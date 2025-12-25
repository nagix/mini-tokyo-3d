import animation from '../animation';
import configs from '../configs';
import ComputeRenderer from '../gpgpu/compute-renderer';
import {lerp} from '../helpers/helpers';
import {hasDarkBackground} from '../helpers/helpers-mapbox';
import {AircraftMeshSet, BusMeshSet, CarMeshSet} from '../mesh-sets';
import {Point} from 'mapbox-gl';
import {Color, Scene, WebGLRenderTarget, Vector3} from 'three';

const MAX_UG_CARS = 1000;
const MAX_OG_CARS = 2500;
const MAX_AIRCRAFTS = 200;
const MAX_BUSES = 4000;

export default class {

    constructor(options) {
        const me = this;

        me.id = options.id;
        me.type = 'three';
        me.lightColor = 'white';
        me.objects = new Map();

        me.onCameraChanged = me.onCameraChanged.bind(me);
    }

    onAdd(map, context) {
        const me = this,
            scene = context.scene,
            zoom = map.getZoom(),
            cameraZ = map.map.getFreeCameraOptions().position.z,
            modelOrigin = map.getModelOrigin(),
            modelScale = map.getModelScale(),
            chunkSize = context.renderer.capabilities.maxTextureSize;

        me.map = map;
        me.context = context;

        me.computeRenderer = new ComputeRenderer(MAX_UG_CARS + MAX_OG_CARS + MAX_AIRCRAFTS + MAX_BUSES, {modelOrigin, chunkSize});

        const ugCarMeshSet = me.ugCarMeshSet = new CarMeshSet(MAX_UG_CARS, {zoom, cameraZ, modelScale}),
            ogCarMeshSet = me.ogCarMeshSet = new CarMeshSet(MAX_OG_CARS, {zoom, cameraZ, modelScale}),
            aircraftMeshSet = me.aircraftMeshSet = new AircraftMeshSet(MAX_AIRCRAFTS, {zoom, cameraZ, modelScale}),
            busMeshSet = me.busMeshSet = new BusMeshSet(MAX_BUSES, {zoom, cameraZ, modelScale});

        scene.add(ugCarMeshSet.getMesh());
        scene.add(ogCarMeshSet.getMesh());
        scene.add(aircraftMeshSet.getMesh());
        scene.add(busMeshSet.getMesh());

        scene.add(ugCarMeshSet.getDelayMarkerMesh());
        scene.add(ogCarMeshSet.getDelayMarkerMesh());

        scene.add(ugCarMeshSet.getOutlineMesh());
        scene.add(ogCarMeshSet.getOutlineMesh());
        scene.add(aircraftMeshSet.getOutlineMesh());
        scene.add(busMeshSet.getOutlineMesh());

        const ugPickingScene = me.ugPickingScene = new Scene();

        ugPickingScene.background = new Color(0xFFFFFF);
        ugPickingScene.add(ugCarMeshSet.getPickingMesh());

        const ogPickingScene = me.ogPickingScene = new Scene();

        ogPickingScene.background = new Color(0xFFFFFF);
        ogPickingScene.add(ogCarMeshSet.getPickingMesh());
        ogPickingScene.add(aircraftMeshSet.getPickingMesh());
        ogPickingScene.add(busMeshSet.getPickingMesh());

        me.pickingTexture = new WebGLRenderTarget(1, 1);
        me.pixelBuffer = new Uint8Array(4);

        me.animationID = animation.start({
            callback: () => {
                me.needsUpdateInstances = true;
            },
            frameRate: 1
        });

        map.on('zoom', me.onCameraChanged);
        map.on('pitch', me.onCameraChanged);
    }

    onRemove(map) {
        const me = this;

        me.computeRenderer.dispose();

        me.ugCarMeshSet.dispose();
        me.ogCarMeshSet.dispose();
        me.aircraftMeshSet.dispose();
        me.busMeshSet.dispose();

        me.pickingTexture.dispose();

        animation.stop(me.animationID);

        map.off('zoom', me.onCameraChanged);
        map.off('pitch', me.onCameraChanged);
    }

    prerender(map, context) {
        const me = this,
            textures = me.computeRenderer.compute(context, map.layerZoom);

        me.ugCarMeshSet.setTextures(textures);
        me.ogCarMeshSet.setTextures(textures);
        me.aircraftMeshSet.setTextures(textures);
        me.busMeshSet.setTextures(textures);

        if (me.needsUpdateInstances) {
            // Reassign object instances into mesh sets based on type and altitude
            const [ugCarInstanceIDs, ogCarInstanceIDs, aircraftInstanceIDs, busInstanceIDs] = me.computeRenderer.getInstanceIDs(context);

            me.ugCarMeshSet.setInstanceIDs(ugCarInstanceIDs);
            me.ogCarMeshSet.setInstanceIDs(ogCarInstanceIDs);
            me.aircraftMeshSet.setInstanceIDs(aircraftInstanceIDs);
            me.busMeshSet.setInstanceIDs(busInstanceIDs);
            delete me.needsUpdateInstances;
        }
    }

    onCameraChanged() {
        const me = this,
            map = me.map,
            cameraParams = {
                zoom: map.getZoom(),
                cameraZ: map.map.getFreeCameraOptions().position.z
            };

        me.ugCarMeshSet.refreshCameraParams(cameraParams);
        me.ogCarMeshSet.refreshCameraParams(cameraParams);
        me.aircraftMeshSet.refreshCameraParams(cameraParams);
        me.busMeshSet.refreshCameraParams(cameraParams);
    }

    setMode(viewMode, searchMode) {
        const me = this,
            currentOpacity = me.computeRenderer.getOpacity();
        let ugOpacity, ogOpacity;

        if (searchMode !== 'none' && searchMode !== 'edit') {
            ugOpacity = ogOpacity = .1;
        } else if (viewMode === 'underground') {
            ugOpacity = .9;
            ogOpacity = .225;
        } else {
            ugOpacity = .225;
            ogOpacity = .9;
        }
        animation.start({
            callback: (elapsed, duration) => {
                me.computeRenderer.setOpacity({
                    ground: lerp(currentOpacity.ground, ogOpacity, elapsed / duration),
                    underground: lerp(currentOpacity.underground, ugOpacity, elapsed / duration),
                });
                me.refreshDelayMarkers(true);
            },
            duration: configs.transitionDuration
        });
    }

    addRouteGroup(data) {
        return this.computeRenderer.addRouteGroup(data);
    }

    removeRouteGroup(groupIndex) {
        this.computeRenderer.removeRouteGroup(groupIndex);
    }

    addColorGroup(data) {
        return this.computeRenderer.addColorGroup(data);
    }

    removeColorGroup(groupIndex) {
        this.computeRenderer.removeColorGroup(groupIndex);
    }

    addObject(object) {
        const me = this;
        let objectType, routeIndex, colorIndex, sectionIndex, nextSectionIndex, delay;

        if (object.type === 'train') {
            const {id, r, v, ad} = object;

            objectType = 0;
            routeIndex = me.computeRenderer.getRouteIndex(r.id);
            if (ad && ad.color) {
                object.colorGroupIndex = me.computeRenderer.addColorGroup([{
                    id,
                    color: ad.color
                }]);
                colorIndex = me.computeRenderer.getColorIndex(id);
            } else {
                colorIndex = me.computeRenderer.getColorIndex(v ? v.id : r.id);
            }
            sectionIndex = object.sectionIndex;
            nextSectionIndex = sectionIndex + object.sectionLength;
            delay = object.delay ? 1 : 0;
        } else if (object.type === 'flight') {
            const {a, feature} = object;

            objectType = 1;
            routeIndex = me.computeRenderer.getRouteIndex(feature.properties.id);
            colorIndex = me.computeRenderer.getColorIndex(a.id);
            sectionIndex = 0;
            nextSectionIndex = 1;
        } else {
            const {gtfsId, feature, offsets: stopOffsets} = object;

            objectType = 2;
            routeIndex = me.computeRenderer.getRouteIndex(`${gtfsId}.${feature.properties.id}`);
            colorIndex = me.computeRenderer.getColorIndex(gtfsId);
            sectionIndex = stopOffsets[object.sectionIndex];
            nextSectionIndex = stopOffsets[object.sectionIndex + object.sectionLength];
        }

        const instanceID = object.instanceID = me.computeRenderer.addInstance(objectType, routeIndex, colorIndex, sectionIndex, nextSectionIndex, delay);

        me.objects.set(instanceID, object);
        Object.assign(object, me.getObjectPosition(object));
        me.needsUpdateInstances = true;
    }

    updateObject(object, timeOffset, duration, accelerationTime, normalizedAcceleration, decelerationTime, normalizedDeceleration) {
        const me = this;
        let sectionIndex, nextSectionIndex;

        if (object.type === 'train') {
            sectionIndex = object.sectionIndex;
            nextSectionIndex = sectionIndex + object.sectionLength;
        } else if (object.type === 'flight') {
            sectionIndex = 0;
            nextSectionIndex = 1;
        } else {
            const stopOffsets = object.offsets;

            sectionIndex = stopOffsets[object.sectionIndex];
            nextSectionIndex = stopOffsets[object.sectionIndex + object.sectionLength];
        }

        me.computeRenderer.updateInstance(object.instanceID, sectionIndex, nextSectionIndex, timeOffset, duration, accelerationTime, normalizedAcceleration, decelerationTime, normalizedDeceleration);
        Object.assign(object, me.getObjectPosition(object));
        me.needsUpdateInstances = true;
    }

    getObjectPosition(object) {
        return this.computeRenderer.getInstancePosition(object.instanceID);
    }

    removeObject(object) {
        const me = this,
            {instanceID, colorGroupIndex} = object;

        if (instanceID !== undefined) {
            me.objects.delete(instanceID);
            delete object.instanceID;
            return me.computeRenderer.removeInstance(instanceID).then(() => {
                if (colorGroupIndex !== undefined) {
                    me.computeRenderer.removeColorGroup(colorGroupIndex);
                    delete object.colorGroupIndex;
                }
                me.needsUpdateInstances = true;
            });
        }
        return Promise.resolve();
    }

    pickObject(mode, point) {
        const me = this,
            {pickingTexture, pixelBuffer} = me,
            {renderer, camera} = me.context,
            rendererContext = renderer.getContext(),
            pixelRatio = window.devicePixelRatio,
            scene = mode === 'underground' ? me.ugPickingScene : me.ogPickingScene;

        camera.setViewOffset(
            rendererContext.drawingBufferWidth,
            rendererContext.drawingBufferHeight,
            point.x * pixelRatio | 0,
            point.y * pixelRatio | 0,
            1,
            1
        );

        renderer.resetState();
        renderer.setRenderTarget(pickingTexture);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.resetState();

        camera.clearViewOffset();

        renderer.readRenderTargetPixels(pickingTexture, 0, 0, 1, 1, pixelBuffer);

        return me.objects.get((pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | pixelBuffer[2]);
    }

    refreshDelayMarkers(actual) {
        const me = this,
            dark = hasDarkBackground(me.map.map, actual);

        me.ugCarMeshSet.refreshDelayMarkerMesh(dark);
        me.ogCarMeshSet.refreshDelayMarkerMesh(dark);
    }

    setTimeOffset(timeOffset) {
        this.computeRenderer.setTimeOffset(timeOffset);
    }

    markObject(object) {
        const me = this,
            instanceID = object ? object.instanceID : -1;

        me.computeRenderer.setMarked(instanceID);
        me.ugCarMeshSet.setMarkedInstanceID(instanceID);
        me.ogCarMeshSet.setMarkedInstanceID(instanceID);
        me.aircraftMeshSet.setMarkedInstanceID(instanceID);
        me.busMeshSet.setMarkedInstanceID(instanceID);
        me.needsUpdateInstances = true;
    }

    trackObject(object) {
        const me = this,
            instanceID = object ? object.instanceID : -1;

        me.computeRenderer.setTracked(instanceID);
        me.ugCarMeshSet.setTrackedInstanceID(instanceID);
        me.ogCarMeshSet.setTrackedInstanceID(instanceID);
        me.aircraftMeshSet.setTrackedInstanceID(instanceID);
        me.busMeshSet.setTrackedInstanceID(instanceID);
        me.needsUpdateInstances = true;
    }

    project(lnglat, altitude) {
        const {map, context} = this,
            {width, height} = map.map.transform,
            {x, y, z} = map.getModelPosition(lnglat, altitude),
            {x: px, y: py} = new Vector3(x, y, z).project(context.camera);

        return new Point((px + 1) / 2 * width, (1 - py) / 2 * height);
    }

}
