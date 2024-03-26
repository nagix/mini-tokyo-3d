import {AmbientLight, DirectionalLight, LightingEffect} from '@deck.gl/core';
import {Tile3DLayer} from '@deck.gl/geo-layers';
import {MapboxLayer} from '@deck.gl/mapbox';
import SunCalc from 'suncalc';

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
            ambientLight = me.ambientLight = new AmbientLight({
                color: lightColor,
                intensity: 3.0
            }),
            directionalLight = me.directionalLight = new DirectionalLight({
                color: lightColor,
                intensity: 9.0,
                direction: [0, 0, -1]
            }),
            mbox = map.map;

        me.map = map;

        delete options.lightColor;
        delete options.minzoom;
        delete options.maxzoom;

        mbox.addLayer(new MapboxLayer(options), beforeId || 'poi');
        mbox.setLayerZoomRange(implementation.id, implementation.minzoom, implementation.maxzoom);
        mbox.__deck.props.effects = [new LightingEffect({ambientLight, directionalLight})];

        if (lightColor === undefined) {
            me._tick();
        }
    }

    _tick() {
        const me = this,
            {map, ambientLight, directionalLight} = me,
            now = map.clock.getTime();

        if (Math.floor(now / 60000) !== Math.floor(me.lastRefresh / 60000)) {
            const {r, g, b} = map.getLightColor(),
                lightColor = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)],
                center = map.getCenter(),
                sunPos = SunCalc.getPosition(now, center.lat, center.lng),
                azimuth = Math.PI + sunPos.azimuth,
                altitude = -sunPos.altitude;

            ambientLight.color = lightColor;
            directionalLight.color = lightColor;
            directionalLight.direction = [
                Math.sin(azimuth) * Math.cos(altitude),
                Math.cos(azimuth) * Math.cos(altitude),
                -Math.sin(altitude)
            ];
            me.lastRefresh = now;
        }
        if (map.map.getLayer(me.implementation.id)) {
            requestAnimationFrame(me._tick);
        }
    }

}
