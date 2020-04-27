import configs from './configs';
import * as helpers from './helpers';

const clock = {

    baseTime: 0,

    baseHighResTime: 0,

    speed: 1,

    reset() {
        clock.baseTime = 0;
        clock.baseHighResTime = 0;
        clock.speed = 1;
    },

    setSpeed(speed) {
        clock.baseTime = clock.getTime() - Date.now() * speed;
        clock.baseHighResTime = clock.getHighResTime() - performance.now() * speed;
        clock.speed = speed;
    },

    setDate(date) {
        const baseTime = clock.baseTime;

        // Adjust JST back to local time
        const offset = -clock.getTimezoneOffset();

        clock.baseTime = date.getTime() + offset - Date.now() * clock.speed;
        clock.baseHighResTime += clock.baseTime - baseTime;
    },

    /**
      * Returns the date object in JST.
      * If the time is not specified, it returns that at the current time.
      * In the playback mode, the time in the simulation clock is used.
      * @param {number} time - The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
      * @returns {Date} Date object that represents the specified time in JST
      */
    getJSTDate(time) {
        // Adjust local time to JST (UTC+9)
        const offset = clock.getTimezoneOffset();

        return new Date(helpers.valueOrDefault(time, clock.getTime()) + offset);
    },

    /**
      * Returns the number of milliseconds since the Unix Epoch at the specified time.
      * If the time is not specified, it returns that at the current time.
      * In the playback mode, the time in the simulation clock is used.
      * @param {string} timeString - Time expression in JST in "hh:mm" format
      * @returns {number} The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
      */
    getTime(timeString) {
        if (!timeString) {
            return clock.baseTime + Date.now() * clock.speed;
        } else {
            const date = clock.getJSTDate(),
                timeStrings = timeString.split(':'),
                hours = +timeStrings[0],
                minutes = +timeStrings[1],

                // Adjust JST back to local time
                // Special handling of time between midnight and 3am
                offset = -clock.getTimezoneOffset() +
                    ((date.getHours() < 3 ? -1 : 0) + (hours < 3 ? 1 : 0)) * 86400000;

            return date.setHours(hours, minutes, 0, 0) + offset + configs.minDelay;
        }
    },

    /**
      * Returns the time expression in JST.
      * If the time is not specified, it returns that at the current time.
      * In the playback mode, the time in the simulation clock is used.
      * @param {number} time - The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
      * @returns {number} Time expression in JST in "hh:mm" format
      */
    getTimeString(time) {
        const date = clock.getJSTDate(time),
            hours = `0${date.getHours()}`.slice(-2),
            minutes = `'0${date.getMinutes()}`.slice(-2);

        return `${hours}:${minutes}`;
    },

    /**
      * Returns the number of milliseconds since the time origin.
      * In the playback mode, the time in the simulation clock is used.
      * @returns {number} The number of milliseconds elapsed since the time origin
      */
    getHighResTime() {
        return clock.baseHighResTime + performance.now() * clock.speed;
    },

    getTimezoneOffset() {
        return (new Date().getTimezoneOffset() + 540) * 60000;
    }

};

export default clock;
