import {LngLatBounds} from 'mapbox-gl';
import {parseCSSColor} from 'csscolorparser';
import {includes, lerp, luminance} from './helpers';
import SunCalc from 'suncalc';

const HOUR = 3600000;

/**
 * Returns the smallest bounding box that contains all the given points
 * @param {Array<LngLatLike>} coords - Array of LngLatLike objects
 * @returns {LngLatBounds} The bounding box
 */
export function getBounds(coords) {
    const bounds = new LngLatBounds();

    for (const coord of coords) {
        bounds.extend(coord);
    }
    return bounds;
}

/**
 * Sets the properties in the specified layer that inherits deck.gl's MabboxLayer.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {string} id - The ID of the layer
 * @param {object} props - One or more properties to update
 */
export function setLayerProps(map, id, props) {
    map.getLayer(id).implementation.setProps(props);
}

/**
 * Returns the sunlight color at a specific time.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {number} time - The number of milliseconds elapsed since January 1,
 *     1970 00:00:00 UTC
 * @returns {object} Color object
 */
export function getSunlightColor(map, time) {
    const {lng, lat} = map.getCenter(),
        {sunrise, sunset} = SunCalc.getTimes(time, lat, lng),
        sunriseTime = sunrise.getTime(),
        sunsetTime = sunset.getTime();
    let t, r, g, b;

    if (time >= sunriseTime - HOUR && time < sunriseTime) {
        // Night to sunrise
        t = (time - sunriseTime) / HOUR + 1;
        r = lerp(.4, .8, t);
        g = lerp(.4, .9, t);
        b = lerp(.5, 1, t);
    } else if (time >= sunriseTime && time < sunriseTime + HOUR) {
        // Sunrise to day
        t = (time - sunriseTime) / HOUR;
        r = lerp(.8, 1, t);
        g = lerp(.9, 1, t);
        b = 1;
    } else if (time >= sunriseTime + HOUR && time < sunsetTime - HOUR) {
        // Day
        r = g = b = 1;
    } else if (time >= sunsetTime - HOUR && time < sunsetTime) {
        // Day to sunset
        t = (time - sunsetTime) / HOUR + 1;
        r = 1;
        g = lerp(1, .9, t);
        b = lerp(1, .8, t);
    } else if (time >= sunsetTime && time < sunsetTime + HOUR) {
        // Sunset to night
        t = (time - sunsetTime) / HOUR;
        r = lerp(1, .4, t);
        g = lerp(.9, .4, t);
        b = lerp(.8, .5, t);
    } else {
        // Night
        r = g = .4;
        b = .5;
    }
    return {r, g, b};
}

/**
 * Sets the sunlight at a specific time to the map
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {number} time - The number of milliseconds elapsed since January 1,
 *     1970 00:00:00 UTC
 */
export function setSunlight(map, time) {
    const {lat, lng} = map.getCenter(),
        {azimuth, altitude} = SunCalc.getPosition(time, lat, lng),
        sunAzimuth = 180 + azimuth * 180 / Math.PI,
        sunAltitude = 90 - altitude * 180 / Math.PI,
        {r, g, b} = getSunlightColor(map, time);

    map.setLight({
        position: [1.15, sunAzimuth, sunAltitude],
        color: `rgb(${r * 255},${g * 255},${b * 255})`,
        intensity: 0.35
    });
}

/**
 * Checks if the background color of the map is dark.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {boolean} actual - If true, the result is based on the current background color.
 *     Otherwise, the result is based on the target background color
 * @returns {boolean} True if the background color of the map is dark
 */
export function hasDarkBackground(map, actual) {
    if (actual) {
        return luminance(map.getLayer('background').paint.get('background-color')) < .5;
    }
    const [r, g, b] = parseCSSColor(map.getPaintProperty('background', 'background-color'));
    return luminance({r, g, b}) < 127.5;
}

/**
 * Returns the modified style color based on the color factors.
 * @param {object} color - Style color object
 * @param {object} colorFactors - Color factors object
 * @returns {string} Modified style color string
 */
export function getScaledColorString(color, colorFactors) {
    return `rgba(${color.r * colorFactors.r},${color.g * colorFactors.g},${color.b * colorFactors.b},${color.a})`;
}

/**
 * Returns an array of the style color information retrieved from map layers.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @returns {Array<object>} Array of the style color objects
 */
export function getStyleColors(map) {
    // Layer type -> paint property key mapping
    const paintPropertyKeys = {
            'background': ['background-color'],
            'line': ['line-color'],
            'fill': ['fill-color', 'fill-outline-color']
        },
        layerTypes = Object.keys(paintPropertyKeys),
        colors = [];

    map.getStyle().layers.filter(layer =>
        includes(layerTypes, layer.type) && !layer.id.match(/-(og|ug)-/)
    ).forEach(layer => {
        const {id, type} = layer;

        for (const key of paintPropertyKeys[type]) {
            const prop = map.getPaintProperty(id, key);

            if (typeof prop === 'string') {
                const [r, g, b, a] = parseCSSColor(prop);
                colors.push({id, key, r, g, b, a});
            } else if (Array.isArray(prop) && prop[0] === 'case') {
                prop.forEach((item, i) => {
                    if (i >= 1 && typeof item === 'string') {
                        const [r, g, b, a] = parseCSSColor(item);
                        colors.push({id, key, _case: i, r, g, b, a});
                    }
                });
            } else if (typeof prop === 'object') {
                prop.stops.forEach((item, i) => {
                    const [r, g, b, a] = parseCSSColor(item[1]);
                    colors.push({id, key, stops: i, r, g, b, a});
                });
            }
        }
    });
    return colors;
}

/**
 * Returns an array of the style opacity information retrieved from map layers.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @returns {Array<object>} Array of the style opacity objects
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

/**
 * Multiplies a target by a factor. The target can be either a number, "case" expression
 * or zoom function that is used in the Mapbox style specification
 * @param {number | Array | object} obj - Target number, "case" expression or zoom
 *     function
 * @param {number} factor - Factor to multiply
 * @returns {number | Array | object} Result number, "case" expression or zoom function
 */
export function scaleValues(obj, factor) {
    if (!isNaN(obj)) {
        return obj * factor;
    }
    if (Array.isArray(obj) && obj[0] === 'case') {
        return obj.map(item => isNaN(item) ? item : item * factor);
    }

    const result = {};

    for (const key of Object.keys(obj)) {
        if (key === 'stops') {
            result[key] = obj[key].map(element =>
                [element[0], element[1] * factor]
            );
        } else {
            result[key] = obj[key];
        }
    }
    return result;
}
