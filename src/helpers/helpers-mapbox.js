import {LngLat, LngLatBounds} from 'mapbox-gl';
import {parseCSSColor} from 'csscolorparser';
import {includes, lerp, luminance, valueOrDefault} from './helpers';
import * as SunCalc from 'suncalc';

const HOUR = 3600000;
const BG_LAYER_IDS = ['background', 'background-underground'];

/**
 * Returns the sunrise and sunset times for the local solar day that contains
 * the given time. SunCalc 2.x anchors getTimes to the UTC calendar day, so the
 * returned times would otherwise jump by a day at 00:00 UTC. Shifting the input
 * by the longitude offset (15 degrees per hour) selects the local solar day, as
 * SunCalc 1.x did internally, moving the unavoidable day boundary to local solar
 * midnight.
 * @param {LngLat} center - The location to compute the times for
 * @param {number} time - The number of milliseconds elapsed since January 1,
 *     1970 00:00:00 UTC
 * @returns {Object} Object with sunrise and sunset Date objects
 */
function getSunTimes(center, time) {
    return SunCalc.getTimes(time + center.lng / 15 * HOUR, center.lat, center.lng);
}

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
 * @param {Object} props - One or more properties to update
 */
export function setLayerProps(map, id, props) {
    map.getLayer(id).setProps(props);
}

/**
 * Returns the sunlight color at a specific time.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {number} time - The number of milliseconds elapsed since January 1,
 *     1970 00:00:00 UTC
 * @returns {Object} Color object
 */
export function getSunlightColor(map, time) {
    const center = map.getCenter(),
        {sunrise, sunset} = getSunTimes(center, time),
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
 * @param {number} shadowIntensity - Determines the shadow strength
 * @param {boolean} shadowOnly - If true, only the shadow intensity is updated
 *     while the brightness-affecting properties are left unchanged
 */
export function setSunlight(map, time, shadowIntensity, shadowOnly) {
    const center = map.getCenter(),
        {sunrise, sunset} = getSunTimes(center, time),
        sunriseTime = sunrise.getTime(),
        sunsetTime = sunset.getTime(),
        {azimuth, altitude} = SunCalc.getPosition(time, center.lat, center.lng),
        sunAzimuth = azimuth,
        sunAltitude = 90 - altitude;
    let t, ambient, directional, sun;

    if (time >= sunriseTime - HOUR / 2 && time < sunriseTime) {
        // Night to sunrise
        const sunrisePosition = SunCalc.getPosition(sunriseTime, center.lat, center.lng);

        t = (time - sunriseTime) / (HOUR / 2) + 1;
        ambient = {
            r: lerp(0, 153, t),
            g: lerp(22, 179, t),
            b: lerp(56, 204, t),
            i: lerp(.5, .65, t)
        };
        directional = {
            r: 74,
            g: 74,
            b: 74,
            i: lerp(.5, .6, t),
            w: .5
        };
        sun = {
            azimuth: lerp(210, sunrisePosition.azimuth, t),
            altitude: 20
        };
    } else if (time >= sunriseTime && time < sunriseTime + HOUR) {
        // Sunrise to day
        t = (time - sunriseTime) / HOUR;
        ambient = {
            r: lerp(153, 255, t),
            g: lerp(179, 255, t),
            b: lerp(204, 255, t),
            i: lerp(.65, .7, t)
        };
        directional = {
            r: lerp(254, 255, t),
            g: lerp(202, 255, t),
            b: lerp(139, 255, t),
            i: lerp(.6, .3, t),
            w: 1
        };
        sun = {
            azimuth: sunAzimuth,
            altitude: sunAltitude
        };
    } else if (time >= sunriseTime + HOUR && time < sunsetTime - HOUR) {
        // Day
        ambient = {
            r: 255,
            g: 255,
            b: 255,
            i: .7
        };
        directional = {
            r: 255,
            g: 255,
            b: 255,
            i: .3,
            w: 1
        };
        sun = {
            azimuth: sunAzimuth,
            altitude: sunAltitude
        };
    } else if (time >= sunsetTime - HOUR && time < sunsetTime) {
        // Day to sunset
        t = (time - sunsetTime) / HOUR + 1;
        ambient = {
            r: lerp(255, 204, t),
            g: lerp(255, 179, t),
            b: lerp(255, 153, t),
            i: lerp(.7, .65, t)
        };
        directional = {
            r: lerp(255, 254, t),
            g: lerp(255, 194, t),
            b: lerp(255, 134, t),
            i: lerp(.3, .6, t),
            w: 1
        };
        sun = {
            azimuth: sunAzimuth,
            altitude: sunAltitude
        };
    } else if (time >= sunsetTime && time < sunsetTime + HOUR / 2) {
        // Sunset to night
        const sunsetPosition = SunCalc.getPosition(sunsetTime, center.lat, center.lng);

        t = (time - sunsetTime) / (HOUR / 2);
        ambient = {
            r: lerp(204, 0, t),
            g: lerp(179, 22, t),
            b: lerp(153, 56, t),
            i: lerp(.65, .5, t)
        };
        directional = {
            r: 74,
            g: 74,
            b: 74,
            i: lerp(.6, .5, t),
            w: .5
        };
        sun = {
            azimuth: lerp(sunsetPosition.azimuth, 210, t),
            altitude: 20
        };
    } else {
        // Night
        ambient = {
            r: 0,
            g: 22,
            b: 56,
            i: .5
        };
        directional = {
            r: 74,
            g: 74,
            b: 74,
            i: .5,
            w: .5
        };
        sun = {
            azimuth: 210,
            altitude: 20
        };
    }

    const shadowIntensityValue = directional.w * shadowIntensity;

    if (shadowOnly) {
        // Mode toggle (underground/ground): the brightness-affecting values (color, intensity
        // and direction) are unchanged, so update shadow-intensity alone. Changing the brightness
        // here would force a re-evaluation/re-upload of all model layer instances and freeze the
        // main thread.
        const lights = map.getLights();

        for (const light of lights) {
            if (light.type === 'directional') {
                light.properties = Object.assign({}, light.properties, {
                    'shadow-intensity': shadowIntensityValue
                });
            }
        }
        map.setLights(lights);
    } else {
        map.setLights([{
            id: 'ambient',
            type: 'ambient',
            properties: {
                color: `rgb(${ambient.r}, ${ambient.g}, ${ambient.b})`,
                intensity: ambient.i
            }
        }, {
            id: 'directional',
            type: 'directional',
            properties: {
                direction: ['literal', [sun.azimuth, sun.altitude]],
                color: `rgb(${directional.r}, ${directional.g}, ${directional.b})`,
                intensity: directional.i,
                'cast-shadows': true,
                'shadow-intensity': shadowIntensityValue
            }
        }]);
    }

    map.setPaintProperty('sky', 'sky-atmosphere-sun', [sunAzimuth, sunAltitude]);
}

/**
 * Checks if the background color of the map is dark.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {boolean} actual - If true, the result is based on the current background color.
 *     Otherwise, the result is based on the target background color
 * @returns {boolean} True if the background color of the map is dark
 */
export function hasDarkBackground(map, actual) {
    const light = map.getLights().filter(({type}) => type === 'ambient')[0],
        lightColorElements = parseCSSColor(light.properties.color),
        lightIntensity = light.properties.intensity,
        lr = lightColorElements[0] / 255 * lightIntensity,
        lg = lightColorElements[1] / 255 * lightIntensity,
        lb = lightColorElements[2] / 255 * lightIntensity;

    if (actual) {
        return BG_LAYER_IDS.reduce((value, id) => {
            const paintProperties = map.style.getOwnLayer(id).paint,
                {r, g, b} = paintProperties.get('background-color'),
                a = paintProperties.get('background-opacity');
            return value + luminance({r: r * lr * a, g: g * lg * a, b: b * lb * a});
        }, 0) < .5;
    }

    return BG_LAYER_IDS.reduce((value, id) => {
        const [r, g, b] = parseCSSColor(map.getPaintProperty(id, 'background-color')),
            a = valueOrDefault(map.getPaintProperty(id, 'background-opacity'), 1);
        return value + luminance({r: r * lr * a, g: g * lg * a, b: b * lb * a});
    }, 0) < 127.5;
}

/**
 * Returns an array of the style opacity information retrieved from map layers.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {string} metadataKey - Metadata key to filter
 * @returns {Array<Object>} Array of the style opacity objects
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

        const key = `${type.replace('symbol', 'icon')}-opacity`,
            prop = propMapping[id] || valueOrDefault(map.getPaintProperty(id, key), 1);

        if (!isNaN(prop)) {
            opacities.push({id, key, opacity: prop, metadata});
        } else if (includes(['match', 'step', 'interpolate'], prop[0])) {
            const opacity = [];

            prop.forEach((value, index) => {
                if ((index % 2 === (prop[0] === 'match' ? 1 : 0) || index === prop.length - 1) && !isNaN(value)) {
                    opacity.push({index, value});
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
 * @param {Array<Object>} styleOpacities - Array of the style opacity objects
 * @param {string | Array<string>} factorKey - Metadata key for the factor to multiply
 */
export function setStyleOpacities(map, styleOpacities, factorKey) {
    const duration = map.style.transition.duration;

    for (const {id, key, opacity, metadata} of styleOpacities) {
        let factor, prop;

        if (Array.isArray(factorKey)) {
            factor = factorKey.reduce((value, key) => valueOrDefault(value, metadata[key]), undefined);
        } else {
            factor = metadata[factorKey];
        }

        if (key) {
            if (Array.isArray(opacity)) {
                prop = map.getPaintProperty(id, key);
                for (const {index, value} of opacity) {
                    prop[index] = value * factor;
                }
            } else {
                prop = opacity * factor;
            }
            map.setPaintProperty(id, key, prop);
        } else {
            const start = performance.now(),
                current = valueOrDefault(map.getLayer(id).props.opacity, 1);

            // Workaround for deck.gl's transitions property which doesn't work as extected
            (function repeat() {
                const elapsed = performance.now() - start;

                setLayerProps(map, id, {
                    opacity: lerp(current, factor, Math.min(elapsed / duration, 1))
                });
                if (elapsed < duration) {
                    requestAnimationFrame(repeat);
                }
            })();
        }
    }
}

export function fetchTimezoneOffset(lngLat, accessToken) {
    const {lng, lat} = LngLat.convert(lngLat);

    return fetch(`https://api.mapbox.com/v4/examples.4ze9z6tv/tilequery/${lng},${lat}.json?radius=22224&limit=1&access_token=${accessToken}`)
        .then(response => response.json())
        .then(({features}) => {
            if (features.length === 0) {
                throw new Error();
            }

            const timeZone = features[0].properties.TZID,
                date = new Date(),
                utcDate = new Date(date.toLocaleString('en-US', {timeZone: 'UTC'})),
                tzDate = new Date(date.toLocaleString('en-US', {timeZone}));

            return (utcDate.getTime() - tzDate.getTime()) / 60000;
        })
        .catch(() => {
            return -Math.round(lng / 15) * 60;
        });
}
