import * as THREE from 'three';

/**
 * A bunch of utility functions used throughout the library.
 * @namespace
 * @type {Object}
 */
export default {
    /**
     * A map of types used by `SPE.utils.ensureTypedArg` and
     * `SPE.utils.ensureArrayTypedArg` to compare types against.
     *
     * @enum {String}
     */
    types: {
        /**
         * Boolean type.
         * @type {String}
         */
        BOOLEAN: 'boolean',

        /**
         * String type.
         * @type {String}
         */
        STRING: 'string',

        /**
         * Number type.
         * @type {String}
         */
        NUMBER: 'number',

        /**
         * Object type.
         * @type {String}
         */
        OBJECT: 'object'
    },

    /**
     * Given a value, a type, and a default value to fallback to,
     * ensure the given argument adheres to the type requesting,
     * returning the default value if type check is false.
     *
     * @param  {(boolean|string|number|object)} arg          The value to perform a type-check on.
     * @param  {String} type         The type the `arg` argument should adhere to.
     * @param  {(boolean|string|number|object)} defaultValue A default value to fallback on if the type check fails.
     * @return {(boolean|string|number|object)}              The given value if type check passes, or the default value if it fails.
     */
    ensureTypedArg: function( arg, type, defaultValue ) {
        'use strict';

        if ( typeof arg === type ) {
            return arg;
        }
        else {
            return defaultValue;
        }
    },

    /**
     * Given an array of values, a type, and a default value,
     * ensure the given array's contents ALL adhere to the provided type,
     * returning the default value if type check fails.
     *
     * If the given value to check isn't an Array, delegates to SPE.utils.ensureTypedArg.
     *
     * @param  {Array|boolean|string|number|object} arg          The array of values to check type of.
     * @param  {String} type         The type that should be adhered to.
     * @param  {(boolean|string|number|object)} defaultValue A default fallback value.
     * @return {(boolean|string|number|object)}              The given value if type check passes, or the default value if it fails.
     */
    ensureArrayTypedArg: function( arg, type, defaultValue ) {
        'use strict';

        // If the argument being checked is an array, loop through
        // it and ensure all the values are of the correct type,
        // falling back to the defaultValue if any aren't.
        if ( Array.isArray( arg ) ) {
            for ( var i = arg.length - 1; i >= 0; --i ) {
                if ( typeof arg[ i ] !== type ) {
                    return defaultValue;
                }
            }

            return arg;
        }

        // If the arg isn't an array then just fallback to
        // checking the type.
        return this.ensureTypedArg( arg, type, defaultValue );
    },

    /**
     * Ensures the given value is an instance of a constructor function.
     *
     * @param  {Object} arg          The value to check instance of.
     * @param  {Function} instance     The constructor of the instance to check against.
     * @param  {Object} defaultValue A default fallback value if instance check fails
     * @return {Object}              The given value if type check passes, or the default value if it fails.
     */
    ensureInstanceOf: function( arg, instance, defaultValue ) {
        'use strict';

        if ( instance !== undefined && arg instanceof instance ) {
            return arg;
        }
        else {
            return defaultValue;
        }
    },

    /**
     * Given an array of values, ensure the instances of all items in the array
     * matches the given instance constructor falling back to a default value if
     * the check fails.
     *
     * If given value isn't an Array, delegates to `SPE.utils.ensureInstanceOf`.
     *
     * @param  {Array|Object} arg          The value to perform the instanceof check on.
     * @param  {Function} instance     The constructor of the instance to check against.
     * @param  {Object} defaultValue A default fallback value if instance check fails
     * @return {Object}              The given value if type check passes, or the default value if it fails.
     */
    ensureArrayInstanceOf: function( arg, instance, defaultValue ) {
        'use strict';

        // If the argument being checked is an array, loop through
        // it and ensure all the values are of the correct type,
        // falling back to the defaultValue if any aren't.
        if ( Array.isArray( arg ) ) {
            for ( var i = arg.length - 1; i >= 0; --i ) {
                if ( instance !== undefined && arg[ i ] instanceof instance === false ) {
                    return defaultValue;
                }
            }

            return arg;
        }

        // If the arg isn't an array then just fallback to
        // checking the type.
        return this.ensureInstanceOf( arg, instance, defaultValue );
    },

    /**
     * Ensures that any "value-over-lifetime" properties of an emitter are
     * of the correct length (as dictated by `SPE.valueOverLifetimeLength`).
     *
     * Delegates to `SPE.utils.interpolateArray` for array resizing.
     *
     * If properties aren't arrays, then property values are put into one.
     *
     * @param  {Object} property  The property of an SPE.Emitter instance to check compliance of.
     * @param  {Number} minLength The minimum length of the array to create.
     * @param  {Number} maxLength The maximum length of the array to create.
     */
    ensureValueOverLifetimeCompliance: function( property, minLength, maxLength ) {
        'use strict';

        minLength = minLength || 3;
        maxLength = maxLength || 3;

        // First, ensure both properties are arrays.
        if ( Array.isArray( property._value ) === false ) {
            property._value = [ property._value ];
        }

        if ( Array.isArray( property._spread ) === false ) {
            property._spread = [ property._spread ];
        }

        var valueLength = this.clamp( property._value.length, minLength, maxLength ),
            spreadLength = this.clamp( property._spread.length, minLength, maxLength ),
            desiredLength = Math.max( valueLength, spreadLength );

        if ( property._value.length !== desiredLength ) {
            property._value = this.interpolateArray( property._value, desiredLength );
        }

        if ( property._spread.length !== desiredLength ) {
            property._spread = this.interpolateArray( property._spread, desiredLength );
        }
    },

    /**
     * Performs linear interpolation (lerp) on an array.
     *
     * For example, lerping [1, 10], with a `newLength` of 10 will produce [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].
     *
     * Delegates to `SPE.utils.lerpTypeAgnostic` to perform the actual
     * interpolation.
     *
     * @param  {Array} srcArray  The array to lerp.
     * @param  {Number} newLength The length the array should be interpolated to.
     * @return {Array}           The interpolated array.
     */
    interpolateArray: function( srcArray, newLength ) {
        'use strict';

        var sourceLength = srcArray.length,
            newArray = [ typeof srcArray[ 0 ].clone === 'function' ? srcArray[ 0 ].clone() : srcArray[ 0 ] ],
            factor = ( sourceLength - 1 ) / ( newLength - 1 );


        for ( var i = 1; i < newLength - 1; ++i ) {
            var f = i * factor,
                before = Math.floor( f ),
                after = Math.ceil( f ),
                delta = f - before;

            newArray[ i ] = this.lerpTypeAgnostic( srcArray[ before ], srcArray[ after ], delta );
        }

        newArray.push(
            typeof srcArray[ sourceLength - 1 ].clone === 'function' ?
            srcArray[ sourceLength - 1 ].clone() :
            srcArray[ sourceLength - 1 ]
        );

        return newArray;
    },

    /**
     * Clamp a number to between the given min and max values.
     * @param  {Number} value The number to clamp.
     * @param  {Number} min   The minimum value.
     * @param  {Number} max   The maximum value.
     * @return {Number}       The clamped number.
     */
    clamp: function( value, min, max ) {
        'use strict';

        return Math.max( min, Math.min( value, max ) );
    },

    /**
     * If the given value is less than the epsilon value, then return
     * a randomised epsilon value if specified, or just the epsilon value if not.
     * Works for negative numbers as well as positive.
     *
     * @param  {Number} value     The value to perform the operation on.
     * @param  {Boolean} randomise Whether the value should be randomised.
     * @return {Number}           The result of the operation.
     */
    zeroToEpsilon: function( value, randomise ) {
        'use strict';

        var epsilon = 0.00001,
            result = value;

        result = randomise ? Math.random() * epsilon * 10 : epsilon;

        if ( value < 0 && value > -epsilon ) {
            result = -result;
        }

        // if ( value === 0 ) {
        //     result = randomise ? Math.random() * epsilon * 10 : epsilon;
        // }
        // else if ( value > 0 && value < epsilon ) {
        //     result = randomise ? Math.random() * epsilon * 10 : epsilon;
        // }
        // else if ( value < 0 && value > -epsilon ) {
        //     result = -( randomise ? Math.random() * epsilon * 10 : epsilon );
        // }

        return result;
    },

    /**
     * Linearly interpolates two values of various types. The given values
     * must be of the same type for the interpolation to work.
     * @param  {(number|Object)} start The start value of the lerp.
     * @param  {(number|object)} end   The end value of the lerp.
     * @param  {Number} delta The delta posiiton of the lerp operation. Ideally between 0 and 1 (inclusive).
     * @return {(number|object|undefined)}       The result of the operation. Result will be undefined if
     *                                               the start and end arguments aren't a supported type, or
     *                                               if their types do not match.
     */
    lerpTypeAgnostic: function( start, end, delta ) {
        'use strict';

        var types = this.types,
            out;

        if ( typeof start === types.NUMBER && typeof end === types.NUMBER ) {
            return start + ( ( end - start ) * delta );
        }
        else if ( start instanceof THREE.Vector2 && end instanceof THREE.Vector2 ) {
            out = start.clone();
            out.x = this.lerp( start.x, end.x, delta );
            out.y = this.lerp( start.y, end.y, delta );
            return out;
        }
        else if ( start instanceof THREE.Vector3 && end instanceof THREE.Vector3 ) {
            out = start.clone();
            out.x = this.lerp( start.x, end.x, delta );
            out.y = this.lerp( start.y, end.y, delta );
            out.z = this.lerp( start.z, end.z, delta );
            return out;
        }
        else if ( start instanceof THREE.Vector4 && end instanceof THREE.Vector4 ) {
            out = start.clone();
            out.x = this.lerp( start.x, end.x, delta );
            out.y = this.lerp( start.y, end.y, delta );
            out.z = this.lerp( start.z, end.z, delta );
            out.w = this.lerp( start.w, end.w, delta );
            return out;
        }
        else if ( start instanceof THREE.Color && end instanceof THREE.Color ) {
            out = start.clone();
            out.r = this.lerp( start.r, end.r, delta );
            out.g = this.lerp( start.g, end.g, delta );
            out.b = this.lerp( start.b, end.b, delta );
            return out;
        }
        else {
            console.warn( 'Invalid argument types, or argument types do not match:', start, end );
        }
    },

    /**
     * Perform a linear interpolation operation on two numbers.
     * @param  {Number} start The start value.
     * @param  {Number} end   The end value.
     * @param  {Number} delta The position to interpolate to.
     * @return {Number}       The result of the lerp operation.
     */
    lerp: function( start, end, delta ) {
        'use strict';
        return start + ( ( end - start ) * delta );
    },

    /**
     * Rounds a number to a nearest multiple.
     *
     * @param  {Number} n        The number to round.
     * @param  {Number} multiple The multiple to round to.
     * @return {Number}          The result of the round operation.
     */
    roundToNearestMultiple: function( n, multiple ) {
        'use strict';

        var remainder = 0;

        if ( multiple === 0 ) {
            return n;
        }

        remainder = Math.abs( n ) % multiple;

        if ( remainder === 0 ) {
            return n;
        }

        if ( n < 0 ) {
            return -( Math.abs( n ) - remainder );
        }

        return n + multiple - remainder;
    },

    /**
     * Check if all items in an array are equal. Uses strict equality.
     *
     * @param  {Array} array The array of values to check equality of.
     * @return {Boolean}       Whether the array's values are all equal or not.
     */
    arrayValuesAreEqual: function( array ) {
        'use strict';

        for ( var i = 0; i < array.length - 1; ++i ) {
            if ( array[ i ] !== array[ i + 1 ] ) {
                return false;
            }
        }

        return true;
    },

    // colorsAreEqual: function() {
    //     var colors = Array.prototype.slice.call( arguments ),
    //         numColors = colors.length;

    //     for ( var i = 0, color1, color2; i < numColors - 1; ++i ) {
    //         color1 = colors[ i ];
    //         color2 = colors[ i + 1 ];

    //         if (
    //             color1.r !== color2.r ||
    //             color1.g !== color2.g ||
    //             color1.b !== color2.b
    //         ) {
    //             return false
    //         }
    //     }

    //     return true;
    // },


    /**
     * Given a start value and a spread value, create and return a random
     * number.
     * @param  {Number} base   The start value.
     * @param  {Number} spread The size of the random variance to apply.
     * @return {Number}        A randomised number.
     */
    randomFloat: function( base, spread ) {
        'use strict';
        return base + spread * ( Math.random() - 0.5 );
    },



    /**
     * Given an SPE.ShaderAttribute instance, and various other settings,
     * assign values to the attribute's array in a `vec3` format.
     *
     * @param  {Object} attribute   The instance of SPE.ShaderAttribute to save the result to.
     * @param  {Number} index       The offset in the attribute's TypedArray to save the result from.
     * @param  {Object} base        THREE.Vector3 instance describing the start value.
     * @param  {Object} spread      THREE.Vector3 instance describing the random variance to apply to the start value.
     * @param  {Object} spreadClamp THREE.Vector3 instance describing the multiples to clamp the randomness to.
     */
    randomVector3: function( attribute, index, base, spread, spreadClamp ) {
        'use strict';

        var x = base.x + ( Math.random() * spread.x - ( spread.x * 0.5 ) ),
            y = base.y + ( Math.random() * spread.y - ( spread.y * 0.5 ) ),
            z = base.z + ( Math.random() * spread.z - ( spread.z * 0.5 ) );

        // var x = this.randomFloat( base.x, spread.x ),
        // y = this.randomFloat( base.y, spread.y ),
        // z = this.randomFloat( base.z, spread.z );

        if ( spreadClamp ) {
            x = -spreadClamp.x * 0.5 + this.roundToNearestMultiple( x, spreadClamp.x );
            y = -spreadClamp.y * 0.5 + this.roundToNearestMultiple( y, spreadClamp.y );
            z = -spreadClamp.z * 0.5 + this.roundToNearestMultiple( z, spreadClamp.z );
        }

        attribute.typedArray.setVec3Components( index, x, y, z );
    },

    /**
     * Given an SPE.Shader attribute instance, and various other settings,
     * assign Color values to the attribute.
     * @param  {Object} attribute The instance of SPE.ShaderAttribute to save the result to.
     * @param  {Number} index     The offset in the attribute's TypedArray to save the result from.
     * @param  {Object} base      THREE.Color instance describing the start color.
     * @param  {Object} spread    THREE.Vector3 instance describing the random variance to apply to the start color.
     */
    randomColor: function( attribute, index, base, spread ) {
        'use strict';

        var r = base.r + ( Math.random() * spread.x ),
            g = base.g + ( Math.random() * spread.y ),
            b = base.b + ( Math.random() * spread.z );

        r = this.clamp( r, 0, 1 );
        g = this.clamp( g, 0, 1 );
        b = this.clamp( b, 0, 1 );


        attribute.typedArray.setVec3Components( index, r, g, b );
    },


    randomColorAsHex: ( function() {
        'use strict';

        var workingColor = new THREE.Color();

        /**
         * Assigns a random color value, encoded as a hex value in decimal
         * format, to a SPE.ShaderAttribute instance.
         * @param  {Object} attribute The instance of SPE.ShaderAttribute to save the result to.
         * @param  {Number} index     The offset in the attribute's TypedArray to save the result from.
         * @param  {Object} base      THREE.Color instance describing the start color.
         * @param  {Object} spread    THREE.Vector3 instance describing the random variance to apply to the start color.
         */
        return function( attribute, index, base, spread ) {
            var numItems = base.length,
                colors = [];

            for ( var i = 0; i < numItems; ++i ) {
                var spreadVector = spread[ i ];

                workingColor.copy( base[ i ] );

                workingColor.r += ( Math.random() * spreadVector.x ) - ( spreadVector.x * 0.5 );
                workingColor.g += ( Math.random() * spreadVector.y ) - ( spreadVector.y * 0.5 );
                workingColor.b += ( Math.random() * spreadVector.z ) - ( spreadVector.z * 0.5 );

                workingColor.r = this.clamp( workingColor.r, 0, 1 );
                workingColor.g = this.clamp( workingColor.g, 0, 1 );
                workingColor.b = this.clamp( workingColor.b, 0, 1 );

                colors.push( workingColor.getHex() );
            }

            attribute.typedArray.setVec4Components( index, colors[ 0 ], colors[ 1 ], colors[ 2 ], colors[ 3 ] );
        };
    }() ),

    /**
     * Assigns a random vector 3 value to an SPE.ShaderAttribute instance, projecting the
     * given values onto a sphere.
     *
     * @param  {Object} attribute The instance of SPE.ShaderAttribute to save the result to.
     * @param  {Number} index     The offset in the attribute's TypedArray to save the result from.
     * @param  {Object} base              THREE.Vector3 instance describing the origin of the transform.
     * @param  {Number} radius            The radius of the sphere to project onto.
     * @param  {Number} radiusSpread      The amount of randomness to apply to the projection result
     * @param  {Object} radiusScale       THREE.Vector3 instance describing the scale of each axis of the sphere.
     * @param  {Number} radiusSpreadClamp What numeric multiple the projected value should be clamped to.
     */
    randomVector3OnSphere: function(
        attribute, index, base, radius, radiusSpread, radiusScale, radiusSpreadClamp
    ) {
        'use strict';

        var depth = 2 * Math.random() - 1,
            t = 6.2832 * Math.random(),
            r = Math.sqrt( 1 - depth * depth ),
            rand = this.randomFloat( radius, radiusSpread ),
            x = 0,
            y = 0,
            z = 0;


        if ( radiusSpreadClamp ) {
            rand = Math.round( rand / radiusSpreadClamp ) * radiusSpreadClamp;
        }



        // Set position on sphere
        x = r * Math.cos( t ) * rand;
        y = r * Math.sin( t ) * rand;
        z = depth * rand;

        // Apply radius scale to this position
        x *= radiusScale.x;
        y *= radiusScale.y;
        z *= radiusScale.z;

        // Translate to the base position.
        x += base.x;
        y += base.y;
        z += base.z;

        // Set the values in the typed array.
        attribute.typedArray.setVec3Components( index, x, y, z );
    },

    seededRandom: function( seed ) {
        var x = Math.sin( seed ) * 10000;
        return x - ( x | 0 );
    },



    /**
     * Assigns a random vector 3 value to an SPE.ShaderAttribute instance, projecting the
     * given values onto a 2d-disc.
     *
     * @param  {Object} attribute The instance of SPE.ShaderAttribute to save the result to.
     * @param  {Number} index     The offset in the attribute's TypedArray to save the result from.
     * @param  {Object} base              THREE.Vector3 instance describing the origin of the transform.
     * @param  {Number} radius            The radius of the sphere to project onto.
     * @param  {Number} radiusSpread      The amount of randomness to apply to the projection result
     * @param  {Object} radiusScale       THREE.Vector3 instance describing the scale of each axis of the disc. The z-component is ignored.
     * @param  {Number} radiusSpreadClamp What numeric multiple the projected value should be clamped to.
     */
    randomVector3OnDisc: function( attribute, index, base, radius, radiusSpread, radiusScale, radiusSpreadClamp ) {
        'use strict';

        var t = 6.2832 * Math.random(),
            rand = Math.abs( this.randomFloat( radius, radiusSpread ) ),
            x = 0,
            y = 0,
            z = 0;

        if ( radiusSpreadClamp ) {
            rand = Math.round( rand / radiusSpreadClamp ) * radiusSpreadClamp;
        }

        // Set position on sphere
        x = Math.cos( t ) * rand;
        y = Math.sin( t ) * rand;

        // Apply radius scale to this position
        x *= radiusScale.x;
        y *= radiusScale.y;

        // Translate to the base position.
        x += base.x;
        y += base.y;
        z += base.z;

        // Set the values in the typed array.
        attribute.typedArray.setVec3Components( index, x, y, z );
    },

    randomDirectionVector3OnSphere: ( function() {
        'use strict';

        var v = new THREE.Vector3();

        /**
         * Given an SPE.ShaderAttribute instance, create a direction vector from the given
         * position, using `speed` as the magnitude. Values are saved to the attribute.
         *
         * @param  {Object} attribute       The instance of SPE.ShaderAttribute to save the result to.
         * @param  {Number} index           The offset in the attribute's TypedArray to save the result from.
         * @param  {Number} posX            The particle's x coordinate.
         * @param  {Number} posY            The particle's y coordinate.
         * @param  {Number} posZ            The particle's z coordinate.
         * @param  {Object} emitterPosition THREE.Vector3 instance describing the emitter's base position.
         * @param  {Number} speed           The magnitude to apply to the vector.
         * @param  {Number} speedSpread     The amount of randomness to apply to the magnitude.
         */
        return function( attribute, index, posX, posY, posZ, emitterPosition, speed, speedSpread ) {
            v.copy( emitterPosition );

            v.x -= posX;
            v.y -= posY;
            v.z -= posZ;

            v.normalize().multiplyScalar( -this.randomFloat( speed, speedSpread ) );

            attribute.typedArray.setVec3Components( index, v.x, v.y, v.z );
        };
    }() ),


    randomDirectionVector3OnDisc: ( function() {
        'use strict';

        var v = new THREE.Vector3();

        /**
         * Given an SPE.ShaderAttribute instance, create a direction vector from the given
         * position, using `speed` as the magnitude. Values are saved to the attribute.
         *
         * @param  {Object} attribute       The instance of SPE.ShaderAttribute to save the result to.
         * @param  {Number} index           The offset in the attribute's TypedArray to save the result from.
         * @param  {Number} posX            The particle's x coordinate.
         * @param  {Number} posY            The particle's y coordinate.
         * @param  {Number} posZ            The particle's z coordinate.
         * @param  {Object} emitterPosition THREE.Vector3 instance describing the emitter's base position.
         * @param  {Number} speed           The magnitude to apply to the vector.
         * @param  {Number} speedSpread     The amount of randomness to apply to the magnitude.
         */
        return function( attribute, index, posX, posY, posZ, emitterPosition, speed, speedSpread ) {
            v.copy( emitterPosition );

            v.x -= posX;
            v.y -= posY;
            v.z -= posZ;

            v.normalize().multiplyScalar( -this.randomFloat( speed, speedSpread ) );

            attribute.typedArray.setVec3Components( index, v.x, v.y, 0 );
        };
    }() ),

    getPackedRotationAxis: ( function() {
        'use strict';

        var v = new THREE.Vector3(),
            vSpread = new THREE.Vector3(),
            c = new THREE.Color(),
            addOne = new THREE.Vector3( 1, 1, 1 );

        /**
         * Given a rotation axis, and a rotation axis spread vector,
         * calculate a randomised rotation axis, and pack it into
         * a hexadecimal value represented in decimal form.
         * @param  {Object} axis       THREE.Vector3 instance describing the rotation axis.
         * @param  {Object} axisSpread THREE.Vector3 instance describing the amount of randomness to apply to the rotation axis.
         * @return {Number}            The packed rotation axis, with randomness.
         */
        return function( axis, axisSpread ) {
            v.copy( axis ).normalize();
            vSpread.copy( axisSpread ).normalize();

            v.x += ( -axisSpread.x * 0.5 ) + ( Math.random() * axisSpread.x );
            v.y += ( -axisSpread.y * 0.5 ) + ( Math.random() * axisSpread.y );
            v.z += ( -axisSpread.z * 0.5 ) + ( Math.random() * axisSpread.z );

            // v.x = Math.abs( v.x );
            // v.y = Math.abs( v.y );
            // v.z = Math.abs( v.z );

            v.normalize().add( addOne ).multiplyScalar( 0.5 );

            c.setRGB( v.x, v.y, v.z );

            return c.getHex();
        };
    }() )
};
