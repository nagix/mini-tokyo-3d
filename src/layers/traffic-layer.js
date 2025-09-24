import animation from '../animation';
import configs from '../configs';
import ComputeRenderer from '../gpgpu/compute-renderer';
import {colorToRGBArray, lerp, valueOrDefault} from '../helpers/helpers';
import {hasDarkBackground} from '../helpers/helpers-mapbox';
import {AircraftMeshSet, BusMeshSet, CarMeshSet} from '../mesh-sets';
import {Point} from 'mapbox-gl';
import {Color, Scene, MathUtils, WebGLRenderTarget, Vector3} from 'three';

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
        me.busObjects = [];
        me.routeIndices = new Map();
        me.colorIndices = new Map();

        me.onCameraChanged = me.onCameraChanged.bind(me);
    }

    onAdd(map, context) {
        const me = this,
            scene = context.scene,
            zoom = map.getZoom(),
            cameraZ = map.map.getFreeCameraOptions().position.z,
            modelOrigin = map.getModelOrigin(),
            modelScale = map.getModelScale(),
            textureWidth = context.renderer.capabilities.maxTextureSize;

        me.map = map;
        me.context = context;

        const features = [],
            colors = [];

        for (const {id, color} of map.railways.getAll()) {
            for (const zoom of [13, 14, 15, 16, 17, 18]) {
                features.push(map.featureLookup.get(`${id}.${zoom}`));
            }
            colors.push(color);
            me.routeIndices.set(id, me.routeIndices.size);
            me.colorIndices.set(id, me.colorIndices.size);
        }
        for (const [id, feature] of map.featureLookup.entries()) {
            if (feature.properties.altitude > 0) {
                features.push(feature);
                me.routeIndices.set(id, me.routeIndices.size);
            }
        }
        for (const {id, color} of map.trainVehicleTypes.getAll()) {
            colors.push(color);
            me.colorIndices.set(id, me.colorIndices.size);
        }
        for (const {id, color, tailcolor} of map.operators.getAll()) {
            colors.push([color, tailcolor]);
            me.colorIndices.set(id, me.colorIndices.size);
        }

        me.computeRenderer = new ComputeRenderer(MAX_UG_CARS + MAX_OG_CARS + MAX_AIRCRAFTS, features, colors, {modelOrigin, textureWidth});

        const ugCarMeshSet = me.ugCarMeshSet = new CarMeshSet(MAX_UG_CARS, {zoom, cameraZ, modelScale}),
            ogCarMeshSet = me.ogCarMeshSet = new CarMeshSet(MAX_OG_CARS, {zoom, cameraZ, modelScale}),
            aircraftMeshSet = me.aircraftMeshSet = new AircraftMeshSet(MAX_AIRCRAFTS, {zoom, cameraZ, modelScale}),
            busMeshSet = me.busMeshSet = new BusMeshSet(MAX_BUSES, {index: 3, zoom, cameraZ, modelScale, opacity: .9});

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

        if (me.needsUpdateInstances) {
            // Reassign object instances into mesh sets based on type and altitude
            const [ugCarInstanceIDs, ogCarInstanceIDs, aircraftInstanceIDs] = me.computeRenderer.getInstanceIDs(context);

            me.ugCarMeshSet.setInstanceIDs(ugCarInstanceIDs);
            me.ogCarMeshSet.setInstanceIDs(ogCarInstanceIDs);
            me.aircraftMeshSet.setInstanceIDs(aircraftInstanceIDs);
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
                me.busMeshSet.setOpacity(lerp(currentOpacity.ground, ogOpacity, elapsed / duration));
                me.refreshDelayMarkers(true);
            },
            duration: configs.transitionDuration
        });
    }

    addBus(object) {
        const me = this,
            meshSet = me.busMeshSet,
            objects = me.busObjects,
            {x, y, z} = me.map.getModelPosition(object.coord, object.altitude),
            attributes = {
                translation: [x, y, z],
                rotationZ: MathUtils.degToRad(-object.bearing),
                opacity0: 0,
                outline: object.outline,
                color: colorToRGBArray(object.color)
            };

        meshSet.addInstance(attributes);

        object.meshIndex = 3;
        object.instanceIndex = objects.length;
        objects.push(object);

        object.animationID = animation.start({
            callback: (elapsed, duration) => {
                meshSet.setInstanceAttributes(object.instanceIndex, {opacity0: elapsed / duration});
            },
            complete: () => {
                delete object.animationID;
            },
            duration: configs.fadeDuration
        });
    }

    addObject(object) {
        const me = this;
        let routeIndex, colorIndex, sectionIndex, sectionLength, delay;

        if (object.type === 'train') {
            const {r, v, ad} = object;

            routeIndex = me.routeIndices.get(r.id);
            colorIndex = ad && ad.color ? me.computeRenderer.addColor(ad.color) : me.colorIndices.get(v ? v.id : r.id);
            sectionIndex = object.sectionIndex;
            sectionLength = object.sectionLength;
            delay = object.delay;
        } else {
            const {a, feature} = object;

            routeIndex = me.routeIndices.get(feature.properties.id);
            colorIndex = me.colorIndices.get(a.id);
            sectionIndex = 0;
            sectionLength = 1;
        }

        const instanceID = object.instanceID = me.computeRenderer.addInstance(routeIndex, colorIndex, sectionIndex, sectionLength, delay);

        me.objects.set(instanceID, object);
        me.needsUpdateInstances = true;
    }

    updateBus(object) {
        if (!object || object.instanceIndex === undefined || object.removing) {
            return;
        }

        const me = this,
            {x, y, z} = me.map.getModelPosition(object.coord, object.altitude),
            attributes = {
                translation: [x, y, z],
                rotationZ: MathUtils.degToRad(-object.bearing),
                outline: object.outline
            };

        me.busMeshSet.setInstanceAttributes(object.instanceIndex, attributes);
    }

    updateObject(object, timeOffset, duration, accelerationTime, normalizedAcceleration, decelerationTime, normalizedDeceleration) {
        const me = this,
            sectionIndex = valueOrDefault(object.sectionIndex, 0),
            sectionLength = valueOrDefault(object.sectionLength, 1);

        me.computeRenderer.updateInstance(object.instanceID, sectionIndex, sectionLength, timeOffset, duration, accelerationTime, normalizedAcceleration, decelerationTime, normalizedDeceleration);
        me.needsUpdateInstances = true;
    }

    getObjectPosition(object) {
        return this.computeRenderer.getInstancePosition(object.instanceID);
    }

    removeBus(object) {
        if (!object || object.instanceIndex === undefined || object.removing) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            const me = this,
                animationID = object.animationID,
                meshSet = me.busMeshSet,
                objects = me.busObjects;

            if (animationID) {
                animation.stop(animationID);
            }
            object.removing = true;

            object.animationID = animation.start({
                callback: (elapsed, duration) => {
                    meshSet.setInstanceAttributes(object.instanceIndex, {opacity0: 1 - elapsed / duration});
                },
                complete: () => {
                    const instanceIndex = object.instanceIndex;

                    meshSet.removeInstance(instanceIndex);

                    delete object.meshIndex;
                    delete object.instanceIndex;
                    delete object.animationID;
                    delete object.removing;
                    objects.splice(instanceIndex, 1);
                    for (let i = instanceIndex; i < objects.length; i++) {
                        objects[i].instanceIndex--;
                    }
                    resolve();
                },
                duration: configs.fadeDuration
            });
        });
    }

    removeObject(object) {
        const me = this,
            instanceID = object.instanceID;

        if (instanceID !== undefined) {
            me.objects.delete(instanceID);
            delete object.instanceID;
            return me.computeRenderer.removeInstance(instanceID).then(() => {
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

        const meshIndex = pixelBuffer[0],
            instanceIndex = (pixelBuffer[1] << 8) | pixelBuffer[2];

        if (meshIndex !== 3) {
            return me.objects.get(instanceIndex);
        } else {
            return me.busObjects[instanceIndex];
        }
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
        me.needsUpdateInstances = true;
    }

    trackObject(object) {
        const me = this,
            instanceID = object ? object.instanceID : -1;

        me.computeRenderer.setTracked(instanceID);
        me.ugCarMeshSet.setTrackedInstanceID(instanceID);
        me.ogCarMeshSet.setTrackedInstanceID(instanceID);
        me.aircraftMeshSet.setTrackedInstanceID(instanceID);
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
