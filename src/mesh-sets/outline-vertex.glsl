uniform float zoom;
uniform float cameraZ;
uniform float modelScale;

#ifdef GPGPU
uniform sampler2D textureData0;
uniform sampler2D textureData1;
uniform int marked;
uniform int tracked;
uniform float intensity;
attribute int instanceID;
#else
attribute vec3 translation;
attribute float rotationX;
attribute float rotationZ;
attribute float outline;
attribute vec3 idColor;
#endif

#ifdef AIRCRAFT
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

varying float vInstanceOpacity;

void main() {
    #ifdef GPGPU
    int width = textureSize( textureData0, 0 ).x;
    ivec2 reference = ivec2( instanceID % width, instanceID / width );
    vec4 data0 = texelFetch( textureData0, reference, 0 );
    vec4 data1 = texelFetch( textureData1, reference, 0 );
    vec3 translation = data0.xyz;
    float rotationX = data1.y;
    float rotationZ = data1.x;
    float outline = instanceID == marked ? 1.0 : instanceID == tracked ? intensity : 0.0;
    #endif

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

    #ifdef GPGPU
    position0 = position0 * ( 1.0 + float( instanceID % 256 ) / 256.0 * 0.03 );
    #else
    position0 = position0 * ( 1.0 + idColor.b * 0.03 );
    #endif

    position0 = position0 + 0.1 * scale0 * sign( position );

    #ifdef BUS
    vec3 transformed = rotateZ( rotationZ ) * position0 + translation + vec3( 0.0, 0.0, 0.3 * scale0 );
    #else
    vec3 transformed = rotateZ( rotationZ ) * rotateX( rotationX ) * position0 + translation + vec3( 0.0, 0.0, 0.44 * scale0 );
    #endif

    gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
    vInstanceOpacity = outline;
}
