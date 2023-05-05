import animation from '../animation';
import configs from '../configs';
import {colorToRGBArray, lerp} from '../helpers/helpers';
import {hasDarkBackground} from '../helpers/helpers-mapbox';
import {AircraftMeshSet, CarMeshSet} from '../mesh-sets';
import {Point} from 'mapbox-gl';
import {Color, Scene, MathUtils, WebGLRenderTarget, Vector3} from 'three';

const MAX_UG_CARS = 2000;
const MAX_OG_CARS = 4000;
const MAX_AIRCRAFTS = 200;

export default class {

    constructor(options) {
        const me = this;

        me.id = options.id;
        me.type = 'three';
        me.lightColor = 'white';
        me.ugObjects = [];
        me.ogObjects = [];
        me.aircraftObjects = [];
    }

    onAdd(map, context) {
        const me = this,
            {scene} = me.context = context,
            zoom = map.getZoom(),
            cameraZ = map.map.getFreeCameraOptions().position.z,
            modelScale = map.getModelScale();

        me.map = map;

        me.ugCarMeshSet = new CarMeshSet(MAX_UG_CARS, {index: 0, zoom, cameraZ, modelScale, opacity: .225});
        me.ogCarMeshSet = new CarMeshSet(MAX_OG_CARS, {index: 1, zoom, cameraZ, modelScale, opacity: .9});
        me.aircraftMeshSet = new AircraftMeshSet(MAX_AIRCRAFTS, {index: 2, zoom, cameraZ, modelScale, opacity: .9});

        scene.add(me.ugCarMeshSet.getMesh());
        scene.add(me.ogCarMeshSet.getMesh());
        scene.add(me.aircraftMeshSet.getMesh());

        scene.add(me.ugCarMeshSet.getDelayMarkerMesh());
        scene.add(me.ogCarMeshSet.getDelayMarkerMesh());

        scene.add(me.ugCarMeshSet.getOutlineMesh());
        scene.add(me.ogCarMeshSet.getOutlineMesh());
        scene.add(me.aircraftMeshSet.getOutlineMesh());

        me.ugPickingScene = new Scene();
        me.ugPickingScene.background = new Color(0xFFFFFF);
        me.ugPickingScene.add(me.ugCarMeshSet.getPickingMesh());

        me.ogPickingScene = new Scene();
        me.ogPickingScene.background = new Color(0xFFFFFF);
        me.ogPickingScene.add(me.ogCarMeshSet.getPickingMesh());
        me.ogPickingScene.add(me.aircraftMeshSet.getPickingMesh());

        me.pickingTexture = new WebGLRenderTarget(1, 1);
        me.pixelBuffer = new Uint8Array(4);

        map.on('zoom', me.onCameraChanged.bind(me));
        map.on('pitch', me.onCameraChanged.bind(me));
    }

    onCameraChanged() {
        const me = this,
            cameraParams = {
                zoom: me.map.getZoom(),
                cameraZ: me.map.map.getFreeCameraOptions().position.z
            };

        me.ugCarMeshSet.refreshCameraParams(cameraParams);
        me.ogCarMeshSet.refreshCameraParams(cameraParams);
        me.aircraftMeshSet.refreshCameraParams(cameraParams);
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
                me.refreshDelayMarkers(true);
            },
            duration: configs.transitionDuration
        });
    }

    addObject(object) {
        const me = this,
            meshIndex = object.type === 'train' ? object.altitude < 0 ? 0 : 1 : 2,
            meshSet = [me.ugCarMeshSet, me.ogCarMeshSet, me.aircraftMeshSet][meshIndex],
            objects = [me.ugObjects, me.ogObjects, me.aircraftObjects][meshIndex],
            {x, y, z} = me.map.getModelPosition(object.coord, object.altitude),
            color = Array.isArray(object.color) ? object.color : [object.color],
            attributes = {
                translation: [x, y, z],
                rotationX: object.pitch,
                rotationZ: MathUtils.degToRad(-object.bearing),
                opacity0: 0,
                outline: object.outline
            };

        if (object.type === 'train') {
            attributes.delay = object.delay;
            attributes.color0 = colorToRGBArray(color[0]);
            attributes.color1 = colorToRGBArray(color[1] || '#00ff00');
            attributes.color2 = colorToRGBArray(color[2] || '#00ff00');
            attributes.color3 = colorToRGBArray(color[3] || '#00ff00');
        } else {
            attributes.color0 = colorToRGBArray(color[0]);
            attributes.color1 = colorToRGBArray(color[1]);
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
            meshIndex = object.meshIndex,
            meshSet = [me.ugCarMeshSet, me.ogCarMeshSet, me.aircraftMeshSet][meshIndex],
            objects = [me.ugObjects, me.ogObjects, me.aircraftObjects][meshIndex],
            instanceIndex = object.instanceIndex,
            {x, y, z} = me.map.getModelPosition(object.coord, object.altitude),
            attributes = {
                translation: [x, y, z],
                rotationX: object.pitch,
                rotationZ: MathUtils.degToRad(-object.bearing),
                outline: object.outline
            },
            newMeshIndex = object.altitude < 0 ? 0 : 1;

        if (object.type === 'train') {
            attributes.delay = object.delay;
        }

        meshSet.setInstanceAttributes(instanceIndex, attributes);

        if (object.type === 'train' && newMeshIndex !== meshIndex) {
            const newMeshSet = [me.ugCarMeshSet, me.ogCarMeshSet, me.aircraftMeshSet][newMeshIndex],
                newObjects = [me.ugObjects, me.ogObjects, me.aircraftObjects][newMeshIndex],
                opacity = meshSet.getInstanceAttributes(instanceIndex).opacity0 * meshSet.getOpacity();

            if (object.animationID) {
                animation.stop(object.animationID);
            }

            newMeshSet.addInstance(meshSet.getInstanceAttributes(instanceIndex));

            object.meshIndex = newMeshIndex;
            object.instanceIndex = newObjects.length;
            newObjects.push(object);

            meshSet.removeInstance(instanceIndex);
            objects.splice(instanceIndex, 1);
            for (let i = instanceIndex; i < objects.length; i++) {
                objects[i].instanceIndex--;
            }

            newMeshSet.setInstanceAttributes(object.instanceIndex, {opacity0: opacity / newMeshSet.getOpacity()});
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
            meshIndex = object.meshIndex,
            meshSet = [me.ugCarMeshSet, me.ogCarMeshSet, me.aircraftMeshSet][meshIndex],
            objects = [me.ugObjects, me.ogObjects, me.aircraftObjects][meshIndex];

        if (object.animationID) {
            animation.stop(object.animationID);
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
            {context, pickingTexture, pixelBuffer} = me,
            {renderer, camera} = context,
            {drawingBufferWidth, drawingBufferHeight} = renderer.getContext(),
            pixelRatio = window.devicePixelRatio,
            scene = mode === 'underground' ? me.ugPickingScene : me.ogPickingScene;

        camera.setViewOffset(
            drawingBufferWidth,
            drawingBufferHeight,
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

        const meshIndex = pixelBuffer[0],
            instanceIndex = (pixelBuffer[1] << 8) | pixelBuffer[2],
            objects = [me.ugObjects, me.ogObjects, me.aircraftObjects][meshIndex];

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
