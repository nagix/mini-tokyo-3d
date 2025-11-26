import {MercatorCoordinate} from 'mapbox-gl';
import {FullScreenQuad} from 'three/examples/jsm/postprocessing/Pass.js';
import {ClampToEdgeWrapping, DataTexture, FloatType, GLSL3, MathUtils, NearestFilter, RGBAFormat, RGBAIntegerFormat, RGFormat, ShaderMaterial, UnsignedByteType, UnsignedIntType, WebGLRenderTarget} from 'three';
import animation from '../animation';
import configs from '../configs';
import {clamp, colorToRGBArray, lerp} from '../helpers/helpers';
import computeFragmentShader from './compute-fragment.glsl';
import computeVertexShader from './compute-vertex.glsl';

const MAX_EXTRA_COLORS = 50;

export default class {

    constructor(count, features, colors, parameters) {
        const me = this,
            textureWidth = me.textureWidth = parameters.textureWidth,
            textureHeight0 = Math.ceil(count * 2 / textureWidth),
            textureHeight1 = Math.ceil(count * 2 / textureWidth),
            array0 = new Uint32Array(textureWidth * textureHeight0 * 4),
            array1 = new Float32Array(textureWidth * textureHeight1 * 4),
            dtObject0 = me.dtObject0 = new DataTexture(array0, textureWidth, textureHeight0, RGBAIntegerFormat, UnsignedIntType),
            dtObject1 = me.dtObject1 = new DataTexture(array1, textureWidth, textureHeight1, RGBAFormat, FloatType);

        dtObject0.needsUpdate = true;
        dtObject1.needsUpdate = true;

        me.modelOrigin = parameters.modelOrigin;
        me.loadFeatures(features);
        me.loadColors(colors);

        const uniforms = me.uniforms = {
            zoom: {value: 0},
            time: {value: performance.now()},
            timeOffset: {value: 0},
            opacityGround: {value: .9},
            opacityUnderground: {value: .225},
            textureObject0: {value: dtObject0},
            textureObject1: {value: dtObject1},
            textureRoute0: {value: me.dtRoute0},
            textureRoute1: {value: me.dtRoute1},
            textureData0: {value: null},
            textureData1: {value: null}
        };
        const material = me.material = new ShaderMaterial({
            uniforms,
            vertexShader: computeVertexShader,
            fragmentShader: computeFragmentShader,
            defines: {
                textureWidth: `${textureWidth}u`,
                loopCount: me.loopCount,
                fadeDuration: configs.fadeDuration
            },
            glslVersion: GLSL3
        });

        me.quad = new FullScreenQuad(material);

        me.dataVariable = [];
        for (let i = 0; i < 2; i++) {
            me.dataVariable[i] = new WebGLRenderTarget(textureWidth, textureHeight1, {
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

        me.count = count;
        me.marked = -1;
        me.tracked = -1;
        me.currentTextureIndex = 0;
        me.buffer = new Float32Array(textureWidth * textureHeight1 * 4);
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

        return [...currentDataVariable.textures, me.dtColor];
    }

    getInstanceIDs(context) {
        const me = this,
            texture = me.dataVariable[me.currentTextureIndex],
            objectArray0 = me.dtObject0.image.data,
            bufferArray = me.buffer,
            ugCarIDs = {body: [], delayMarker: [], outline: []},
            ogCarIDs = {body: [], delayMarker: [], outline: []},
            aircraftIDs = {body: [], outline: []};

        context.renderer.readRenderTargetPixels(texture, 0, 0, texture.width, texture.height, bufferArray);
        for (let i = 0, ilen = me.count; i < ilen; i++) {
            const offset = i * 8,
                fadeAnimationType = objectArray0[offset + 6];

            if (fadeAnimationType !== 0) {
                const objectType = objectArray0[offset],
                    delay = objectArray0[offset + 7],
                    z = bufferArray[i * 4 + 2],
                    ids = objectType === 0 ? z < 0 ? ugCarIDs : ogCarIDs : aircraftIDs;

                ids.body.push(i);
                if (delay === 1) {
                    ids.delayMarker.push(i);
                }
                if (i === me.marked || i === me.tracked) {
                    ids.outline.push(i);
                }
            }
        }

        // This ensures smooth fade animations
        ugCarIDs.body.sort((a, b) => a % 256 - b % 256);
        ogCarIDs.body.sort((a, b) => a % 256 - b % 256);

        return [ugCarIDs, ogCarIDs, aircraftIDs];
    }

    loadFeatures(features) {
        const me = this,
            textureWidth = me.textureWidth,
            modelOrigin = me.modelOrigin,
            items = [];
        let size0 = 0,
            size1 = 0,
            maxCount = 1;

        for (const feature of features) {
            const properties = feature.properties,
                coords = feature.geometry.coordinates,
                distances = properties.distances,
                sectionOffsets = properties['station-offsets'] || [0, properties.length];

            items.push({coords, distances, sectionOffsets});
            size0 += 1;
            size1 += coords.length * 3 + Math.ceil(sectionOffsets.length / 2);
            maxCount = Math.max(maxCount, coords.length);
        }

        me.loopCount = Math.ceil(Math.log2(maxCount));

        const textureHeight0 = Math.ceil(size0 / textureWidth) || 1,
            textureHeight1 = Math.ceil(size1 / textureWidth) || 1,
            array0 = new Uint32Array(textureWidth * textureHeight0 * 4),
            array1 = new Float32Array(textureWidth * textureHeight1 * 2);
        let offset0 = 0,
            offset1 = 0;

        for (const {coords, distances, sectionOffsets} of items) {
            array0.set([offset1, coords.length, offset1 + coords.length * 3], offset0 * 4);
            offset0 += 1;
            for (let i = 0, ilen = coords.length; i < ilen; i++) {
                const coord = coords[i],
                    mercatorCoord = MercatorCoordinate.fromLngLat(coord, coord[2] || 0),
                    [distance, bearing, , pitch] = distances[i];

                array1.set([
                    distance,
                    mercatorCoord.x - modelOrigin.x,
                    -(mercatorCoord.y - modelOrigin.y),
                    mercatorCoord.z - modelOrigin.z,
                    MathUtils.degToRad(-bearing),
                    pitch
                ], offset1 * 2 + i * 6);
            }
            array1.set(sectionOffsets, offset1 * 2 + coords.length * 6);
            offset1 += Math.ceil(coords.length * 3 + sectionOffsets.length / 2);
        }

        const dtRoute0 = me.dtRoute0 = new DataTexture(array0, textureWidth, textureHeight0, RGBAIntegerFormat, UnsignedIntType),
            dtRoute1 = me.dtRoute1 = new DataTexture(array1, textureWidth, textureHeight1, RGFormat, FloatType);

        dtRoute0.needsUpdate = true;
        dtRoute1.needsUpdate = true;
    }

    loadColors(colors) {
        const me = this,
            textureWidth = me.textureWidth,
            textureHeight = Math.ceil((colors.length + MAX_EXTRA_COLORS) * 4 / textureWidth) || 1,
            array = new Uint8Array(textureWidth * textureHeight * 16);
        let offset = 0;

        me.colorCount = colors.length;

        for (const color of colors) {
            const colors = Array.isArray(color) ? color : [color];

            array.set([
                ...colorToRGBArray(colors[0]), 255,
                ...colorToRGBArray(colors[1] || colors[0]), 255,
                ...colorToRGBArray(colors[2] || colors[0]), 255,
                ...colorToRGBArray(colors[3] || '#00ff00'), 255
            ], offset);
            offset += 16;
        }

        const dtColor = me.dtColor = new DataTexture(array, textureWidth, textureHeight, RGBAFormat, UnsignedByteType);

        dtColor.needsUpdate = true;
    }

    addInstance(objectType, routeIndex, colorIndex, sectionIndex, sectionLength, delay) {
        const me = this,
            array0 = me.dtObject0.image.data,
            array1 = me.dtObject1.image.data;

        for (let i = 0, ilen = me.count; i < ilen; i++) {
            const offset = i * 8,
                fadeAnimationType = array0[offset + 6];

            if (fadeAnimationType === 0) {
                array0.set([
                    objectType,
                    routeIndex,
                    colorIndex,
                    86400000,
                    86400000,
                    performance.now(),
                    1,
                    delay
                ], offset);
                array1.set([
                    sectionIndex,
                    sectionIndex + sectionLength
                ], offset);
                me.dtObject0.needsUpdate = true;
                me.dtObject1.needsUpdate = true;
                return i;
            }
        }
        console.log('Error: exceed the max train count');
    }

    updateInstance(instanceID, sectionIndex, sectionLength, timeOffset, duration, accelerationTime, normalizedAcceleration, decelerationTime, normalizedDeceleration) {
        const me = this,
            array0 = me.dtObject0.image.data,
            array1 = me.dtObject1.image.data,
            offset = instanceID * 8;

        array0.set([
            timeOffset,
            timeOffset + duration
        ], offset + 3);
        array1.set([
            sectionIndex,
            sectionIndex + sectionLength,
            accelerationTime,
            normalizedAcceleration,
            decelerationTime,
            normalizedDeceleration
        ], offset);
        me.dtObject0.needsUpdate = true;
        me.dtObject1.needsUpdate = true;
    }

    removeInstance(instanceID) {
        return new Promise(resolve => {
            const me = this,
                array0 = me.dtObject0.image.data,
                offset = instanceID * 8,
                colorIndex = array0[offset + 2];

            array0.set([performance.now(), 2], offset + 5);
            me.dtObject0.needsUpdate = true;

            animation.start({
                complete: () => {
                    array0.set([0, 0], offset + 6);
                    me.dtObject0.needsUpdate = true;

                    // Clear the extra color if it has
                    if (colorIndex >= me.colorCount) {
                        me.removeColor(colorIndex);
                    }
                    resolve();
                },
                duration: configs.fadeDuration
            });
        });
    }

    getInstancePosition(instanceID) {
        const me = this,
            uniforms = me.uniforms,
            zoom = uniforms.zoom.value,
            timeOffset = uniforms.timeOffset.value,
            objectArray0 = me.dtObject0.image.data,
            objectArray1 = me.dtObject1.image.data,
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
            routeArray0 = me.dtRoute0.image.data,
            routeArray1 = me.dtRoute1.image.data,
            sectionOffset = routeArray0[headerindex * 4 + 2],
            sectionDistance = routeArray1[sectionOffset * 2 + sectionIndex],
            nextSectionDistance = routeArray1[sectionOffset * 2 + nextSectionIndex],
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
            a = (distance - baseDistance) / (nextDistance - baseDistance),
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

    addColor(color) {
        const me = this,
            array = me.dtColor.image.data,
            colors = Array.isArray(color) ? color : [color];

        for (let i = 0; i < MAX_EXTRA_COLORS; i++) {
            const offset = (me.colorCount + i) * 16;

            if (array[offset + 3] === 0) {
                array.set([
                    ...colorToRGBArray(colors[0]), 255,
                    ...colorToRGBArray(colors[1] || colors[0]), 255,
                    ...colorToRGBArray(colors[2] || colors[0]), 255,
                    ...colorToRGBArray(colors[3] || '#00ff00'), 255
                ], offset);
                me.dtColor.needsUpdate = true;
                return me.colorCount + i;
            }
        }
    }

    removeColor(colorIndex) {
        this.dtColor.image.data.fill(0, colorIndex * 16, (colorIndex + 1) * 16);
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

    setMarked(id) {
        this.marked = id;
    }

    setTracked(id) {
        this.tracked = id;
    }

    dispose() {
        const me = this;

        me.dtObject0.dispose();
        me.dtObject1.dispose();
        me.dtRoute0.dispose();
        me.dtRoute1.dispose();
        me.dtColor.dispose();

        me.quad.dispose();
        me.material.dispose();

        for (let i = 0; i < 2; i++) {
            me.dataVariable[i].dispose();
        }
    }

}
