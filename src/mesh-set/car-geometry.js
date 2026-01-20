import {BufferGeometry, BufferAttribute, Vector3} from 'three';

export default class extends BufferGeometry {

    constructor(width = 1, height = 1, depth = 1) {
        super();

        const me = this,
            indices = [],
            vertices = [],
            normals = [],
            uvs = [],
            groups = [];
        let numberOfVertices = 0;

        buildPlane('z', 'y', 'x', -1, -1, depth, height, width, 3, 1, [0, 1, 2]);
        buildPlane('z', 'y', 'x', 1, -1, depth, height, -width, 3, 1, [2, 1, 0]);
        buildPlane('x', 'z', 'y', 1, 1, width, depth, height, 1, 3, [5, 4, 3]);
        buildPlane('x', 'z', 'y', 1, -1, width, depth, -height, 1, 3, [3, 4, 5]);
        buildPlane('x', 'y', 'z', 1, -1, width, height, depth, 1, 1, [0]);
        buildPlane('x', 'y', 'z', -1, -1, width, height, -depth, 1, 1, [3]);

        me.setIndex(indices);
        me.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
        me.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
        me.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
        me.setAttribute('groupIndex', new BufferAttribute(new Float32Array(groups), 1));

        function buildPlane(u, v, w, udir, vdir, width, height, depth, gridX, gridY, groupIndices) {
            const segmentWidth = width / gridX,
                segmentHeight = height / gridY,
                widthHalf = width / 2,
                heightHalf = height / 2,
                depthHalf = depth / 2,
                vector = new Vector3();
            let groupCount = 0;

            for (let iy = 0; iy < gridY; iy++) {
                for (let ix = 0; ix < gridX; ix++) {
                    for (let i = 0; i < 4; i++) {
                        const x = ix + Math.floor(i / 2),
                            y = iy + Math.floor((i + 1) / 2) % 2;

                        vector[u] = (x * segmentWidth - widthHalf) * udir;
                        vector[v] = (y * segmentHeight - heightHalf) * vdir;
                        vector[w] = depthHalf;
                        vertices.push(vector.x, vector.y, vector.z);

                        vector[u] = 0;
                        vector[v] = 0;
                        vector[w] = depth > 0 ? 1 : -1;
                        normals.push(vector.x, vector.y, vector.z);

                        uvs.push(x / gridX, 1 - y / gridY);

                        groups.push(groupIndices[groupCount]);
                    }

                    indices.push(numberOfVertices, numberOfVertices + 1, numberOfVertices + 3);
                    indices.push(numberOfVertices + 1, numberOfVertices + 2, numberOfVertices + 3);

                    groupCount += 1;
                    numberOfVertices += 4;
                }
            }
        }
    }

}
