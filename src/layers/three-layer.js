import {AmbientLight, DirectionalLight, MathUtils, Matrix4, Mesh, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer} from 'three';

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
        me._tick = me._tick.bind(me);
        me._onResize = me._onResize.bind(me);
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

        // This is needed to avoid a black screen with empty scene
        scene.add(new Mesh());

        me.mbox = mbox;
        me.camera = new PerspectiveCamera(MathUtils.radToDeg(_fov), width / height);

        // The view matrix is set directly in _render(), so prevent the renderer
        // from recomputing matrixWorld/matrixWorldInverse from the camera's
        // position/quaternion/scale (see _render() for details).
        me.camera.matrixWorldAutoUpdate = false;

        mbox.on('resize', me._onResize);

        if (me.implementation.lightColor === undefined) {
            me._tick();
        }
    }

    _tick() {
        const me = this,
            map = me.map,
            now = map.clock.getTime();

        if (Math.floor(now / 60000) !== Math.floor(me.lastRefresh / 60000)) {
            me._updateLights();
            me.lastRefresh = now;
        }
        if (me.mbox) {
            requestAnimationFrame(me._tick);
        }
    }

    _updateLights() {
        const me = this,
            map = me.map,
            directional = map.getDirectionalLight(),
            ambient = map.getAmbientLight();

        setSRGBColor(me.light.color, directional.color);
        me.light.intensity = directional.intensity * DIRECTIONAL_INTENSITY;
        setSRGBColor(me.ambientLight.color, ambient.color);
        me.ambientLight.intensity = ambient.intensity * AMBIENT_INTENSITY;
    }

    _onRemove(mbox) {
        const me = this;

        mbox.off('resize', me._onResize);
        delete me.mbox;
    }

    _render(gl, matrix) {
        // These parameters are copied from mapbox-gl/src/geo/transform.js
        const {modelOrigin, mbox, renderer, camera, light, scene} = this,
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

        renderer.resetState();
        renderer.render(scene, camera);
    }

    _onResize(event) {
        const camera = this.camera,
            transform = event.target.transform;

        camera.aspect = transform.width / transform.height;
        camera.updateProjectionMatrix();
    }

}
