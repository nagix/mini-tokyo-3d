import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import configs from './configs';
import * as helpers from './helpers';

const SQRT3 = Math.sqrt(3);

const modelOrigin = mapboxgl.MercatorCoordinate.fromLngLat(configs.originCoord);

export default class {

    constructor(id, underground = false, semitransparent = false) {
        const me = this;

        me.id = id;
        me.type = 'custom';
        me.renderingMode = '3d';
        me.underground = underground;
        me.semitransparent = semitransparent;
    }

    setSemitransparent(semitransparent) {
        this.semitransparent = semitransparent;
    }

    onAdd(map, gl) {
        const me = this,
            {_fov, width, height} = map.transform,
            renderer = me.renderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl
            }),
            scene = me.scene = new THREE.Scene(),
            light = me.light = new THREE.DirectionalLight(0xffffff, .8);

        renderer.autoClear = false;

        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, .4));

        // This is needed to avoid a black screen with empty scene
        scene.add(new THREE.Mesh());

        me.map = map;
        me.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(_fov), width / height);
        me.raycaster = new THREE.Raycaster();
    }

    render(gl, matrix) {
        const {underground, semitransparent, map, renderer, camera, light, scene} = this,
            {_fov, _camera, _horizonShift, worldSize, fovAboveCenter, _pitch, width, height} = map.transform,
            halfFov = _fov / 2,
            angle = Math.PI / 2 - _pitch,
            cameraToSeaLevelDistance = _camera.position[2] * worldSize / Math.cos(_pitch),
            topHalfSurfaceDistance = Math.sin(fovAboveCenter) * cameraToSeaLevelDistance / Math.sin(helpers.clamp(angle - fovAboveCenter, 0.01, Math.PI - 0.01)),
            furthestDistance = Math.cos(angle) * topHalfSurfaceDistance + cameraToSeaLevelDistance,
            horizonDistance = cameraToSeaLevelDistance / _horizonShift,
            farZ = Math.min(furthestDistance * 1.01, horizonDistance),
            nearZ = height / 50,
            halfHeight = Math.tan(halfFov) * nearZ,
            halfWidth = halfHeight * width / height,

            m = new THREE.Matrix4().fromArray(matrix),
            l = new THREE.Matrix4()
                .makeTranslation(modelOrigin.x, modelOrigin.y, 0)
                .scale(new THREE.Vector3(1, -1, 1)),

            projectionMatrixI = new THREE.Matrix4();

        camera.projectionMatrix = new THREE.Matrix4().makePerspective(
            -halfWidth, halfWidth, halfHeight, -halfHeight, nearZ, farZ);
        projectionMatrixI.copy(camera.projectionMatrix).invert();
        camera.matrix.copy(projectionMatrixI.multiply(m).multiply(l)).invert();
        camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

        if (underground && !semitransparent) {
            // Recalculate the projection matrix to replace the far plane
            camera.projectionMatrix = new THREE.Matrix4().makePerspective(
                -halfWidth, halfWidth, halfHeight, -halfHeight, nearZ, furthestDistance * 2.5);
        }

        const rad = THREE.MathUtils.degToRad(map.getBearing() + 30);
        light.position.set(-Math.sin(rad), -Math.cos(rad), SQRT3).normalize();

        renderer.resetState();
        renderer.render(scene, camera);
    }

    onResize(event) {
        const {camera} = this,
            {width, height} = event.target.transform;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    pickObject(point) {
        const {map, raycaster, camera, scene} = this,
            {width, height} = map.transform,
            mouse = new THREE.Vector2(point.x / width * 2 - 1, -point.y / height * 2 + 1);

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(scene.children, true);

        for (let i = 0, ilen = intersects.length; i < ilen; i++) {
            const {name, parent} = intersects[i].object;

            if (name === 'cube' && parent.userData.coord) {
                return parent;
            }
        }
    }

}
