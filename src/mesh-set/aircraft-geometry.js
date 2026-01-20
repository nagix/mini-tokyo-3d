import {BoxGeometry, BufferAttribute, BufferGeometry} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const groupIndices = new Float32Array(
    [].concat(...[0, 1, 2].map(x => Array(24).fill(x)))
);

export default class extends BufferGeometry {

    constructor(width = 1, height = 1, depth = 1, thickness = .1) {
        super();

        const me = this;

        const geometries = [
            new BoxGeometry(width, height, depth),
            new BoxGeometry(height, width, thickness),
            new BoxGeometry(thickness, width, depth)
        ];
        const mergedGeometry = mergeGeometries(geometries);

        me.copy(mergedGeometry);
        me.setAttribute('groupIndex', new BufferAttribute(groupIndices, 1));

        geometries.forEach(geometry => geometry.dispose());
        mergedGeometry.dispose();
    }

}
