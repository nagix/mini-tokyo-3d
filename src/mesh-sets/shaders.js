const commonVariables = `
uniform float zoom;
uniform float modelScale;
attribute vec3 translation;

float getScale( float zoom, float modelScale) {
	return pow( 2.0, 14.0 - clamp( zoom, 13.0, 19.0 ) ) * modelScale * 100.0;
}

#ifdef TRANSFORM
uniform float cameraZ;
attribute float rotationX;
attribute float rotationZ;
attribute vec3 idColor;

#ifdef AIRCRAFT
attribute float groupIndex;
#endif

#ifndef BUS
mat3 rotateX( float angle ) {
    float s = sin( angle );
    float c = cos( angle );
    return mat3(
        1.0, 0.0, 0.0,
        0.0, c, s,
        0.0, -s, c
    );
}
#endif

mat3 rotateZ( float angle ) {
    float s = sin( angle );
    float c = cos( angle );
    return mat3(
        c, s, 0.0,
        -s, c, 0.0,
        0.0, 0.0, 1.0
    );
}
#endif
`;

const vInstanceColor = `
varying vec3 vInstanceColor;
`;

const vIntensity = `
varying float vIntensity;
`;

const vInstanceOpacity = `
varying float vInstanceOpacity;
`;

const vIdColor = `
varying vec3 vIdColor;
`;

const transformPosition = `
float zoom0 = zoom + log2( cameraZ / abs( cameraZ - translation.z ) );
float scale0 = getScale( zoom0, modelScale );

#ifdef AIRCRAFT
float scale = 0.06 / 0.285 * modelScale * 100.0;
float offsetY = groupIndex == 2.0 ? 0.44 - 1.32 * max( scale / scale0, 1.0 ) : 0.0;
float offsetZ = groupIndex == 2.0 ? 0.88 : 0.0;
float scaleX = groupIndex == 1.0 ? max( scale0, scale ) : scale0;
float scaleY = groupIndex == 0.0 ? max( scale0, scale ) : scale0;
vec3 position0 = ( position + vec3( 0.0, offsetY, offsetZ ) ) * vec3( scaleX, scaleY, scale0 );
#else
vec3 position0 = position * scale0;
#endif

position0 = position0 * ( 1.0 + idColor.b * 0.03 );

#ifdef OUTLINE
position0 = position0 + 0.1 * scale0 * sign( position );
#endif

#ifdef BUS
vec3 transformed = rotateZ( rotationZ ) * position0 + translation + vec3( 0.0, 0.0, 0.3 * scale0 );
#else
vec3 transformed = rotateZ( rotationZ ) * rotateX( rotationX ) * position0 + translation + vec3( 0.0, 0.0, 0.44 * scale0 );
#endif
`;

const common = `
#include <common>
#define TRANSFORM

${commonVariables}

#ifdef BUS
attribute vec3 color;
#else
attribute vec3 color0;
attribute vec3 color1;
#ifdef CAR
attribute vec3 color2;
attribute vec3 color3;
attribute float groupIndex;
#endif
#endif

attribute float opacity0;

${vInstanceColor}
${vInstanceOpacity}
`;

const beginNormalVertex = `
#ifdef BUS
vec3 objectNormal = rotateZ( rotationZ ) * vec3( normal );
#else
vec3 objectNormal = rotateZ( rotationZ ) * rotateX( rotationX ) * vec3( normal );
#endif
`;

const colorVertex = `
#include <color_vertex>

#ifdef CAR
float mod3 = mod( groupIndex, 3.0 );
vec3 null = vec3( 0.0, 1.0, 0.0 );
vInstanceColor = groupIndex >= 3.0 && color3 != null ? color3 : mod3 == 0.0 ? color0 : mod3 == 1.0 ? color1 : color2;
#endif

#ifdef AIRCRAFT
vInstanceColor = groupIndex < 2.0 ? color0 : color1;
#endif

#ifdef BUS
vInstanceColor = color;
#endif

vInstanceOpacity = opacity0;
`;

export function updateVertexShader(shader) {
    return shader
        .replace('#include <common>', common)
        .replace('#include <begin_vertex>', transformPosition)
        .replace('#include <beginnormal_vertex>', beginNormalVertex)
        .replace('#include <color_vertex>', colorVertex);
}

const packing = `
#include <packing>

${vInstanceColor}
${vInstanceOpacity}
`;

const diffuseColorFragment = `
vec4 diffuseColor = vec4( diffuse * vInstanceColor, opacity * vInstanceOpacity );
`;

export function updateFragmentShader(shader) {
    return shader
        .replace('#include <packing>', packing)
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', diffuseColorFragment);
}

export const pickingVertexShader = `
#define TRANSFORM

${commonVariables}
${vIdColor}

void main() {
    ${transformPosition}
    gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
    vIdColor = idColor;
}
`;

export const pickingFragmentShader = `
${vIdColor}

void main() {
    gl_FragColor = vec4( vIdColor, 1.0 );
}
`;

export const delayMarkerVertexShader = `
${commonVariables}
uniform float opacity;
attribute float opacity0;
attribute float delay;
${vIntensity}

void main() {
    float scale = getScale( zoom, modelScale );
    vec3 transformed = position * scale + translation + vec3( 0.0, 0.0, 0.44 * scale );
    gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, delay );
    vec3 vNormal = normalize( normalMatrix * normal );
    vec3 vNormel = normalize( vec3( modelViewMatrix * vec4( transformed, 1.0 ) ) );
    vIntensity = ( 1.0 + dot( vNormal, vNormel ) ) * opacity * opacity0;
}
`;

export const delayMarkerFragmentShader = `
uniform float base;
${vIntensity}

void main() {
    vec3 color = mix( vec3( base ), vec3( 1.0, 0.6, 0.0 ), vIntensity );
    gl_FragColor = vec4( color, 1.0 );
}
`;

export const outlineVertexShader = `
#define TRANSFORM
#define OUTLINE

${commonVariables}
attribute float outline;
${vInstanceOpacity}

void main() {
    ${transformPosition}
    gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, outline > 0.0 ? 1.0 : 0.0 );
    vInstanceOpacity = outline;
}
`;

export const outlineFragmentShader = `
${vInstanceOpacity}

void main() {
    gl_FragColor = vec4( 1.0, 1.0, 1.0, vInstanceOpacity );
}
`;

export function define(name, code) {
    return `#define ${name}\n${code}`;
}
