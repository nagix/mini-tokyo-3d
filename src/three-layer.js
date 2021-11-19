import {AmbientLight, Color, DirectionalLight, MathUtils, Matrix4, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer} from 'three';
import {clamp, valueOrDefault} from './helpers';

const SQRT3 = Math.sqrt(3);

export default class {

    constructor(implementation) {
        const me = this;

        me.implementation = implementation;
        me._tick = me._tick.bind(me);
        me._onResize = me._onResize.bind(me);
    }

    onAdd(map, beforeId) {
        const me = this,
            {implementation} = me,
            {id, minzoom, maxzoom} = implementation;

        me.map = map;
        me.modelOrigin = map.getModelOrigin();

        map.map.addLayer({
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
            render: me._render.bind(me)
        }, beforeId || 'poi');
        map.map.setLayerZoomRange(id, minzoom, maxzoom);
    }

    _onAdd(mbox, gl) {
        const me = this,
            {_fov, width, height} = mbox.transform,
            renderer = me.renderer = new WebGLRenderer({
                canvas: mbox.getCanvas(),
                context: gl
            }),
            scene = me.scene = new Scene(),
            lightColor = valueOrDefault(me.implementation.lightColor, new Color().copy(me.map.getLightColor())),
            light = me.light = new DirectionalLight(lightColor, .8),
            ambientLight = me.ambientLight = new AmbientLight(lightColor, .4);

        renderer.autoClear = false;

        scene.add(light);
        scene.add(ambientLight);

        // This is needed to avoid a black screen with empty scene
        scene.add(new Mesh());

        me.mbox = mbox;
        me.camera = new PerspectiveCamera(MathUtils.radToDeg(_fov), width / height);

        mbox.on('resize', me._onResize);

        if (me.implementation.lightColor === undefined) {
            me._tick();
        }
    }

    _tick() {
        const me = this,
            {map, mbox, light, ambientLight, lastRefresh, _tick} = me,
            now = map.clock.getTime();

        if (Math.floor(now / 60000) !== Math.floor(lastRefresh / 60000)) {
            const lightColor = map.getLightColor();

            light.color.copy(lightColor);
            ambientLight.color.copy(lightColor);
            me.lastRefresh = now;
        }
        if (mbox) {
            requestAnimationFrame(_tick);
        }
    }

    _onRemove(mbox) {
        const me = this;

        mbox.off('resize', me._onResize);
        delete me.mbox;
    }

    _render(gl, matrix) {
        // These parameters are copied from mapbox-gl/src/geo/transform.js
        const {modelOrigin, mbox, renderer, camera, light, scene} = this,
            {_fov, _camera, _horizonShift, worldSize, fovAboveCenter, _pitch, width, height} = mbox.transform,
            halfFov = _fov / 2,
            angle = Math.PI / 2 - _pitch,
            cameraToSeaLevelDistance = _camera.position[2] * worldSize / Math.cos(_pitch),
            topHalfSurfaceDistance = Math.sin(fovAboveCenter) * cameraToSeaLevelDistance / Math.sin(clamp(angle - fovAboveCenter, 0.01, Math.PI - 0.01)),
            furthestDistance = Math.cos(angle) * topHalfSurfaceDistance + cameraToSeaLevelDistance,
            horizonDistance = cameraToSeaLevelDistance / _horizonShift,
            farZ = camera.far = Math.min(furthestDistance * 2, horizonDistance),
            nearZ = camera.near = height / 50,
            halfHeight = Math.tan(halfFov) * nearZ,
            halfWidth = halfHeight * width / height,

            m = new Matrix4().fromArray(matrix),
            l = new Matrix4()
                .makeTranslation(modelOrigin.x, modelOrigin.y, 0)
                .scale(new Vector3(1, -1, 1));

        camera.projectionMatrix.makePerspective(
            -halfWidth, halfWidth, halfHeight, -halfHeight, nearZ, farZ
        ).clone().invert().multiply(m).multiply(l).invert()
            .decompose(camera.position, camera.quaternion, camera.scale);

        const rad = MathUtils.degToRad(mbox.getBearing() + 30);
        light.position.set(-Math.sin(rad), -Math.cos(rad), SQRT3).normalize();

        renderer.resetState();
        renderer.render(scene, camera);
    }

    _onResize(event) {
        const {camera} = this,
            {width, height} = event.target.transform;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

}
