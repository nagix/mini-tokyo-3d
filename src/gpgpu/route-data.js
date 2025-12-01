import {MercatorCoordinate} from 'mapbox-gl';
import {MathUtils} from 'three';
import LinearDataTexture from './linear-data-texture';

export default class {

    constructor(parameters) {
        const me = this,
            chunkSize = parameters.chunkSize;

        me.modelOrigin = parameters.modelOrigin;
        me.uintTexture = new LinearDataTexture(0, 'uint4', chunkSize);
        me.floatTexture = new LinearDataTexture(0, 'float2', chunkSize);
        me.groups = new Map();
        me.groupCount = 0;
        me.freeIndices = [];
        me.freeBundledIndices = [];
        me.lookup = new Map();
        me.loopCount = 0;
    }

    addGroup(data) {
        const me = this,
            {modelOrigin, lookup} = me,
            ids = [],
            items = [],
            uintTextureOffset = me.uintTexture.size;
        let uintTextureSize = 0,
            floatTextureOffset = me.floatTexture.size,
            floatTextureSize = 0,
            maxCount = 1;

        for (const {id, feature: features} of data) {
            const bundled = Array.isArray(features),
                freeIndices = bundled ? me.freeBundledIndices : me.freeIndices;
            let index;

            if (freeIndices.length > 0) {
                index = freeIndices.pop();
            } else {
                index = uintTextureOffset + uintTextureSize;
                uintTextureSize += bundled ? features.length : 1;
            }
            ids.push(id);
            lookup.set(id, {index, bundled});
            for (const feature of bundled ? features : [features]) {
                const properties = feature.properties,
                    coords = feature.geometry.coordinates,
                    distances = properties.distances,
                    sectionOffsets = properties['station-offsets'] || [0, properties.length];

                items.push({index, coords, distances, sectionOffsets});
                index += 1;
                floatTextureSize += coords.length * 3 + Math.ceil(sectionOffsets.length / 2);
                maxCount = Math.max(maxCount, coords.length);
            }
        }

        me.groups.set(me.groupCount, {
            ids,
            floatTextureOffset,
            floatTextureSize
        });

        me.loopCount = Math.max(me.loopCount, Math.ceil(Math.log2(maxCount)));

        const uintTexture = new LinearDataTexture(me.uintTexture, uintTextureSize),
            floatTexture = new LinearDataTexture(me.floatTexture, floatTextureSize);

        me.uintTexture.dispose();
        me.floatTexture.dispose();
        me.uintTexture = uintTexture;
        me.floatTexture = floatTexture;

        const uintArray = uintTexture.image.data,
            floatArray = floatTexture.image.data;

        for (const {index, coords, distances, sectionOffsets} of items) {
            uintArray.set([
                floatTextureOffset,
                coords.length,
                floatTextureOffset + coords.length * 3
            ], index * 4);

            for (let i = 0, ilen = coords.length; i < ilen; i++) {
                const coord = coords[i],
                    mercatorCoord = MercatorCoordinate.fromLngLat(coord, coord[2] || 0),
                    [distance, bearing, , pitch] = distances[i];

                floatArray.set([
                    distance,
                    mercatorCoord.x - modelOrigin.x,
                    -(mercatorCoord.y - modelOrigin.y),
                    mercatorCoord.z - modelOrigin.z,
                    MathUtils.degToRad(-bearing),
                    pitch
                ], floatTextureOffset * 2 + i * 6);
            }
            floatArray.set(sectionOffsets, floatTextureOffset * 2 + coords.length * 6);
            floatTextureOffset += Math.ceil(coords.length * 3 + sectionOffsets.length / 2);
        }

        uintTexture.needsUpdate = true;
        floatTexture.needsUpdate = true;

        return me.groupCount++;
    }

    removeGroup(groupIndex) {
        const me = this,
            {uintTexture, groups, lookup} = me,
            {ids, floatTextureOffset, floatTextureSize} = groups.get(groupIndex),
            uintArray = uintTexture.image.data;

        groups.delete(groupIndex);

        for (const item of groups.values()) {
            if (item.floatTextureOffset >= floatTextureOffset + floatTextureSize) {
                item.floatTextureOffset -= floatTextureSize;
            }
        }

        for (const id of ids) {
            const {index, bundled} = lookup.get(id),
                freeIndices = bundled ? me.freeBundledIndices : me.freeIndices;

            freeIndices.push(index);
            lookup.delete(id);
        }

        const floatTexture = new LinearDataTexture(me.floatTexture, floatTextureOffset, floatTextureSize);

        me.floatTexture.dispose();
        me.floatTexture = floatTexture;

        for (let i = 0, ilen = uintTexture.size; i < ilen; i++) {
            const offset = i * 4;

            if (uintArray[offset] >= floatTextureOffset + floatTextureSize) {
                uintArray[offset] -= floatTextureSize;
            }
            if (uintArray[offset + 2] >= floatTextureOffset + floatTextureSize) {
                uintArray[offset + 2] -= floatTextureSize;
            }
        }

        uintTexture.needsUpdate = true;
        floatTexture.needsUpdate = true;
    }

    getIndex(id) {
        return this.lookup.get(id).index;
    }

    dispose() {
        const me = this;

        me.uintTexture.dispose();
        me.floatTexture.dispose();
    }

}
