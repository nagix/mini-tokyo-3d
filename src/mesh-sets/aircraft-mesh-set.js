import InstancedGeometry from './instanced-geometry.js';
import {BackSide, BoxGeometry, BufferAttribute, Mesh, MeshLambertMaterial, ShaderMaterial} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const groupIndices = new Float32Array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2
]);

const glslRotateFunctions = `
    mat3 rotateX( float angle ) {
        float s = sin( angle );
        float c = cos( angle );

        return mat3(
            1.0, 0.0, 0.0,
            0.0, c, s,
            0.0, -s, c
        );
    }

    mat3 rotateZ( float angle ) {
        float s = sin( angle );
        float c = cos( angle );

        return mat3(
            c, s, 0.0,
            -s, c, 0.0,
            0.0, 0.0, 1.0
        );
    }
`;

const glslTransformVariables = `
    uniform float zoom;
    uniform float cameraZ;
    uniform float modelScale;
    attribute float groupIndex;
    attribute vec3 translation;
    attribute float rotationX;
    attribute float rotationZ;
    attribute vec3 idColor;
`;

const glslTransform = outline => `
    float scale = 0.06 / 0.285 * modelScale * 100.0;
    float zoom0 = zoom + log2( cameraZ / abs( cameraZ - translation.z ) );
    float scale0 = pow( 2.0, 14.0 - clamp( zoom0, 13.0, 19.0 ) ) * modelScale * 100.0;
    float offsetY = groupIndex == 2.0 ? 0.44 - 1.32 * max( scale / scale0, 1.0 ) : 0.0;
    float offsetZ = groupIndex == 2.0 ? 0.88 : 0.0;
    float scaleX = groupIndex == 1.0 ? max( scale0, scale ) : scale0;
    float scaleY = groupIndex == 0.0 ? max( scale0, scale ) : scale0;
    vec3 position0 = ( position + vec3( 0.0, offsetY, offsetZ ) ) * vec3( scaleX, scaleY, scale0 );
    position0 = position0 * ( 1.0 + idColor.b * 0.03 );
    ${outline ? 'position0 = position0 + 0.1 * scale0 * sign( position );' : ''}
    vec3 transformed = rotateZ( rotationZ ) * rotateX( rotationX ) * position0 + translation + vec3( 0.0, 0.0, .44 * scale0 );
`;

export default class {

    constructor(count, parameters) {
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

        boxGeometries.map(x => x.dispose());
        mergedGeometry.dispose();

        const uniforms = me.uniforms = {
            zoom: {type: 'f', value: parameters.zoom},
            cameraZ: {type: 'f', value: parameters.cameraZ},
            modelScale: {type: 'f', value: parameters.modelScale}
        };

        const material = me.material = new MeshLambertMaterial({
            opacity: parameters.opacity,
            transparent: true
        });

        material.onBeforeCompile = shader => {
            const shaderUniforms = shader.uniforms;

            shaderUniforms.zoom = uniforms.zoom;
            shaderUniforms.cameraZ = uniforms.cameraZ;
            shaderUniforms.modelScale = uniforms.modelScale;

            shader.vertexShader = [`
                attribute vec3 color0;
                attribute vec3 color1;
                attribute float opacity0;
                varying vec3 vTriangleColor;
                varying float vInstanceOpacity;
                ${glslTransformVariables}

                ${glslRotateFunctions}

            `, shader.vertexShader.replace(
                '#include <begin_vertex>',
                glslTransform()
            ).replace(
                '#include <beginnormal_vertex>',
                'vec3 objectNormal = rotateZ( rotationZ ) * rotateX( rotationX ) * vec3( normal );'
            ).replace('#include <color_vertex>', `
                #include <color_vertex>

                vTriangleColor = groupIndex < 2.0 ? color0 : color1;
                vInstanceOpacity = opacity0;
            `)].join('');

            shader.fragmentShader = [`
                varying vec3 vTriangleColor;
                varying float vInstanceOpacity;
            `, shader.fragmentShader.replace(
                'vec4 diffuseColor = vec4( diffuse, opacity );',
                'vec4 diffuseColor = vec4( vTriangleColor, vInstanceOpacity * opacity );'
            )].join('');
        };

        const mesh = me.mesh = new Mesh(geometry, material);

        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;

        const pickingMaterial = me.pickingMaterial = new ShaderMaterial({
            uniforms: {
                zoom: uniforms.zoom,
                cameraZ: uniforms.cameraZ,
                modelScale: uniforms.modelScale
            },
            vertexShader: `
                varying vec3 vIdColor;
                ${glslTransformVariables}

                ${glslRotateFunctions}

                void main( void ) {
                    ${glslTransform()}
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
                    vIdColor = idColor;
                }
            `,
            fragmentShader: `
                varying vec3 vIdColor;

                void main( void ) {
                    gl_FragColor = vec4( vIdColor, 1.0 );
                }
            `
        });

        const pickingMesh = me.pickingMesh = new Mesh(geometry, pickingMaterial);

        pickingMesh.updateMatrix();
        pickingMesh.matrixAutoUpdate = false;
        pickingMesh.frustumCulled = false;

        const outlineMaterial = me.outlineMaterial = new ShaderMaterial({
            uniforms: {
                zoom: uniforms.zoom,
                cameraZ: uniforms.cameraZ,
                modelScale: uniforms.modelScale
            },
            vertexShader: `
                attribute float outline;
                varying float vInstanceOpacity;
                ${glslTransformVariables}

                ${glslRotateFunctions}

                void main( void ) {
                    ${glslTransform(true)}
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, outline > 0.0 ? 1.0 : 0.0 );
                    vInstanceOpacity = outline;
                }
            `,
            fragmentShader: `
                varying float vInstanceOpacity;

                void main( void ) {
                    gl_FragColor = vec4( 1.0, 1.0, 1.0, vInstanceOpacity );
                }
            `,
            side: BackSide,
            transparent: true
        });

        const outlineMesh = me.outlineMesh = new Mesh(geometry, outlineMaterial);

        outlineMesh.updateMatrix();
        outlineMesh.matrixAutoUpdate = false;
        outlineMesh.frustumCulled = false;
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

    addInstance(attributes) {
        this.geometry.addInstance(attributes);
    }

    removeInstance(index) {
        this.geometry.removeInstance(index);
    }

    setInstanceAttributes(index, attributes) {
        this.geometry.setInstanceAttributes(index, attributes);
    }

    getInstanceAttributes(index) {
        return this.geometry.getInstanceAttributes(index);
    }

    setOpacity(opacity) {
        this.material.opacity = opacity;
    }

    getOpacity() {
        return this.material.opacity;
    }

    refreshCameraParams(params) {
        const uniforms = this.uniforms;

        uniforms.zoom.value = params.zoom;
        uniforms.cameraZ.value = params.cameraZ;
    }

    dispose() {
        const me = this;

        me.geometry.dispose();
        me.material.dispose();
        me.pickingMaterial.dispose();
        me.outlineMaterial.dispose();
    }

}
