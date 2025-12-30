import JapaneseHolidays from 'japanese-holidays';
import configs from './configs';
import {valueOrDefault} from './helpers/helpers';

export default class {

    constructor(date, speed, offset = -540) {
        this.reset()
            .setTimezoneOffset(offset)
            .setDate(date)
            .setSpeed(speed);
    }

    reset() {
        const me = this;

        me.baseTime = 0;
        me.baseHighResTime = 0;
        me.speed = 1;
        return me;
    }

    setSpeed(speed) {
        const me = this;

        if (isNaN(speed)) {
            return me;
        }

        me.baseTime = me.getTime() - Date.now() * speed;
        me.baseHighResTime = me.getHighResTime() - performance.now() * speed;
        me.speed = speed;
        return me;
    }

    /**
     * Changes the clock time based on the given Date object. Note that the timestamp stored
     * in the Date object is ignored because Date objects don't hold time zones.
     * @param {Date} date - Date object that represents the specified time in the target time zone
     * @returns {Clock} Returns itself to allow for method chaining
     */
    setDate(date) {
        const me = this;

        if (!(date instanceof Date)) {
            return me;
        }

        const prevBaseTime = me.baseTime,

            // Adjust the date back to local time
            offset = -me.getLocalTimezoneOffset(),

            baseTime = me.baseTime = date.getTime() + offset - Date.now() * me.speed;

        me.baseHighResTime += baseTime - prevBaseTime;
        return me;
    }

    setTimezoneOffset(offset) {
        const me = this;

        me.timezoneOffset = offset;
        return me;
    }

    /**
     * Returns the date object in the target time zone. Note that the timestamp stored
     * in the Date object is not actual because Date objects don't hold time zones.
     * If the time is not specified, it returns that at the current time.
     * In the playback mode, the time in the simulation clock is used.
     * @param {number} time - The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
     * @returns {Date} Date object that represents the specified time in the target time zone
     */
    getDate(time) {
        const me = this,

            // Adjust the date from local time
            offset = me.getLocalTimezoneOffset();

        return new Date(valueOrDefault(time, me.getTime()) + offset);
    }

    /**
     * Returns the number of milliseconds since the Unix Epoch at the specified time.
     * If the time is not specified, it returns that at the current time.
     * In the playback mode, the time in the simulation clock is used.
     * @param {string} timeString - Time expression in the target time zone in "hh:mm" format
     * @returns {number} The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
     */
    getTime(timeString) {
        const me = this;

        if (!timeString) {
            return me.baseTime + Date.now() * me.speed;
        }

        const date = me.getDate(),
            timeStrings = timeString.split(':'),
            hours = +timeStrings[0],
            minutes = +timeStrings[1],

            // Adjust the date back to local time
            // Special handling of time between midnight and 3am
            offset = -me.getLocalTimezoneOffset() +
                ((date.getHours() < 3 ? -1 : 0) + (hours < 3 ? 1 : 0)) * 86400000;

        return date.setHours(hours, minutes, 0, 0) + offset + configs.minDelay;
    }

    /**
     * Returns the date and time expression in the target time zone.
     * If the time is not specified, it returns that at the current time.
     * In the playback mode, the time in the simulation clock is used.
     * @param {number} time - The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
     * @returns {string} Date and time expression in the target time zone in "YYYY-MM-DD HH:mm:ss" format
     */
    getString(time) {
        const date = this.getDate(time),
            year = date.getFullYear(),
            month = `0${date.getMonth() + 1}`.slice(-2),
            day = `0${date.getDate()}`.slice(-2),
            hours = `0${date.getHours()}`.slice(-2),
            minutes = `0${date.getMinutes()}`.slice(-2),
            seconds = `0${date.getSeconds()}`.slice(-2);

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    /**
     * Returns the time expression in the target time zone.
     * If the time is not specified, it returns that at the current time.
     * In the playback mode, the time in the simulation clock is used.
     * @param {number} time - The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
     * @returns {string} Time expression in the target time zone in "hh:mm" format
     */
    getTimeString(time) {
        const date = this.getDate(time),
            hours = `0${date.getHours()}`.slice(-2),
            minutes = `0${date.getMinutes()}`.slice(-2);

        return `${hours}:${minutes}`;
    }

    /**
     * Returns a time offset based on the current time.
     * @returns {number} The number of milliseconds elapsed since the last 3am
     */
    getTimeOffset() {
        const me = this;

        return me.getTime() - me.getTime('03:00');
    }

    /**
     * Returns the number of milliseconds since the time origin.
     * In the playback mode, the time in the simulation clock is used.
     * @returns {number} The number of milliseconds elapsed since the time origin
     */
    getHighResTime() {
        const me = this;

        return me.baseHighResTime + performance.now() * me.speed;
    }

    getTimezoneOffset() {
        return this.timezoneOffset;
    }

    /**
     * Returns the difference, in minutes, between the date in the local time zone
     * and the same date in the target time zone.
     * @returns {number} The difference in minutes
     */
    getLocalTimezoneOffset() {
        return (new Date().getTimezoneOffset() - this.timezoneOffset) * 60000;
    }

    getCalendar() {
        const date = this.getDate(),
            hours = date.getHours();

        if (hours < 3) {
            date.setHours(hours - 24);
        }

        const dayOfWeek = date.getDay(),
            year = date.getFullYear(),
            month = date.getMonth(),
            day = date.getDate();

        if (dayOfWeek === 0 || JapaneseHolidays.isHoliday(date) ||
            (month === 11 && day >= 30) ||
            (month === 0 && day <= 3)) {
            return 'Holiday';
        }
        if (dayOfWeek === 6) {
            return 'Saturday';
        }
        return 'Weekday';
    }

}
