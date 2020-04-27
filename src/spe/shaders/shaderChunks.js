export default {
    // Register color-packing define statements.
    defines: [
        '#define PACKED_COLOR_SIZE 256.0',
        '#define PACKED_COLOR_DIVISOR 255.0'
    ].join( '\n' ),

    // All uniforms used by vertex / fragment shaders
    uniforms: [
        'uniform float deltaTime;',
        'uniform float runTime;',
        'uniform sampler2D texture;',
        'uniform vec4 textureAnimation;',
        'uniform float scale;',
    ].join( '\n' ),

    // All attributes used by the vertex shader.
    //
    // Note that some attributes are squashed into other ones:
    //
    // * Drag is acceleration.w
    attributes: [
        'attribute vec4 acceleration;',
        'attribute vec3 velocity;',
        'attribute vec4 rotation;',
        'attribute vec3 rotationCenter;',
        'attribute vec4 params;',
        'attribute vec4 size;',
        'attribute vec4 angle;',
        'attribute vec4 color;',
        'attribute vec4 opacity;'
    ].join( '\n' ),

    //
    varyings: [
        'varying vec4 vColor;',
        '#ifdef SHOULD_ROTATE_TEXTURE',
        '    varying float vAngle;',
        '#endif',

        '#ifdef SHOULD_CALCULATE_SPRITE',
        '    varying vec4 vSpriteSheet;',
        '#endif'
    ].join( '\n' ),


    // Branch-avoiding comparison fns
    // - http://theorangeduck.com/page/avoiding-shader-conditionals
    branchAvoidanceFunctions: [
        'float when_gt(float x, float y) {',
        '    return max(sign(x - y), 0.0);',
        '}',

        'float when_lt(float x, float y) {',
        '    return min( max(1.0 - sign(x - y), 0.0), 1.0 );',
        '}',

        'float when_eq( float x, float y ) {',
        '    return 1.0 - abs( sign( x - y ) );',
        '}',

        'float when_ge(float x, float y) {',
        '  return 1.0 - when_lt(x, y);',
        '}',

        'float when_le(float x, float y) {',
        '  return 1.0 - when_gt(x, y);',
        '}',

        // Branch-avoiding logical operators
        // (to be used with above comparison fns)
        'float and(float a, float b) {',
        '    return a * b;',
        '}',

        'float or(float a, float b) {',
        '    return min(a + b, 1.0);',
        '}',
    ].join( '\n' ),


    // From:
    // - http://stackoverflow.com/a/12553149
    // - https://stackoverflow.com/questions/22895237/hexadecimal-to-rgb-values-in-webgl-shader
    unpackColor: [
        'vec3 unpackColor( in float hex ) {',
        '   vec3 c = vec3( 0.0 );',

        '   float r = mod( (hex / PACKED_COLOR_SIZE / PACKED_COLOR_SIZE), PACKED_COLOR_SIZE );',
        '   float g = mod( (hex / PACKED_COLOR_SIZE), PACKED_COLOR_SIZE );',
        '   float b = mod( hex, PACKED_COLOR_SIZE );',

        '   c.r = r / PACKED_COLOR_DIVISOR;',
        '   c.g = g / PACKED_COLOR_DIVISOR;',
        '   c.b = b / PACKED_COLOR_DIVISOR;',

        '   return c;',
        '}',
    ].join( '\n' ),

    unpackRotationAxis: [
        'vec3 unpackRotationAxis( in float hex ) {',
        '   vec3 c = vec3( 0.0 );',

        '   float r = mod( (hex / PACKED_COLOR_SIZE / PACKED_COLOR_SIZE), PACKED_COLOR_SIZE );',
        '   float g = mod( (hex / PACKED_COLOR_SIZE), PACKED_COLOR_SIZE );',
        '   float b = mod( hex, PACKED_COLOR_SIZE );',

        '   c.r = r / PACKED_COLOR_DIVISOR;',
        '   c.g = g / PACKED_COLOR_DIVISOR;',
        '   c.b = b / PACKED_COLOR_DIVISOR;',

        '   c *= vec3( 2.0 );',
        '   c -= vec3( 1.0 );',

        '   return c;',
        '}',
    ].join( '\n' ),

    floatOverLifetime: [
        'float getFloatOverLifetime( in float positionInTime, in vec4 attr ) {',
        '    highp float value = 0.0;',
        '    float deltaAge = positionInTime * float( VALUE_OVER_LIFETIME_LENGTH - 1 );',
        '    float fIndex = 0.0;',
        '    float shouldApplyValue = 0.0;',

        // This might look a little odd, but it's faster in the testing I've done than using branches.
        // Uses basic maths to avoid branching.
        //
        // Take a look at the branch-avoidance functions defined above,
        // and be sure to check out The Orange Duck site where I got this
        // from (link above).

        // Fix for static emitters (age is always zero).
        '    value += attr[ 0 ] * when_eq( deltaAge, 0.0 );',
        '',
        '    for( int i = 0; i < VALUE_OVER_LIFETIME_LENGTH - 1; ++i ) {',
        '       fIndex = float( i );',
        '       shouldApplyValue = and( when_gt( deltaAge, fIndex ), when_le( deltaAge, fIndex + 1.0 ) );',
        '       value += shouldApplyValue * mix( attr[ i ], attr[ i + 1 ], deltaAge - fIndex );',
        '    }',
        '',
        '    return value;',
        '}',
    ].join( '\n' ),

    colorOverLifetime: [
        'vec3 getColorOverLifetime( in float positionInTime, in vec3 color1, in vec3 color2, in vec3 color3, in vec3 color4 ) {',
        '    vec3 value = vec3( 0.0 );',
        '    value.x = getFloatOverLifetime( positionInTime, vec4( color1.x, color2.x, color3.x, color4.x ) );',
        '    value.y = getFloatOverLifetime( positionInTime, vec4( color1.y, color2.y, color3.y, color4.y ) );',
        '    value.z = getFloatOverLifetime( positionInTime, vec4( color1.z, color2.z, color3.z, color4.z ) );',
        '    return value;',
        '}',
    ].join( '\n' ),

    paramFetchingFunctions: [
        'float getAlive() {',
        '   return params.x;',
        '}',

        'float getAge() {',
        '   return params.y;',
        '}',

        'float getMaxAge() {',
        '   return params.z;',
        '}',

        'float getWiggle() {',
        '   return params.w;',
        '}',
    ].join( '\n' ),

    forceFetchingFunctions: [
        'vec4 getPosition( in float age ) {',
        '   return modelViewMatrix * vec4( position, 1.0 );',
        '}',

        'vec3 getVelocity( in float age ) {',
        '   return velocity * age;',
        '}',

        'vec3 getAcceleration( in float age ) {',
        '   return acceleration.xyz * age;',
        '}',
    ].join( '\n' ),


    rotationFunctions: [
        // Huge thanks to:
        // - http://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/
        '#ifdef SHOULD_ROTATE_PARTICLES',
        '   mat4 getRotationMatrix( in vec3 axis, in float angle) {',
        '       axis = normalize(axis);',
        '       float s = sin(angle);',
        '       float c = cos(angle);',
        '       float oc = 1.0 - c;',
        '',
        '       return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,',
        '                   oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,',
        '                   oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,',
        '                   0.0,                                0.0,                                0.0,                                1.0);',
        '   }',
        '',
        '   vec3 getRotation( in vec3 pos, in float positionInTime ) {',
        '      if( rotation.y == 0.0 ) {',
        '           return pos;',
        '      }',
        '',
        '      vec3 axis = unpackRotationAxis( rotation.x );',
        '      vec3 center = rotationCenter;',
        '      vec3 translated;',
        '      mat4 rotationMatrix;',

        '      float angle = 0.0;',
        '      angle += when_eq( rotation.z, 0.0 ) * rotation.y;',
        '      angle += when_gt( rotation.z, 0.0 ) * mix( 0.0, rotation.y, positionInTime );',
        '      translated = rotationCenter - pos;',
        '      rotationMatrix = getRotationMatrix( axis, angle );',
        '      return center - vec3( rotationMatrix * vec4( translated, 0.0 ) );',
        '   }',
        '#endif'
    ].join( '\n' ),


    // Fragment chunks
    rotateTexture: [
        '    vec2 vUv = vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y );',
        '',
        '    #ifdef SHOULD_ROTATE_TEXTURE',
        '       float x = gl_PointCoord.x - 0.5;',
        '       float y = 1.0 - gl_PointCoord.y - 0.5;',
        '       float c = cos( -vAngle );',
        '       float s = sin( -vAngle );',

        '       vUv = vec2( c * x + s * y + 0.5, c * y - s * x + 0.5 );',
        '    #endif',
        '',

        // Spritesheets overwrite angle calculations.
        '    #ifdef SHOULD_CALCULATE_SPRITE',
        '        float framesX = vSpriteSheet.x;',
        '        float framesY = vSpriteSheet.y;',
        '        float columnNorm = vSpriteSheet.z;',
        '        float rowNorm = vSpriteSheet.w;',

        '        vUv.x = gl_PointCoord.x * framesX + columnNorm;',
        '        vUv.y = 1.0 - (gl_PointCoord.y * framesY + rowNorm);',
        '    #endif',

        '',
        '    vec4 rotatedTexture = texture2D( texture, vUv );',
    ].join( '\n' )
};
