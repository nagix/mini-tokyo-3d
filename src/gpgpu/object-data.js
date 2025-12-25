import animation from '../animation';
import configs from '../configs';
import LinearDataTexture from './linear-data-texture';

export default class {

    constructor(count, parameters) {
        const me = this,
            chunkSize = parameters.chunkSize;

        me.uintTexture = new LinearDataTexture(count * 2, 'uint4', chunkSize);
        me.floatTexture = new LinearDataTexture(count * 2, 'float4', chunkSize);
        me.count = count;
        me.start = 0;
    }

    add(objectType, routeIndex, colorIndex, sectionIndex, nextSectionIndex, delay) {
        const me = this,
            {uintTexture, floatTexture} = me,
            uintArray = uintTexture.image.data,
            floatArray = floatTexture.image.data;

        for (let i = me.start, ilen = me.count; i < ilen; i++) {
            const offset = i * 8,
                fadeAnimationType = uintArray[offset + 6];

            if (fadeAnimationType === 0) {
                uintArray.set([
                    objectType,
                    routeIndex,
                    colorIndex,
                    86400000,
                    86400000,
                    performance.now(),
                    1,
                    delay
                ], offset);
                floatArray.set([
                    sectionIndex,
                    nextSectionIndex
                ], offset);
                uintTexture.needsUpdate = true;
                floatTexture.needsUpdate = true;
                me.start = i + 1;
                return i;
            }
        }
        console.log('Error: exceed the max train count');
    }

    update(instanceID, sectionIndex, nextSectionIndex, timeOffset, duration, accelerationTime, normalizedAcceleration, decelerationTime, normalizedDeceleration) {
        const me = this,
            {uintTexture, floatTexture} = me,
            uintArray = uintTexture.image.data,
            floatArray = floatTexture.image.data,
            offset = instanceID * 8;

        uintArray.set([
            timeOffset,
            timeOffset + duration
        ], offset + 3);
        floatArray.set([
            sectionIndex,
            nextSectionIndex,
            accelerationTime,
            normalizedAcceleration,
            decelerationTime,
            normalizedDeceleration
        ], offset);
        uintTexture.needsUpdate = true;
        floatTexture.needsUpdate = true;
    }

    remove(instanceID) {
        return new Promise(resolve => {
            const me = this,
                uintTexture = me.uintTexture,
                uintArray = uintTexture.image.data,
                offset = instanceID * 8;

            uintArray.set([performance.now(), 2], offset + 5);
            uintTexture.needsUpdate = true;

            animation.start({
                complete: () => {
                    uintArray.set([0, 0], offset + 6);
                    uintTexture.needsUpdate = true;
                    me.start = Math.min(instanceID, me.start);
                    resolve();
                },
                duration: configs.fadeDuration
            });
        });
    }

    setMarked(id) {
        this.marked = id;
    }

    setTracked(id) {
        this.tracked = id;
    }

    getIDs(bufferArray) {
        const me = this,
            uintArray = me.uintTexture.image.data,
            ugCarIDs = {body: [], delayMarker: [], outline: []},
            ogCarIDs = {body: [], delayMarker: [], outline: []},
            aircraftIDs = {body: [], outline: []},
            busIDs = {body: [], outline: []};

        for (let i = 0, ilen = me.count; i < ilen; i++) {
            const offset = i * 8,
                fadeAnimationType = uintArray[offset + 6];

            if (fadeAnimationType !== 0) {
                const objectType = uintArray[offset],
                    delay = uintArray[offset + 7],
                    z = bufferArray[i * 4 + 2],
                    ids = objectType === 0 ? z < 0 ? ugCarIDs : ogCarIDs : objectType === 1 ? aircraftIDs : busIDs;

                ids.body.push(i);
                if (delay === 1) {
                    ids.delayMarker.push(i);
                }
                if (i === me.marked || i === me.tracked) {
                    ids.outline.push(i);
                }
            }
        }

        // This ensures smooth fade animations
        ugCarIDs.body.sort((a, b) => a % 256 - b % 256);
        ogCarIDs.body.sort((a, b) => a % 256 - b % 256);

        return [ugCarIDs, ogCarIDs, aircraftIDs, busIDs];
    }

    dispose() {
        const me = this;

        me.uintTexture.dispose();
        me.floatTexture.dispose();
    }

}
