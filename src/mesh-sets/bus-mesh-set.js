import MeshSet from './mesh-set.js';
import {BackSide, BoxGeometry, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, InstancedInterleavedBuffer, InterleavedBufferAttribute, Mesh, MeshLambertMaterial, ShaderMaterial} from 'three';
import {updateVertexShader, updateFragmentShader, pickingVertexShader, pickingFragmentShader, outlineVertexShader, outlineFragmentShader, define} from './shaders.js';

class InstancedGeometry extends InstancedBufferGeometry {

    constructor(geometry, count, index, attributes) {
        super();

        const me = this,
            {attributes: geometryAttributes, index: geometryIndex} = geometry,
            userData = me.userData,
            userDataAttributes = userData.attributes = {},
            userDataBuffers = userData.buffers = [];

        me.instanceCount = 0;

        for (const key of Object.keys(geometryAttributes)) {
            me.attributes[key] = geometryAttributes[key].clone();
        }
        if (geometryIndex) {
            me.index = geometryIndex.clone();
        }

        const idColors = new Uint8Array(count * 3),
            idColorBuffer = new InstancedBufferAttribute(idColors, 3, true);
        for (let i = 0; i < count; i++) {
            idColors.set([index & 255, (i >> 8) & 255, i & 255], i * 3);
        }
        me.setAttribute('idColor', idColorBuffer);

        const items = {};
        for (const key of Object.keys(attributes)) {
            const attribute = attributes[key];

            if (attribute instanceof InterleavedBufferAttribute) {
                me.setAttribute(key, attribute);
            } else {
                const {type, itemSize, normalized} = attributes[key],
                    item = items[type] = items[type] || {type, size: 0, keys: []};

                userDataAttributes[key] = {itemSize, offset: item.size, normalized};
                item.size += itemSize;
                item.keys.push(key);
            }
        }

        for (const key of Object.keys(items)) {
            const {type: TypedArray, size, keys} = items[key],
                array = new TypedArray(count * size),
                buffer = new InstancedInterleavedBuffer(array, size).setUsage(DynamicDrawUsage);

            for (const key of keys) {
                const attribute = userDataAttributes[key],
                    {itemSize, offset, normalized} = attribute;

                me.setAttribute(key, new InterleavedBufferAttribute(buffer, itemSize, offset, normalized));
                attribute.buffer = buffer;
            }
            userDataBuffers.push(buffer);
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
                attribute = attributes[key],
                start = index * buffer.stride + offset;

            if (isNaN(attribute)) {
                buffer.set(attribute, start);
            } else {
                buffer.array[start] = attribute;
            }
            buffer.needsUpdate = true;
        }
    }

    getInstanceAttributes(index) {
        const me = this,
            userDataAttributes = me.userData.attributes,
            attributes = {};

        for (const key of Object.keys(userDataAttributes)) {
            const {itemSize, offset, buffer} = userDataAttributes[key],
                array = buffer.array,
                start = index * buffer.stride + offset;

            attributes[key] = itemSize > 1 ?
                array.subarray(start, start + itemSize) :
                array[start];
        }
        return attributes;
    }

}

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
