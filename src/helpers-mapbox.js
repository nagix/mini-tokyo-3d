import mapboxgl from 'mapbox-gl';
import {parseCSSColor} from 'csscolorparser';
import * as helpers from './helpers';

export function getBounds(coords) {
    const bounds = new mapboxgl.LngLatBounds();

    for (const coord of coords) {
        bounds.extend(coord);
    }
    return bounds;
}

export function setLayerProps(map, id, props) {
    map.getLayer(id).implementation.setProps(props);
}

export function isDarkBackground(map) {
    const [r, g, b] = parseCSSColor(map.getPaintProperty('background', 'background-color'));
    return helpers.luminance({r, g, b}) < 127.5;
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
        colors = [];

    map.getStyle().layers.filter(layer =>
        helpers.includes(layerTypes, layer.type) && !layer.id.match(/-(og|ug)-/)
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
 * @param {object} map - Mapbox's Map object
 * @returns {Array} Array of the style opacity objects
 */
export function getStyleOpacities(map) {
    const layerTypes = ['line', 'fill', 'fill-extrusion'],
        opacities = [];

    map.getStyle().layers.filter(layer =>
        helpers.includes(layerTypes, layer.type)
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
