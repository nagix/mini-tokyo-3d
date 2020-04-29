import pako from 'pako';

export function loadJSON(url) {
    return new Promise((resolve, reject) => {
        const gz = url.endsWith('.gz'),
            request = new XMLHttpRequest();

        request.open('GET', url);
        request.responseType = gz ? 'arraybuffer' : 'text';
        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    resolve(JSON.parse(gz ? pako.inflate(new Uint8Array(request.response), {to: 'string'}) : request.response));
                } else {
                    reject(Error(request.statusText));
                }
            }
        };
        request.send();
    });
}

export function buildLookup(array, key) {
    const k = key || 'id',
        lookup = {};

    array.forEach(element => {
        lookup[element[k]] = element;
    });
    return lookup;
}

export function clamp(value, lower, upper) {
    return Math.min(Math.max(value, lower), upper);
}

export function includes(array, value) {
    let i, ilen;

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

export function    valueOrDefault(value, defaultValue) {
    return value === undefined ? defaultValue : value;
}

export function numberOrDefault(value, defaultValue) {
    return isNaN(value) ? defaultValue : value;
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
    Object.keys(obj).forEach(key => {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    });
    return obj;
}

export function setLayerProps(map, id, props) {
    map.getLayer(id).implementation.setProps(props);
}

export function isDarkBackground(map) {
    const color = map.getLayer('background').paint._values['background-color'];
    return luminance(color) < .5;
}

/**
  * Returns an array of the style color information retrieved from map layers.
  * @param {object} map - Mapbox's Map object
  * @returns {Array} Array of the style color objects
  */
export function getStyleColors(map) {
    // Layer type -> paint property key mapping
    const paintPropertyKeys = {
            'background': ['background-color'],
            'line': ['line-color'],
            'fill': ['fill-color', 'fill-outline-color'],
            'fill-extrusion': ['fill-extrusion-color']
        },
        layerTypes = Object.keys(paintPropertyKeys),
        rgbaPattern = /rgba\((\d+),(\d+),(\d+),([\d\.]+)\)/,
        colors = [];

    map.getStyle().layers.filter(layer =>
        includes(layerTypes, layer.type) && !layer.id.match(/-(og|ug)-/)
    ).forEach(layer => {
        const {id, type} = layer;

        paintPropertyKeys[type].forEach(key => {
            const prop = map.getPaintProperty(id, key);
            let color;

            if (typeof prop === 'string') {
                color = prop.match(rgbaPattern);
                colors.push({id, key, r: color[1], g: color[2], b: color[3], a: color[4]});
            } else if (typeof prop === 'object') {
                prop.stops.forEach((item, i) => {
                    color = item[1].match(rgbaPattern);
                    colors.push({id, key, stops: i, r: color[1], g: color[2], b: color[3], a: color[4]});
                });
            }
        });
    });
    return colors;
}

/**
  * Returns an array of the style opacity information retrieved from map layers.
  * @param {object} map - Mapbox's Map object
  * @returns {Array} Array of the style opacity objects
  */
export function getStyleOpacities(map) {
    const layerTypes = ['line', 'fill', 'fill-extrusion'],
        opacities = [];

    map.getStyle().layers.filter(layer =>
        includes(layerTypes, layer.type)
    ).forEach(layer => {
        const {id, type} = layer,
            key = `${type}-opacity`;

        opacities.push({id, key, opacity: map.getPaintProperty(id, key) || 1});
    });
    return opacities;
}

export function scaleValues(obj, factor) {
    if (!isNaN(obj)) {
        return obj * factor;
    }

    const result = {};

    Object.keys(obj).forEach(key => {
        if (key === 'stops') {
            result[key] = obj[key].map(element =>
                [element[0], element[1] * factor]
            );
        } else {
            result[key] = obj[key];
        }
    });
    return result;
}

/**
  * Returns the relative luminance of the color
  * @param {object} color - Color object that has {r, g, b}
  * @returns {number} Relative luminance betweem 0 and 1
  */
export function luminance(color) {
    return .2126 * color.r + .7152 * color.g + .0722 * color.b;
}

/**
  * Convert a hex color code to RGB array
  * @param {object} color - Hex color code
  * @returns {Array} RGB array
  */
export function colorToRGBArray(color) {
    const c = parseInt(color.replace('#', ''), 16);

    return [Math.floor(c / 65536) % 256, Math.floor(c / 256) % 256, c % 256];
}

export function dispatchClickEvent(className) {
    document.getElementsByClassName(className)[0]
        .dispatchEvent(new MouseEvent('click'));
}

/**
  * Returns the language code for user interface. The returned value is
  * ISO 639-1 code, but the exception is Chinese (zh-Hans or zh-Hant).
  * @returns {string} Language code for user interface
  */
export function getLang() {
    const match = location.search.match(/lang=(.*?)(&|$)/);
    let lang = match ? decodeURIComponent(match[1]) : '';

    if (!lang.match(/ja|en|ko|zh-Han[st]|th|ne/)) {
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

    return lang.match(/ja|en|ko|zh-Han[st]|th|ne/) ? lang : 'en';
}
