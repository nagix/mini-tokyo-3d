import DeckGlowMaskLayer from './deck-glow-mask-layer';
import ZoomWidthScaleExtension, {STROKE_WIDTH_SCALE_STOPS} from '../extensions/zoom-width-scale-extension';

const MASK_WIDTH_SCALE = 1.5;
const GLOW_SOURCE_WIDTH_SCALE = 2.5;

// Renders the railway sections currently affected by a delay or suspension
// (see Map#refreshRailwayStatusGlow) as a glowing line. A non-white glowColor
// (via the options passed to the constructor) tells delay from suspension
// apart at a glance.
export default class RailwayStatusGlowLayer extends DeckGlowMaskLayer {

    constructor(id, options) {
        super(id, Object.assign({hasGlowSource: true}, options));

        const me = this;

        me.feature = null;
        me.intensity = 0;
        // Applied up front (not just when setOpacity() is called later) so a
        // status already active on page load starts out correctly faded.
        if (me.metadata) {
            me.setOpacity(me.metadata['mt3d:opacity']);
        }
    }

    onAdd(map, gl) {
        super.onAdd(map, gl);
        this._updateLayers();
    }

    show(feature) {
        const me = this;

        me.feature = feature;
        me.intensity = 1;
        me._updateLayers();
    }

    hide() {
        const me = this;

        me.feature = null;
        me._updateLayers();
    }

    setIntensity(intensity) {
        const me = this;

        me.intensity = intensity;
        me._updateLayers();
        if (me.map) {
            me.map.triggerRepaint();
        }
    }

    _updateLayers() {
        const me = this,
            maskLayers = [],
            glowSourceLayers = [];

        if (me.feature) {
            const buildLayer = (id, widthScale) => me._buildGeoJsonLayer({
                id,
                data: me.feature,
                getLineColor: [255, 255, 255, 255],
                getLineWidth: d => d.properties.width * widthScale,
                lineWidthUnits: 'pixels',
                extensions: [new ZoomWidthScaleExtension(STROKE_WIDTH_SCALE_STOPS)],
                opacity: me.intensity,
                // Same reasoning as StationGlowLayer: a flat, ground-level (or
                // consistently underground) mask with nothing else sharing
                // this offscreen target - depth testing would only risk
                // silently discarding fragments against unrelated state.
                parameters: {
                    depthTest: false,
                    depthMask: false
                }
            });

            maskLayers.push(buildLayer('railway-status', MASK_WIDTH_SCALE));
            glowSourceLayers.push(buildLayer('railway-status-glow-source', GLOW_SOURCE_WIDTH_SCALE));
        }
        me.layerManager.setProps({layers: maskLayers});
        me.glowSourceLayerManager.setProps({layers: glowSourceLayers});

        // Skips the mask/blur/composite render() entirely while no section is
        // affected, same as StationGlowLayer.
        if (me.map) {
            me.map.setLayoutProperty(me.id, 'visibility', maskLayers.length ? 'visible' : 'none');
        }
    }

}
