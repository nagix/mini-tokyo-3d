import * as THREE from 'three';
import { distributions, valueOverLifetimeLength } from './configs';
import utils from './utils';

/**
 * An SPE.Emitter instance.
 * @typedef {Object} Emitter
 * @see SPE.Emitter
 */

/**
 * A map of options to configure an SPE.Emitter instance.
 *
 * @typedef {Object} EmitterOptions
 *
 * @property {distribution} [type=BOX] The default distribution this emitter should use to control
 *                         its particle's spawn position and force behaviour.
 *                         Must be an SPE.distributions.* value.
 *
 *
 * @property {Number} [particleCount=100] The total number of particles this emitter will hold. NOTE: this is not the number
 *                                  of particles emitted in a second, or anything like that. The number of particles
 *                                  emitted per-second is calculated by particleCount / maxAge (approximately!)
 *
 * @property {Number|null} [duration=null] The duration in seconds that this emitter should live for. If not specified, the emitter
 *                                         will emit particles indefinitely.
 *                                         NOTE: When an emitter is older than a specified duration, the emitter is NOT removed from
 *                                         it's group, but rather is just marked as dead, allowing it to be reanimated at a later time
 *                                         using `SPE.Emitter.prototype.enable()`.
 *
 * @property {Boolean} [isStatic=false] Whether this emitter should be not be simulated (true).
 * @property {Boolean} [activeMultiplier=1] A value between 0 and 1 describing what percentage of this emitter's particlesPerSecond should be
 *                                          emitted, where 0 is 0%, and 1 is 100%.
 *                                          For example, having an emitter with 100 particles, a maxAge of 2, yields a particlesPerSecond
 *                                          value of 50. Setting `activeMultiplier` to 0.5, then, will only emit 25 particles per second (0.5 = 50%).
 *                                          Values greater than 1 will emulate a burst of particles, causing the emitter to run out of particles
 *                                          before it's next activation cycle.
 *
 * @property {Boolean} [direction=1] The direction of the emitter. If value is `1`, emitter will start at beginning of particle's lifecycle.
 *                                   If value is `-1`, emitter will start at end of particle's lifecycle and work it's way backwards.
 *
 * @property {Object} [maxAge={}] An object describing the particle's maximum age in seconds.
 * @property {Number} [maxAge.value=2] A number between 0 and 1 describing the amount of maxAge to apply to all particles.
 * @property {Number} [maxAge.spread=0] A number describing the maxAge variance on a per-particle basis.
 *
 *
 * @property {Object} [position={}] An object describing this emitter's position.
 * @property {Object} [position.value=new THREE.Vector3()] A THREE.Vector3 instance describing this emitter's base position.
 * @property {Object} [position.spread=new THREE.Vector3()] A THREE.Vector3 instance describing this emitter's position variance on a per-particle basis.
 *                                                          Note that when using a SPHERE or DISC distribution, only the x-component
 *                                                          of this vector is used.
 * @property {Object} [position.spreadClamp=new THREE.Vector3()] A THREE.Vector3 instance describing the numeric multiples the particle's should
 *                                                               be spread out over.
 *                                                               Note that when using a SPHERE or DISC distribution, only the x-component
 *                                                               of this vector is used.
 * @property {Number} [position.radius=10] This emitter's base radius.
 * @property {Object} [position.radiusScale=new THREE.Vector3()] A THREE.Vector3 instance describing the radius's scale in all three axes. Allows a SPHERE or DISC to be squashed or stretched.
 * @property {distribution} [position.distribution=value of the `type` option.] A specific distribution to use when radiusing particles. Overrides the `type` option.
 * @property {Boolean} [position.randomise=false] When a particle is re-spawned, whether it's position should be re-randomised or not. Can incur a performance hit.
 *
 *
 * @property {Object} [velocity={}] An object describing this particle velocity.
 * @property {Object} [velocity.value=new THREE.Vector3()] A THREE.Vector3 instance describing this emitter's base velocity.
 * @property {Object} [velocity.spread=new THREE.Vector3()] A THREE.Vector3 instance describing this emitter's velocity variance on a per-particle basis.
 *                                                          Note that when using a SPHERE or DISC distribution, only the x-component
 *                                                          of this vector is used.
 * @property {distribution} [velocity.distribution=value of the `type` option.] A specific distribution to use when calculating a particle's velocity. Overrides the `type` option.
 * @property {Boolean} [velocity.randomise=false] When a particle is re-spawned, whether it's velocity should be re-randomised or not. Can incur a performance hit.
 *
 *
 * @property {Object} [acceleration={}] An object describing this particle's acceleration.
 * @property {Object} [acceleration.value=new THREE.Vector3()] A THREE.Vector3 instance describing this emitter's base acceleration.
 * @property {Object} [acceleration.spread=new THREE.Vector3()] A THREE.Vector3 instance describing this emitter's acceleration variance on a per-particle basis.
 *                           Note that when using a SPHERE or DISC distribution, only the x-component
 *                           of this vector is used.
 * @property {distribution} [acceleration.distribution=value of the `type` option.] A specific distribution to use when calculating a particle's acceleration. Overrides the `type` option.
 * @property {Boolean} [acceleration.randomise=false] When a particle is re-spawned, whether it's acceleration should be re-randomised or not. Can incur a performance hit.
 *
 *
 * @property {Object} [drag={}] An object describing this particle drag. Drag is applied to both velocity and acceleration values.
 * @property {Number} [drag.value=0] A number between 0 and 1 describing the amount of drag to apply to all particles.
 * @property {Number} [drag.spread=0] A number describing the drag variance on a per-particle basis.
 * @property {Boolean} [drag.randomise=false] When a particle is re-spawned, whether it's drag should be re-randomised or not. Can incur a performance hit.
 *
 *
 * @property {Object} [wiggle={}] This is quite a fun one! The values of this object will determine whether a particle will wiggle, or jiggle, or wave,
 *                                or shimmy, or waggle, or... Well you get the idea. The wiggle is calculated over-time, meaning that a particle will
 *                                start off with no wiggle, and end up wiggling about with the distance of the `value` specified by the time it dies.
 *                                It's quite handy to simulate fire embers, or similar effects where the particle's position should slightly change over
 *                                time, and such change isn't easily controlled by rotation, velocity, or acceleration. The wiggle is a combination of sin and cos calculations, so is circular in nature.
 * @property {Number} [wiggle.value=0] A number describing the amount of wiggle to apply to all particles. It's measured in distance.
 * @property {Number} [wiggle.spread=0] A number describing the wiggle variance on a per-particle basis.
 *
 *
 * @property {Object} [rotation={}] An object describing this emitter's rotation. It can either be static, or set to rotate from 0radians to the value of `rotation.value`
 *                                  over a particle's lifetime. Rotation values affect both a particle's position and the forces applied to it.
 * @property {Object} [rotation.axis=new THREE.Vector3(0, 1, 0)] A THREE.Vector3 instance describing this emitter's axis of rotation.
 * @property {Object} [rotation.axisSpread=new THREE.Vector3()] A THREE.Vector3 instance describing the amount of variance to apply to the axis of rotation on
 *                                                              a per-particle basis.
 * @property {Number} [rotation.angle=0] The angle of rotation, given in radians. If `rotation.static` is true, the emitter will start off rotated at this angle, and stay as such.
 *                                       Otherwise, the particles will rotate from 0radians to this value over their lifetimes.
 * @property {Number} [rotation.angleSpread=0] The amount of variance in each particle's rotation angle.
 * @property {Boolean} [rotation.static=false] Whether the rotation should be static or not.
 * @property {Object} [rotation.center=The value of `position.value`] A THREE.Vector3 instance describing the center point of rotation.
 * @property {Boolean} [rotation.randomise=false] When a particle is re-spawned, whether it's rotation should be re-randomised or not. Can incur a performance hit.
 *
 *
 * @property {Object} [color={}] An object describing a particle's color. This property is a "value-over-lifetime" property, meaning an array of values and spreads can be
 *                               given to describe specific value changes over a particle's lifetime.
 *                               Depending on the value of SPE.valueOverLifetimeLength, if arrays of THREE.Color instances are given, then the array will be interpolated to
 *                               have a length matching the value of SPE.valueOverLifetimeLength.
 * @property {Object} [color.value=new THREE.Color()] Either a single THREE.Color instance, or an array of THREE.Color instances to describe the color of a particle over it's lifetime.
 * @property {Object} [color.spread=new THREE.Vector3()] Either a single THREE.Vector3 instance, or an array of THREE.Vector3 instances to describe the color variance of a particle over it's lifetime.
 * @property {Boolean} [color.randomise=false] When a particle is re-spawned, whether it's color should be re-randomised or not. Can incur a performance hit.
 *
 *
 * @property {Object} [opacity={}] An object describing a particle's opacity. This property is a "value-over-lifetime" property, meaning an array of values and spreads can be
 *                               given to describe specific value changes over a particle's lifetime.
 *                               Depending on the value of SPE.valueOverLifetimeLength, if arrays of numbers are given, then the array will be interpolated to
 *                               have a length matching the value of SPE.valueOverLifetimeLength.
 * @property {Number} [opacity.value=1] Either a single number, or an array of numbers to describe the opacity of a particle over it's lifetime.
 * @property {Number} [opacity.spread=0] Either a single number, or an array of numbers to describe the opacity variance of a particle over it's lifetime.
 * @property {Boolean} [opacity.randomise=false] When a particle is re-spawned, whether it's opacity should be re-randomised or not. Can incur a performance hit.
 *
 *
 * @property {Object} [size={}] An object describing a particle's size. This property is a "value-over-lifetime" property, meaning an array of values and spreads can be
 *                               given to describe specific value changes over a particle's lifetime.
 *                               Depending on the value of SPE.valueOverLifetimeLength, if arrays of numbers are given, then the array will be interpolated to
 *                               have a length matching the value of SPE.valueOverLifetimeLength.
 * @property {Number} [size.value=1] Either a single number, or an array of numbers to describe the size of a particle over it's lifetime.
 * @property {Number} [size.spread=0] Either a single number, or an array of numbers to describe the size variance of a particle over it's lifetime.
 * @property {Boolean} [size.randomise=false] When a particle is re-spawned, whether it's size should be re-randomised or not. Can incur a performance hit.
 *
 *
 * @property {Object} [angle={}] An object describing a particle's angle. The angle is a 2d-rotation, measured in radians, applied to the particle's texture.
 *                               NOTE: if a particle's texture is a sprite-sheet, this value IS IGNORED.
 *                               This property is a "value-over-lifetime" property, meaning an array of values and spreads can be
 *                               given to describe specific value changes over a particle's lifetime.
 *                               Depending on the value of SPE.valueOverLifetimeLength, if arrays of numbers are given, then the array will be interpolated to
 *                               have a length matching the value of SPE.valueOverLifetimeLength.
 * @property {Number} [angle.value=0] Either a single number, or an array of numbers to describe the angle of a particle over it's lifetime.
 * @property {Number} [angle.spread=0] Either a single number, or an array of numbers to describe the angle variance of a particle over it's lifetime.
 * @property {Boolean} [angle.randomise=false] When a particle is re-spawned, whether it's angle should be re-randomised or not. Can incur a performance hit.
 *
 */

/**
 * The SPE.Emitter class.
 *
 * @constructor
 *
 * @param {EmitterOptions} options A map of options to configure the emitter.
 */
var Emitter = function( options ) {
    'use strict';

    var types = utils.types,
        lifetimeLength = valueOverLifetimeLength;

    // Ensure we have a map of options to play with,
    // and that each option is in the correct format.
    options = utils.ensureTypedArg( options, types.OBJECT, {} );
    options.position = utils.ensureTypedArg( options.position, types.OBJECT, {} );
    options.velocity = utils.ensureTypedArg( options.velocity, types.OBJECT, {} );
    options.acceleration = utils.ensureTypedArg( options.acceleration, types.OBJECT, {} );
    options.radius = utils.ensureTypedArg( options.radius, types.OBJECT, {} );
    options.drag = utils.ensureTypedArg( options.drag, types.OBJECT, {} );
    options.rotation = utils.ensureTypedArg( options.rotation, types.OBJECT, {} );
    options.color = utils.ensureTypedArg( options.color, types.OBJECT, {} );
    options.opacity = utils.ensureTypedArg( options.opacity, types.OBJECT, {} );
    options.size = utils.ensureTypedArg( options.size, types.OBJECT, {} );
    options.angle = utils.ensureTypedArg( options.angle, types.OBJECT, {} );
    options.wiggle = utils.ensureTypedArg( options.wiggle, types.OBJECT, {} );
    options.maxAge = utils.ensureTypedArg( options.maxAge, types.OBJECT, {} );

    if ( options.onParticleSpawn ) {
        console.warn( 'onParticleSpawn has been removed. Please set properties directly to alter values at runtime.' );
    }

    this.uuid = THREE.Math.generateUUID();

    this.type = utils.ensureTypedArg( options.type, types.NUMBER, distributions.BOX );

    // Start assigning properties...kicking it off with props that DON'T support values over
    // lifetimes.
    //
    // Btw, values over lifetimes are just the new way of referring to *Start, *Middle, and *End.
    this.position = {
        _value: utils.ensureInstanceOf( options.position.value, THREE.Vector3, new THREE.Vector3() ),
        _spread: utils.ensureInstanceOf( options.position.spread, THREE.Vector3, new THREE.Vector3() ),
        _spreadClamp: utils.ensureInstanceOf( options.position.spreadClamp, THREE.Vector3, new THREE.Vector3() ),
        _distribution: utils.ensureTypedArg( options.position.distribution, types.NUMBER, this.type ),
        _randomise: utils.ensureTypedArg( options.position.randomise, types.BOOLEAN, false ),
        _radius: utils.ensureTypedArg( options.position.radius, types.NUMBER, 10 ),
        _radiusScale: utils.ensureInstanceOf( options.position.radiusScale, THREE.Vector3, new THREE.Vector3( 1, 1, 1 ) ),
        _distributionClamp: utils.ensureTypedArg( options.position.distributionClamp, types.NUMBER, 0 ),
    };

    this.velocity = {
        _value: utils.ensureInstanceOf( options.velocity.value, THREE.Vector3, new THREE.Vector3() ),
        _spread: utils.ensureInstanceOf( options.velocity.spread, THREE.Vector3, new THREE.Vector3() ),
        _distribution: utils.ensureTypedArg( options.velocity.distribution, types.NUMBER, this.type ),
        _randomise: utils.ensureTypedArg( options.position.randomise, types.BOOLEAN, false )
    };

    this.acceleration = {
        _value: utils.ensureInstanceOf( options.acceleration.value, THREE.Vector3, new THREE.Vector3() ),
        _spread: utils.ensureInstanceOf( options.acceleration.spread, THREE.Vector3, new THREE.Vector3() ),
        _distribution: utils.ensureTypedArg( options.acceleration.distribution, types.NUMBER, this.type ),
        _randomise: utils.ensureTypedArg( options.position.randomise, types.BOOLEAN, false )
    };

    this.drag = {
        _value: utils.ensureTypedArg( options.drag.value, types.NUMBER, 0 ),
        _spread: utils.ensureTypedArg( options.drag.spread, types.NUMBER, 0 ),
        _randomise: utils.ensureTypedArg( options.position.randomise, types.BOOLEAN, false )
    };

    this.wiggle = {
        _value: utils.ensureTypedArg( options.wiggle.value, types.NUMBER, 0 ),
        _spread: utils.ensureTypedArg( options.wiggle.spread, types.NUMBER, 0 )
    };

    this.rotation = {
        _axis: utils.ensureInstanceOf( options.rotation.axis, THREE.Vector3, new THREE.Vector3( 0.0, 1.0, 0.0 ) ),
        _axisSpread: utils.ensureInstanceOf( options.rotation.axisSpread, THREE.Vector3, new THREE.Vector3() ),
        _angle: utils.ensureTypedArg( options.rotation.angle, types.NUMBER, 0 ),
        _angleSpread: utils.ensureTypedArg( options.rotation.angleSpread, types.NUMBER, 0 ),
        _static: utils.ensureTypedArg( options.rotation.static, types.BOOLEAN, false ),
        _center: utils.ensureInstanceOf( options.rotation.center, THREE.Vector3, this.position._value.clone() ),
        _randomise: utils.ensureTypedArg( options.position.randomise, types.BOOLEAN, false )
    };


    this.maxAge = {
        _value: utils.ensureTypedArg( options.maxAge.value, types.NUMBER, 2 ),
        _spread: utils.ensureTypedArg( options.maxAge.spread, types.NUMBER, 0 )
    };



    // The following properties can support either single values, or an array of values that change
    // the property over a particle's lifetime (value over lifetime).
    this.color = {
        _value: utils.ensureArrayInstanceOf( options.color.value, THREE.Color, new THREE.Color() ),
        _spread: utils.ensureArrayInstanceOf( options.color.spread, THREE.Vector3, new THREE.Vector3() ),
        _randomise: utils.ensureTypedArg( options.position.randomise, types.BOOLEAN, false )
    };

    this.opacity = {
        _value: utils.ensureArrayTypedArg( options.opacity.value, types.NUMBER, 1 ),
        _spread: utils.ensureArrayTypedArg( options.opacity.spread, types.NUMBER, 0 ),
        _randomise: utils.ensureTypedArg( options.position.randomise, types.BOOLEAN, false )
    };

    this.size = {
        _value: utils.ensureArrayTypedArg( options.size.value, types.NUMBER, 1 ),
        _spread: utils.ensureArrayTypedArg( options.size.spread, types.NUMBER, 0 ),
        _randomise: utils.ensureTypedArg( options.position.randomise, types.BOOLEAN, false )
    };

    this.angle = {
        _value: utils.ensureArrayTypedArg( options.angle.value, types.NUMBER, 0 ),
        _spread: utils.ensureArrayTypedArg( options.angle.spread, types.NUMBER, 0 ),
        _randomise: utils.ensureTypedArg( options.position.randomise, types.BOOLEAN, false )
    };


    // Assign renaining option values.
    this.particleCount = utils.ensureTypedArg( options.particleCount, types.NUMBER, 100 );
    this.duration = utils.ensureTypedArg( options.duration, types.NUMBER, null );
    this.isStatic = utils.ensureTypedArg( options.isStatic, types.BOOLEAN, false );
    this.activeMultiplier = utils.ensureTypedArg( options.activeMultiplier, types.NUMBER, 1 );
    this.direction = utils.ensureTypedArg( options.direction, types.NUMBER, 1 );

    // Whether this emitter is alive or not.
    this.alive = utils.ensureTypedArg( options.alive, types.BOOLEAN, true );


    // The following properties are set internally and are not
    // user-controllable.
    this.particlesPerSecond = 0;

    // The current particle index for which particles should
    // be marked as active on the next update cycle.
    this.activationIndex = 0;

    // The offset in the typed arrays this emitter's
    // particle's values will start at
    this.attributeOffset = 0;

    // The end of the range in the attribute buffers
    this.attributeEnd = 0;



    // Holds the time the emitter has been alive for.
    this.age = 0.0;

    // Holds the number of currently-alive particles
    this.activeParticleCount = 0.0;

    // Holds a reference to this emitter's group once
    // it's added to one.
    this.group = null;

    // Holds a reference to this emitter's group's attributes object
    // for easier access.
    this.attributes = null;

    // Holds a reference to the params attribute's typed array
    // for quicker access.
    this.paramsArray = null;

    // A set of flags to determine whether particular properties
    // should be re-randomised when a particle is reset.
    //
    // If a `randomise` property is given, this is preferred.
    // Otherwise, it looks at whether a spread value has been
    // given.
    //
    // It allows randomization to be turned off as desired. If
    // all randomization is turned off, then I'd expect a performance
    // boost as no attribute buffers (excluding the `params`)
    // would have to be re-passed to the GPU each frame (since nothing
    // except the `params` attribute would have changed).
    this.resetFlags = {
        // params: utils.ensureTypedArg( options.maxAge.randomise, types.BOOLEAN, !!options.maxAge.spread ) ||
        //     utils.ensureTypedArg( options.wiggle.randomise, types.BOOLEAN, !!options.wiggle.spread ),
        position: utils.ensureTypedArg( options.position.randomise, types.BOOLEAN, false ) ||
            utils.ensureTypedArg( options.radius.randomise, types.BOOLEAN, false ),
        velocity: utils.ensureTypedArg( options.velocity.randomise, types.BOOLEAN, false ),
        acceleration: utils.ensureTypedArg( options.acceleration.randomise, types.BOOLEAN, false ) ||
            utils.ensureTypedArg( options.drag.randomise, types.BOOLEAN, false ),
        rotation: utils.ensureTypedArg( options.rotation.randomise, types.BOOLEAN, false ),
        rotationCenter: utils.ensureTypedArg( options.rotation.randomise, types.BOOLEAN, false ),
        size: utils.ensureTypedArg( options.size.randomise, types.BOOLEAN, false ),
        color: utils.ensureTypedArg( options.color.randomise, types.BOOLEAN, false ),
        opacity: utils.ensureTypedArg( options.opacity.randomise, types.BOOLEAN, false ),
        angle: utils.ensureTypedArg( options.angle.randomise, types.BOOLEAN, false )
    };

    this.updateFlags = {};
    this.updateCounts = {};

    // A map to indicate which emitter parameters should update
    // which attribute.
    this.updateMap = {
        maxAge: 'params',
        position: 'position',
        velocity: 'velocity',
        acceleration: 'acceleration',
        drag: 'acceleration',
        wiggle: 'params',
        rotation: 'rotation',
        size: 'size',
        color: 'color',
        opacity: 'opacity',
        angle: 'angle'
    };

    for ( var i in this.updateMap ) {
        if ( this.updateMap.hasOwnProperty( i ) ) {
            this.updateCounts[ this.updateMap[ i ] ] = 0.0;
            this.updateFlags[ this.updateMap[ i ] ] = false;
            this._createGetterSetters( this[ i ], i );
        }
    }

    this.bufferUpdateRanges = {};
    this.attributeKeys = null;
    this.attributeCount = 0;


    // Ensure that the value-over-lifetime property objects above
    // have value and spread properties that are of the same length.
    //
    // Also, for now, make sure they have a length of 3 (min/max arguments here).
    utils.ensureValueOverLifetimeCompliance( this.color, lifetimeLength, lifetimeLength );
    utils.ensureValueOverLifetimeCompliance( this.opacity, lifetimeLength, lifetimeLength );
    utils.ensureValueOverLifetimeCompliance( this.size, lifetimeLength, lifetimeLength );
    utils.ensureValueOverLifetimeCompliance( this.angle, lifetimeLength, lifetimeLength );
};

Emitter.constructor = Emitter;

Emitter.prototype._createGetterSetters = function( propObj, propName ) {
    'use strict';

    var self = this;

    for ( var i in propObj ) {
        if ( propObj.hasOwnProperty( i ) ) {

            var name = i.replace( '_', '' );

            Object.defineProperty( propObj, name, {
                get: ( function( prop ) {
                    return function() {
                        return this[ prop ];
                    };
                }( i ) ),

                set: ( function( prop ) {
                    return function( value ) {
                        var mapName = self.updateMap[ propName ],
                            prevValue = this[ prop ],
                            length = valueOverLifetimeLength;

                        if ( prop === '_rotationCenter' ) {
                            self.updateFlags.rotationCenter = true;
                            self.updateCounts.rotationCenter = 0.0;
                        }
                        else if ( prop === '_randomise' ) {
                            self.resetFlags[ mapName ] = value;
                        }
                        else {
                            self.updateFlags[ mapName ] = true;
                            self.updateCounts[ mapName ] = 0.0;
                        }

                        self.group._updateDefines();

                        this[ prop ] = value;

                        // If the previous value was an array, then make
                        // sure the provided value is interpolated correctly.
                        if ( Array.isArray( prevValue ) ) {
                            utils.ensureValueOverLifetimeCompliance( self[ propName ], length, length );
                        }
                    };
                }( i ) )
            } );
        }
    }
};

Emitter.prototype._setBufferUpdateRanges = function( keys ) {
    'use strict';

    this.attributeKeys = keys;
    this.attributeCount = keys.length;

    for ( var i = this.attributeCount - 1; i >= 0; --i ) {
        this.bufferUpdateRanges[ keys[ i ] ] = {
            min: Number.POSITIVE_INFINITY,
            max: Number.NEGATIVE_INFINITY
        };
    }
};

Emitter.prototype._calculatePPSValue = function( groupMaxAge ) {
    'use strict';

    var particleCount = this.particleCount;


    // Calculate the `particlesPerSecond` value for this emitter. It's used
    // when determining which particles should die and which should live to
    // see another day. Or be born, for that matter. The "God" property.
    if ( this.duration ) {
        this.particlesPerSecond = particleCount / ( groupMaxAge < this.duration ? groupMaxAge : this.duration );
    }
    else {
        this.particlesPerSecond = particleCount / groupMaxAge;
    }
};

Emitter.prototype._setAttributeOffset = function( startIndex ) {
    this.attributeOffset = startIndex;
    this.activationIndex = startIndex;
    this.activationEnd = startIndex + this.particleCount;
};


Emitter.prototype._assignValue = function( prop, index ) {
    'use strict';

    switch ( prop ) {
        case 'position':
            this._assignPositionValue( index );
            break;

        case 'velocity':
        case 'acceleration':
            this._assignForceValue( index, prop );
            break;

        case 'size':
        case 'opacity':
            this._assignAbsLifetimeValue( index, prop );
            break;

        case 'angle':
            this._assignAngleValue( index );
            break;

        case 'params':
            this._assignParamsValue( index );
            break;

        case 'rotation':
            this._assignRotationValue( index );
            break;

        case 'color':
            this._assignColorValue( index );
            break;
    }
};

Emitter.prototype._assignPositionValue = function( index ) {
    'use strict';

    var prop = this.position,
        attr = this.attributes.position,
        value = prop._value,
        spread = prop._spread,
        distribution = prop._distribution;

    switch ( distribution ) {
        case distributions.BOX:
            utils.randomVector3( attr, index, value, spread, prop._spreadClamp );
            break;

        case distributions.SPHERE:
            utils.randomVector3OnSphere( attr, index, value, prop._radius, prop._spread.x, prop._radiusScale, prop._spreadClamp.x, prop._distributionClamp || this.particleCount );
            break;

        case distributions.DISC:
            utils.randomVector3OnDisc( attr, index, value, prop._radius, prop._spread.x, prop._radiusScale, prop._spreadClamp.x );
            break;
    }
};

Emitter.prototype._assignForceValue = function( index, attrName ) {
    'use strict';

    var prop = this[ attrName ],
        value = prop._value,
        spread = prop._spread,
        distribution = prop._distribution,
        pos,
        positionX,
        positionY,
        positionZ,
        i;

    switch ( distribution ) {
        case distributions.BOX:
            utils.randomVector3( this.attributes[ attrName ], index, value, spread );
            break;

        case distributions.SPHERE:
            pos = this.attributes.position.typedArray.array;
            i = index * 3;

            // Ensure position values aren't zero, otherwise no force will be
            // applied.
            // positionX = utils.zeroToEpsilon( pos[ i ], true );
            // positionY = utils.zeroToEpsilon( pos[ i + 1 ], true );
            // positionZ = utils.zeroToEpsilon( pos[ i + 2 ], true );
            positionX = pos[ i ];
            positionY = pos[ i + 1 ];
            positionZ = pos[ i + 2 ];

            utils.randomDirectionVector3OnSphere(
                this.attributes[ attrName ], index,
                positionX, positionY, positionZ,
                this.position._value,
                prop._value.x,
                prop._spread.x
            );
            break;

        case distributions.DISC:
            pos = this.attributes.position.typedArray.array;
            i = index * 3;

            // Ensure position values aren't zero, otherwise no force will be
            // applied.
            // positionX = utils.zeroToEpsilon( pos[ i ], true );
            // positionY = utils.zeroToEpsilon( pos[ i + 1 ], true );
            // positionZ = utils.zeroToEpsilon( pos[ i + 2 ], true );
            positionX = pos[ i ];
            positionY = pos[ i + 1 ];
            positionZ = pos[ i + 2 ];

            utils.randomDirectionVector3OnDisc(
                this.attributes[ attrName ], index,
                positionX, positionY, positionZ,
                this.position._value,
                prop._value.x,
                prop._spread.x
            );
            break;
    }

    if ( attrName === 'acceleration' ) {
        var drag = utils.clamp( utils.randomFloat( this.drag._value, this.drag._spread ), 0, 1 );
        this.attributes.acceleration.typedArray.array[ index * 4 + 3 ] = drag;
    }
};

Emitter.prototype._assignAbsLifetimeValue = function( index, propName ) {
    'use strict';

    var array = this.attributes[ propName ].typedArray,
        prop = this[ propName ],
        value;

    if ( utils.arrayValuesAreEqual( prop._value ) && utils.arrayValuesAreEqual( prop._spread ) ) {
        value = Math.abs( utils.randomFloat( prop._value[ 0 ], prop._spread[ 0 ] ) );
        array.setVec4Components( index, value, value, value, value );
    }
    else {
        array.setVec4Components( index,
            Math.abs( utils.randomFloat( prop._value[ 0 ], prop._spread[ 0 ] ) ),
            Math.abs( utils.randomFloat( prop._value[ 1 ], prop._spread[ 1 ] ) ),
            Math.abs( utils.randomFloat( prop._value[ 2 ], prop._spread[ 2 ] ) ),
            Math.abs( utils.randomFloat( prop._value[ 3 ], prop._spread[ 3 ] ) )
        );
    }
};

Emitter.prototype._assignAngleValue = function( index ) {
    'use strict';

    var array = this.attributes.angle.typedArray,
        prop = this.angle,
        value;

    if ( utils.arrayValuesAreEqual( prop._value ) && utils.arrayValuesAreEqual( prop._spread ) ) {
        value = utils.randomFloat( prop._value[ 0 ], prop._spread[ 0 ] );
        array.setVec4Components( index, value, value, value, value );
    }
    else {
        array.setVec4Components( index,
            utils.randomFloat( prop._value[ 0 ], prop._spread[ 0 ] ),
            utils.randomFloat( prop._value[ 1 ], prop._spread[ 1 ] ),
            utils.randomFloat( prop._value[ 2 ], prop._spread[ 2 ] ),
            utils.randomFloat( prop._value[ 3 ], prop._spread[ 3 ] )
        );
    }
};

Emitter.prototype._assignParamsValue = function( index ) {
    'use strict';

    this.attributes.params.typedArray.setVec4Components( index,
        this.isStatic ? 1 : 0,
        0.0,
        Math.abs( utils.randomFloat( this.maxAge._value, this.maxAge._spread ) ),
        utils.randomFloat( this.wiggle._value, this.wiggle._spread )
    );
};

Emitter.prototype._assignRotationValue = function( index ) {
    'use strict';

    this.attributes.rotation.typedArray.setVec3Components( index,
        utils.getPackedRotationAxis( this.rotation._axis, this.rotation._axisSpread ),
        utils.randomFloat( this.rotation._angle, this.rotation._angleSpread ),
        this.rotation._static ? 0 : 1
    );

    this.attributes.rotationCenter.typedArray.setVec3( index, this.rotation._center );
};

Emitter.prototype._assignColorValue = function( index ) {
    'use strict';
    utils.randomColorAsHex( this.attributes.color, index, this.color._value, this.color._spread );
};

Emitter.prototype._resetParticle = function( index ) {
    'use strict';

    var resetFlags = this.resetFlags,
        updateFlags = this.updateFlags,
        updateCounts = this.updateCounts,
        keys = this.attributeKeys,
        key,
        updateFlag;

    for ( var i = this.attributeCount - 1; i >= 0; --i ) {
        key = keys[ i ];
        updateFlag = updateFlags[ key ];

        if ( resetFlags[ key ] === true || updateFlag === true ) {
            this._assignValue( key, index );
            this._updateAttributeUpdateRange( key, index );

            if ( updateFlag === true && updateCounts[ key ] === this.particleCount ) {
                updateFlags[ key ] = false;
                updateCounts[ key ] = 0.0;
            }
            else if ( updateFlag == true ) {
                ++updateCounts[ key ];
            }
        }
    }
};

Emitter.prototype._updateAttributeUpdateRange = function( attr, i ) {
    'use strict';

    var ranges = this.bufferUpdateRanges[ attr ];

    ranges.min = Math.min( i, ranges.min );
    ranges.max = Math.max( i, ranges.max );
};

Emitter.prototype._resetBufferRanges = function() {
    'use strict';

    var ranges = this.bufferUpdateRanges,
        keys = this.bufferUpdateKeys,
        i = this.bufferUpdateCount - 1,
        key;

    for ( i; i >= 0; --i ) {
        key = keys[ i ];
        ranges[ key ].min = Number.POSITIVE_INFINITY;
        ranges[ key ].max = Number.NEGATIVE_INFINITY;
    }
};

Emitter.prototype._onRemove = function() {
    'use strict';
    // Reset any properties of the emitter that were set by
    // a group when it was added.
    this.particlesPerSecond = 0;
    this.attributeOffset = 0;
    this.activationIndex = 0;
    this.activeParticleCount = 0;
    this.group = null;
    this.attributes = null;
    this.paramsArray = null;
    this.age = 0.0;
};

Emitter.prototype._decrementParticleCount = function() {
    'use strict';
    --this.activeParticleCount;

    // TODO:
    //  - Trigger event if count === 0.
};

Emitter.prototype._incrementParticleCount = function() {
    'use strict';
    ++this.activeParticleCount;

    // TODO:
    //  - Trigger event if count === this.particleCount.
};

Emitter.prototype._checkParticleAges = function( start, end, params, dt ) {
    'use strict';
    for ( var i = end - 1, index, maxAge, age, alive; i >= start; --i ) {
        index = i * 4;

        alive = params[ index ];

        if ( alive === 0.0 ) {
            continue;
        }

        // Increment age
        age = params[ index + 1 ];
        maxAge = params[ index + 2 ];

        if ( this.direction === 1 ) {
            age += dt;

            if ( age >= maxAge ) {
                age = 0.0;
                alive = 0.0;
                this._decrementParticleCount();
            }
        }
        else {
            age -= dt;

            if ( age <= 0.0 ) {
                age = maxAge;
                alive = 0.0;
                this._decrementParticleCount();
            }
        }

        params[ index ] = alive;
        params[ index + 1 ] = age;

        this._updateAttributeUpdateRange( 'params', i );
    }
};

Emitter.prototype._activateParticles = function( activationStart, activationEnd, params, dtPerParticle ) {
    'use strict';
    var direction = this.direction;

    for ( var i = activationStart, index, dtValue; i < activationEnd; ++i ) {
        index = i * 4;

        // Don't re-activate particles that aren't dead yet.
        // if ( params[ index ] !== 0.0 && ( this.particleCount !== 1 || this.activeMultiplier !== 1 ) ) {
        //     continue;
        // }

        if ( params[ index ] != 0.0 && this.particleCount !== 1 ) {
            continue;
        }

        // Increment the active particle count.
        this._incrementParticleCount();

        // Mark the particle as alive.
        params[ index ] = 1.0;

        // Reset the particle
        this._resetParticle( i );

        // Move each particle being activated to
        // it's actual position in time.
        //
        // This stops particles being 'clumped' together
        // when frame rates are on the lower side of 60fps
        // or not constant (a very real possibility!)
        dtValue = dtPerParticle * ( i - activationStart );
        params[ index + 1 ] = direction === -1 ? params[ index + 2 ] - dtValue : dtValue;

        this._updateAttributeUpdateRange( 'params', i );
    }
};

/**
 * Simulates one frame's worth of particles, updating particles
 * that are already alive, and marking ones that are currently dead
 * but should be alive as alive.
 *
 * If the emitter is marked as static, then this function will do nothing.
 *
 * @param  {Number} dt The number of seconds to simulate (deltaTime)
 */
Emitter.prototype.tick = function( dt ) {
    'use strict';

    if ( this.isStatic ) {
        return;
    }

    if ( this.paramsArray === null ) {
        this.paramsArray = this.attributes.params.typedArray.array;
    }

    var start = this.attributeOffset,
        end = start + this.particleCount,
        params = this.paramsArray, // vec3( alive, age, maxAge, wiggle )
        ppsDt = this.particlesPerSecond * this.activeMultiplier * dt,
        activationIndex = this.activationIndex;

    // Reset the buffer update indices.
    this._resetBufferRanges();

    // Increment age for those particles that are alive,
    // and kill off any particles whose age is over the limit.
    this._checkParticleAges( start, end, params, dt );

    // If the emitter is dead, reset the age of the emitter to zero,
    // ready to go again if required
    if ( this.alive === false ) {
        this.age = 0.0;
        return;
    }

    // If the emitter has a specified lifetime and we've exceeded it,
    // mark the emitter as dead.
    if ( this.duration !== null && this.age > this.duration ) {
        this.alive = false;
        this.age = 0.0;
        return;
    }


    var activationStart = this.particleCount === 1 ? activationIndex : ( activationIndex | 0 ),
        activationEnd = Math.min( activationStart + ppsDt, this.activationEnd ),
        activationCount = activationEnd - this.activationIndex | 0,
        dtPerParticle = activationCount > 0 ? dt / activationCount : 0;

    this._activateParticles( activationStart, activationEnd, params, dtPerParticle );

    // Move the activation window forward, soldier.
    this.activationIndex += ppsDt;

    if ( this.activationIndex > end ) {
        this.activationIndex = start;
    }


    // Increment the age of the emitter.
    this.age += dt;
};

/**
 * Resets all the emitter's particles to their start positions
 * and marks the particles as dead if the `force` argument is
 * true.
 *
 * @param  {Boolean} [force=undefined] If true, all particles will be marked as dead instantly.
 * @return {Emitter}       This emitter instance.
 */
Emitter.prototype.reset = function( force ) {
    'use strict';

    this.age = 0.0;
    this.alive = false;

    if ( force === true ) {
        var start = this.attributeOffset,
            end = start + this.particleCount,
            array = this.paramsArray,
            attr = this.attributes.params.bufferAttribute;

        for ( var i = end - 1, index; i >= start; --i ) {
            index = i * 4;

            array[ index ] = 0.0;
            array[ index + 1 ] = 0.0;
        }

        attr.updateRange.offset = 0;
        attr.updateRange.count = -1;
        attr.needsUpdate = true;
    }

    return this;
};

/**
 * Enables the emitter. If not already enabled, the emitter
 * will start emitting particles.
 *
 * @return {Emitter} This emitter instance.
 */
Emitter.prototype.enable = function() {
    'use strict';
    this.alive = true;
    return this;
};

/**
 * Disables th emitter, but does not instantly remove it's
 * particles fromt the scene. When called, the emitter will be
 * 'switched off' and just stop emitting. Any particle's alive will
 * be allowed to finish their lifecycle.
 *
 * @return {Emitter} This emitter instance.
 */
Emitter.prototype.disable = function() {
    'use strict';

    this.alive = false;
    return this;
};

/**
 * Remove this emitter from it's parent group (if it has been added to one).
 * Delgates to SPE.group.prototype.removeEmitter().
 *
 * When called, all particle's belonging to this emitter will be instantly
 * removed from the scene.
 *
 * @return {Emitter} This emitter instance.
 *
 * @see SPE.Group.prototype.removeEmitter
 */
Emitter.prototype.remove = function() {
    'use strict';
    if ( this.group !== null ) {
        this.group.removeEmitter( this );
    }
    else {
        console.error( 'Emitter does not belong to a group, cannot remove.' );
    }

    return this;
};

export default Emitter;
