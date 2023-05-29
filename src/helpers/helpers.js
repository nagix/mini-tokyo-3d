import {DecodeUTF8, Gunzip} from 'fflate';

export function loadJSON(url) {
    return fetch(url).then(async response => {
        if (url.endsWith('.gz')) {
            let stringData = '';
            const reader = response.body.getReader(),
                utfDecode = new DecodeUTF8(data => {
                    stringData += data;
                }),
                inflate = new Gunzip((data, final) => {
                    utfDecode.push(data, final);
                });

            while (true) {
                const {done, value} = await reader.read();

                if (done) {
                    inflate.push(new Uint8Array(0), true);
                    return JSON.parse(stringData);
                }
                inflate.push(value);
            }
        } else {
            return response.json();
        }
    });
}

export function buildLookup(array, key) {
    const k = key || 'id',
        lookup = {};

    for (const element of array) {
        lookup[element[k]] = element;
    }
    return lookup;
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

/**
 * Given an array of member function names as strings, replace all of them
 * with bound versions that will always refer to `context` as `this`. This
 * is useful for classes where otherwise event bindings would reassign
 * `this` to the evented object or some other value: this lets you ensure
 * the `this` value always.
 *
 * @param fns list of member function names
 * @param context the context value
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
 * Calculates a buffer for input trapezoid for a given distance.
 * @param {Array} trapezoid - Input trapezoid
 * @param {number} distance - Input distance
 * @returns {Array} Buffered trapezoid
 */
export function bufferTrapezoid(trapezoid, distance) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = trapezoid,
        vx0 = x1 - x0,
        vx1 = x2 - x1,
        vx2 = x3 - x2,
        vx3 = x0 - x3,
        vy0 = y1 - y0,
        vy1 = y2 - y1,
        vy2 = y3 - y2,
        vy3 = y0 - y3,
        p0 = distance / Math.sqrt(vx0 * vx0 + vy0 * vy0),
        p1 = distance / Math.sqrt(vx1 * vx1 + vy1 * vy1),
        p2 = distance / Math.sqrt(vx2 * vx2 + vy2 * vy2),
        p3 = distance / Math.sqrt(vx3 * vx3 + vy3 * vy3),
        px0 = x0 - vy0 * p0,
        px1 = x1 - vy1 * p1,
        px2 = x2 - vy2 * p2,
        px3 = x3 - vy3 * p3,
        py0 = y0 + vx0 * p0,
        py1 = y1 + vx1 * p1,
        py2 = y2 + vx2 * p2,
        py3 = y3 + vx3 * p3,
        s0 = vx0 * vy1,
        s1 = vx1 * vy2,
        s2 = vx2 * vy3,
        s3 = vx3 * vy0,
        t0 = vy0 * vx1,
        t1 = vy1 * vx2,
        t2 = vy2 * vx3,
        t3 = vy3 * vx0,
        q0 = s0 - t0,
        q1 = s1 - t1,
        q2 = s2 - t2,
        q3 = s3 - t3;

    return [[
        (vx0 * vx1 * (py0 - py1) + s0 * px1 - t0 * px0) / q0,
        (s0 * py0 - t0 * py1 - vy0 * vy1 * (px0 - px1)) / q0
    ], [
        (vx1 * vx2 * (py1 - py2) + s1 * px2 - t1 * px1) / q1,
        (s1 * py1 - t1 * py2 - vy1 * vy2 * (px1 - px2)) / q1
    ], [
        (vx2 * vx3 * (py2 - py3) + s2 * px3 - t2 * px2) / q2,
        (s2 * py2 - t2 * py3 - vy2 * vy3 * (px2 - px3)) / q2
    ], [
        (vx3 * vx0 * (py3 - py0) + s3 * px0 - t3 * px3) / q3,
        (s3 * py3 - t3 * py0 - vy3 * vy0 * (px3 - px0)) / q3
    ]];
}

/**
 * Determines if the point resides inside the trapezoid.
 * @param {Array} point - Input point
 * @param {Array} trapezoid - Input trapezoid
 * @returns {boolean} true if the point resides inside the trapezoid
 */
export function pointInTrapezoid(point, trapezoid) {
    const [x, y] = point,
        [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = trapezoid;

    return (x1 - x0) * (y - y0) < (y1 - y0) * (x - x0) &&
        (x2 - x1) * (y - y1) < (y2 - y1) * (x - x1) &&
        (x3 - x2) * (y - y2) < (y3 - y2) * (x - x2) &&
        (x0 - x3) * (y - y3) < (y0 - y3) * (x - x3);
}

/**
 * Returns the relative luminance of the color.
 * @param {object} color - Color object that has {r, g, b}
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
 * @param {object} attributes - The attributes to set
 * @param {Element} container - The node to append the element to
 * @returns {Element} The new Element
 */
export function createElement(tagName, attributes, container) {
    const element = document.createElement(tagName);

    Object.assign(element, attributes);
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
 * Returns the language code for user interface. The returned value is
 * ISO 639-1 code, but the exception is Chinese (zh-Hans or zh-Hant).
 * @param {string} input - Language code to verify
 * @returns {string} Language code for user interface
 */
export function getLang(input) {
    let lang = valueOrDefault(input, '');

    if (!lang.match(/ja|en|fr|ko|zh-Han[st]|th|ne|pt-BR/)) {
        lang = (window.navigator.languages && window.navigator.languages[0]) ||
            window.navigator.language ||
            window.navigator.userLanguage ||
            window.navigator.browserLanguage || '';
    }

    if (lang.match(/zh-(Hant|TW|HK|MO)/)) {
        lang = 'zh-Hant';
    } else if (lang.match(/zh/)) {
        lang = 'zh-Hans';
    } else {
        lang = lang.substring(0, 2);
    }

    return lang.match(/ja|en|ko|zh-Han[st]|th|fr|ne|pt/) ? lang : 'en';
}
