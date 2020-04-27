/**
 * A helper class for TypedArrays.
 *
 * Allows for easy resizing, assignment of various component-based
 * types (Vector2s, Vector3s, Vector4s, Mat3s, Mat4s),
 * as well as Colors (where components are `r`, `g`, `b`),
 * Numbers, and setting from other TypedArrays.
 *
 * @author Luke Moody
 * @constructor
 * @param {Function} TypedArrayConstructor The constructor to use (Float32Array, Uint8Array, etc.)
 * @param {Number} size                 The size of the array to create
 * @param {Number} componentSize        The number of components per-value (ie. 3 for a vec3, 9 for a Mat3, etc.)
 * @param {Number} indexOffset          The index in the array from which to start assigning values. Default `0` if none provided
 */
var TypedArrayHelper = function( TypedArrayConstructor, size, componentSize, indexOffset ) {
    'use strict';

    this.componentSize = componentSize || 1;
    this.size = ( size || 1 );
    this.TypedArrayConstructor = TypedArrayConstructor || Float32Array;
    this.array = new TypedArrayConstructor( size * this.componentSize );
    this.indexOffset = indexOffset || 0;
};

TypedArrayHelper.constructor = TypedArrayHelper;

/**
 * Sets the size of the internal array.
 *
 * Delegates to `this.shrink` or `this.grow` depending on size
 * argument's relation to the current size of the internal array.
 *
 * Note that if the array is to be shrunk, data will be lost.
 *
 * @param {Number} size The new size of the array.
 */
TypedArrayHelper.prototype.setSize = function( size, noComponentMultiply ) {
    'use strict';

    var currentArraySize = this.array.length;

    if ( !noComponentMultiply ) {
        size = size * this.componentSize;
    }

    if ( size < currentArraySize ) {
        return this.shrink( size );
    }
    else if ( size > currentArraySize ) {
        return this.grow( size );
    }
    else {
        console.info( 'TypedArray is already of size:', size + '.', 'Will not resize.' );
    }
};

/**
 * Shrinks the internal array.
 *
 * @param  {Number} size The new size of the typed array. Must be smaller than `this.array.length`.
 * @return {SPE.TypedArrayHelper}      Instance of this class.
 */
TypedArrayHelper.prototype.shrink = function( size ) {
    'use strict';

    this.array = this.array.subarray( 0, size );
    this.size = size;
    return this;
};

/**
 * Grows the internal array.
 * @param  {Number} size The new size of the typed array. Must be larger than `this.array.length`.
 * @return {SPE.TypedArrayHelper}      Instance of this class.
 */
TypedArrayHelper.prototype.grow = function( size ) {
    'use strict';

    var existingArray = this.array,
        newArray = new this.TypedArrayConstructor( size );

    newArray.set( existingArray );
    this.array = newArray;
    this.size = size;

    return this;
};


/**
 * Perform a splice operation on this array's buffer.
 * @param  {Number} start The start index of the splice. Will be multiplied by the number of components for this attribute.
 * @param  {Number} end The end index of the splice. Will be multiplied by the number of components for this attribute.
 * @returns {Object} The SPE.TypedArrayHelper instance.
 */
TypedArrayHelper.prototype.splice = function( start, end ) {
    'use strict';
    start *= this.componentSize;
    end *= this.componentSize;

    var data = [],
        array = this.array,
        size = array.length;

    for ( var i = 0; i < size; ++i ) {
        if ( i < start || i >= end ) {
            data.push( array[ i ] );
        }
        // array[ i ] = 0;
    }

    this.setFromArray( 0, data );

    return this;
};


/**
 * Copies from the given TypedArray into this one, using the index argument
 * as the start position. Alias for `TypedArray.set`. Will automatically resize
 * if the given source array is of a larger size than the internal array.
 *
 * @param {Number} index      The start position from which to copy into this array.
 * @param {TypedArray} array The array from which to copy; the source array.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setFromArray = function( index, array ) {
    'use strict';

    var sourceArraySize = array.length,
        newSize = index + sourceArraySize;

    if ( newSize > this.array.length ) {
        this.grow( newSize );
    }
    else if ( newSize < this.array.length ) {
        this.shrink( newSize );
    }

    this.array.set( array, this.indexOffset + index );

    return this;
};

/**
 * Set a Vector2 value at `index`.
 *
 * @param {Number} index The index at which to set the vec2 values from.
 * @param {Vector2} vec2  Any object that has `x` and `y` properties.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setVec2 = function( index, vec2 ) {
    'use strict';

    return this.setVec2Components( index, vec2.x, vec2.y );
};

/**
 * Set a Vector2 value using raw components.
 *
 * @param {Number} index The index at which to set the vec2 values from.
 * @param {Number} x     The Vec2's `x` component.
 * @param {Number} y     The Vec2's `y` component.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setVec2Components = function( index, x, y ) {
    'use strict';

    var array = this.array,
        i = this.indexOffset + ( index * this.componentSize );

    array[ i ] = x;
    array[ i + 1 ] = y;
    return this;
};

/**
 * Set a Vector3 value at `index`.
 *
 * @param {Number} index The index at which to set the vec3 values from.
 * @param {Vector3} vec2  Any object that has `x`, `y`, and `z` properties.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setVec3 = function( index, vec3 ) {
    'use strict';

    return this.setVec3Components( index, vec3.x, vec3.y, vec3.z );
};

/**
 * Set a Vector3 value using raw components.
 *
 * @param {Number} index The index at which to set the vec3 values from.
 * @param {Number} x     The Vec3's `x` component.
 * @param {Number} y     The Vec3's `y` component.
 * @param {Number} z     The Vec3's `z` component.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setVec3Components = function( index, x, y, z ) {
    'use strict';

    var array = this.array,
        i = this.indexOffset + ( index * this.componentSize );

    array[ i ] = x;
    array[ i + 1 ] = y;
    array[ i + 2 ] = z;
    return this;
};

/**
 * Set a Vector4 value at `index`.
 *
 * @param {Number} index The index at which to set the vec4 values from.
 * @param {Vector4} vec2  Any object that has `x`, `y`, `z`, and `w` properties.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setVec4 = function( index, vec4 ) {
    'use strict';

    return this.setVec4Components( index, vec4.x, vec4.y, vec4.z, vec4.w );
};

/**
 * Set a Vector4 value using raw components.
 *
 * @param {Number} index The index at which to set the vec4 values from.
 * @param {Number} x     The Vec4's `x` component.
 * @param {Number} y     The Vec4's `y` component.
 * @param {Number} z     The Vec4's `z` component.
 * @param {Number} w     The Vec4's `w` component.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setVec4Components = function( index, x, y, z, w ) {
    'use strict';

    var array = this.array,
        i = this.indexOffset + ( index * this.componentSize );

    array[ i ] = x;
    array[ i + 1 ] = y;
    array[ i + 2 ] = z;
    array[ i + 3 ] = w;
    return this;
};

/**
 * Set a Matrix3 value at `index`.
 *
 * @param {Number} index The index at which to set the matrix values from.
 * @param {Matrix3} mat3 The 3x3 matrix to set from. Must have a TypedArray property named `elements` to copy from.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setMat3 = function( index, mat3 ) {
    'use strict';

    return this.setFromArray( this.indexOffset + ( index * this.componentSize ), mat3.elements );
};

/**
 * Set a Matrix4 value at `index`.
 *
 * @param {Number} index The index at which to set the matrix values from.
 * @param {Matrix4} mat3 The 4x4 matrix to set from. Must have a TypedArray property named `elements` to copy from.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setMat4 = function( index, mat4 ) {
    'use strict';

    return this.setFromArray( this.indexOffset + ( index * this.componentSize ), mat4.elements );
};

/**
 * Set a Color value at `index`.
 *
 * @param {Number} index The index at which to set the vec3 values from.
 * @param {Color} color  Any object that has `r`, `g`, and `b` properties.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setColor = function( index, color ) {
    'use strict';

    return this.setVec3Components( index, color.r, color.g, color.b );
};

/**
 * Set a Number value at `index`.
 *
 * @param {Number} index The index at which to set the vec3 values from.
 * @param {Number} numericValue  The number to assign to this index in the array.
 * @return {SPE.TypedArrayHelper} Instance of this class.
 */
TypedArrayHelper.prototype.setNumber = function( index, numericValue ) {
    'use strict';

    this.array[ this.indexOffset + ( index * this.componentSize ) ] = numericValue;
    return this;
};

/**
 * Returns the value of the array at the given index, taking into account
 * the `indexOffset` property of this class.
 *
 * Note that this function ignores the component size and will just return a
 * single value.
 *
 * @param  {Number} index The index in the array to fetch.
 * @return {Number}       The value at the given index.
 */
TypedArrayHelper.prototype.getValueAtIndex = function( index ) {
    'use strict';

    return this.array[ this.indexOffset + index ];
};

/**
 * Returns the component value of the array at the given index, taking into account
 * the `indexOffset` property of this class.
 *
 * If the componentSize is set to 3, then it will return a new TypedArray
 * of length 3.
 *
 * @param  {Number} index The index in the array to fetch.
 * @return {TypedArray}       The component value at the given index.
 */
TypedArrayHelper.prototype.getComponentValueAtIndex = function( index ) {
    'use strict';

    return this.array.subarray( this.indexOffset + ( index * this.componentSize ) );
};

export default TypedArrayHelper;
