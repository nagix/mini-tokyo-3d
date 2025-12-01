import {DataTexture, FloatType, RGBAFormat, RGBAIntegerFormat, RGFormat, UnsignedByteType, UnsignedIntType} from 'three';

const PROPS = {
    ubyte4: {
        TypedArray: Uint8Array,
        format: RGBAFormat,
        type: UnsignedByteType,
        unit: 4
    },
    uint4: {
        TypedArray: Uint32Array,
        format: RGBAIntegerFormat,
        type: UnsignedIntType,
        unit: 4
    },
    float4: {
        TypedArray: Float32Array,
        format: RGBAFormat,
        type: FloatType,
        unit: 4
    },
    float2: {
        TypedArray: Float32Array,
        format: RGFormat,
        type: FloatType,
        unit: 2
    }
};

export default class extends DataTexture {

    constructor(...args) {
        if (typeof args[0] === 'number') {
            // Create a new texture
            const [size, textureType, chunkSize] = args,
                {TypedArray, format, type, unit} = PROPS[textureType],
                chunkCount = Math.ceil(size / chunkSize),
                array = new TypedArray(chunkSize * chunkCount * unit);

            super(array, chunkSize, chunkCount, format, type);

            Object.assign(this.userData, {size, TypedArray, unit});
            this.needsUpdate = true;
        } else if (args.length === 2) {
            // Create an expanded texture
            const [texture, increase] = args,
                {image, userData, format, type} = texture,
                {data, width: chunkSize} = image,
                {size: currentSize, TypedArray, unit} = userData,
                size = currentSize + increase,
                chunkCount = Math.ceil(size / chunkSize);
            let array;

            if (chunkCount === image.height) {
                array = data;
            } else {
                array = new TypedArray(chunkSize * chunkCount * unit);
                array.set(data);
            }

            super(array, chunkSize, chunkCount, format, type);

            Object.assign(this.userData, {size, TypedArray, unit});
            this.needsUpdate = true;
        } else {
            // Created a shrinked texture
            const [texture, offset, decrease] = args,
                {image, userData, format, type} = texture,
                {data, width: chunkSize} = image,
                {size: currentSize, TypedArray, unit} = userData,
                size = currentSize - decrease,
                chunkCount = Math.ceil(size / chunkSize);
            let array;

            if (chunkCount === image.height) {
                array = data;
            } else {
                array = new TypedArray(chunkSize * chunkCount * unit);
                array.set(data.subarray(0, offset * unit));
                array.set(data.subarray((offset + decrease) * unit, currentSize * unit), offset * unit);
            }

            super(array, chunkSize, chunkCount, format, type);

            Object.assign(this.userData, {size, TypedArray, unit});
            this.needsUpdate = true;
        }
    }

    get size() {
        return this.userData.size;
    }

}
