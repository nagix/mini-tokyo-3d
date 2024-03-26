import {valueOrDefault} from './helpers/helpers';

const animation = {

    instances: {},

    count: 0,

    initialized: false,

    init() {
        if (animation.initialized) {
            return;
        }
        animation.initialized = true;

        (function repeat() {
            const instances = animation.instances,
                ids = Object.keys(instances),
                length = ids.length,
                now = performance.now();

            for (let i = 0; i < length; i++) {
                const id = ids[i],
                    instance = instances[id];

                if (instance) {
                    const nextFrame = instance.nextFrame || 0;

                    if (nextFrame <= now) {
                        const {clock, duration, frameRate = Infinity} = instance,
                            time = clock ? clock.getHighResTime() : now,
                            start = instance.start = instance.start || time,
                            elapsed = time - start;

                        if (instance.callback) {
                            instance.callback(Math.min(elapsed, duration), duration);
                        }
                        instance.nextFrame = Math.max(nextFrame + 1000 / frameRate, now);

                        if (elapsed >= duration) {
                            if (instance.complete) {
                                instance.complete();
                            }
                            animation.stop(id);
                        }
                    }
                }
            }
            requestAnimationFrame(repeat);
        })();
    },

    isActive(id) {
        return id in animation.instances;
    },

    /**
     * Starts a new animation.
     * @param {Object} options - Animation options
     * @param {Function} options.callback - Function called on every frame
     * @param {Function} options.complete - Function called when the animation completes
     * @param {number} options.duration - Animation duration. Default is Infinity
     * @param {number} options.start - Animation start time (same timestamp as performance.now())
     * @param {number} options.frameRate - Animation frames per second
     * @param {Object} options.clock - If specified, animation speed will be affected by its clock speed
     * @returns {number} Animation ID which can be used to stop
     */
    start(options) {
        options.duration = valueOrDefault(options.duration, Infinity);
        animation.instances[animation.count] = options;
        return animation.count++;
    },

    /**
     * Stops an animation.
     * @param {number} id - Animation ID to stop
     */
    stop(id) {
        const instances = animation.instances;

        if (instances[id]) {
            delete instances[id];
        }
    },

    /**
     * Set the frame rate to an animation.
     * @param {number} id - Animation ID to set
     * @param {number} frameRate - Frames per second of the animation. If set to 0 or
     *     not specified, the default value (browser's native fps) will be applied.
     */
    setFrameRate(id, frameRate) {
        const instance = animation.instances[id];

        if (instance) {
            if (frameRate > 0) {
                instance.frameRate = frameRate;
            } else {
                delete instance.frameRate;
            }
        }
    }

};

export default animation;
