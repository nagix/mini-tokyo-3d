import {GeoJsonLayer} from '@deck.gl/layers';
import {MapboxLayer} from '@deck.gl/mapbox';

export default class {

    constructor(implementation) {
        this.implementation = implementation;
    }

    onAdd(map, beforeId) {
        const me = this,
            {implementation} = me,
            {id, minzoom, maxzoom, metadata} = implementation,
            options = Object.assign({}, implementation, {type: GeoJsonLayer});

        me.map = map;

        delete options.minzoom;
        delete options.maxzoom;
        delete options.metadata;

        map.map.addLayer(new MapboxLayer(options), beforeId || 'poi');
        map.map.setLayerZoomRange(id, minzoom, maxzoom);
        map.map.getLayer(id).metadata = metadata;
    }

}
