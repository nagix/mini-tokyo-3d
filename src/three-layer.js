import {AmbientLight, DirectionalLight, MathUtils, Matrix4, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer} from 'three';
import {clamp} from './helpers';

const SQRT3 = Math.sqrt(3);

export default class {

    constructor(implementation) {
        this.implementation = implementation;
    }

    onAdd(map, beforeId) {
        const me = this,
            {implementation} = me,
            {id, minzoom, maxzoom} = implementation;

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

    _onAdd(map, gl) {
        const me = this,
            {_fov, width, height} = map.transform,
            renderer = me.renderer = new WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl
            }),
            scene = me.scene = new Scene(),
            light = me.light = new DirectionalLight(0xffffff, .8),
            ambientLight = me.ambientLight = new AmbientLight(0xffffff, .4);

        renderer.autoClear = false;

        scene.add(light);
        scene.add(ambientLight);

        // This is needed to avoid a black screen with empty scene
        scene.add(new Mesh());

        me._map = map;
        me.camera = new PerspectiveCamera(MathUtils.radToDeg(_fov), width / height);

        map.on('resize', me._onResize.bind(me));
    }

    _onRemove() {
        // noop
    }

    _render(gl, matrix) {
        // These parameters are copied from mapbox-gl/src/geo/transform.js
        const {modelOrigin, _map, renderer, camera, light, scene} = this,
            {_fov, _camera, _horizonShift, worldSize, fovAboveCenter, _pitch, width, height} = _map.transform,
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

        const rad = MathUtils.degToRad(_map.getBearing() + 30);
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
