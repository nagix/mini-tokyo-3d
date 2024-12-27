import MeshSet from './mesh-set.js';
import InstancedGeometry from './instanced-geometry.js';
import {BackSide, BoxGeometry, Mesh, MeshLambertMaterial, ShaderMaterial} from 'three';
import {updateVertexShader, updateFragmentShader, pickingVertexShader, pickingFragmentShader, outlineVertexShader, outlineFragmentShader, define} from './shaders.js';

export default class extends MeshSet {

    constructor(count, parameters) {
        super(parameters);

        const me = this;

        const boxGeometry = new BoxGeometry(.6, 1.2, .6);

        const geometry = me.geometry = new InstancedGeometry(boxGeometry, count, parameters.index, {
            translation: {type: Float32Array, itemSize: 3},
            rotationZ: {type: Float32Array, itemSize: 1},
            opacity0: {type: Float32Array, itemSize: 1},
            outline: {type: Float32Array, itemSize: 1},
            color: {type: Uint8Array, itemSize: 3, normalized: true}
        });

        boxGeometry.dispose();

        const material = me.material = new MeshLambertMaterial({
            opacity: parameters.opacity,
            transparent: true
        });

        material.onBeforeCompile = shader => {
            shader.uniforms = Object.assign(shader.uniforms, me.getUniforms());
            shader.vertexShader = define('BUS', updateVertexShader(shader.vertexShader));
            shader.fragmentShader = updateFragmentShader(shader.fragmentShader);
        };

        const mesh = me.mesh = new Mesh(geometry, material);

        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;

        const pickingMaterial = me.pickingMaterial = new ShaderMaterial({
            uniforms: me.getUniforms(),
            vertexShader: define('BUS', pickingVertexShader),
            fragmentShader: pickingFragmentShader
        });

        const pickingMesh = me.pickingMesh = new Mesh(geometry, pickingMaterial);

        pickingMesh.updateMatrix();
        pickingMesh.matrixAutoUpdate = false;
        pickingMesh.frustumCulled = false;

        const outlineMaterial = me.outlineMaterial = new ShaderMaterial({
            uniforms: me.getUniforms(),
            vertexShader: define('BUS', outlineVertexShader),
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
