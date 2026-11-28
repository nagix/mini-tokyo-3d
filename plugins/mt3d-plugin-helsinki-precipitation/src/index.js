// The application supplies this peer dependency as a global or module at runtime.
// eslint-disable-next-line import-x/no-unresolved
import {THREE} from 'mini-tokyo-3d';
import {resolveOptions} from './options';
import ParticleRenderer from './particle-renderer';

const ICON = `data:image/svg+xml;charset=utf-8,${encodeURIComponent([
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '<path fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"',
    ' d="M16 32a10 10 0 0 1 1-20 17 17 0 0 1 31 8 10 10 0 0 1 0 20H16"/>',
    '<path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"',
    ' d="M20 47l-3 7m17-7l-3 7m17-7l-3 7"/>',
    '</svg>'
].join(''))}`;

class PrecipitationLayer {

    constructor(options) {
        this.id = 'helsinki-precipitation';
        this.type = 'three';
        this.options = options;
        this.brightness = 0.5;
    }

    onAdd(map, context) {
        this.particleRenderer = new ParticleRenderer(THREE, this.options, map);
        this.particleRenderer.setBrightness(this.brightness);
        this.particleRenderer.onAdd(context);
        map.getMapboxMap().moveLayer(this.id);
    }

    onRemove() {
        if (this.particleRenderer) {
            this.particleRenderer.onRemove();
            this.particleRenderer = undefined;
        }
    }

    render(_map, context) {
        if (this.particleRenderer) {
            this.particleRenderer.render(context);
        }
    }

    setBrightness(brightness) {
        this.brightness = brightness;
        if (this.particleRenderer) {
            this.particleRenderer.setBrightness(brightness);
        }
    }

}

class HelsinkiPrecipitationPlugin {

    constructor(options) {
        const resolved = resolveOptions(
                options,
                typeof location === 'undefined' ? '' : location.search
        );

        this.id = 'helsinki-precipitation';
        this.name = {
            en: 'Rain and snow',
            fi: 'Sade ja lumi'
        };
        this.iconStyle = {
            backgroundSize: '32px',
            backgroundImage: `url("${ICON}")`
        };
        this.clockModes = ['realtime'];
        this.viewModes = ['ground'];
        this.searchModes = ['none'];
        this.enabled = resolved.enabled;
        this.layer = new PrecipitationLayer(resolved);
        this._onLight = this._onLight.bind(this);
    }

    onAdd(map) {
        this.map = map;
    }

    onEnabled() {
        const mbox = this.map.getMapboxMap();

        if (!mbox.getLayer(this.layer.id)) {
            this.map.addLayer(this.layer);
        }
        this.map.on('light', this._onLight);
        this._onLight(this.map.getLight());
    }

    onDisabled() {
        this.map.off('light', this._onLight);
        if (this.map.getMapboxMap().getLayer(this.layer.id)) {
            this.map.removeLayer(this.layer.id);
        }
    }

    onRemove() {
        this.map = undefined;
    }

    onVisibilityChanged(visible) {
        if (this.map && this.map.getMapboxMap().getLayer(this.layer.id)) {
            this.map.setLayerVisibility(this.layer.id, visible ? 'visible' : 'none');
        }
    }

    _onLight({brightness}) {
        this.layer.setBrightness(brightness);
    }

}

export default function(options) {
    return new HelsinkiPrecipitationPlugin(options);
}
