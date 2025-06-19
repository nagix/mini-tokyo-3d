uniform float zoom;
uniform float cameraZ;
uniform float modelScale;

#ifdef GPGPU
uniform sampler2D textureData0;
uniform sampler2D textureData1;
attribute int instanceID;
#else
uniform float opacity;
attribute vec3 translation;
attribute float opacity0;
attribute float delay;
#endif

float getScale( float zoom, float modelScale) {
    return pow( 2.0, 14.0 - clamp( zoom, 13.0, 19.0 ) ) * modelScale * 100.0;
}

varying float vIntensity;

void main() {
    #ifdef GPGPU
    int width = textureSize( textureData0, 0 ).x;
    ivec2 reference = ivec2( instanceID % width, instanceID / width );
    vec4 data0 = texelFetch( textureData0, reference, 0 );
    vec4 data1 = texelFetch( textureData1, reference, 0 );
    vec3 translation = data0.xyz;
    float opacity0 = data1.w;
    float delay = 1.0;
    #endif

    float zoom0 = zoom + log2( cameraZ / abs( cameraZ - translation.z ) );
    float scale = getScale( zoom0, modelScale );

    vec3 transformed = position * scale + translation + vec3( 0.0, 0.0, 0.44 * scale );
    gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, delay );
    vec3 vNormal = normalize( normalMatrix * normal );
    vec3 vNormel = normalize( vec3( modelViewMatrix * vec4( transformed, 1.0 ) ) );

    #ifdef GPGPU
    vIntensity = ( 1.0 + dot( vNormal, vNormel ) ) * opacity0;
    #else
    vIntensity = ( 1.0 + dot( vNormal, vNormel ) ) * opacity * opacity0;
    #endif
}
