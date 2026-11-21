import DeckGlowMaskLayer from './deck-glow-mask-layer';
import ZoomWidthScaleExtension, {STROKE_WIDTH_SCALE_STOPS} from '../extensions/zoom-width-scale-extension';

const WIDTH_SCALE = 1.5;

// Glows the marked/tracked railway's line together with its stations'
// footprints (see Map#addRailwayOutline). Only line features (properties.section)
// get the WIDTH_SCALE buffer, matching RailwayStatusGlowLayer - station
// footprints keep StationGlowLayer's own unscaled width.
export default class RailwayGlowLayer extends DeckGlowMaskLayer {

    constructor(id) {
        super(id);

        const me = this;

        me.states = new Map();

        for (const name of ['railways-marked', 'railways-selected']) {
            me.states.set(name, {feature: null, intensity: 0});
        }
    }

    onAdd(map, gl) {
        super.onAdd(map, gl);
        this._updateLayers();
    }

    show(feature, name) {
        const me = this,
            state = me.states.get(name);

        state.feature = feature;
        state.intensity = 1;
        me._updateLayers();
    }

    hide(name) {
        const me = this,
            state = me.states.get(name);

        state.feature = null;
        me._updateLayers();
    }

    setIntensity(name, intensity) {
        const me = this,
            state = me.states.get(name);

        state.intensity = intensity;
        me._updateLayers();
        if (me.map) {
            me.map.triggerRepaint();
        }
    }

    _updateLayers() {
        const me = this,
            layers = [];

        for (const [name, state] of me.states) {
            if (state.feature) {
                layers.push(me._buildGeoJsonLayer({
                    id: name,
                    data: state.feature,
                    filled: true,
                    stroked: true,
                    getFillColor: [255, 255, 255, 255],
                    getLineColor: [255, 255, 255, 255],
                    getLineWidth: d => (d.properties.section ? d.properties.width * WIDTH_SCALE : d.properties.width),
                    lineWidthUnits: 'pixels',
                    extensions: [new ZoomWidthScaleExtension(STROKE_WIDTH_SCALE_STOPS)],
                    opacity: state.intensity,
                    // Same reasoning as StationGlowLayer: a flat mask with
                    // nothing else sharing this offscreen target.
                    parameters: {
                        depthTest: false,
                        depthMask: false
                    }
                }));
            }
        }
        me.layerManager.setProps({layers});

        if (me.map) {
            me.map.setLayoutProperty(me.id, 'visibility', layers.length ? 'visible' : 'none');
        }
    }

}
