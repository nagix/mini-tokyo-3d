import {AdditiveBlending, BackSide, BoxGeometry, Mesh, MeshLambertMaterial, MultiplyBlending, ShaderMaterial, SphereGeometry} from 'three';
import AircraftGeometry from './aircraft-geometry.js';
import CarGeometry from './car-geometry.js';
import InstancedGeometry from './instanced-geometry.js';
import commonVertexShaderChunk from './common-vertex.glsl';
import colorVertexShaderChunk from './color-vertex.glsl';
import beginnormalVertexShaderChunk from './beginnormal-vertex.glsl';
import beginVertexShaderChunk from './begin-vertex.glsl';
import commonFragmentShaderChunk from './common-fragment.glsl';
import diffuseColorFragmentShaderChunk from './diffuse-color-fragment.glsl';
import outlineFragmentShader from './outline-fragment.glsl';
import outlineVertexShader from './outline-vertex.glsl';
import pickingFragmentShader from './picking-fragment.glsl';
import pickingVertexShader from './picking-vertex.glsl';
import delayMarkerFragmentShader from './delay-marker-fragment.glsl';
import delayMarkerVertexShader from './delay-marker-vertex.glsl';

export default class {

    constructor(type, count, parameters) {
        const me = this;

        const baseGeometry =
            type === 'CAR' ? new CarGeometry(.88, 1.76, .88) :
            type === 'AIRCRAFT' ? new AircraftGeometry(.88, 2.64, .88, .1) :
            new BoxGeometry(.6, 1.2, .6);
        const baseOutlineGeometry =
            type === 'CAR' ? new BoxGeometry(.88, 1.76, .88) : undefined;

        const uniforms = me.uniforms = {
            zoom: {value: parameters.zoom},
            cameraZ: {value: parameters.cameraZ},
            modelScale: {value: parameters.modelScale},
            textureData0: {value: null},
            textureData1: {value: null},
            textureColor: {value: null}
        };

        const geometry = me.geometry = new InstancedGeometry(baseGeometry, count);
        const material = me.material = new MeshLambertMaterial({
            transparent: true
        });

        material.onBeforeCompile = shader => {
            Object.assign(shader.uniforms, uniforms);
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', commonVertexShaderChunk)
                .replace('#include <color_vertex>', colorVertexShaderChunk)
                .replace('#include <beginnormal_vertex>', beginnormalVertexShaderChunk)
                .replace('#include <begin_vertex>', beginVertexShaderChunk);
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', commonFragmentShaderChunk)
                .replace('vec4 diffuseColor = vec4( diffuse, opacity );', diffuseColorFragmentShaderChunk);
            shader.defines = {[type]: true};
        };
        material.customProgramCacheKey = () => type;

        const mesh = me.mesh = new Mesh(geometry, material);

        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;

        const pickingMaterial = me.pickingMaterial = new ShaderMaterial({
            uniforms,
            vertexShader: pickingVertexShader,
            fragmentShader: pickingFragmentShader,
            defines: {[type]: true}
        });

        const pickingMesh = me.pickingMesh = new Mesh(geometry, pickingMaterial);

        pickingMesh.updateMatrix();
        pickingMesh.matrixAutoUpdate = false;
        pickingMesh.frustumCulled = false;

        const outlineGeometry = me.outlineGeometry = new InstancedGeometry(baseOutlineGeometry || baseGeometry, 2);
        const outlineMaterial = me.outlineMaterial = new ShaderMaterial({
            uniforms: {
                ...uniforms,
                marked: {value: -1},
                tracked: {value: -1},
                intensity: {value: 0}
            },
            vertexShader: outlineVertexShader,
            fragmentShader: outlineFragmentShader,
            defines: {[type]: true},
            transparent: true,
            side: BackSide
        });

        const outlineMesh = me.outlineMesh = new Mesh(outlineGeometry, outlineMaterial);

        outlineMesh.updateMatrix();
        outlineMesh.matrixAutoUpdate = false;
        outlineMesh.frustumCulled = false;

        baseGeometry.dispose();
        if (baseOutlineGeometry) {
            baseOutlineGeometry.dispose();
        }

        if (type === 'CAR') {
            const sphereGeometry = new SphereGeometry(1.8, 32, 32);
            const delayMarkerGeometry = me.delayMarkerGeometry = new InstancedGeometry(sphereGeometry, count);
            const delayMarkerMaterial = me.delayMarkerMaterial = new ShaderMaterial({
                uniforms: {
                    ...uniforms,
                    base: {value: 1}
                },
                vertexShader: delayMarkerVertexShader,
                fragmentShader: delayMarkerFragmentShader,
                blending: MultiplyBlending,
                depthWrite: false
            });

            const delayMarkerMesh = me.delayMarkerMesh = new Mesh(delayMarkerGeometry, delayMarkerMaterial);

            delayMarkerMesh.updateMatrix();
            delayMarkerMesh.matrixAutoUpdate = false;
            delayMarkerMesh.frustumCulled = false;

            sphereGeometry.dispose();
        }

    }

    getMesh() {
        return this.mesh;
    }

    getPickingMesh() {
        return this.pickingMesh;
    }

    getOutlineMesh() {
        return this.outlineMesh;
    }

    getDelayMarkerMesh() {
        return this.delayMarkerMesh;
    }

    refreshCameraParams(params) {
        const uniforms = this.uniforms;

        uniforms.zoom.value = params.zoom;
        uniforms.cameraZ.value = params.cameraZ;
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
        const me = this,
            delayMarkerGeometry = me.delayMarkerGeometry;

        me.geometry.setInstanceIDs(ids.body);
        me.outlineGeometry.setInstanceIDs(ids.outline);
        if (delayMarkerGeometry) {
            delayMarkerGeometry.setInstanceIDs(ids.delayMarker);
        }
    }

    setMarkedInstanceID(id) {
        this.outlineMaterial.uniforms.marked.value = id;
    }

    setTrackedInstanceID(id) {
        this.outlineMaterial.uniforms.tracked.value = id;
    }

    refreshDelayMarkerMesh(dark) {
        const {delayMarkerMaterial, delayMarkerMesh} = this;

        if (delayMarkerMaterial) {
            delayMarkerMaterial.uniforms.base.value = dark ? 0 : 1;
        }
        if (delayMarkerMesh) {
            delayMarkerMesh.material.blending = dark ? AdditiveBlending : MultiplyBlending;
        }
    }

    dispose() {
        const me = this,
            {delayMarkerGeometry, delayMarkerMaterial} = me;

        me.geometry.dispose();
        me.material.dispose();
        me.pickingMaterial.dispose();
        me.outlineGeometry.dispose();
        me.outlineMaterial.dispose();
        if (delayMarkerGeometry) {
            delayMarkerGeometry.dispose();
        }
        if (delayMarkerMaterial) {
            delayMarkerMaterial.dispose();
        }
    }

}
