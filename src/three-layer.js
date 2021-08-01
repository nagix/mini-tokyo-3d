import {MercatorCoordinate, Point} from 'mapbox-gl';
import * as THREE from 'three';
import configs from './configs';
import {clamp} from './helpers';

const SQRT3 = Math.sqrt(3);

export default class {

    constructor(id, underground = false, semitransparent = false) {
        const me = this;

        me.id = id;
        me.type = 'custom';
        me.renderingMode = '3d';
        me.underground = underground;
        me.semitransparent = semitransparent;
        me.modelOrigin = MercatorCoordinate.fromLngLat(configs.originCoord);
        me.modelScale = me.modelOrigin.meterInMercatorCoordinateUnits();
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
            light = me.light = new THREE.DirectionalLight(0xffffff, .8),
            ambientLight = me.ambientLight = new THREE.AmbientLight(0xffffff, .4);

        renderer.autoClear = false;

        scene.add(light);
        scene.add(ambientLight);

        // This is needed to avoid a black screen with empty scene
        scene.add(new THREE.Mesh());

        me.map = map;
        me.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(_fov), width / height);
        me.raycaster = new THREE.Raycaster();
    }

    render(gl, matrix) {
        const {underground, semitransparent, modelOrigin, map, renderer, camera, light, scene} = this,
            {_fov, _camera, _horizonShift, worldSize, fovAboveCenter, _pitch, width, height} = map.transform,
            halfFov = _fov / 2,
            angle = Math.PI / 2 - _pitch,
            cameraToSeaLevelDistance = _camera.position[2] * worldSize / Math.cos(_pitch),
            topHalfSurfaceDistance = Math.sin(fovAboveCenter) * cameraToSeaLevelDistance / Math.sin(clamp(angle - fovAboveCenter, 0.01, Math.PI - 0.01)),
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

    getModelOrigin() {
        return this.modelOrigin;
    }

    getModelScale() {
        return this.modelScale;
    }

    getModelPosition(lngLatLike, altitude) {
        const coord = MercatorCoordinate.fromLngLat(lngLatLike, altitude),
            origin = this.modelOrigin;

        return {
            x: coord.x - origin.x,
            y: -(coord.y - origin.y),
            z: coord.z - origin.z
        };
    }

    /**
     * Returns a Point representing pixel coordinates, relative to the map's
     * container, that correspond to the specified geographical location.
     * @param {LngLatLike} lngLatLike - The geographical location to project
     * @param {number} altitude - The altitude in meters of the position
     * @returns {Point} The Point corresponding to lnglat, relative to the
     *     map's container
     */
    project(lngLatLike, altitude) {
        const {map, camera} = this,
            {width, height} = map.transform,
            {x, y, z} = this.getModelPosition(lngLatLike, altitude),
            {x: px, y: py} = new THREE.Vector3(x, y, z).project(camera);

        return new Point((px + 1) / 2 * width, (1 - py) / 2 * height);
    }

}
