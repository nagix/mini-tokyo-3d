import {DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry} from 'three';

export default class extends InstancedBufferGeometry {

    constructor(geometry, count) {
        super();

        const me = this,
            attribute = new InstancedBufferAttribute(new Int32Array(count), 1).setUsage(DynamicDrawUsage);

        me.instanceCount = 0;
        for (const key of Object.keys(geometry.attributes)) {
            me.attributes[key] = geometry.attributes[key].clone();
        }
        me.index = geometry.index.clone();

        me.setAttribute('instanceID', attribute);
    }

    setInstanceIDs(ids) {
        const me = this,
            attribute = me.getAttribute('instanceID'),
            count = ids.length;

        attribute.array.set(ids);
        attribute.addUpdateRange(0, count);
        attribute.needsUpdate = true;
        me.instanceCount = count;
    }

}
