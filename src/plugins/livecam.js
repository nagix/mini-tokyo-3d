import {createElement, loadJSON} from '../helpers';
import Marker from '../marker';
import Panel from '../panel';
import Popup from '../popup';
import Plugin from './plugin';
import livecamSVG from '../../node_modules/@fortawesome/fontawesome-free/svgs/solid/video.svg';
import './livecam.css';

// Live camera URL
const LIVECAM_URL = 'https://mini-tokyo.appspot.com/livecam';

class LivecamPanel extends Panel {

    constructor(options) {
        super(Object.assign({className: 'livecam-panel'}, options));
    }

    addTo(map) {
        const me = this,
            {name, html} = me._options.camera;

        me.setTitle(name[map.lang])
            .setHTML(html);
        return super.addTo(map);
    }

}

class LivecamPlugin extends Plugin {

    constructor(options) {
        super(options);

        const me = this;

        me.id = 'livecam';
        me.name = {
            en: 'Live Cameras',
            ja: 'ライブカメラ',
            ko: '실시간 웹캠',
            ne: 'प्रत्यक्ष क्यामेरा',
            th: 'กล้องถ่ายทอดสด',
            'zh-Hans': '实时摄像头',
            'zh-Hant': '實時攝像頭'
        };
        me.iconStyle = {
            backgroundSize: '32px',
            backgroundImage: `url("${livecamSVG.replace('%3e', ' fill=\'white\'%3e')}")`
        };
        me.markers = {};
        me._clickEventListener = () => {
            me._updatePanel();
        };
        me._clockModeEventListener = e => {
            me.setVisibility(e.mode === 'realtime');
        };
    }

    onEnabled() {
        const me = this,
            map = me._map;

        map.on('click', me._clickEventListener);
        map.on('clockmode', me._clockModeEventListener);

        loadJSON(LIVECAM_URL).then(data => {
            me._addMarkers(data);
            me.setVisibility(map.getClockMode() === 'realtime');
        });
    }

    onDisabled() {
        const me = this,
            map = me._map;

        me._updatePanel();
        for (const id of Object.keys(me.markers)) {
            me.markers[id].remove();
            delete me.markers[id];
        }

        map.off('clockmode', me._clockModeEventListener);
        map.off('click', me._clickEventListener);
    }

    setVisibility(visible) {
        const me = this;

        me._updatePanel();
        for (const id of Object.keys(me.markers)) {
            me.markers[id].setVisibility(visible);
        }
    }

    _addMarkers(cameras) {
        const me = this,
            map = me._map,
            {lang} = map;

        for (const camera of cameras) {
            const {center, zoom, bearing, pitch, id, name, thumbnail} = camera,
                element = createElement('div', {className: 'livecam-marker'});
            let popup;

            me.markers[id] = new Marker({element})
                .setLngLat(center)
                .addTo(map)
                .on('click', () => {
                    me._updatePanel(camera);
                    map.setViewMode('ground');
                    map.flyTo({center, zoom, bearing, pitch});
                })
                .on('mouseenter', () => {
                    popup = new Popup()
                        .setLngLat(center)
                        .setHTML([
                            '<div class="thumbnail-image-container">',
                            '<div class="ball-pulse"><div></div><div></div><div></div></div>',
                            `<div class="thumbnail-image" style="background-image: url(\'${thumbnail}\');"></div>`,
                            '</div>',
                            `<div><strong>${name[lang]}</strong></div>`
                        ].join(''))
                        .addTo(map);
                })
                .on('mouseleave', () => {
                    if (popup) {
                        popup.remove();
                        popup = undefined;
                    }
                });
        }
    }

    _updatePanel(camera) {
        const me = this,
            {id} = camera || {};

        if (me.selectedCamera !== id && me.panel) {
            me.markers[me.selectedCamera].setActivity(false);
            me.panel.remove();
            delete me.panel;
            delete me.selectedCamera;
        }
        if (!me.selectedCamera && camera) {
            me.markers[id].setActivity(true);
            me.panel = new LivecamPanel({camera}).addTo(me._map);
            me.selectedCamera = id;
        }
    }

}

export default function(options) {
    return new LivecamPlugin(options);
}
