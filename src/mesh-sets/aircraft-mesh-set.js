import MeshSet from './mesh-set.js';
import InstancedGeometry from './instanced-geometry.js';
import {BackSide, BoxGeometry, BufferAttribute, Mesh, MeshLambertMaterial, ShaderMaterial} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {updateVertexShader, updateFragmentShader, pickingVertexShader, pickingFragmentShader, outlineVertexShader, outlineFragmentShader, define} from './shaders.js';

const groupIndices = new Float32Array(
    [].concat(...[0, 1, 2].map(x => Array(24).fill(x)))
);

export default class extends MeshSet {

    constructor(count, parameters) {
        super(parameters);

        const me = this;

        const boxGeometries = [
            new BoxGeometry(.88, 2.64, .88),
            new BoxGeometry(2.64, .88, .1),
            new BoxGeometry(.1, .88, .88)
        ];
        const mergedGeometry = mergeGeometries(boxGeometries);

        mergedGeometry.setAttribute('groupIndex', new BufferAttribute(groupIndices, 1));

        const geometry = me.geometry = new InstancedGeometry(mergedGeometry, count, parameters.index, {
            translation: {type: Float32Array, itemSize: 3},
            rotationX: {type: Float32Array, itemSize: 1},
            rotationZ: {type: Float32Array, itemSize: 1},
            opacity0: {type: Float32Array, itemSize: 1},
            outline: {type: Float32Array, itemSize: 1},
            color0: {type: Uint8Array, itemSize: 3, normalized: true},
            color1: {type: Uint8Array, itemSize: 3, normalized: true}
        });

        boxGeometries.forEach(x => x.dispose());
        mergedGeometry.dispose();

        const material = me.material = new MeshLambertMaterial({
            opacity: parameters.opacity,
            transparent: true
        });

        material.onBeforeCompile = shader => {
            shader.uniforms = Object.assign(shader.uniforms, me.getUniforms());
            shader.vertexShader = define('AIRCRAFT', updateVertexShader(shader.vertexShader));
            shader.fragmentShader = updateFragmentShader(shader.fragmentShader);
        };

        const mesh = me.mesh = new Mesh(geometry, material);

        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;

        const pickingMaterial = me.pickingMaterial = new ShaderMaterial({
            uniforms: me.getUniforms(),
            vertexShader: define('AIRCRAFT', pickingVertexShader),
            fragmentShader: pickingFragmentShader
        });

        const pickingMesh = me.pickingMesh = new Mesh(geometry, pickingMaterial);

        pickingMesh.updateMatrix();
        pickingMesh.matrixAutoUpdate = false;
        pickingMesh.frustumCulled = false;

        const outlineMaterial = me.outlineMaterial = new ShaderMaterial({
            uniforms: me.getUniforms(),
            vertexShader: define('AIRCRAFT', outlineVertexShader),
            fragmentShader: outlineFragmentShader,
            transparent: true,
            side: BackSide
        });

        const outlineMesh = me.outlineMesh = new Mesh(geometry, outlineMaterial);

        outlineMesh.updateMatrix();
        outlineMesh.matrixAutoUpdate = false;
        outlineMesh.frustumCulled = false;
    }

    dispose() {
        const me = this;

        me.geometry.dispose();
        me.material.dispose();
        me.pickingMaterial.dispose();
        me.outlineMaterial.dispose();
    }

}
