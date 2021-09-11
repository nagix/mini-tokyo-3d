import AircraftMeshSet from './aircraft-mesh-set';
import animation from './animation';
import CarMeshSet from './car-mesh-set';
import configs from './configs';
import {clamp, colorToRGBArray, lerp} from './helpers';
import {isDarkBackground} from './helpers-mapbox';
import ThreeLayer from './three-layer';
import {Color, Scene, MathUtils, WebGLRenderTarget} from 'three';

const MAX_UG_CARS = 2000;
const MAX_OG_CARS = 4000;
const MAX_AIRCRAFTS = 200;

export default class extends ThreeLayer {

    constructor(options) {
        super(options.id, true, true);

        this.ugObjects = [];
        this.ogObjects = [];
        this.aircraftObjects = [];
    }

    onAdd(map, gl) {
        const me = this;

        super.onAdd(map, gl);

        me.ugCarMeshSet = new CarMeshSet(MAX_UG_CARS, {index: 0, scale: me.modelScale * 100, opacity: .225});
        me.ogCarMeshSet = new CarMeshSet(MAX_OG_CARS, {index: 1, scale: me.modelScale * 100, opacity: .9});
        me.aircraftMeshSet = new AircraftMeshSet(MAX_AIRCRAFTS, {index: 2, scale: .06 / .285 * me.modelScale * 100, opacity: .9});

        me.scene.add(me.ugCarMeshSet.getMesh());
        me.scene.add(me.ogCarMeshSet.getMesh());
        me.scene.add(me.aircraftMeshSet.getMesh());

        me.scene.add(me.ugCarMeshSet.getDelayMarkerMesh());
        me.scene.add(me.ogCarMeshSet.getDelayMarkerMesh());

        me.scene.add(me.ugCarMeshSet.getOutlineMesh());
        me.scene.add(me.ogCarMeshSet.getOutlineMesh());
        me.scene.add(me.aircraftMeshSet.getOutlineMesh());

        me.ugPickingScene = new Scene();
        me.ugPickingScene.background = new Color(0xFFFFFF);
        me.ugPickingScene.add(me.ugCarMeshSet.getPickingMesh());

        me.ogPickingScene = new Scene();
        me.ogPickingScene.background = new Color(0xFFFFFF);
        me.ogPickingScene.add(me.ogCarMeshSet.getPickingMesh());
        me.ogPickingScene.add(me.aircraftMeshSet.getPickingMesh());

        me.pickingTexture = new WebGLRenderTarget(1, 1);
        me.pixelBuffer = new Uint8Array(4);

        map.on('zoom', me.onZoom.bind(me));
        map.on('pitch', me.onPitch.bind(me));
    }

    onZoom() {
        const me = this,
            zoom = me.map.getZoom(),
            unit = Math.pow(2, 14 - clamp(zoom, 13, 19)),
            scale = unit * me.modelScale * 100;

        me.ugCarMeshSet.setScale(scale);
        me.ogCarMeshSet.setScale(scale);

        me.onPitch();
    }

    onPitch() {
        const me = this;

        for (const object of me.aircraftObjects) {
            me.updateObject(object);
        }
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

    getAircraftScale(object) {
        const me = this,
            objectZ = me.getModelPosition(object.coord, object.altitude).z,
            cameraZ = me.map.getFreeCameraOptions().position.z,
            zoom = me.map.getZoom() + Math.log2(cameraZ / Math.abs(cameraZ - objectZ)),
            unit = Math.pow(2, 14 - clamp(zoom, 13, 19));

        return unit * me.modelScale * 100;
    }

    addObject(object) {
        const me = this,
            meshIndex = object.type === 'train' ? object.altitude < 0 ? 0 : 1 : 2,
            meshSet = [me.ugCarMeshSet, me.ogCarMeshSet, me.aircraftMeshSet][meshIndex],
            objects = [me.ugObjects, me.ogObjects, me.aircraftObjects][meshIndex],
            {x, y, z} = me.getModelPosition(object.coord, object.altitude),
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
            attributes.scale0 = me.getAircraftScale(object);
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
            {x, y, z} = me.getModelPosition(object.coord, object.altitude),
            attributes = {
                translation: [x, y, z],
                rotationX: object.pitch,
                rotationZ: MathUtils.degToRad(-object.bearing),
                outline: object.outline
            },
            newMeshIndex = object.altitude < 0 ? 0 : 1;

        if (object.type === 'train') {
            attributes.delay = object.delay;
        } else {
            attributes.scale0 = me.getAircraftScale(object);
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
            context = me.renderer.getContext(),
            pixelRatio = window.devicePixelRatio,
            scene = mode === 'underground' ? me.ugPickingScene : me.ogPickingScene;

        me.camera.setViewOffset(
            context.drawingBufferWidth,
            context.drawingBufferHeight,
            point.x * pixelRatio | 0,
            point.y * pixelRatio | 0,
            1,
            1
        );

        me.renderer.resetState();
        me.renderer.setRenderTarget(me.pickingTexture);
        me.renderer.render(scene, me.camera);
        me.renderer.setRenderTarget(null);

        me.camera.clearViewOffset();

        me.renderer.readRenderTargetPixels(me.pickingTexture, 0, 0, 1, 1, me.pixelBuffer);

        const meshIndex = me.pixelBuffer[0];
        const instanceIndex = (me.pixelBuffer[1] << 8) | me.pixelBuffer[2];
        const objects = [me.ugObjects, me.ogObjects, me.aircraftObjects][meshIndex];

        if (objects) {
            return objects[instanceIndex];
        }
    }

    refreshDelayMarkers(actual) {
        const me = this,
            dark = isDarkBackground(me.map, actual);

        me.ugCarMeshSet.refreshDelayMarkerMesh(dark);
        me.ogCarMeshSet.refreshDelayMarkerMesh(dark);
    }

}
