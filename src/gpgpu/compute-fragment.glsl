uniform int zoom;
uniform int time;
uniform int timeOffset;
uniform float opacityGround;
uniform float opacityUnderground;
uniform usampler2D textureRoute0;
uniform sampler2D textureRoute1;
uniform usampler2D textureObject0;
uniform sampler2D textureObject1;
uniform sampler2D textureData0;
uniform sampler2D textureData1;

layout (location = 0) out vec4 outPosition0;
layout (location = 1) out vec4 outPosition1;

uvec4 fetchRoute0( uint index ) {
    ivec2 ref = ivec2( int( index % chunkSize ), int( index / chunkSize ) );
    return texelFetch( textureRoute0, ref, 0 );
}

vec2 fetchRoute1( uint index ) {
    ivec2 ref = ivec2( int( index % chunkSize ), int( index / chunkSize ) );
    return texelFetch( textureRoute1, ref, 0 ).rg;
}

uvec4 fetchObject0( uint index ) {
    ivec2 ref = ivec2( int( index % chunkSize ), int( index / chunkSize ) );
    return texelFetch( textureObject0, ref, 0 );
}

vec4 fetchObject1( uint index ) {
    ivec2 ref = ivec2( int( index % chunkSize ), int( index / chunkSize ) );
    return texelFetch( textureObject1, ref, 0 );
}

vec4 fetchData0( uint index ) {
    ivec2 ref = ivec2( int( index % chunkSize ), int( index / chunkSize ) );
    return texelFetch( textureData0, ref, 0 );
}

vec4 fetchData1( uint index ) {
    ivec2 ref = ivec2( int( index % chunkSize ), int( index / chunkSize ) );
    return texelFetch( textureData1, ref, 0 );
}

/**
 * Returns the index of the node at the distance
 * @param distance - the distance
 * @param offset - the offset in the route texture
 * @param length - the length of nodes
 * @returns the index of the node at the distance
 */
uint indexOfNodeAt( float distance, uint offset, uint length ) {
    uint start = 0u;
    uint end = length - 1u;
    uint center;
    bool finished;
    bool firstHalf;

    for ( int i = 0; i < loopCount; i++ ) {
        finished = start == end - 1u;
        center = ( start + end ) / 2u;
        firstHalf = distance < fetchRoute1( offset + center * 3u ).r;
        start = finished || firstHalf ? start : center;
        end = finished || ! firstHalf ? end : center;
    }
    return offset + start * 3u;
}

void main() {
    uint instanceID = uint( gl_FragCoord.y ) * chunkSize + uint( gl_FragCoord.x );
    uint index = instanceID * 2u;
    uvec4 object0 = fetchObject0( index );
    uvec4 object1 = fetchObject0( index + 1u );
    vec4 object2 = fetchObject1( index );
    vec4 object3 = fetchObject1( index + 1u );
    uint objectType = object0.x;
    uint routeID = object0.y;
    uint colorID = object0.z;
    int startTime = int( object0.w );
    int endTime = int( object1.x );
    int fadeAnimationStartTime = int( object1.y );
    uint fadeAnimationType = object1.z;
    uint sectionIndex = uint( object2.x );
    uint nextSectionIndex = uint( object2.y );
    float accelerationTime = object2.z;
    float acceleration = object2.w;
    float decelerationTime = object3.x;
    float deceleration = object3.y;

    vec4 data0 = fetchData0( instanceID );
    vec4 data1 = fetchData1( instanceID );
    vec3 prevPosition = data0.xyz;
    float prevRotateZ = data1.x;
    float prevRotateX = data1.y;
    int opacityAnimationStartTime = int( data1.z );

    uint routeSubID = objectType == 0u ? uint( zoom - 13 ) : 0u;
    uvec4 header = fetchRoute0( routeID + routeSubID );

    uint offset = header.z;
    vec2 distances = fetchRoute1( offset + sectionIndex / 2u );
    float sectionDistance = sectionIndex % 2u == 0u ? distances.r : distances.g;
    distances = fetchRoute1( offset + nextSectionIndex / 2u );
    float nextSectionDistance = nextSectionIndex % 2u == 0u ? distances.r : distances.g;

    float elapsed = float( clamp( timeOffset - startTime, 0, endTime - startTime ) );
    float left = float( clamp( endTime - timeOffset, 0, endTime - startTime ) );
    float a = elapsed < accelerationTime ? acceleration / 2.0 * elapsed * elapsed :
        left < decelerationTime ? 1.0 - deceleration / 2.0 * left * left :
        max( acceleration * accelerationTime, deceleration * decelerationTime) * ( elapsed - accelerationTime / 2.0 );
    float distance = mix( sectionDistance, nextSectionDistance, a );

    index = indexOfNodeAt( distance, header.x, header.y );
    vec2 section0 = fetchRoute1( index );
    vec2 section1 = fetchRoute1( ++index );
    vec2 section2 = fetchRoute1( ++index );
    vec2 section3 = fetchRoute1( ++index );
    vec2 section4 = fetchRoute1( ++index );
    float baseDistance = section0.r;
    vec3 currentPosition = vec3( section0.g, section1.r, section1.g );
    float rotateZ = section2.r;
    float rotateX = section2.g;
    float nextDistance = section3.r;
    vec3 nextPosition = vec3( section3.g, section4.r, section4.g );
    a = ( distance - baseDistance ) / ( nextDistance - baseDistance );
    vec3 position = mix( currentPosition, nextPosition, a );

    bool prevGround = prevPosition.z >= 0.0;
    bool ground = position.z >= 0.0;
    opacityAnimationStartTime = time >= fadeAnimationStartTime + fadeDuration && ( ( prevGround && ! ground ) || ( ! prevGround && ground ) ) ? time : opacityAnimationStartTime;
    a = clamp( float( time - opacityAnimationStartTime ) / float( fadeDuration ), 0.0, 1.0 );
    float opacity0 = mix( ground ? opacityUnderground : opacityGround, ground ? opacityGround : opacityUnderground, a );

    a = clamp( float( time - fadeAnimationStartTime ) / float( fadeDuration ), 0.0, 1.0 );
    bool fadingIn = fadeAnimationType == 1u;
    bool fadingOut = fadeAnimationType == 2u;
    float opacity1 = mix( fadingOut ? 1.0 : 0.0, fadingIn ? 1.0 : 0.0, a );
    float opacity = opacity0 * opacity1;

    position = fadingOut ? prevPosition : position;
    rotateZ = fadingOut ? prevRotateZ : rotateZ;
    rotateX = fadingOut ? prevRotateX : rotateX;

    outPosition0 = vec4( position, float( colorID ) );
    outPosition1 = vec4( rotateZ, rotateX, opacityAnimationStartTime, opacity );
}
