import MeshSet from './mesh-set.js';
import InstancedGeometry from './instanced-geometry.js';
import {AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, Mesh, MeshLambertMaterial, MultiplyBlending, ShaderMaterial, SphereGeometry} from 'three';
import {updateVertexShader, updateFragmentShader, pickingVertexShader, pickingFragmentShader, delayMarkerVertexShader, delayMarkerFragmentShader, outlineVertexShader, outlineFragmentShader, define} from './shaders.js';

const groupIndices = new Float32Array(
    [].concat(...[0, 1, 2, 2, 1, 0, 5, 4, 3, 3, 4, 5, 0, 3].map(x => Array(6).fill(x)))
);

export default class extends MeshSet {

    constructor(count, parameters) {
        super(parameters);

        const me = this,
            {index, opacity, dark} = parameters;

        const boxGeometry = new BoxGeometry(.88, 1.76, .88, 1, 1, 3);
        const nonIndexedGeometry = boxGeometry.toNonIndexed();

        nonIndexedGeometry.setAttribute('groupIndex', new BufferAttribute(groupIndices, 1));

        const geometry = me.geometry = new InstancedGeometry(nonIndexedGeometry, count, index, {
            translation: {type: Float32Array, itemSize: 3},
            rotationX: {type: Float32Array, itemSize: 1},
            rotationZ: {type: Float32Array, itemSize: 1},
            opacity0: {type: Float32Array, itemSize: 1},
            delay: {type: Float32Array, itemSize: 1},
            outline: {type: Float32Array, itemSize: 1},
            color0: {type: Uint8Array, itemSize: 3, normalized: true},
            color1: {type: Uint8Array, itemSize: 3, normalized: true},
            color2: {type: Uint8Array, itemSize: 3, normalized: true},
            color3: {type: Uint8Array, itemSize: 3, normalized: true}
        });

        boxGeometry.dispose();
        nonIndexedGeometry.dispose();

        Object.assign(me.uniforms, {
            opacity: {type: 'f', value: opacity},
            base: {type: 'f', value: dark ? 0 : 1}
        });

        const material = me.material = new MeshLambertMaterial({
            opacity,
            transparent: true
        });

        material.onBeforeCompile = shader => {
            shader.uniforms = Object.assign(shader.uniforms, me.getUniforms());
            shader.vertexShader = define('CAR', updateVertexShader(shader.vertexShader));
            shader.fragmentShader = updateFragmentShader(shader.fragmentShader);
        };

        const mesh = me.mesh = new Mesh(geometry, material);

        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;

        const pickingMaterial = me.pickingMaterial = new ShaderMaterial({
            uniforms: me.getUniforms(),
            vertexShader: define('CAR', pickingVertexShader),
            fragmentShader: pickingFragmentShader
        });

        const pickingMesh = me.pickingMesh = new Mesh(geometry, pickingMaterial);

        pickingMesh.updateMatrix();
        pickingMesh.matrixAutoUpdate = false;
        pickingMesh.frustumCulled = false;

        const sphereGeometry = new SphereGeometry(1.8, 32, 32);

        const delayMarkerGeometry = me.delayMarkerGeometry = new InstancedGeometry(sphereGeometry, count, index, {
            translation: geometry.getAttribute('translation'),
            opacity0: geometry.getAttribute('opacity0'),
            delay: geometry.getAttribute('delay')
        });

        sphereGeometry.dispose();

        const delayMarkerMaterial = me.delayMarkerMaterial = new ShaderMaterial({
            uniforms: me.getUniforms(true),
            vertexShader: define('CAR', delayMarkerVertexShader),
            fragmentShader: delayMarkerFragmentShader,
            blending: dark ? AdditiveBlending : MultiplyBlending,
            depthWrite: false
        });

        const delayMarkerMesh = me.delayMarkerMesh = new Mesh(delayMarkerGeometry, delayMarkerMaterial);

        delayMarkerMesh.updateMatrix();
        delayMarkerMesh.matrixAutoUpdate = false;
        delayMarkerMesh.frustumCulled = false;

        const outlineMaterial = me.outlineMaterial = new ShaderMaterial({
            uniforms: me.getUniforms(),
            vertexShader: define('CAR', outlineVertexShader),
            fragmentShader: outlineFragmentShader,
            transparent: true,
            side: BackSide
        });

        const outlineMesh = me.outlineMesh = new Mesh(geometry, outlineMaterial);

        outlineMesh.updateMatrix();
        outlineMesh.matrixAutoUpdate = false;
        outlineMesh.frustumCulled = false;
    }

    getUniforms(extras) {
        return extras ? Object.assign({}, this.uniforms) : super.getUniforms();
    }

    getDelayMarkerMesh() {
        return this.delayMarkerMesh;
    }

    addInstance(attributes) {
        super.addInstance(attributes);
        this.delayMarkerGeometry.addInstance();
    }

    removeInstance(index) {
        super.removeInstance(index);
        this.delayMarkerGeometry.removeInstance(index);
    }

    setOpacity(opacity) {
        super.setOpacity(opacity);
        this.uniforms.opacity.value = this.delayMarkerMaterial.opacity = opacity;
    }

    refreshDelayMarkerMesh(dark) {
        this.uniforms.base.value = dark ? 0 : 1;
        this.delayMarkerMaterial.blending = dark ? AdditiveBlending : MultiplyBlending;
    }

    dispose() {
        const me = this;

        me.geometry.dispose();
        me.material.dispose();
        me.pickingMaterial.dispose();
        me.delayMarkerGeometry.dispose();
        me.delayMarkerMaterial.dispose();
        me.outlineMaterial.dispose();
    }

}
