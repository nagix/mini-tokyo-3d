import {LngLatBounds} from 'mapbox-gl';
import {parseCSSColor} from 'csscolorparser';
import {lerp, luminance, valueOrDefault} from './helpers';
import SunCalc from 'suncalc';

const HOUR = 3600000;
const BG_LAYER_IDS = ['background', 'background-underground'];

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
        color: `rgb(${r * 255},${g * 255},${b * 255})`
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
        return BG_LAYER_IDS.reduce((value, id) => {
            const {r, g, b} = map.getLayer(id).paint.get('background-color'),
                a = map.getLayer(id).paint.get('background-opacity');
            return value + luminance({r: r * a, g: g * a, b: b * a});
        }, 0) < .5;
    }

    return BG_LAYER_IDS.reduce((value, id) => {
        const [r, g, b] = parseCSSColor(map.getPaintProperty(id, 'background-color')),
            a = valueOrDefault(map.getPaintProperty(id, 'background-opacity'), 1);
        return value + luminance({r: r * a, g: g * a, b: b * a});
    }, 0) < 127.5;
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
 * @param {string} metadataKey - Metadata key to filter
 * @returns {Array<object>} Array of the style color objects
 */
export function getStyleColors(map, metadataKey) {
    // Layer type -> paint property key mapping
    const paintPropertyKeys = {
            'background': ['background-color'],
            'line': ['line-color'],
            'fill': ['fill-color', 'fill-outline-color']
        },
        colors = [];

    map.getStyle().layers.filter(({metadata}) =>
        metadata && metadata[metadataKey]
    ).forEach(({id, type}) => {
        for (const key of paintPropertyKeys[type]) {
            const prop = map.getPaintProperty(id, key);

            if (!prop) {
                return;
            }
            if (typeof prop === 'string') {
                const [r, g, b, a] = parseCSSColor(prop);
                colors.push({id, key, color: {r, g, b, a}});
            } else if (prop.stops) {
                const color = [];

                prop.stops.forEach((item, index) => {
                    const [r, g, b, a] = parseCSSColor(item[1]);
                    color.push({index, value: {r, g, b, a}});
                });
                colors.push({id, key, color});
            } else if (prop[0] === 'case' || prop[0] === 'interpolate') {
                const color = [];

                prop.forEach((item, index) => {
                    if (index >= 1 && typeof item === 'string') {
                        const [r, g, b, a] = parseCSSColor(item);
                        color.push({index, value: {r, g, b, a}});
                    }
                });
                colors.push({id, key, color});
            }
        }
    });
    return colors;
}

/**
 * Sets style colors based on the style color objects and color factors
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {Array<object>} styleColors - Array of the style color objects
 * @param {object} factors - Color factors to multiply in the form of {r, g, b}
 */
export function setStyleColors(map, styleColors, factors) {
    let prop;

    for (const {id, key, color} of styleColors) {
        if (Array.isArray(color)) {
            prop = map.getPaintProperty(id, key);
            for (const {index, value} of color) {
                const scaledColor = getScaledColorString(value, factors);

                if (prop.stops) {
                    prop.stops[index][1] = scaledColor;
                } else {
                    // Bug: transition doesn't work (mapbox-gl-js #7121)
                    prop[index] = scaledColor;
                }
            }
        } else {
            prop = getScaledColorString(color, factors);
        }
        map.setPaintProperty(id, key, prop);
    }
}

/**
 * Returns an array of the style opacity information retrieved from map layers.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {string} metadataKey - Metadata key to filter
 * @returns {Array<object>} Array of the style opacity objects
 */
export function getStyleOpacities(map, metadataKey) {
    const {_layers, _order} = map.style,
        propMapping = {
            'background-underground': 1,
            'building-underground-underground': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15, 1]
        },
        opacities = [];

    _order.map(id => _layers[id]).filter(({metadata}) =>
        metadata && metadata[metadataKey]
    ).forEach(({id, type, metadata}) => {
        if (type === 'custom') {
            opacities.push({id, metadata});
            return;
        }

        const key = `${type}-opacity`,
            prop = propMapping[id] || valueOrDefault(map.getPaintProperty(id, key), 1);

        if (!isNaN(prop)) {
            opacities.push({id, key, opacity: prop, metadata});
        } else if (prop.stops) {
            const opacity = [];

            prop.stops.forEach((item, index) => {
                opacity.push({index, value: item[1]});
            });
            opacities.push({id, key, opacity, metadata});
        } else if (prop[0] === 'case' || prop[0] === 'interpolate') {
            const opacity = [];

            prop.forEach((item, index) => {
                if (index % 2 === 0 && !isNaN(item)) {
                    opacity.push({index, value: item});
                }
            });
            opacities.push({id, key, opacity, metadata});
        }
    });
    return opacities;
}

/**
 * Sets style opacities based on the style opacity objects and factor
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {Array<object>} styleOpacities - Array of the style opacity objects
 * @param {string | Array<string>} factorKey - Metadata key for the factor to multiply
 */
export function setStyleOpacities(map, styleOpacities, factorKey) {
    let factor, prop;

    for (const {id, key, opacity, metadata} of styleOpacities) {
        if (Array.isArray(factorKey)) {
            factor = factorKey.reduce((value, key) => valueOrDefault(value, metadata[key]), undefined);
        } else {
            factor = metadata[factorKey];
        }

        if (key) {
            if (Array.isArray(opacity)) {
                prop = map.getPaintProperty(id, key);
                for (const {index, value} of opacity) {
                    const scaledOpacity = value * factor;

                    if (prop.stops) {
                        prop.stops[index][1] = scaledOpacity;
                    } else {
                        prop[index] = scaledOpacity;
                    }
                }
            } else {
                prop = opacity * factor;
            }
            map.setPaintProperty(id, key, prop);
        } else {
            setLayerProps(map, id, {opacity: factor});
        }
    }
}
