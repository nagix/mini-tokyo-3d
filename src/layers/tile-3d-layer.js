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
            {implementation} = me,
            {id, lightColor, minzoom, maxzoom} = implementation,
            options = Object.assign({}, implementation, {type: Tile3DLayer});

        me.map = map;

        delete options.lightColor;
        delete options.minzoom;
        delete options.maxzoom;

        map.map.addLayer(new MapboxLayer(options), beforeId || 'poi');
        map.map.setLayerZoomRange(id, minzoom, maxzoom);

        me.ambientLight = new AmbientLight({
            color: lightColor,
            intensity: 3.0
        });
        me.directionalLight = new DirectionalLight({
            color: lightColor,
            intensity: 9.0,
            direction: [0, 0, -1]
        });

        map.map.__deck.props.effects = [new LightingEffect({
            ambientLight: me.ambientLight,
            directionalLight: me.directionalLight
        })];

        if (lightColor === undefined) {
            me._tick();
        }
    }

    _tick() {
        const me = this,
            {map, ambientLight, directionalLight, lastRefresh, _tick, implementation} = me,
            now = map.clock.getTime();

        if (Math.floor(now / 60000) !== Math.floor(lastRefresh / 60000)) {
            const {r, g, b} = map.getLightColor(),
                lightColor = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)],
                {lat, lng} = map.getCenter(),
                sunPos = SunCalc.getPosition(now, lat, lng),
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
        if (map.map.getLayer(implementation.id)) {
            requestAnimationFrame(_tick);
        }
    }

}
