const common = `
#include <common>

uniform float zoom;
uniform float cameraZ;
uniform float modelScale;
uniform sampler2D textureData0;
uniform sampler2D textureData1;
uniform sampler2D textureColor;

attribute int instanceID;

#ifndef BUS
attribute float groupIndex;
#endif

float getScale( float zoom, float modelScale) {
    return pow( 2.0, 14.0 - clamp( zoom, 13.0, 19.0 ) ) * modelScale * 100.0;
}

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

varying vec3 vInstanceColor;
varying float vInstanceOpacity;
`;

const colorVertex = `
#include <color_vertex>

int width = textureSize( textureData0, 0 ).x;
ivec2 reference = ivec2( instanceID % width, instanceID / width );
vec4 data0 = texelFetch( textureData0, reference, 0 );
vec4 data1 = texelFetch( textureData1, reference, 0 );
vec3 translation = data0.xyz;
int colorID = int( data0.w );
float rotationX = data1.y;
float rotationZ = data1.x;
float opacity0 = data1.w;

width = textureSize( textureColor, 0 ).x;
reference = ivec2( colorID * 4 % width, colorID * 4 / width );
vec3 color0 = texelFetch( textureColor, reference, 0 ).rgb;
reference = ivec2( ( colorID * 4 + 1 ) % width, ( colorID * 4 + 1 ) / width );
vec3 color1 = texelFetch( textureColor, reference, 0 ).rgb;
reference = ivec2( ( colorID * 4 + 2 ) % width, ( colorID * 4 + 2 ) / width );
vec3 color2 = texelFetch( textureColor, reference, 0 ).rgb;
reference = ivec2( ( colorID * 4 + 3 ) % width, ( colorID * 4 + 3 ) / width );
vec3 color3 = texelFetch( textureColor, reference, 0 ).rgb;

#ifdef CAR
float mod3 = mod( groupIndex, 3.0 );
vec3 null = vec3( 0.0, 1.0, 0.0 );
vInstanceColor = groupIndex >= 3.0 && color3 != null ? color3 : mod3 == 0.0 ? color0 : mod3 == 1.0 ? color1 : color2;
#endif

#ifdef AIRCRAFT
vInstanceColor = groupIndex < 2.0 ? color0 : color1;
#endif

#ifdef BUS
vInstanceColor = color0;
#endif

vInstanceOpacity = opacity0;
`;

const beginNormalVertex = `
#ifdef BUS
vec3 objectNormal = rotateZ( rotationZ ) * vec3( normal );
#else
vec3 objectNormal = rotateZ( rotationZ ) * rotateX( rotationX ) * vec3( normal );
#endif
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

position0 = position0 * ( 1.0 + float( instanceID % 256 ) / 256.0 * 0.03 );

#ifdef BUS
vec3 transformed = rotateZ( rotationZ ) * position0 + translation + vec3( 0.0, 0.0, 0.3 * scale0 );
#else
vec3 transformed = rotateZ( rotationZ ) * rotateX( rotationX ) * position0 + translation + vec3( 0.0, 0.0, 0.44 * scale0 );
#endif
`;

export function updateVertexShader(shader) {
    return shader
        .replace('#include <common>', common)
        .replace('#include <color_vertex>', colorVertex)
        .replace('#include <beginnormal_vertex>', beginNormalVertex)
        .replace('#include <begin_vertex>', transformPosition);
}

const packing = `
#include <packing>

varying vec3 vInstanceColor;
varying float vInstanceOpacity;
`;

const diffuseColorFragment = `
vec4 diffuseColor = vec4( diffuse * vInstanceColor, opacity * vInstanceOpacity );
`;

export function updateFragmentShader(shader) {
    return shader
        .replace('#include <packing>', packing)
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', diffuseColorFragment);
}
