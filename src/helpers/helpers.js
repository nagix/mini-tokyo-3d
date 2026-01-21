import {DecodeUTF8, Gunzip} from 'fflate';
import configs from '../configs';

let touchDevice = false;

if (typeof window !== 'undefined') {
    // Browser environment
    window.addEventListener('touchstart', () => {
        touchDevice = true;
    }, {once: true});
}

export function isTouchDevice() {
    return touchDevice;
}

export function loadJSON(url) {
    return fetch(url).then(response => {
        if (url.endsWith('.gz')) {
            let stringData = '';
            const reader = response.body.getReader(),
                utfDecode = new DecodeUTF8(data => {
                    stringData += data;
                }),
                inflate = new Gunzip((data, final) => {
                    utfDecode.push(data, final);
                });

            return reader.read().then(function pump({done, value}) {
                if (done) {
                    inflate.push(new Uint8Array(0), true);
                    return JSON.parse(stringData);
                }
                inflate.push(value);
                return reader.read().then(pump);
            });
        } else {
            return response.json();
        }
    });
}

export function lerp(x, y, a) {
    return x * (1 - a) + y * a;
}

export function clamp(value, lower, upper) {
    return Math.min(Math.max(value, lower), upper);
}

export function includes(array, value) {
    let i, ilen;

    if (!Array.isArray(array) && typeof array !== 'string') {
        return false;
    }
    if (!Array.isArray(value)) {
        return array.indexOf(value) !== -1;
    }
    for (i = 0, ilen = value.length; i < ilen; i++) {
        if (array.indexOf(value[i]) === -1) {
            return false;
        }
    }
    return true;
}

export function flat(array) {
    return array.reduce((acc, val) => acc.concat(val), []);
}

export function normalize(value) {
    return value.normalize("NFD").replace(/\(.*\)|<.*>|〈.*〉|[\u0300-\u036F]/g, '');
}

export function valueOrDefault(value, defaultValue) {
    return value === undefined ? defaultValue : value;
}

export function numberOrDefault(value, defaultValue) {
    return isNaN(value) ? defaultValue : value;
}

export function isString(value) {
    return typeof value === 'string' || value instanceof String;
}

export function mergeMaps(...maps) {
    const result = new Map();

    for (const map of maps) {
        for (const [k, v] of map) {
            result.set(k, v);
        }
    }
    return result;
}

/**
 * Returns a time expression based on a time offset.
 * @param {number} timeOffset - The number of milliseconds elapsed since the last 3am
 * @returns {string} Time expression in "hh:mm" format
 */
export function getTimeString(timeOffset) {
    const hours = `0${(Math.floor(timeOffset / 3600000) + 3) % 24}`.slice(-2),
        minutes = `0${Math.floor(timeOffset / 60000) % 60}`.slice(-2);

    return `${hours}:${minutes}`;
}

/**
 * Return a time offset based on a time expression.
 * @param {string} string - Time expression in "hh:mm" format
 * @returns {number} The number of milliseconds elapsed since the last 3am
 */
export function getTimeOffset(string) {
    return (((+string.substring(0, 2)) + 21) % 24 * 60 + (+string.substring(3, 5))) * 60000;
}

/**
 * Given an array of member function names as strings, replace all of them
 * with bound versions that will always refer to `context` as `this`. This
 * is useful for classes where otherwise event bindings would reassign
 * `this` to the evented object or some other value: this lets you ensure
 * the `this` value always.
 *
 * @param {Array<string>} fns - list of member function names
 * @param {Object} context - the context value
 */
export function bindAll(fns, context) {
    for (const fn of fns) {
        if (!context[fn]) {
            continue;
        }
        context[fn] = context[fn].bind(context);
    }
}

export function removePrefix(value) {
    if (typeof value === 'string') {
        return value.replace(/.*:/, '');
    }
    if (Array.isArray(value)) {
        return value.map(removePrefix);
    }
    return value;
}

export function cleanKeys(obj) {
    for (const key of Object.keys(obj)) {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    }
    return obj;
}

export function blink() {
    const p = performance.now() % 1500 / 1500 * 2;

    return p < 1 ? p : 2 - p;
}

/**
 * Measure the actual frame rate asynchronously
 * @returns {Promise} A Promise that resolves to the measured frame rate value
 */
export function measureFrameRate() {
    return new Promise(resolve => {
        let count = 0;
        const start = performance.now(),
            repeat = () => {
                if (count++ < 60) {
                    requestAnimationFrame(repeat);
                } else {
                    resolve(1000 / ((performance.now() - start) / 60));
                }
            };
        repeat();
    });
}

/**
 * Returns the relative luminance of the color.
 * @param {Object} color - Color object that has {r, g, b}
 * @returns {number} Relative luminance
 */
export function luminance(color) {
    return .2126 * color.r + .7152 * color.g + .0722 * color.b;
}

/**
 * Converts a hex color code to RGB array.
 * @param {string} color - Hex color code
 * @returns {Array} RGB array
 */
export function colorToRGBArray(color) {
    const c = parseInt(color.replace('#', ''), 16);

    return [Math.floor(c / 65536) % 256, Math.floor(c / 256) % 256, c % 256];
}

/**
 * Creates an element with the specified attributes and appends it to a container.
 * @param {string} tagName - A string that specifies the type of element to be created
 * @param {Object} attributes - The attributes to set
 * @param {Element} container - The node to append the element to
 * @returns {Element} The new Element
 */
export function createElement(tagName, attributes, container) {
    const element = document.createElement(tagName);

    for (const key of Object.keys(attributes)) {
        try {
            element[key] = attributes[key];
        } catch (e) {
            element.setAttribute(key, attributes[key]);
        }
    }
    if (container) {
        container.appendChild(element);
    }
    return element;
}

/**
 * Shows notification message.
 * @param {Node} container - Node in which the notification panel is shown
 * @param {string} message - Notification message
 */
export function showNotification(container, message) {
    const element = createElement('div', {
        className: 'notification',
        innerHTML: message
    }, container);

    setTimeout(() => {
        element.style.opacity = 0;
    }, 1000);
    setTimeout(() => {
        container.removeChild(element);
    }, 2000);
}

/**
 * Normalize the given language code to one of the supported codes. The
 * returned value is ISO 639-1 code, but the exception is Chinese
 * (zh-Hans or zh-Hant). Returns undefined if not supported.
 * @param {string} lang - Language code
 * @returns {string} Normalized language code
 */
export function normalizeLang(lang) {
    const langs = configs.langs.map(code => code.replace('pt-BR', 'pt'));

    if (lang.match(/^zh-(Hant|TW|HK|MO)/)) {
        lang = 'zh-Hant';
    } else if (lang.match(/^zh/)) {
        lang = 'zh-Hans';
    } else {
        lang = lang.substring(0, 2);
    }
    return includes(langs, lang) ? lang : undefined;
}

/**
 * Returns the language code for user interface. The returned value is
 * ISO 639-1 code, but the exception is Chinese (zh-Hans or zh-Hant).
 * @param {string} lang - Language code to verify
 * @returns {string} Language code for user interface
 */
export function getLang(lang) {
    if (!includes(configs.langs, lang)) {
        const _navigator = window.navigator;

        lang = (_navigator.languages && _navigator.languages[0]) ||
            _navigator.language ||
            _navigator.userLanguage ||
            _navigator.browserLanguage || '';
    }
    return normalizeLang(lang) || 'en';
}
