import animation from '../animation';
import configs from '../configs';
import ComputeRenderer from '../gpgpu/compute-renderer';
import {colorToRGBArray, lerp} from '../helpers/helpers';
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
        me.trains = new Map();
        me.aircraftObjects = [];
        me.busObjects = [];

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

        const features = [].concat(
            ...Array.from(map.railways.getAll()).map(({id}) =>
                [13, 14, 15, 16, 17, 18].map(zoom => map.featureLookup.get(`${id}.${zoom}`))
            )
        );
        const colors = [].concat(
            Array.from(map.railways.getAll()).map(({color}) => color),
            Array.from(map.trainVehicleTypes.getAll()).map(({color}) => color)
        );

        me.computeRenderer = new ComputeRenderer(MAX_UG_CARS + MAX_OG_CARS, features, colors, {modelOrigin, textureWidth});

        const ugCarMeshSet = me.ugCarMeshSet = new CarMeshSet(MAX_UG_CARS, {zoom, cameraZ, modelScale}),
            ogCarMeshSet = me.ogCarMeshSet = new CarMeshSet(MAX_OG_CARS, {zoom, cameraZ, modelScale}),
            aircraftMeshSet = me.aircraftMeshSet = new AircraftMeshSet(MAX_AIRCRAFTS, {index: 2, zoom, cameraZ, modelScale, opacity: .9}),
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

        if (me.needsUpdateInstances) {
            const [ugInstanceIDs, ogInstanceIDs] = me.computeRenderer.getInstanceIDs(context);

            me.ugCarMeshSet.setInstanceIDs(ugInstanceIDs);
            me.ogCarMeshSet.setInstanceIDs(ogInstanceIDs);
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
                me.aircraftMeshSet.setOpacity(lerp(currentOpacity.ground, ogOpacity, elapsed / duration));
                me.busMeshSet.setOpacity(lerp(currentOpacity.ground, ogOpacity, elapsed / duration));
                me.refreshDelayMarkers(true);
            },
            duration: configs.transitionDuration
        });
    }

    addObject(object) {
        if (object.type === 'train') {
            return;
        }

        const me = this,
            {type, altitude} = object,
            meshIndex = type === 'train' ? altitude < 0 ? 0 : 1 : type === 'flight' ? 2 : 3,
            meshSet = [undefined, undefined, me.aircraftMeshSet, me.busMeshSet][meshIndex],
            objects = [undefined, undefined, me.aircraftObjects, me.busObjects][meshIndex],
            {x, y, z} = me.map.getModelPosition(object.coord, altitude),
            color = Array.isArray(object.color) ? object.color : [object.color],
            attributes = {
                translation: [x, y, z],
                rotationZ: MathUtils.degToRad(-object.bearing),
                opacity0: 0,
                outline: object.outline
            };

        if (type === 'train') {
            attributes.rotationX = object.pitch;
            attributes.delay = object.delay;
            attributes.color0 = colorToRGBArray(color[0]);
            attributes.color1 = colorToRGBArray(color[1] || color[0]);
            attributes.color2 = colorToRGBArray(color[2] || color[0]);
            attributes.color3 = colorToRGBArray(color[3] || '#00ff00');
        } else if (type === 'flight') {
            attributes.rotationX = object.pitch;
            attributes.color0 = colorToRGBArray(color[0]);
            attributes.color1 = colorToRGBArray(color[1]);
        } else {
            attributes.color = colorToRGBArray(color[0]);
        }

        meshSet.addInstance(attributes);

        object.meshIndex = meshIndex;
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

    addTrain(train) {
        const me = this,
            map = me.map,
            railways = Array.from(map.railways.getAll()),
            railwayIndex = railways.indexOf(train.r),
            adColorIndex = train.ad && train.ad.color ? me.computeRenderer.addColor(train.ad.color) : undefined,
            vehicleColorIndex = train.v ? railways.length + Array.from(map.trainVehicleTypes.getAll()).indexOf(train.v) : undefined,
            colorIndex = adColorIndex || vehicleColorIndex || railwayIndex,
            instanceID = train.instanceID = me.computeRenderer.addInstance(railwayIndex, colorIndex, train.sectionIndex, train.sectionLength, train.delay);

        me.trains.set(instanceID, train);
        me.needsUpdateInstances = true;
    }

    updateObject(object) {
        if (!object || object.instanceIndex === undefined || object.removing) {
            return;
        }
        if (object.type === 'train') {
            return;
        }

        const me = this,
            {meshIndex, instanceIndex, altitude, type, animationID} = object,
            meshSetArray = [undefined, undefined, me.aircraftMeshSet, me.busMeshSet],
            objectsArray = [undefined, undefined, me.aircraftObjects, me.busObjects],
            meshSet = meshSetArray[meshIndex],
            objects = objectsArray[meshIndex],
            {x, y, z} = me.map.getModelPosition(object.coord, altitude),
            attributes = {
                translation: [x, y, z],
                rotationZ: MathUtils.degToRad(-object.bearing),
                outline: object.outline
            },
            newMeshIndex = altitude < 0 ? 0 : 1;

        if (type === 'train') {
            attributes.rotationX = object.pitch;
            attributes.delay = object.delay;
        } else if (type === 'flight') {
            attributes.rotationX = object.pitch;
        }

        meshSet.setInstanceAttributes(instanceIndex, attributes);

        if (type === 'train' && newMeshIndex !== meshIndex) {
            const newMeshSet = meshSetArray[newMeshIndex],
                newObjects = objectsArray[newMeshIndex],
                opacity = meshSet.getInstanceAttributes(instanceIndex).opacity0 * meshSet.getOpacity();
            let newInstanceIndex;

            if (animationID) {
                animation.stop(animationID);
            }

            newMeshSet.addInstance(meshSet.getInstanceAttributes(instanceIndex));

            object.meshIndex = newMeshIndex;
            object.instanceIndex = newInstanceIndex = newObjects.length;
            newObjects.push(object);

            meshSet.removeInstance(instanceIndex);
            objects.splice(instanceIndex, 1);
            for (let i = instanceIndex; i < objects.length; i++) {
                objects[i].instanceIndex--;
            }

            newMeshSet.setInstanceAttributes(newInstanceIndex, {opacity0: opacity / newMeshSet.getOpacity()});
            object.animationID = animation.start({
                callback: (elapsed, duration) => {
                    newMeshSet.setInstanceAttributes(object.instanceIndex, {opacity0: lerp(opacity / newMeshSet.getOpacity(), 1, elapsed / duration)});
                },
                complete: () => {
                    delete object.animationID;
                },
                duration: configs.fadeDuration
            });
        }
    }

    updateTrain(train, timeOffset, duration, accelerationTime, normalizedAcceleration) {
        const me = this;

        me.computeRenderer.updateInstance(train.instanceID, train.sectionIndex, train.sectionLength, timeOffset, duration, accelerationTime, normalizedAcceleration);
        me.needsUpdateInstances = true;
    }

    getObjectPosition(object) {
        const me = this;

        if (object.type === 'train') {
            return me.computeRenderer.getInstancePosition(object.instanceID);
        }
    }

    removeObject(object) {
        if (!object || object.instanceIndex === undefined || object.removing) {
            return Promise.resolve();
        }
        if (object.type === 'train') {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            const me = this,
                {meshIndex, animationID} = object,
                meshSet = [undefined, undefined, me.aircraftMeshSet, me.busMeshSet][meshIndex],
                objects = [undefined, undefined, me.aircraftObjects, me.busObjects][meshIndex];

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

    removeTrain(train) {
        const me = this,
            instanceID = train.instanceID;

        if (instanceID !== undefined) {
            me.trains.delete(instanceID);
            delete train.instanceID;
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

        if (meshIndex === 0) {
            return me.trains.get(instanceIndex);
        } else {
            const objects = [undefined, undefined, me.aircraftObjects, me.busObjects][meshIndex];

            if (objects) {
                return objects[instanceIndex];
            }
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

    markTrain(train) {
        const me = this,
            instanceID = train ? train.instanceID : -1;

        me.computeRenderer.setMarked(instanceID);
        me.ugCarMeshSet.setMarkedInstanceID(instanceID);
        me.ogCarMeshSet.setMarkedInstanceID(instanceID);
        me.needsUpdateInstances = true;
    }

    trackTrain(train) {
        const me = this,
            instanceID = train ? train.instanceID : -1;

        me.computeRenderer.setTracked(instanceID);
        me.ugCarMeshSet.setTrackedInstanceID(instanceID);
        me.ogCarMeshSet.setTrackedInstanceID(instanceID);
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
