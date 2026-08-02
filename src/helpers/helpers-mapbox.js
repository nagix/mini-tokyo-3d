import {LngLatBounds} from 'mapbox-gl';
import {parseCSSColor} from 'csscolorparser';
import {clamp, includes, lerp, luminance, valueOrDefault} from './helpers';
import * as SunCalc from 'suncalc';

const HOUR = 3600000;
const BG_LAYER_IDS = ['background', 'background-underground'];
const RADIAN_TO_DEGREE = 180 / Math.PI;

// The map center must move at least this many degrees in latitude or longitude
// before the sun-position-dependent lighting is refreshed, so it tracks large
// pans without updating on every move.
const SUNLIGHT_REFRESH_DEGREES = 1;

// Fog near/far as positions on a scale where 0 is the ground point at the screen
// center and FOG_FAR_PLANE is the far clipping plane (the horizon).
const FOG_NEAR = 1,
    FOG_FAR = 10,
    FOG_FAR_PLANE = 20;

// Fog color as a function of the scene brightness, mirroring the high-zoom
// (>= zoom 7) color ramp of the map style's fog so that the layer fog changes
// color with the time of day together with the map. Each stop is the style's
// hsla() value converted to [r, g, b, a] (r, g, b in 0-255 sRGB, a in 0-1). The
// alpha lets the original texture show through when the fog is fully applied.
const FOG_COLOR_STOPS = [
    {brightness: 0.01, color: [6, 14, 25, 0.9]}, // hsla(213, 63%, 6%, 0.9) - night
    {brightness: 0.2, color: [237, 204, 171, 0.7]}, // hsla(30, 65%, 80%, 0.7) - twilight
    {brightness: 0.4, color: [247, 251, 253, 0.9]} // hsla(200, 60%, 98%, 0.9) - day
];

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
 * Returns the light of the given type as currently rendered on the map. It reads
 * the evaluated (possibly transitioning) light values, not the target ones set by
 * setLights, so it reflects what is actually on screen mid-transition.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {string} type - The light type ('ambient' or 'directional')
 * @returns {Object} Object with the following properties:
 *     - color: The light color ([r, g, b], each 0-255)
 *     - intensity: The relative luminance of the color (0-1, 0 is black and
 *       1 is white)
 *     - direction: Only for a directional light. The direction to the light
 *       source as [azimuthal, polar] in degrees, where the azimuthal angle is
 *       0-360 (north-based clockwise; 0 = N, 90 = E, 180 = S, 270 = W) and the
 *       polar angle is 0-90 (0 = straight above, 90 = at the horizon)
 */
function getLight(map, type) {
    const {properties} = map.style[`${type}Light`],
        [r, g, b] = parseCSSColor(properties.get('color').toString()),
        result = {
            color: [r, g, b],
            intensity: .2126 * r / 255 + .7152 * g / 255 + .0722 * b / 255
        };

    if (type === 'directional') {
        // The evaluated direction is a Cartesian unit vector, so convert it back to
        // [azimuthal, polar] in degrees (the inverse of Mapbox's spherical-to-Cartesian
        // conversion) to reflect the value actually rendered, including mid-transition.
        const {x, y, z} = properties.get('direction'),
            radial = Math.sqrt(x * x + y * y + z * z),
            polar = radial > 0 ? Math.acos(z / radial) * RADIAN_TO_DEGREE : 0;
        let azimuthal = x !== 0 || y !== 0 ? Math.atan2(-y, -x) * RADIAN_TO_DEGREE + 90 : 0;

        if (azimuthal < 0) {
            azimuthal += 360;
        }
        result.direction = [azimuthal, polar];
    }

    return result;
}

/**
 * Returns the directional light as currently rendered on the map (evaluated,
 * possibly mid-transition).
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @returns {Object} Object with the color ([r, g, b], each 0-255), the
 *     intensity (relative luminance of the color, 0-1) and the direction
 *     ([azimuthal, polar] in degrees) of the directional light. See getLight
 *     for the details of each property.
 */
export function getDirectionalLight(map) {
    return getLight(map, 'directional');
}

/**
 * Returns the ambient light as currently rendered on the map (evaluated,
 * possibly mid-transition).
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @returns {Object} Object with the color ([r, g, b], each 0-255) and the
 *     intensity (relative luminance of the color, 0-1) of the ambient light.
 *     See getLight for the details of each property.
 */
export function getAmbientLight(map) {
    return getLight(map, 'ambient');
}

/**
 * Returns the perceived brightness of the lights as currently rendered on the
 * map (evaluated, possibly mid-transition). This is the same value the map style
 * exposes as ['measure-light', 'brightness'], derived from the ambient and
 * directional lights.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @returns {number} The brightness (0-1), or 0 if it cannot be measured
 */
export function getBrightness(map) {
    return map.style.getBrightness() || 0;
}

/**
 * Returns true if the map center has moved far enough from the last recorded
 * center that the sun-position-dependent lighting should be refreshed. A missing
 * last center returns true.
 * @param {LngLat} center - The current map center
 * @param {LngLat} last - The map center at the last lighting refresh
 * @returns {boolean} True if the center has moved beyond the threshold
 */
export function hasCenterMoved(center, last) {
    return !last ||
        Math.abs(center.lat - last.lat) >= SUNLIGHT_REFRESH_DEGREES ||
        Math.abs(center.lng - last.lng) >= SUNLIGHT_REFRESH_DEGREES;
}

/**
 * Returns the fog color for the map's current brightness, interpolated across the
 * same color ramp the map style's fog uses.
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @returns {Array<number>} The fog color as [r, g, b, a] (r, g, b in 0-255 sRGB,
 *     a in 0-1)
 */
export function getFogColor(map) {
    const brightness = getBrightness(map),
        stops = FOG_COLOR_STOPS;

    for (let i = 1; i < stops.length; i++) {
        const to = stops[i];

        if (brightness <= to.brightness || i === stops.length - 1) {
            const from = stops[i - 1],
                t = clamp((brightness - from.brightness) / (to.brightness - from.brightness), 0, 1);

            return [
                lerp(from.color[0], to.color[0], t),
                lerp(from.color[1], to.color[1], t),
                lerp(from.color[2], to.color[2], t),
                lerp(from.color[3], to.color[3], t)
            ];
        }
    }
}

/**
 * Returns the fog near/far distances for a camera, mapping the shared FOG_NEAR /
 * FOG_FAR positions from the [0 = screen center, FOG_FAR_PLANE = far clipping
 * plane] scale to actual distances.
 * @param {number} center - The distance to the ground at the screen center
 * @param {number} farPlane - The distance to the far clipping plane (the horizon)
 * @returns {Array<number>} The fog distances as [near, far], in the same units as
 *     the arguments
 */
export function getFogNearFar(center, farPlane) {
    const unit = (farPlane - center) / FOG_FAR_PLANE;

    return [center + FOG_NEAR * unit, center + FOG_FAR * unit];
}

/**
 * Sets the sunlight at a specific time to the map
 * @param {mapboxgl.Map} map - Mapbox's Map object
 * @param {number} time - The number of milliseconds elapsed since January 1,
 *     1970 00:00:00 UTC
 * @param {number} shadowIntensity - Determines the shadow strength
 * @param {boolean} shadowOnly - If true, only the shadow intensity is updated
 *     while the brightness-affecting properties are left unchanged
 * @param {boolean} transition - If true, the light animates to the new values
 *     using the default transition. Otherwise it snaps instantly (the default),
 *     which suits continuous changes (move, realtime, time-lapse); a transition is
 *     only wanted when jumping to a specific time via the clock panel.
 */
export function setSunlight(map, time, shadowIntensity, shadowOnly, transition) {
    const center = map.getCenter(),
        {sunrise, sunset} = getSunTimes(center, time),
        // At high latitudes there may be no sunrise/sunset (polar day/night), in
        // which case SunCalc returns null; fall back to NaN so the branches below
        // are skipped and the polar day/night case is handled explicitly.
        sunriseTime = sunrise ? sunrise.getTime() : NaN,
        sunsetTime = sunset ? sunset.getTime() : NaN,
        {azimuth, altitude} = SunCalc.getPosition(time, center.lat, center.lng),
        sunAzimuth = azimuth,
        sunAltitude = 90 - altitude;
    let t, ambient, directional, sun;

    if ((isNaN(sunriseTime) || isNaN(sunsetTime)) && altitude > 0) {
        // Polar day: the sun stays above the horizon all day (no sunrise/sunset),
        // so use daytime lighting. Polar night (sun below the horizon) falls through
        // to the Night branch below.
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
    } else if (time >= sunriseTime - HOUR / 2 && time < sunriseTime) {
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
            i: lerp(.5, 1, t),
            w: 0
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
            r: lerp(255, 235, t),
            g: lerp(255, 197, t),
            b: lerp(255, 173, t),
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
            r: lerp(235, 0, t),
            g: lerp(197, 22, t),
            b: lerp(173, 56, t),
            i: lerp(.65, .5, t)
        };
        directional = {
            r: 74,
            g: 74,
            b: 74,
            i: lerp(1, .5, t),
            w: 0
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
            w: 0
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
        // setLights captures the global style transition synchronously, so drive the
        // snap/animate through it - 0 to snap continuous changes, the default duration
        // to animate a jump - and restore it right after so nothing else is affected.
        const styleTransition = map.style.transition,
            duration = styleTransition.duration;

        styleTransition.duration = transition ? duration : 0;
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
        styleTransition.duration = duration;
    }
    if (map.getLayer('sky')) {
        map.setPaintProperty('sky', 'sky-atmosphere-sun', [sunAzimuth, sunAltitude]);
    } else {
        // The 'sky' layer type will be phased out in a future release of Mapbox GL JS
        // (see https://docs.mapbox.com/style-spec/reference/layers/#sky). To avoid
        // future compatibility problems, it is added here in code rather than declared
        // in the style file, and created together with the initial sun position so the
        // sky is correct from the first frame.
        map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
                'sky-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0,
                    0,
                    5,
                    0.3,
                    8,
                    1
                ],
                'sky-type': 'atmosphere',
                'sky-atmosphere-color': 'hsl(220, 100%, 70%)',
                'sky-atmosphere-sun-intensity': 20,
                'sky-atmosphere-sun': [sunAzimuth, sunAltitude]
            }
        }, 'background');
    }
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
