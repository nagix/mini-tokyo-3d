import {GeoJsonLayer} from '@deck.gl/layers';
import DeckGlowMaskLayer from './deck-glow-mask-layer';
import ZoomWidthScaleExtension, {STROKE_WIDTH_SCALE_STOPS} from '../extensions/zoom-width-scale-extension';

// Renders the marked/tracked station footprint through deck.gl's own
// GeoJsonLayer (filled + stroked, lineWidthUnits: 'pixels') instead of
// converting it to a three.js ShapeGeometry and hand-tracking the native
// stations-outline stroke's pixel width ourselves, as the retired
// station-glow.js did. Mask/blur/composite mechanics are all inherited from
// DeckGlowMaskLayer - this class only supplies station-specific state and
// the GeoJsonLayer(s) built from it.
export default class StationGlowLayer extends DeckGlowMaskLayer {

    constructor(id) {
        super(id);

        const me = this;

        me.states = new Map();

        for (const name of ['stations-marked', 'stations-selected']) {
            me.states.set(name, {feature: null, opacity: 0});
        }
    }

    show(feature, name) {
        const me = this,
            state = me.states.get(name);

        state.feature = feature;
        state.opacity = 1;
        me._updateLayers();
    }

    hide(name) {
        const state = this.states.get(name);

        state.feature = null;
        this._updateLayers();
    }

    setOpacity(name, opacity) {
        const state = this.states.get(name);

        state.opacity = opacity;
        this._updateLayers();
    }

    _updateLayers() {
        const me = this,
            layers = [];

        for (const [name, state] of me.states) {
            if (state.feature) {
                layers.push(new GeoJsonLayer({
                    id: name,
                    data: state.feature,
                    filled: true,
                    stroked: true,
                    getFillColor: [255, 255, 255, 255],
                    getLineColor: [255, 255, 255, 255],
                    getLineWidth: d => d.properties.width,
                    lineWidthUnits: 'pixels',
                    // Matches the native 'stations-outline' layer's own stroke
                    // width (see map.js) - without this, this GeoJsonLayer's
                    // getLineWidth stayed fixed at properties.width forever,
                    // so outside [12, 19] the glow's seed stroke (and so the
                    // glow's own visible size) stopped tracking the real
                    // outline's width.
                    extensions: [new ZoomWidthScaleExtension(STROKE_WIDTH_SCALE_STOPS)],
                    opacity: state.opacity,
                    // This mask has one flat, ground-level feature at a time -
                    // no z-fighting to resolve, and depth testing is one more
                    // variable (buffer state, near/far mismatch) that could be
                    // silently discarding every fragment against this custom
                    // offscreen target.
                    parameters: {
                        depthTest: false,
                        depthMask: false
                    }
                }));
            }
        }
        me.layerManager.setProps({layers});
    }

}
