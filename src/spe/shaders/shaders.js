import * as THREE from 'three';
import shaderChunks from './shaderChunks';

export default {
    vertex: [
        shaderChunks.defines,
        shaderChunks.uniforms,
        shaderChunks.attributes,
        shaderChunks.varyings,

        THREE.ShaderChunk.common,
        THREE.ShaderChunk.logdepthbuf_pars_vertex,
        THREE.ShaderChunk.fog_pars_vertex,

        shaderChunks.branchAvoidanceFunctions,
        shaderChunks.unpackColor,
        shaderChunks.unpackRotationAxis,
        shaderChunks.floatOverLifetime,
        shaderChunks.colorOverLifetime,
        shaderChunks.paramFetchingFunctions,
        shaderChunks.forceFetchingFunctions,
        shaderChunks.rotationFunctions,


        'void main() {',


        //
        // Setup...
        //
        '    highp float age = getAge();',
        '    highp float alive = getAlive();',
        '    highp float maxAge = getMaxAge();',
        '    highp float positionInTime = (age / maxAge);',
        '    highp float isAlive = when_gt( alive, 0.0 );',

        '    #ifdef SHOULD_WIGGLE_PARTICLES',
        '        float wiggleAmount = positionInTime * getWiggle();',
        '        float wiggleSin = isAlive * sin( wiggleAmount );',
        '        float wiggleCos = isAlive * cos( wiggleAmount );',
        '    #endif',

        //
        // Forces
        //

        // Get forces & position
        '    vec3 vel = getVelocity( age );',
        '    vec3 accel = getAcceleration( age );',
        '    vec3 force = vec3( 0.0 );',
        '    vec3 pos = vec3( position );',

        // Calculate the required drag to apply to the forces.
        '    float drag = 1.0 - (positionInTime * 0.5) * acceleration.w;',

        // Integrate forces...
        '    force += vel;',
        '    force *= drag;',
        '    force += accel * age;',
        '    pos += force;',


        // Wiggly wiggly wiggle!
        '    #ifdef SHOULD_WIGGLE_PARTICLES',
        '        pos.x += wiggleSin;',
        '        pos.y += wiggleCos;',
        '        pos.z += wiggleSin;',
        '    #endif',


        // Rotate the emitter around it's central point
        '    #ifdef SHOULD_ROTATE_PARTICLES',
        '        pos = getRotation( pos, positionInTime );',
        '    #endif',

        // Convert pos to a world-space value
        '    vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );',

        // Determine point size.
        '    highp float pointSize = getFloatOverLifetime( positionInTime, size ) * isAlive;',

        // Determine perspective
        '    #ifdef HAS_PERSPECTIVE',
        '        float perspective = scale / length( mvPosition.xyz );',
        '    #else',
        '        float perspective = 1.0;',
        '    #endif',

        // Apply perpective to pointSize value
        '    float pointSizePerspective = pointSize * perspective;',


        //
        // Appearance
        //

        // Determine color and opacity for this particle
        '    #ifdef COLORIZE',
        '       vec3 c = isAlive * getColorOverLifetime(',
        '           positionInTime,',
        '           unpackColor( color.x ),',
        '           unpackColor( color.y ),',
        '           unpackColor( color.z ),',
        '           unpackColor( color.w )',
        '       );',
        '    #else',
        '       vec3 c = vec3(1.0);',
        '    #endif',

        '    float o = isAlive * getFloatOverLifetime( positionInTime, opacity );',

        // Assign color to vColor varying.
        '    vColor = vec4( c, o );',

        // Determine angle
        '    #ifdef SHOULD_ROTATE_TEXTURE',
        '        vAngle = isAlive * getFloatOverLifetime( positionInTime, angle );',
        '    #endif',

        // If this particle is using a sprite-sheet as a texture, we'll have to figure out
        // what frame of the texture the particle is using at it's current position in time.
        '    #ifdef SHOULD_CALCULATE_SPRITE',
        '        float framesX = textureAnimation.x;',
        '        float framesY = textureAnimation.y;',
        '        float loopCount = textureAnimation.w;',
        '        float totalFrames = textureAnimation.z;',
        '        float frameNumber = mod( (positionInTime * loopCount) * totalFrames, totalFrames );',

        '        float column = floor(mod( frameNumber, framesX ));',
        '        float row = floor( (frameNumber - column) / framesX );',

        '        float columnNorm = column / framesX;',
        '        float rowNorm = row / framesY;',

        '        vSpriteSheet.x = 1.0 / framesX;',
        '        vSpriteSheet.y = 1.0 / framesY;',
        '        vSpriteSheet.z = columnNorm;',
        '        vSpriteSheet.w = rowNorm;',
        '    #endif',

        //
        // Write values
        //

        // Set PointSize according to size at current point in time.
        '    gl_PointSize = pointSizePerspective;',
        '    gl_Position = projectionMatrix * mvPosition;',

        THREE.ShaderChunk.logdepthbuf_vertex,
        THREE.ShaderChunk.fog_vertex,

        '}'
    ].join( '\n' ),

    fragment: [
        shaderChunks.uniforms,

        THREE.ShaderChunk.common,
        THREE.ShaderChunk.fog_pars_fragment,
        THREE.ShaderChunk.logdepthbuf_pars_fragment,

        shaderChunks.varyings,

        shaderChunks.branchAvoidanceFunctions,

        'void main() {',
        '    vec3 outgoingLight = vColor.xyz;',
        '    ',
        '    #ifdef ALPHATEST',
        '       if ( vColor.w < float(ALPHATEST) ) discard;',
        '    #endif',

        shaderChunks.rotateTexture,

        THREE.ShaderChunk.logdepthbuf_fragment,

        '    outgoingLight = vColor.xyz * rotatedTexture.xyz;',
        '    gl_FragColor = vec4( outgoingLight.xyz, rotatedTexture.w * vColor.w );',

        THREE.ShaderChunk.fog_fragment,

        '}'
    ].join( '\n' )
};
