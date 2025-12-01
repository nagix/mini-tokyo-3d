import {colorToRGBArray} from '../helpers/helpers';
import LinearDataTexture from './linear-data-texture';

export default class {

    constructor(parameters) {
        const me = this,
            chunkSize = parameters.chunkSize;

        me.texture = new LinearDataTexture(0, 'ubyte4', chunkSize);
        me.groups = new Map();
        me.groupCount = 0;
        me.freeIndices = [];
        me.lookup = new Map();
    }

    addGroup(data) {
        const me = this,
            {freeIndices, lookup} = me,
            ids = [],
            items = [],
            offset = me.texture.size / 4;
        let count = 0;

        for (const {id, color} of data) {
            let index;

            if (freeIndices.length > 0) {
                index = freeIndices.pop();
            } else {
                index = offset + count;
                count += 1;
            }
            ids.push(id);
            lookup.set(id, {index});
            items.push({index, color});
        }

        me.groups.set(me.groupCount, {ids});

        const texture = new LinearDataTexture(me.texture, count * 4);

        me.texture.dispose();
        me.texture = texture;

        const array = texture.image.data;

        for (const {index, color} of items) {
            const colors = Array.isArray(color) ? color : [color];

            array.set([
                ...colorToRGBArray(colors[0]), 255,
                ...colorToRGBArray(colors[1] || colors[0]), 255,
                ...colorToRGBArray(colors[2] || colors[0]), 255,
                ...colorToRGBArray(colors[3] || '#00ff00'), 255
            ], index * 16);
        }

        texture.needsUpdate = true;

        return me.groupCount++;
    }

    removeGroup(groupIndex) {
        const me = this,
            {groups, freeIndices, lookup} = me,
            ids = groups.get(groupIndex).ids;

        groups.delete(groupIndex);

        for (const id of ids) {
            freeIndices.push(lookup.get(id).index);
            lookup.delete(id);
        }
    }

    getIndex(id) {
        return this.lookup.get(id).index;
    }

    dispose() {
        this.texture.dispose();
    }

}
