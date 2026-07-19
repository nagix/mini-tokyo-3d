import {Tile3DLayer} from '@deck.gl/geo-layers';
import {MapboxLayer} from '@deck.gl/mapbox';
import {setLights} from '../helpers/helpers-deck';
import {getAmbientLight, getDirectionalLight, getFogColor, getFogNearFar} from '../helpers/helpers-mapbox';
import FogExtension from './fog-extension';

const DEGREE_TO_RADIAN = Math.PI / 180;

// Base light intensities for this layer, applied at full luminance. They are
// scaled by the relative luminance (0-1) of the corresponding Mapbox light so
// that the lights dim and brighten together with the map.
const DIRECTIONAL_INTENSITY = 5,
    AMBIENT_INTENSITY = 2.5;

// Returns the deck.gl fog color ([r, g, b, a] with r, g, b in 0-1 sRGB and a in
// 0-1) for the current scene brightness. The alpha lets the original texture
// show through at full fog.
function getFog(mbox) {
    const [r, g, b, a] = getFogColor(mbox);

    return [r / 255, g / 255, b / 255, a];
}

// Returns the clip-space w (= linear eye-space depth, the same quantity as the
// shader's 1 / gl_FragCoord.w) of the ground point at the screen center, by
// transforming its common position (viewport.center) with the viewport's
// view-projection matrix. This is exactly the fog depth at the screen center, so
// the fog can be anchored to it in matching units without any scale guessing.
function getCenterDistance(mbox) {
    const viewport = mbox.__deck.getViewports()[0],
        [x, y, z] = viewport.center,
        m = viewport.viewProjectionMatrix;

    return Math.abs(m[3] * x + m[7] * y + m[11] * z + m[15]);
}

// Returns the far clipping plane distance in clip-space w units (eye-space depth),
// extracted from the viewport's perspective projection matrix. Fragments at the
// far plane (the horizon) have this depth, so using it as the fog far makes the
// fog reach the fog color fully at the horizon.
function getFarDistance(mbox) {
    const m = mbox.__deck.getViewports()[0].projectionMatrix;

    return Math.abs(m[14] / (m[10] + 1));
}

export default class {

    constructor(implementation) {
        this.implementation = implementation;
        this._updateLights = this._updateLights.bind(this);
    }

    onAdd(map, beforeId) {
        const me = this,
            implementation = me.implementation,
            lightColor = implementation.lightColor,
            mbox = map.map,
            // The fog is passed by reference so that updating me.fog in _render() is
            // picked up on every deck.gl draw without a prop change. near/far are
            // filled in by the first render, once the deck instance/viewport exists.
            fog = me.fog = {color: getFog(mbox), near: 0, far: 1},
            options = Object.assign({}, implementation, {
                type: Tile3DLayer,
                extensions: [...(implementation.extensions || []), new FogExtension({fog})]
            }),
            ambientLight = {
                color: lightColor,
                intensity: AMBIENT_INTENSITY
            },
            directionalLight = {
                color: lightColor,
                intensity: DIRECTIONAL_INTENSITY,
                direction: [0, 0, -1]
            };

        me.map = map;

        delete options.lightColor;
        delete options.minzoom;
        delete options.maxzoom;

        const mapboxLayer = me.mapboxLayer = new MapboxLayer(options),
            render = mapboxLayer.render.bind(mapboxLayer),
            onRemove = mapboxLayer.onRemove.bind(mapboxLayer);

        mapboxLayer.render = (...args) => {
            me._render();
            return render(...args);
        };
        mapboxLayer.onRemove = (...args) => {
            if (lightColor === undefined) {
                map.off('light', me._updateLights);
            }
            return onRemove(...args);
        };

        mbox.addLayer(mapboxLayer, beforeId || 'poi');
        mbox.setLayerZoomRange(implementation.id, implementation.minzoom, implementation.maxzoom);

        setLights(mbox.__deck, ambientLight, directionalLight);

        if (lightColor === undefined) {
            map.on('light', me._updateLights);
            me._updateLights({directional: getDirectionalLight(mbox), ambient: getAmbientLight(mbox)});
        }
    }

    _render() {
        const me = this,
            mbox = me.map.map,
            fog = me.fog;

        // The lights are updated on the map's 'light' event; only the fog is
        // refreshed per frame here (the extension reads me.fog on every draw).
        // getBrightness reads a cached value the map keeps current, so the color
        // follows the time of day within a frame; near/far are anchored to the
        // screen-center and far-plane depths, so the fog tracks zoom and pitch.
        fog.color = getFog(mbox);
        [fog.near, fog.far] = getFogNearFar(getCenterDistance(mbox), getFarDistance(mbox));
    }

    // Applies the given directional and ambient light (from the map's 'light' event
    // payload) to the deck.gl instance. Called on the event and once on add; only
    // used when lightColor is undefined.
    _updateLights({directional, ambient}) {
        const [azimuthal, polar] = directional.direction,
            azimuth = azimuthal * DEGREE_TO_RADIAN,
            altitude = polar * DEGREE_TO_RADIAN,
            ambientLight = {
                color: ambient.color,
                intensity: ambient.intensity * AMBIENT_INTENSITY
            },
            directionalLight = {
                color: directional.color,
                intensity: directional.intensity * DIRECTIONAL_INTENSITY,
                direction: [
                    Math.sin(azimuth) * Math.sin(altitude),
                    Math.cos(azimuth) * Math.sin(altitude),
                    Math.cos(altitude)
                ]
            };

        setLights(this.map.map.__deck, ambientLight, directionalLight);
    }

}
