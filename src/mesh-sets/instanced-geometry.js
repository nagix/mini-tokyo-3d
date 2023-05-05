import {DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, InstancedInterleavedBuffer, InterleavedBufferAttribute} from 'three';

export default class extends InstancedBufferGeometry {

    constructor(geometry, count, index, attributes) {
        super();

        const me = this;

        me.instanceCount = 0;

        for (const key of Object.keys(geometry.attributes)) {
            me.attributes[key] = geometry.attributes[key].clone();
        }
        if (geometry.index) {
            me.index = geometry.index.clone();
        }

        const idColors = new Uint8Array(count * 3),
            idColorBuffer = new InstancedBufferAttribute(idColors, 3, true);
        for (let i = 0; i < count; i++) {
            idColors.set([index & 255, (i >> 8) & 255, i & 255], i * 3);
        }
        me.setAttribute('idColor', idColorBuffer);

        me.userData.attributes = {};
        me.userData.buffers = [];

        const items = {};
        for (const key of Object.keys(attributes)) {
            const attribute = attributes[key];

            if (attribute instanceof InterleavedBufferAttribute) {
                me.setAttribute(key, attribute);
            } else {
                const {type, itemSize, normalized} = attributes[key],
                    item = items[type] = items[type] || {type, size: 0, keys: []};

                me.userData.attributes[key] = {itemSize, offset: item.size, normalized};
                item.size += itemSize;
                item.keys.push(key);
            }
        }

        for (const key of Object.keys(items)) {
            const {type: TypedArray, size, keys} = items[key],
                array = new TypedArray(count * size),
                buffer = new InstancedInterleavedBuffer(array, size).setUsage(DynamicDrawUsage);

            for (const key of keys) {
                const attribute = me.userData.attributes[key],
                    {itemSize, offset, normalized} = attribute;

                me.setAttribute(key, new InterleavedBufferAttribute(buffer, itemSize, offset, normalized));
                attribute.buffer = buffer;
            }
            me.userData.buffers.push(buffer);
        }
    }

    addInstance(attributes = {}) {
        const me = this;

        me.setInstanceAttributes(me.instanceCount++, attributes);
    }

    removeInstance(index) {
        const me = this,
            count = me.instanceCount;

        for (const buffer of me.userData.buffers) {
            const stride = buffer.stride;

            buffer.set(buffer.array.subarray((index + 1) * stride, count * stride), index * stride);
            buffer.needsUpdate = true;
        }

        me.instanceCount--;
    }

    setInstanceAttributes(index, attributes) {
        const me = this;

        for (const key of Object.keys(attributes)) {
            const {offset, buffer} = me.userData.attributes[key],
                start = index * buffer.stride + offset;

            if (isNaN(attributes[key])) {
                buffer.set(attributes[key], start);
            } else {
                buffer.array[start] = attributes[key];
            }
            buffer.needsUpdate = true;
        }
    }

    getInstanceAttributes(index) {
        const me = this,
            attributes = {};

        for (const key of Object.keys(me.userData.attributes)) {
            const {itemSize, offset, buffer} = me.userData.attributes[key],
                start = index * buffer.stride + offset;

            attributes[key] = itemSize > 1 ?
                buffer.array.subarray(start, start + itemSize) :
                buffer.array[start];
        }
        return attributes;
    }

}
