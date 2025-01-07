import {GeoJsonLayer} from '@deck.gl/layers';
import {MapboxLayer} from '@deck.gl/mapbox';

export default class {

    constructor(implementation) {
        this.implementation = implementation;
    }

    onAdd(map, beforeId) {
        const me = this,
            implementation = me.implementation,
            id = implementation.id,
            options = Object.assign({}, implementation, {type: GeoJsonLayer}),
            mbox = map.map;

        me.map = map;

        delete options.minzoom;
        delete options.maxzoom;
        delete options.metadata;

        mbox.addLayer(new MapboxLayer(options), beforeId || 'poi');
        mbox.setLayerZoomRange(id, implementation.minzoom, implementation.maxzoom);
        mbox.style.getOwnLayer(id).metadata = implementation.metadata;
    }

}
