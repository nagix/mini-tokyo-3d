import {Tile3DLayer} from '@deck.gl/geo-layers';
import {MapboxLayer} from '@deck.gl/mapbox';
import {setLights} from '../helpers/helpers-deck';

const DEGREE_TO_RADIAN = Math.PI / 180;

// Base light intensities for this layer, applied at full luminance. They are
// scaled by the relative luminance (0-1) of the corresponding Mapbox light so
// that the lights dim and brighten together with the map.
const DIRECTIONAL_INTENSITY = 5,
    AMBIENT_INTENSITY = 2.5;

export default class {

    constructor(implementation) {
        const me = this;

        me.implementation = implementation;
        me._tick = me._tick.bind(me);
    }

    onAdd(map, beforeId) {
        const me = this,
            implementation = me.implementation,
            options = Object.assign({}, implementation, {type: Tile3DLayer}),
            lightColor = implementation.lightColor,
            ambientLight = {
                color: lightColor,
                intensity: AMBIENT_INTENSITY
            },
            directionalLight = {
                color: lightColor,
                intensity: DIRECTIONAL_INTENSITY,
                direction: [0, 0, -1]
            },
            mbox = map.map;

        me.map = map;

        delete options.lightColor;
        delete options.minzoom;
        delete options.maxzoom;

        mbox.addLayer(new MapboxLayer(options), beforeId || 'poi');
        mbox.setLayerZoomRange(implementation.id, implementation.minzoom, implementation.maxzoom);
        setLights(mbox.__deck, ambientLight, directionalLight);

        if (lightColor === undefined) {
            me._tick();
        }
    }

    _tick() {
        const me = this,
            map = me.map,
            now = map.clock.getTime(),
            mbox = map.map;

        if (Math.floor(now / 60000) !== Math.floor(me.lastRefresh / 60000)) {
            const directional = map.getDirectionalLight(),
                ambient = map.getAmbientLight(),
                [azimuthal, polar] = directional.direction,
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

            setLights(mbox.__deck, ambientLight, directionalLight);
            me.lastRefresh = now;
        }
        if (mbox.getLayer(me.implementation.id)) {
            requestAnimationFrame(me._tick);
        }
    }

}
