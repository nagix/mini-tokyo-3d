import {MercatorCoordinate, Point} from 'mapbox-gl';
import {AmbientLight, DirectionalLight, MathUtils, Matrix4, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer, WebGLRenderTarget} from 'three';
import configs from './configs';
import {clamp} from './helpers';

const SQRT3 = Math.sqrt(3);

export default class {

    constructor(options) {
        const me = this;

        me.id = options.id;
        me.modelOrigin = MercatorCoordinate.fromLngLat(configs.defaultCenter);
        me.modelScale = me.modelOrigin.meterInMercatorCoordinateUnits();
        me.minzoom = options.minzoom;
        me.maxzoom = options.maxzoom;
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

        me.pickingTexture = new WebGLRenderTarget(1, 1);
        me.pixelBuffer = new Uint8Array(4);

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

    onAdd() {
        // noop
    }

    onRemove() {
        // noop
    }

    getPixel(point, scene) {
        const {camera, renderer, pickingTexture, pixelBuffer} = this,
            context = renderer.getContext(),
            pixelRatio = window.devicePixelRatio;

        camera.setViewOffset(
            context.drawingBufferWidth,
            context.drawingBufferHeight,
            point.x * pixelRatio | 0,
            point.y * pixelRatio | 0,
            1,
            1
        );

        renderer.setRenderTarget(pickingTexture);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.resetState();

        camera.clearViewOffset();

        renderer.readRenderTargetPixels(pickingTexture, 0, 0, 1, 1, pixelBuffer);

        return Array.from(pixelBuffer);
    }

    add(object) {
        const me = this,
            {scene} = me;

        if (scene) {
            scene.add(object);
        }
        return me;
    }

    remove(object) {
        const me = this,
            {scene} = me;

        if (scene) {
            scene.remove(object);
        }
        return me;
    }

    _onResize(event) {
        const {camera} = this,
            {width, height} = event.target.transform;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    getModelOrigin() {
        return this.modelOrigin;
    }

    getModelScale() {
        return this.modelScale;
    }

    getModelPosition(lnglat, altitude) {
        const coord = MercatorCoordinate.fromLngLat(lnglat, altitude),
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
     * @param {LngLatLike} lnglat - The geographical location to project
     * @param {number} altitude - The altitude in meters of the position
     * @returns {Point} The Point corresponding to lnglat, relative to the
     *     map's container
     */
    project(lnglat, altitude) {
        const {_map, camera} = this,
            {width, height} = _map.transform,
            {x, y, z} = this.getModelPosition(lnglat, altitude),
            {x: px, y: py} = new Vector3(x, y, z).project(camera);

        return new Point((px + 1) / 2 * width, (1 - py) / 2 * height);
    }

}
