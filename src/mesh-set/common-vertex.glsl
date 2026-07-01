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

// Decodes an sRGB color (0-1) to the renderer's linear working color space.
// The instance colors are stored as sRGB bytes, so they must be linearized
// before lighting now that the renderer encodes its output back to sRGB.
vec3 decodeSRGB( vec3 color ) {
    return mix( color / 12.92, pow( ( color + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, color ) );
}

varying vec3 vInstanceColor;
varying float vInstanceOpacity;
