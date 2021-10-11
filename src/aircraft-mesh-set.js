import InstancedGeometry from './instanced-geometry.js';
import {BackSide, BoxGeometry, BufferAttribute, Mesh, MeshLambertMaterial, ShaderMaterial} from 'three';
import {mergeBufferGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
    uniform float scale;
    attribute float groupIndex;
    attribute vec3 translation;
    attribute float rotationX;
    attribute float rotationZ;
    attribute float scale0;
    attribute vec3 idColor;
`;

const glslTransform = outline => `
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

        const geometries = [
            new BoxGeometry(.88, 2.64, .88),
            new BoxGeometry(2.64, .88, .1),
            new BoxGeometry(.1, .88, .88)
        ];
        const geometry = mergeBufferGeometries(geometries);

        geometry.setAttribute('groupIndex', new BufferAttribute(groupIndices, 1));

        me.geometry = new InstancedGeometry(geometry, count, parameters.index, {
            translation: {type: Float32Array, itemSize: 3},
            rotationX: {type: Float32Array, itemSize: 1},
            rotationZ: {type: Float32Array, itemSize: 1},
            opacity0: {type: Float32Array, itemSize: 1},
            outline: {type: Float32Array, itemSize: 1},
            scale0: {type: Float32Array, itemSize: 1},
            color0: {type: Uint8Array, itemSize: 3, normalized: true},
            color1: {type: Uint8Array, itemSize: 3, normalized: true}
        });

        geometries.map(x => x.dispose());
        geometry.dispose();

        me.uniforms = {
            scale: {type: 'f', value: parameters.scale}
        };

        me.material = new MeshLambertMaterial({
            opacity: parameters.opacity,
            transparent: true
        });
        me.material.onBeforeCompile = shader => {
            shader.uniforms.scale = me.uniforms.scale;

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

        me.mesh = new Mesh(me.geometry, me.material);
        me.mesh.updateMatrix();
        me.mesh.matrixAutoUpdate = false;
        me.mesh.frustumCulled = false;

        me.pickingMaterial = new ShaderMaterial({
            uniforms: {
                scale: me.uniforms.scale
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

        me.pickingMesh = new Mesh(me.geometry, me.pickingMaterial);
        me.pickingMesh.updateMatrix();
        me.pickingMesh.matrixAutoUpdate = false;
        me.pickingMesh.frustumCulled = false;

        me.outlineMaterial = new ShaderMaterial({
            uniforms: {
                scale: me.uniforms.scale
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

        me.outlineMesh = new Mesh(me.geometry, me.outlineMaterial);
        me.outlineMesh.updateMatrix();
        me.outlineMesh.matrixAutoUpdate = false;
        me.outlineMesh.frustumCulled = false;
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

    dispose() {
        const me = this;

        me.geometry.dispose();
        me.material.dispose();
        me.pickingMaterial.dispose();
        me.outlineMaterial.dispose();
    }

}
