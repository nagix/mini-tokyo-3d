import JapaneseHolidays from 'japanese-holidays';
import configs from './configs';
import {valueOrDefault} from './helpers/helpers';

// Cache of time zone offsets keyed by "<timeZone>:<UTC hour>". Offsets only
// change at DST boundaries (on hour boundaries), so bucketing by the hour keeps
// the animation loop off the relatively expensive Intl path on virtually every
// call while staying accurate.
const offsetCache = new Map();

/**
 * Returns the offset, in minutes, of the given IANA time zone at the given time.
 * Uses the same sign convention as Date#getTimezoneOffset (negative east of UTC)
 * and is DST-aware because it is evaluated at the specified instant.
 * @param {string} timeZone - IANA time zone name
 * @param {number} time - The number of milliseconds since the Unix Epoch
 * @returns {number} The offset in minutes
 */
function getTimezoneOffset(timeZone, time) {
    const key = `${timeZone}:${Math.floor(time / 3600000)}`;
    let offset = offsetCache.get(key);

    if (offset === undefined) {
        const date = new Date(time),
            utcDate = new Date(date.toLocaleString('en-US', {timeZone: 'UTC'})),
            tzDate = new Date(date.toLocaleString('en-US', {timeZone}));

        offset = (utcDate.getTime() - tzDate.getTime()) / 60000;
        if (offsetCache.size >= 100) {
            offsetCache.clear();
        }
        offsetCache.set(key, offset);
    }
    return offset;
}

export default class {

    constructor(date, speed, timezone = configs.defaultTimezone) {
        this.reset()
            .setTimezone(timezone)
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
            offset = -me.getLocalTimezoneOffset(date.getTime()),

            baseTime = me.baseTime = date.getTime() + offset - Date.now() * me.speed;

        me.baseHighResTime += baseTime - prevBaseTime;
        return me;
    }

    /**
     * Sets the target time zone of the clock.
     * @param {string} timezone - IANA time zone name (e.g. "Asia/Tokyo"). Invalid
     *     names are ignored and the current time zone is kept.
     * @returns {Clock} Returns itself to allow for method chaining
     */
    setTimezone(timezone) {
        const me = this;

        try {
            me.timezone = new Intl.DateTimeFormat('en-US', {timeZone: timezone}).resolvedOptions().timeZone;
        } catch (error) {
            // Keep the current time zone if the given name is invalid
        }
        return me;
    }

    getTimezone() {
        return this.timezone;
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
            t = valueOrDefault(time, me.getTime());

        // Adjust the date from local time
        return new Date(t + me.getLocalTimezoneOffset(t));
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

            // Special handling of time between midnight and 3am
            dayOffset = ((date.getHours() < 3 ? -1 : 0) + (hours < 3 ? 1 : 0)) * 86400000,

            localTime = date.setHours(hours, minutes, 0, 0);

        // Adjust the date back to local time
        return localTime - me.getLocalTimezoneOffset(localTime) + dayOffset + configs.minDelay;
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

    /**
     * Returns the difference, in milliseconds, between the date in the local time zone
     * and the same date in the target time zone at the given time.
     * @param {number} time - The number of milliseconds since the Unix Epoch. Defaults
     *     to the current clock time.
     * @returns {number} The difference in milliseconds
     */
    getLocalTimezoneOffset(time = this.getTime()) {
        return (new Date(time).getTimezoneOffset() - getTimezoneOffset(this.timezone, time)) * 60000;
    }

    getCalendar() {
        const date = this.getDate(),
            hours = date.getHours();

        if (hours < 3) {
            date.setHours(hours - 24);
        }

        const dayOfWeek = date.getDay(),
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
