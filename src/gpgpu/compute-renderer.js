import {MercatorCoordinate} from 'mapbox-gl';
import {FullScreenQuad} from 'three/examples/jsm/postprocessing/Pass.js';
import {ClampToEdgeWrapping, FloatType, GLSL3, MathUtils, NearestFilter, RGBAFormat, ShaderMaterial, WebGLRenderTarget} from 'three';
import configs from '../configs';
import {clamp, lerp} from '../helpers/helpers';
import computeFragmentShader from './compute-fragment.glsl';
import computeVertexShader from './compute-vertex.glsl';
import ObjectData from './object-data';
import RouteData from './route-data';
import ColorData from './color-data';

export default class {

    constructor(count, parameters) {
        const me = this,
            chunkSize = parameters.chunkSize,
            chunkCount = Math.ceil(count / chunkSize),
            dtObject = me.dtObject = new ObjectData(count, parameters),
            dtRoute = me.dtRoute = new RouteData(parameters);

        me.dtColor = new ColorData(parameters);
        me.modelOrigin = parameters.modelOrigin;
        me.loopCount = 0;

        const uniforms = me.uniforms = {
            zoom: {value: 0},
            time: {value: performance.now()},
            timeOffset: {value: 0},
            opacityGround: {value: .9},
            opacityUnderground: {value: .225},
            textureObject0: {value: dtObject.uintTexture},
            textureObject1: {value: dtObject.floatTexture},
            textureRoute0: {value: dtRoute.uintTexture},
            textureRoute1: {value: dtRoute.floatTexture},
            textureData0: {value: null},
            textureData1: {value: null}
        };
        const material = me.material = new ShaderMaterial({
            uniforms,
            vertexShader: computeVertexShader,
            fragmentShader: computeFragmentShader,
            defines: {
                chunkSize: `${chunkSize}u`,
                loopCount: me.loopCount,
                fadeDuration: configs.fadeDuration
            },
            glslVersion: GLSL3
        });

        me.quad = new FullScreenQuad(material);

        me.dataVariable = [];
        for (let i = 0; i < 2; i++) {
            me.dataVariable[i] = new WebGLRenderTarget(chunkSize, chunkCount, {
                wrapS: ClampToEdgeWrapping,
                wrapT: ClampToEdgeWrapping,
                minFilter: NearestFilter,
                magFilter: NearestFilter,
                format: RGBAFormat,
                type: FloatType,
                depthBuffer: false,
                count: 2
            });
        }

        me.marked = -1;
        me.tracked = -1;
        me.currentTextureIndex = 0;
        me.buffer = new Float32Array(chunkSize * chunkCount * 4);
    }

    compute(context, zoom) {
        const me = this,
            {dataVariable, currentTextureIndex: previousTextureIndex} = me,
            currentTextureIndex = me.currentTextureIndex = previousTextureIndex === 0 ? 1 : 0,
            previousDataVariable = dataVariable[previousTextureIndex],
            currentDataVariable = dataVariable[currentTextureIndex],
            uniforms = me.uniforms,
            renderer = context.renderer;

        uniforms.zoom.value = zoom;
        uniforms.time.value = performance.now();
        uniforms.textureData0.value = previousDataVariable.textures[0];
        uniforms.textureData1.value = previousDataVariable.textures[1];

        const currentRenderTarget = renderer.getRenderTarget();
        const currentXrEnabled = renderer.xr.enabled;
        const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

        renderer.resetState();

        renderer.xr.enabled = false; // Avoid camera modification
        renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows
        renderer.setRenderTarget(currentDataVariable);
        me.quad.render(renderer);
        renderer.xr.enabled = currentXrEnabled;
        renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
        renderer.setRenderTarget(currentRenderTarget);

        renderer.resetState();

        return [...currentDataVariable.textures, me.dtColor.texture];
    }

    addRouteGroup(data) {
        const me = this,
            {dtRoute, uniforms, material} = me,
            groupIndex = dtRoute.addGroup(data);

        uniforms.textureRoute0.value = dtRoute.uintTexture;
        uniforms.textureRoute1.value = dtRoute.floatTexture;
        material.defines.loopCount = me.loopCount = dtRoute.loopCount;
        material.needsUpdate = true;

        return groupIndex;
    }

    removeRouteGroup(groupIndex) {
        const me = this,
            dtRoute = me.dtRoute;

        dtRoute.removeGroup(groupIndex);
        me.uniforms.textureRoute1.value = dtRoute.floatTexture;
    }

    getRouteIndex(id) {
        return this.dtRoute.getIndex(id);
    }

    addColorGroup(data) {
        return this.dtColor.addGroup(data);
    }

    removeColorGroup(groupIndex) {
        this.dtColor.removeGroup(groupIndex);
    }

    getColorIndex(id) {
        return this.dtColor.getIndex(id);
    }

    addInstance(objectType, routeIndex, colorIndex, sectionIndex, nextSectionIndex, delay) {
        return this.dtObject.add(objectType, routeIndex, colorIndex, sectionIndex, nextSectionIndex, delay);
    }

    updateInstance(instanceID, sectionIndex, nextSectionIndex, timeOffset, duration, accelerationTime, normalizedAcceleration, decelerationTime, normalizedDeceleration) {
        this.dtObject.update(instanceID, sectionIndex, nextSectionIndex, timeOffset, duration, accelerationTime, normalizedAcceleration, decelerationTime, normalizedDeceleration);
    }

    removeInstance(instanceID) {
        return this.dtObject.remove(instanceID);
    }

    setMarked(id) {
        this.dtObject.setMarked(id);
    }

    setTracked(id) {
        this.dtObject.setTracked(id);
    }

    getInstanceIDs(context) {
        const me = this,
            texture = me.dataVariable[me.currentTextureIndex],
            buffer = me.buffer;

        context.renderer.readRenderTargetPixels(texture, 0, 0, texture.width, texture.height, buffer);
        return me.dtObject.getIDs(buffer);
    }

    getInstancePosition(instanceID) {
        const me = this,
            uniforms = me.uniforms,
            zoom = uniforms.zoom.value,
            timeOffset = uniforms.timeOffset.value,
            objectArray0 = me.dtObject.uintTexture.image.data,
            objectArray1 = me.dtObject.floatTexture.image.data,
            objectType = objectArray0[instanceID * 8],
            routeID = objectArray0[instanceID * 8 + 1],
            startTime = objectArray0[instanceID * 8 + 3],
            endTime = objectArray0[instanceID * 8 + 4],
            sectionIndex = objectArray1[instanceID * 8],
            nextSectionIndex = objectArray1[instanceID * 8 + 1],
            accelerationTime = objectArray1[instanceID * 8 + 2],
            acceleration = objectArray1[instanceID * 8 + 3],
            decelerationTime = objectArray1[instanceID * 8 + 4],
            deceleration = objectArray1[instanceID * 8 + 5],
            routeSubID = objectType === 0 ? zoom - 13 : 0,
            headerindex = routeID + routeSubID,
            routeArray0 = me.dtRoute.uintTexture.image.data,
            routeArray1 = me.dtRoute.floatTexture.image.data,
            sectionOffset = routeArray0[headerindex * 4 + 2],
            sectionDistance = objectType === 2 ? sectionIndex : routeArray1[sectionOffset * 2 + sectionIndex],
            nextSectionDistance = objectType === 2 ? nextSectionIndex : routeArray1[sectionOffset * 2 + nextSectionIndex],
            elapsed = clamp(timeOffset - startTime, 0, endTime - startTime),
            left = clamp(endTime - timeOffset, 0, endTime - startTime);
        let t;

        if (elapsed < accelerationTime) {
            t = acceleration / 2 * elapsed * elapsed;
        } else if (left < decelerationTime) {
            t = 1 - deceleration / 2 * left * left;
        } else {
            t = Math.max(acceleration * accelerationTime, deceleration * decelerationTime) * (elapsed - accelerationTime / 2);
        }

        const distance = lerp(sectionDistance, nextSectionDistance, t),
            routeOffset = routeArray0[headerindex * 4];
        let start = 0,
            end = routeArray0[headerindex * 4 + 1] - 1,
            center;

        for (let i = 0; i < me.loopCount; i++) {
            if (start === end - 1) {
                break;
            }
            center = Math.floor((start + end) / 2);
            if (distance < routeArray1[(routeOffset + center * 3) * 2]) {
                end = center;
            } else {
                start = center;
            }
        }

        const nodeOffset = routeOffset + start * 3,
            baseDistance = routeArray1[nodeOffset * 2],
            currentX = routeArray1[nodeOffset * 2 + 1],
            currentY = routeArray1[nodeOffset * 2 + 2],
            currentZ = routeArray1[nodeOffset * 2 + 3],
            rotateZ = routeArray1[nodeOffset * 2 + 4],
            nextDistance = routeArray1[nodeOffset * 2 + 6],
            nextX = routeArray1[nodeOffset * 2 + 7],
            nextY = routeArray1[nodeOffset * 2 + 8],
            nextZ = routeArray1[nodeOffset * 2 + 9],
            a = nextDistance !== baseDistance ? (distance - baseDistance) / (nextDistance - baseDistance) : 0,
            x = lerp(currentX, nextX, a),
            y = lerp(currentY, nextY, a),
            z = lerp(currentZ, nextZ, a),
            modelOrigin = me.modelOrigin,
            coord = new MercatorCoordinate(
                modelOrigin.x + x,
                modelOrigin.y - y,
                modelOrigin.z + z
            ),
            bearing = MathUtils.radToDeg(-rotateZ);

        return {
            coord: coord.toLngLat(),
            altitude: coord.toAltitude(),
            bearing: bearing + (sectionIndex < nextSectionIndex ? 0 : 180),
            _t: t
        };
    }

    setOpacity(opacity) {
        const uniforms = this.uniforms;

        uniforms.opacityGround.value = opacity.ground;
        uniforms.opacityUnderground.value = opacity.underground;
    }

    getOpacity() {
        const uniforms = this.uniforms;

        return {
            ground: uniforms.opacityGround.value,
            underground: uniforms.opacityUnderground.value
        };
    }

    setTimeOffset(timeOffset) {
        this.uniforms.timeOffset.value = timeOffset;
    }

    dispose() {
        const me = this;

        me.dtObject.dispose();
        me.dtRoute.dispose();
        me.dtColor.dispose();

        me.quad.dispose();
        me.material.dispose();

        for (let i = 0; i < 2; i++) {
            me.dataVariable[i].dispose();
        }
    }

}
