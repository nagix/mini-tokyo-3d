import InstancedGeometry from './instanced-geometry.js';
import {AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, Mesh, MeshLambertMaterial, MultiplyBlending, ShaderMaterial, SphereGeometry} from 'three';

const groupIndices = new Float32Array([
    0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
    5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3,
    3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5,
    0, 0, 0, 0, 0, 0,
    3, 3, 3, 3, 3, 3
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
    attribute vec3 translation;
    attribute float rotationX;
    attribute float rotationZ;
    attribute vec3 idColor;
`;

const glslTransform = outline => `
    vec3 position0 = position * ( scale * ( 1.0 + idColor.b * 0.03 ) );
    ${outline ? 'position0 = position0 + 0.1 * scale * sign( position );' : ''}
    vec3 transformed = rotateZ( rotationZ ) * rotateX( rotationX ) * position0 + translation + vec3( 0.0, 0.0, .44 * scale );
`;

export default class {

    constructor(count, parameters) {
        const me = this;

        const boxGeometry = new BoxGeometry(.88, 1.76, .88, 1, 1, 3);
        const nonIndexedGeometry = boxGeometry.toNonIndexed();

        nonIndexedGeometry.setAttribute('groupIndex', new BufferAttribute(groupIndices, 1));

        me.geometry = new InstancedGeometry(nonIndexedGeometry, count, parameters.index, {
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

        me.uniforms = {
            scale: {type: 'f', value: parameters.scale},
            base: {type: 'f', value: parameters.dark ? 0 : 1}
        };

        me.material = new MeshLambertMaterial({
            opacity: parameters.opacity,
            transparent: true
        });
        me.material.onBeforeCompile = shader => {
            shader.uniforms.scale = me.uniforms.scale;

            shader.vertexShader = [`
                attribute float groupIndex;
                attribute vec3 color0;
                attribute vec3 color1;
                attribute vec3 color2;
                attribute vec3 color3;
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
            ).replace(
                '#include <color_vertex>', `
                #include <color_vertex>

                float mod3 = mod( groupIndex, 3.0 );
                vec3 null = vec3( 0.0, 1.0, 0.0 );
                vTriangleColor = mod3 == 1.0 && color1 != null ? color1 : color0;
                vTriangleColor = mod3 == 2.0 && color2 != null ? color2 : vTriangleColor;
                vTriangleColor = groupIndex >= 3.0 && color3 != null ? color3 : vTriangleColor;
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

        const sphereGeometry = new SphereGeometry(1.8, 32, 32);

        me.delayMarkerGeometry = new InstancedGeometry(sphereGeometry, count, parameters.index, {
            translation: me.geometry.getAttribute('translation'),
            opacity0: me.geometry.getAttribute('opacity0'),
            delay: me.geometry.getAttribute('delay')
        });

        sphereGeometry.dispose();

        me.delayMarkerMaterial = new ShaderMaterial({
            uniforms: {
                scale: me.uniforms.scale,
                opacity: {
                    type: 'f',
                    get value() {
                        return me.material.opacity;
                    }
                },
                base: me.uniforms.base
            },
            vertexShader: `
                uniform float scale;
                uniform float opacity;
                attribute vec3 translation;
                attribute float opacity0;
                attribute float delay;
                varying float vIntensity;

                void main( void ) {
                    vec3 transformed = position * scale + translation + vec3( 0.0, 0.0, .44 * scale );
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, delay );
                    vec3 vNormal = normalize( normalMatrix * normal );
                    vec3 vNormel = normalize( vec3( modelViewMatrix * vec4( transformed, 1.0 ) ) );
                    vIntensity = ( 1.0 + dot( vNormal, vNormel ) ) * opacity * opacity0;
                }
            `,
            fragmentShader: `
                uniform float base;
                varying float vIntensity;

                void main( void ) {
                    vec3 color = mix( vec3( base ), vec3( 1.0, 0.6, 0.0 ), vIntensity );
                    gl_FragColor = vec4( color, 1.0 );
                }
            `,
            blending: parameters.dark ? AdditiveBlending : MultiplyBlending,
            depthWrite: false
        });

        me.delayMarkerMesh = new Mesh(me.delayMarkerGeometry, me.delayMarkerMaterial);
        me.delayMarkerMesh.updateMatrix();
        me.delayMarkerMesh.matrixAutoUpdate = false;
        me.delayMarkerMesh.frustumCulled = false;

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
            transparent: true,
            side: BackSide
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

    getDelayMarkerMesh() {
        return this.delayMarkerMesh;
    }

    getOutlineMesh() {
        return this.outlineMesh;
    }

    addInstance(attributes) {
        this.geometry.addInstance(attributes);
        this.delayMarkerGeometry.addInstance();
    }

    removeInstance(index) {
        this.geometry.removeInstance(index);
        this.delayMarkerGeometry.removeInstance(index);
    }

    setInstanceAttributes(index, attributes) {
        this.geometry.setInstanceAttributes(index, attributes);
    }

    getInstanceAttributes(index) {
        return this.geometry.getInstanceAttributes(index);
    }

    setScale(scale) {
        this.uniforms.scale.value = scale;
    }

    getScale() {
        return this.uniforms.scale.value;
    }

    setOpacity(opacity) {
        this.material.opacity = opacity;
        this.delayMarkerMaterial.opacity = opacity;
    }

    getOpacity() {
        return this.material.opacity;
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
