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
    uniform float zoom;
    uniform float cameraZ;
    uniform float modelScale;
    attribute vec3 translation;
    attribute float rotationX;
    attribute float rotationZ;
    attribute vec3 idColor;
`;

const glslTransform = outline => `
    float zoom0 = zoom + log2( cameraZ / abs( cameraZ - translation.z ) );
    float scale = pow( 2.0, 14.0 - clamp( zoom0, 13.0, 19.0 ) ) * modelScale * 100.0;
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

        const geometry = me.geometry = new InstancedGeometry(nonIndexedGeometry, count, parameters.index, {
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

        const uniforms = me.uniforms = {
            zoom: {type: 'f', value: parameters.zoom},
            cameraZ: {type: 'f', value: parameters.cameraZ},
            modelScale: {type: 'f', value: parameters.modelScale},
            base: {type: 'f', value: parameters.dark ? 0 : 1}
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

        const sphereGeometry = new SphereGeometry(1.8, 32, 32);

        const delayMarkerGeometry = me.delayMarkerGeometry = new InstancedGeometry(sphereGeometry, count, parameters.index, {
            translation: geometry.getAttribute('translation'),
            opacity0: geometry.getAttribute('opacity0'),
            delay: geometry.getAttribute('delay')
        });

        sphereGeometry.dispose();

        const delayMarkerMaterial = me.delayMarkerMaterial = new ShaderMaterial({
            uniforms: {
                zoom: uniforms.zoom,
                cameraZ: uniforms.cameraZ,
                modelScale: uniforms.modelScale,
                opacity: {
                    type: 'f',
                    get value() {
                        return me.material.opacity;
                    }
                },
                base: uniforms.base
            },
            vertexShader: `
                uniform float zoom;
                uniform float modelScale;
                uniform float opacity;
                attribute vec3 translation;
                attribute float opacity0;
                attribute float delay;
                varying float vIntensity;

                void main( void ) {
                    float scale = pow( 2.0, 14.0 - clamp( zoom, 13.0, 19.0 ) ) * modelScale * 100.0;
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

        const delayMarkerMesh = me.delayMarkerMesh = new Mesh(delayMarkerGeometry, delayMarkerMaterial);

        delayMarkerMesh.updateMatrix();
        delayMarkerMesh.matrixAutoUpdate = false;
        delayMarkerMesh.frustumCulled = false;

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
            transparent: true,
            side: BackSide
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

    setOpacity(opacity) {
        this.material.opacity = opacity;
        this.delayMarkerMaterial.opacity = opacity;
    }

    getOpacity() {
        return this.material.opacity;
    }

    refreshCameraParams(params) {
        const uniforms = this.uniforms;

        uniforms.zoom.value = params.zoom;
        uniforms.cameraZ.value = params.cameraZ;
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
