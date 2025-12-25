import {BackSide, Mesh, MeshLambertMaterial, ShaderMaterial} from 'three';
import AircraftGeometry from './aircraft-geometry.js';
import InstancedGeometry from './instanced-geometry.js';
import MeshSet from './mesh-set.js';
import {updateVertexShader, updateFragmentShader} from './shaders.js';
import outlineFragmentShader from './outline-fragment.glsl';
import outlineVertexShader from './outline-vertex.glsl';
import pickingFragmentShader from './picking-fragment.glsl';
import pickingVertexShader from './picking-vertex.glsl';

export default class extends MeshSet {

    constructor(count, parameters) {
        super(parameters);

        const me = this;

        const aircraftGeometry = new AircraftGeometry(.88, 2.64, .88, .1);
        const geometry = me.geometry = new InstancedGeometry(aircraftGeometry, count);

        Object.assign(me.uniforms, {
            textureData0: {value: null},
            textureData1: {value: null},
            textureColor: {value: null}
        });

        const material = me.material = new MeshLambertMaterial({
            transparent: true
        });

        material.onBeforeCompile = shader => {
            Object.assign(shader.uniforms, me.getUniforms());
            shader.vertexShader = updateVertexShader(shader.vertexShader);
            shader.fragmentShader = updateFragmentShader(shader.fragmentShader);
            shader.defines = {AIRCRAFT: true};
        };

        const mesh = me.mesh = new Mesh(geometry, material);

        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;

        const pickingMaterial = me.pickingMaterial = new ShaderMaterial({
            uniforms: me.getUniforms(),
            vertexShader: pickingVertexShader,
            fragmentShader: pickingFragmentShader,
            defines: {AIRCRAFT: true}
        });

        const pickingMesh = me.pickingMesh = new Mesh(geometry, pickingMaterial);

        pickingMesh.updateMatrix();
        pickingMesh.matrixAutoUpdate = false;
        pickingMesh.frustumCulled = false;

        const outlineGeometry = me.outlineGeometry = new InstancedGeometry(aircraftGeometry, 2);

        aircraftGeometry.dispose();

        const outlineMaterial = me.outlineMaterial = new ShaderMaterial({
            uniforms: {
                ...me.getUniforms(),
                marked: {value: -1},
                tracked: {value: -1},
                intensity: {value: 0}
            },
            vertexShader: outlineVertexShader,
            fragmentShader: outlineFragmentShader,
            defines: {AIRCRAFT: true},
            transparent: true,
            side: BackSide
        });

        const outlineMesh = me.outlineMesh = new Mesh(outlineGeometry, outlineMaterial);

        outlineMesh.updateMatrix();
        outlineMesh.matrixAutoUpdate = false;
        outlineMesh.frustumCulled = false;
    }

    setTextures(textures) {
        const me = this,
            uniforms = me.uniforms,
            p = performance.now() % 1500 / 1500 * 2.0;

        uniforms.textureData0.value = textures[0];
        uniforms.textureData1.value = textures[1];
        uniforms.textureColor.value = textures[2];

        me.outlineMaterial.uniforms.intensity.value = p < 1 ? p : 2 - p;
    }

    setInstanceIDs(ids) {
        const me = this;

        me.geometry.setInstanceIDs(ids.body);
        me.outlineGeometry.setInstanceIDs(ids.outline);
    }

    setMarkedInstanceID(id) {
        this.outlineMaterial.uniforms.marked.value = id;
    }

    setTrackedInstanceID(id) {
        this.outlineMaterial.uniforms.tracked.value = id;
    }

    getUniforms() {
        return this.uniforms;
    }

    dispose() {
        const me = this;

        me.geometry.dispose();
        me.material.dispose();
        me.pickingMaterial.dispose();
        me.outlineGeometry.dispose();
        me.outlineMaterial.dispose();
    }

}
