import {AmbientLight, DirectionalLight, Fog, MathUtils, Matrix4, Mesh, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer} from 'three';
import {getAmbientLight, getDirectionalLight, getFogColor, getFogNearFar} from '../helpers/helpers-mapbox';

const SQRT3 = Math.sqrt(3);

// Base light intensities for this layer, applied at full luminance. They are
// scaled by the relative luminance (0-1) of the corresponding Mapbox light so
// that the lights dim and brighten together with the map.
const DIRECTIONAL_INTENSITY = 3.8,
    AMBIENT_INTENSITY = 0.4;

// Sets a THREE.Color from an [r, g, b] color with 0-255 sRGB components,
// decoding it to the renderer's linear working color space.
function setSRGBColor(target, [r, g, b]) {
    target.setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
}

export default class {

    constructor(implementation) {
        const me = this;

        me.implementation = implementation;
        me._onResize = me._onResize.bind(me);
        me._updateLights = me._updateLights.bind(me);
    }

    onAdd(map, beforeId) {
        const me = this,
            implementation = me.implementation,
            id = implementation.id,
            _mbox = map.map;

        me.map = map;
        me.modelOrigin = map.getModelOrigin();

        _mbox.addLayer({
            id,
            type: 'custom',
            renderingMode: '3d',
            onAdd: (mbox, gl) => {
                me._onAdd(mbox, gl);
                if (implementation.onAdd) {
                    implementation.onAdd(map, {
                        renderer: me.renderer,
                        scene: me.scene,
                        camera: me.camera
                    });
                }
            },
            onRemove: (mbox, gl) => {
                me._onRemove(mbox, gl);
                if (implementation.onRemove) {
                    implementation.onRemove(map, {
                        renderer: me.renderer,
                        scene: me.scene,
                        camera: me.camera
                    });
                }
            },
            prerender: () => {
                if (implementation.prerender) {
                    implementation.prerender(map, {
                        renderer: me.renderer,
                        scene: me.scene,
                        camera: me.camera
                    });
                }
            },
            render: me._render.bind(me)
        }, beforeId || 'poi');
        _mbox.setLayerZoomRange(id, implementation.minzoom, implementation.maxzoom);
    }

    _onAdd(mbox, gl) {
        const me = this,
            {_fov, width, height} = mbox.transform,
            renderer = me.renderer = new WebGLRenderer({
                canvas: mbox.getCanvas(),
                context: gl
            }),
            scene = me.scene = new Scene(),
            lightColor = me.implementation.lightColor,
            light = me.light = new DirectionalLight(lightColor, DIRECTIONAL_INTENSITY),
            ambientLight = me.ambientLight = new AmbientLight(lightColor, AMBIENT_INTENSITY);

        renderer.autoClear = false;

        scene.add(light);
        scene.add(ambientLight);
        scene.fog = new Fog(0x000000);

        // This is needed to avoid a black screen with empty scene
        scene.add(new Mesh());

        me.mbox = mbox;
        me.camera = new PerspectiveCamera(MathUtils.radToDeg(_fov), width / height);

        // The view matrix is set directly in _render(), so prevent the renderer
        // from recomputing matrixWorld/matrixWorldInverse from the camera's
        // position/quaternion/scale (see _render() for details).
        me.camera.matrixWorldAutoUpdate = false;

        mbox.on('resize', me._onResize);

        if (lightColor === undefined) {
            me.map.on('light', me._updateLights);
            me._updateLights({directional: getDirectionalLight(mbox), ambient: getAmbientLight(mbox)});
        }
    }

    _onRemove(mbox) {
        const me = this;

        mbox.off('resize', me._onResize);
        if (me.implementation.lightColor === undefined) {
            me.map.off('light', me._updateLights);
        }
        delete me.mbox;
    }

    _render(gl, matrix) {
        // These parameters are copied from mapbox-gl/src/geo/transform.js
        const me = this,
            {modelOrigin, mbox, renderer, camera, light, scene} = me,
            {_fov, _camera, _horizonShift, pixelsPerMeter, worldSize, _pitch, width, height} = mbox.transform,
            halfFov = _fov / 2,
            cameraToSeaLevelDistance = _camera.position[2] * worldSize / Math.cos(_pitch),
            horizonDistance = cameraToSeaLevelDistance / _horizonShift,
            undergroundDistance = 1000 * pixelsPerMeter / Math.cos(_pitch),
            farZ = camera.far = Math.max(horizonDistance, cameraToSeaLevelDistance + undergroundDistance),
            nearZ = camera.near = height / 50,
            halfHeight = Math.tan(halfFov) * nearZ,
            halfWidth = halfHeight * width / height,

            m = new Matrix4().fromArray(matrix),
            l = new Matrix4()
                .makeTranslation(modelOrigin.x, modelOrigin.y, 0)
                .scale(new Vector3(1, -1, 1));

        camera.projectionMatrix.makePerspective(
            -halfWidth, halfWidth, halfHeight, -halfHeight, nearZ, farZ
        );
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

        // Set the view matrix directly so that projectionMatrix * matrixWorldInverse
        // reproduces Mapbox's view-projection matrix (m * l). Previously this was done
        // by decomposing the camera world matrix into position/quaternion/scale and
        // letting the renderer rebuild matrixWorldInverse from them. Since three.js
        // r183, Camera.updateMatrixWorld() strips the scale component from
        // matrixWorldInverse ("exclude scale from view matrix to be glTF conform"), but
        // here the decomposed scale is non-identity and essential, so the projection
        // broke and every object became invisible. matrixWorldAutoUpdate is disabled in
        // _onAdd() so the renderer keeps the matrices set here.
        camera.matrixWorldInverse.copy(camera.projectionMatrixInverse).multiply(m).multiply(l);
        camera.matrixWorld.copy(camera.matrixWorldInverse).invert();

        const rad = MathUtils.degToRad(mbox.getBearing() + 30);
        light.position.set(-Math.sin(rad), -Math.cos(rad), SQRT3).normalize();

        // The light color/intensity is updated on the map's 'light' event; only the
        // fog is refreshed per frame here. Anchor the fog to the screen-center
        // (cameraToSeaLevelDistance) and far plane (farZ) depths, so distant
        // geometry fades into the fog color like the map.
        setSRGBColor(scene.fog.color, getFogColor(mbox));
        [scene.fog.near, scene.fog.far] = getFogNearFar(cameraToSeaLevelDistance, farZ);

        renderer.resetState();
        renderer.render(scene, camera);
    }

    // Applies the given directional and ambient light (from the map's 'light' event
    // payload). Called on the event and once on add; only used when lightColor is
    // undefined.
    _updateLights({directional, ambient}) {
        const {light, ambientLight} = this;

        setSRGBColor(light.color, directional.color);
        light.intensity = directional.intensity * DIRECTIONAL_INTENSITY;
        setSRGBColor(ambientLight.color, ambient.color);
        ambientLight.intensity = ambient.intensity * AMBIENT_INTENSITY;
    }

    _onResize(event) {
        const camera = this.camera,
            transform = event.target.transform;

        camera.aspect = transform.width / transform.height;
        camera.updateProjectionMatrix();
    }

}
