import {LayerExtension} from '@deck.gl/core';

// Matches the native 'stations-outline'/'railways-og-*' style layers' own
// interpolate expression: constant screen-space stroke width within the
// normal [12, 19] zoom range, shrinking below zoom 12 and growing above
// zoom 19. Shared by every other layer whose stroke needs to track that same
// width (see map.js and station-glow-layer.js).
export const STROKE_WIDTH_SCALE_STOPS = [9, 0.125, 12, 1, 19, 1, 22, 8];

// DECKGL_FILTER_SIZE is a deck.gl shaderlib hook run right after a layer
// computes its own screen-space size (see @deck.gl/core's shaderlib
// SHADER_HOOKS).
const shaders = {
    inject: {
        'vs:#decl': 'uniform float zoomWidthScale;',
        'vs:DECKGL_FILTER_SIZE': 'size *= zoomWidthScale;'
    }
};

// Mirrors a mapbox style expression's exponential interpolation
// (['interpolate', ['exponential', 2], ['zoom'], ...stops]), clamped to the
// first/last stop's value outside its range.
function interpolate(stops, zoom) {
    const lastIndex = stops.length - 2;

    if (zoom <= stops[0]) {
        return stops[1];
    }
    if (zoom >= stops[lastIndex]) {
        return stops[lastIndex + 1];
    }
    for (let i = 0; i < lastIndex; i += 2) {
        const zoom0 = stops[i],
            value0 = stops[i + 1],
            zoom1 = stops[i + 2],
            value1 = stops[i + 3];

        if (zoom <= zoom1) {
            const t = (Math.pow(2, zoom - zoom0) - 1) / (Math.pow(2, zoom1 - zoom0) - 1);

            return value0 + t * (value1 - value0);
        }
    }
}

// stops has no default: which curve (if any) applies is a fact about the
// caller's data, not something to assume here - omitting it just disables
// scaling (zoomWidthScale stays 1).
export default class ZoomWidthScaleExtension extends LayerExtension {

    constructor(stops) {
        super({stops});
    }

    getShaders() {
        return shaders;
    }

    // extension.draw.call(layer, opts, extension) means `this` here is the
    // LAYER, not this extension instance - extension.opts (not this.opts)
    // holds the constructor argument.
    draw({uniforms}, extension) {
        const {stops} = extension.opts;

        uniforms.zoomWidthScale = stops ? interpolate(stops, this.context.viewport.zoom) : 1;
    }

}

ZoomWidthScaleExtension.extensionName = 'ZoomWidthScaleExtension';
