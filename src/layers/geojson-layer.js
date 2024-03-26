import {LayerExtension} from '@deck.gl/core';
import {GeoJsonLayer} from '@deck.gl/layers';
import {MapboxLayer} from '@deck.gl/mapbox';

// Workaround for deck.gl #8235
class ShaderExtension extends LayerExtension {

    constructor(options) {
        super(options);
        this.constructor.extensionName = 'ShaderExtension';
    }

    getShaders(extensions) {
        return Object.assign({}, super.getShaders(extensions), {
            inject: {
                'vs:#decl': 'invariant gl_Position;'
            }
        });
    }

}

export default class {

    constructor(implementation) {
        this.implementation = implementation;
    }

    onAdd(map, beforeId) {
        const me = this,
            implementation = me.implementation,
            id = implementation.id,
            options = Object.assign({}, implementation, {
                type: GeoJsonLayer,
                extensions: [new ShaderExtension()]
            }),
            mbox = map.map;

        me.map = map;

        delete options.minzoom;
        delete options.maxzoom;
        delete options.metadata;

        mbox.addLayer(new MapboxLayer(options), beforeId || 'poi');
        mbox.setLayerZoomRange(id, implementation.minzoom, implementation.maxzoom);
        mbox.getLayer(id).metadata = implementation.metadata;
    }

}
