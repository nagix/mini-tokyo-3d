import {GeoJsonLayer} from '@deck.gl/layers';
import DeckGlowMaskLayer from './deck-glow-mask-layer';
import ZoomWidthScaleExtension, {STROKE_WIDTH_SCALE_STOPS} from '../extensions/zoom-width-scale-extension';

// Renders the marked/tracked station footprint through deck.gl's own
// GeoJsonLayer (filled + stroked, lineWidthUnits: 'pixels') so its stroke
// width tracks the real stations-outline layer's pixel width for free.
// Mask/blur/composite mechanics are all inherited from DeckGlowMaskLayer -
// this class only supplies station-specific state and the GeoJsonLayer(s)
// built from it.
export default class StationGlowLayer extends DeckGlowMaskLayer {

    constructor(id) {
        super(id);

        const me = this;

        me.states = new Map();

        for (const name of ['stations-marked', 'stations-selected']) {
            me.states.set(name, {feature: null, opacity: 0});
        }
    }

    onAdd(map, gl) {
        super.onAdd(map, gl);
        // Establishes the initial hidden state (nothing is marked/tracked
        // yet at this point) - see the visibility toggle in _updateLayers().
        this._updateLayers();
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
                    // Keeps getLineWidth tracking the native 'stations-outline'
                    // layer's own zoom-dependent stroke width (see map.js).
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

        // Mask/blur/composite all run inside this layer's own render() (see
        // DeckGlowMaskLayer), so hiding it via the standard mapbox layout
        // property - rather than just leaving an empty deck.gl layer list -
        // skips that render() call entirely instead of paying for a blank
        // mask every frame while nothing is marked/tracked.
        if (me.map) {
            me.map.setLayoutProperty(me.id, 'visibility', layers.length ? 'visible' : 'none');
        }
    }

}
