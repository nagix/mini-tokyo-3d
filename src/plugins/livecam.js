import {Marker} from 'mapbox-gl';
import AnimatedPopup from 'mapbox-gl-animated-popup';
import * as helpers from '../helpers';
import Panel from '../panel';
import Plugin from './plugin';
import livecamSVG from '../../node_modules/@fortawesome/fontawesome-free/svgs/solid/video.svg';

// Live camera URL
const LIVECAM_URL = 'https://mini-tokyo.appspot.com/livecam';

// Add style
const style = document.createElement('style');
style.innerHTML = `
    .livecam-panel {
        height: 262px !important;
    }
    .livecam-panel.collapsed {
        height: 50px !important;
    }
    .livecam-panel.closed {
        height: 0 !important;
    }
    .livecam-marker {
        width: 40px;
        height: 40px;
        border: 2px solid #333;
        border-radius: 50%;
        background: white no-repeat center/20px url("${livecamSVG.replace('%3e', ' fill=\'%23333\'%3e')}");
        cursor: pointer;
    }
    .livecam-marker-active {
        border-color: #33B5E5;
        background-image: url("${livecamSVG.replace('%3e', ' fill=\'%2333B5E5\'%3e')}");
    }
`;
document.head.appendChild(style);

class LivecamPanel extends Panel {

    constructor(options) {
        super(Object.assign({className: 'livecam-panel'}, options));
    }

    addTo(mt3d) {
        const me = this,
            {name, html} = me._options.camera;

        me.setTitle(name[mt3d.lang])
            .setHTML(html);
        return super.addTo(mt3d);
    }

}

function updateMarkerElement(element, highlight) {
    const {classList} = element;

    if (highlight) {
        classList.add('livecam-marker-active');
    } else {
        classList.remove('livecam-marker-active');
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
        me.markers = [];
        me._clickEventListener = () => {
            me._updatePanel();
        };
        me._clockModeEventListener = e => {
            me.setVisibility(e.mode === 'realtime');
        };
    }

    onEnabled() {
        const me = this,
            mt3d = me._mt3d;

        mt3d.on('click', me._clickEventListener);
        mt3d.on('clockmode', me._clockModeEventListener);

        helpers.loadJSON(LIVECAM_URL).then(data => {
            me._addMarkers(data);
            me.setVisibility(mt3d.getClockMode() === 'realtime');
        });
    }

    onDisabled() {
        const me = this,
            mt3d = me._mt3d;

        me._updatePanel();
        for (const marker of me.markers) {
            marker.remove();
        }
        me.markers = [];

        mt3d.off('clockmode', me._clockModeEventListener);
        mt3d.off('click', me._clickEventListener);
    }

    setVisibility(visible) {
        const me = this;

        me._updatePanel();
        for (const marker of me.markers) {
            marker.getElement().style.visibility = visible ? 'visible' : 'hidden';
        }
    }

    _addMarkers(cameras) {
        const me = this,
            mt3d = me._mt3d,
            {lang, map} = mt3d;

        for (const camera of cameras) {
            const {center, zoom, bearing, pitch, id, name, thumbnail} = camera,
                element = document.createElement('div');
            let popup;

            element.id = `camera-${id}`;
            element.className = 'livecam-marker';
            element.addEventListener('click', event => {
                me._updatePanel(camera);
                if (popup) {
                    popup.remove();
                    popup = undefined;
                }
                mt3d.trackObject();
                mt3d._setViewMode('ground');
                map.flyTo({
                    center,
                    zoom,
                    bearing,
                    pitch
                });

                event.stopPropagation();
            });
            element.addEventListener('mouseenter', () => {
                updateMarkerElement(element, true);
                popup = new AnimatedPopup({
                    className: 'popup-object',
                    closeButton: false,
                    closeOnClick: false,
                    maxWidth: '300px',
                    offset: {
                        top: [0, 10],
                        bottom: [0, -30]
                    },
                    openingAnimation: {
                        duration: 300,
                        easing: 'easeOutBack'
                    }
                });
                popup.setLngLat(center)
                    .setHTML([
                        '<div class="thumbnail-image-container">',
                        '<div class="ball-pulse"><div></div><div></div><div></div></div>',
                        `<div class="thumbnail-image" style="background-image: url(\'${thumbnail}\');"></div>`,
                        '</div>',
                        `<div><strong>${name[lang]}</strong></div>`
                    ].join(''))
                    .addTo(map);
            });
            element.addEventListener('mouseleave', () => {
                updateMarkerElement(element, me.selectedCamera === id);
                if (popup) {
                    popup.remove();
                    popup = undefined;
                }
            });
            element.addEventListener('mousemove', event => {
                mt3d.markObject();
                event.stopPropagation();
            });

            me.markers.push(
                new Marker(element)
                    .setLngLat(center)
                    .addTo(map)
            );
        }
    }

    _updatePanel(camera) {
        const me = this,
            mt3d = me._mt3d,
            {id} = camera || {};

        if (me.selectedCamera !== id && me.panel) {
            const element = mt3d.container.querySelector(`#camera-${me.selectedCamera}`);

            updateMarkerElement(element);
            me.panel.remove();
            delete me.panel;
            delete me.selectedCamera;
        }
        if (!me.selectedCamera && camera) {
            const element = mt3d.container.querySelector(`#camera-${id}`);

            updateMarkerElement(element, true);
            me.panel = new LivecamPanel({camera}).addTo(mt3d);
            me.selectedCamera = id;
        }
    }

}

export default function(options) {
    return new LivecamPlugin(options);
}
