import animation from '../animation';
import configs from '../configs';
import {colorToRGBArray, lerp} from '../helpers/helpers';
import {hasDarkBackground} from '../helpers/helpers-mapbox';
import {AircraftMeshSet, BusMeshSet, CarMeshSet} from '../mesh-sets';
import {Point} from 'mapbox-gl';
import {Color, Scene, MathUtils, WebGLRenderTarget, Vector3} from 'three';

const MAX_UG_CARS = 2000;
const MAX_OG_CARS = 4000;
const MAX_AIRCRAFTS = 200;
const MAX_BUSES = 4000;

export default class {

    constructor(options) {
        const me = this;

        me.id = options.id;
        me.type = 'three';
        me.lightColor = 'white';
        me.ugObjects = [];
        me.ogObjects = [];
        me.aircraftObjects = [];
        me.busObjects = [];
    }

    onAdd(map, context) {
        const me = this,
            scene = context.scene,
            zoom = map.getZoom(),
            cameraZ = map.map.getFreeCameraOptions().position.z,
            modelScale = map.getModelScale();

        me.map = map;
        me.context = context;

        const ugCarMeshSet = me.ugCarMeshSet = new CarMeshSet(MAX_UG_CARS, {index: 0, zoom, cameraZ, modelScale, opacity: .225});
        const ogCarMeshSet = me.ogCarMeshSet = new CarMeshSet(MAX_OG_CARS, {index: 1, zoom, cameraZ, modelScale, opacity: .9});
        const aircraftMeshSet = me.aircraftMeshSet = new AircraftMeshSet(MAX_AIRCRAFTS, {index: 2, zoom, cameraZ, modelScale, opacity: .9});
        const busMeshSet = me.busMeshSet = new BusMeshSet(MAX_BUSES, {index: 3, zoom, cameraZ, modelScale, opacity: .9});

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

        map.on('zoom', me.onCameraChanged.bind(me));
        map.on('pitch', me.onCameraChanged.bind(me));
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
            currentUgOpacity = me.ugCarMeshSet.getOpacity(),
            currentOgOpacity = me.ogCarMeshSet.getOpacity();
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
                me.ugCarMeshSet.setOpacity(lerp(currentUgOpacity, ugOpacity, elapsed / duration));
                me.ogCarMeshSet.setOpacity(lerp(currentOgOpacity, ogOpacity, elapsed / duration));
                me.aircraftMeshSet.setOpacity(lerp(currentOgOpacity, ogOpacity, elapsed / duration));
                me.busMeshSet.setOpacity(lerp(currentOgOpacity, ogOpacity, elapsed / duration));
                me.refreshDelayMarkers(true);
            },
            duration: configs.transitionDuration
        });
    }

    addObject(object) {
        const me = this,
            {type, altitude} = object,
            meshIndex = type === 'train' ? altitude < 0 ? 0 : 1 : type === 'flight' ? 2 : 3,
            meshSet = [me.ugCarMeshSet, me.ogCarMeshSet, me.aircraftMeshSet, me.busMeshSet][meshIndex],
            objects = [me.ugObjects, me.ogObjects, me.aircraftObjects, me.busObjects][meshIndex],
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

    updateObject(object) {
        if (!object || object.instanceIndex === undefined) {
            return;
        }

        const me = this,
            {meshIndex, instanceIndex, altitude, type, animationID} = object,
            meshSetArray = [me.ugCarMeshSet, me.ogCarMeshSet, me.aircraftMeshSet, me.busMeshSet],
            objectsArray = [me.ugObjects, me.ogObjects, me.aircraftObjects, me.busObjects],
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

    removeObject(object) {
        if (!object || object.instanceIndex === undefined) {
            return;
        }

        const me = this,
            {meshIndex, animationID} = object,
            meshSet = [me.ugCarMeshSet, me.ogCarMeshSet, me.aircraftMeshSet, me.busMeshSet][meshIndex],
            objects = [me.ugObjects, me.ogObjects, me.aircraftObjects, me.busObjects][meshIndex];

        if (animationID) {
            animation.stop(animationID);
        }

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
                objects.splice(instanceIndex, 1);
                for (let i = instanceIndex; i < objects.length; i++) {
                    objects[i].instanceIndex--;
                }
            },
            duration: configs.fadeDuration
        });

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
            instanceIndex = (pixelBuffer[1] << 8) | pixelBuffer[2],
            objects = [me.ugObjects, me.ogObjects, me.aircraftObjects, me.busObjects][meshIndex];

        if (objects) {
            return objects[instanceIndex];
        }
    }

    refreshDelayMarkers(actual) {
        const me = this,
            dark = hasDarkBackground(me.map.map, actual);

        me.ugCarMeshSet.refreshDelayMarkerMesh(dark);
        me.ogCarMeshSet.refreshDelayMarkerMesh(dark);
    }

    project(lnglat, altitude) {
        const {map, context} = this,
            {width, height} = map.map.transform,
            {x, y, z} = map.getModelPosition(lnglat, altitude),
            {x: px, y: py} = new Vector3(x, y, z).project(context.camera);

        return new Point((px + 1) / 2 * width, (1 - py) / 2 * height);
    }

}
