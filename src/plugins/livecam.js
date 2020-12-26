import mapboxgl from 'mapbox-gl';
import AnimatedPopup from 'mapbox-gl-animated-popup';
import * as helpers from '../helpers';
import Plugin from './plugin';
import livecamSVG from '../../node_modules/@fortawesome/fontawesome-free/svgs/solid/video.svg';

// Live camera URL
const LIVECAM_URL = 'https://mini-tokyo.appspot.com/livecam';

class LivecamPanel {

    constructor(options) {
        this._camera = options.camera;
    }

    addTo(mt3d) {
        const me = this,
            container = me._container = document.createElement('div');

        container.className = 'panel';
        container.innerHTML = `
<div id="panel-header"></div>
<div id="panel-body">
    <div class="scroll-box">
        <div id="panel-content"></div>
    </div>
</div>`;
        container.style.height = '256px';

        mt3d.container.appendChild(container);

        const headerElement = container.querySelector('#panel-header'),
            contentElement = container.querySelector('#panel-content');

        headerElement.innerHTML = [
            '<div class="desc-header">',
            `<strong>${this._camera.name[mt3d.lang]}</strong>`,
            '</div>',
            '<div id="slide-button" class="slide-down"></div>'
        ].join('');

        headerElement.addEventListener('click', () => {
            const {style} = container,
                {classList} = container.querySelector('#slide-button');

            if (style.height !== '44px') {
                style.height = '44px';
                classList.remove('slide-down');
                classList.add('slide-up');
            } else {
                style.height = '256px';
                classList.remove('slide-up');
                classList.add('slide-down');
            }
        });

        contentElement.innerHTML = this._camera.html;

        return me;
    }

    remove() {
        const me = this;

        me._container.parentNode.removeChild(me._container);
        delete me._container;
        delete me._mt3d;
    }

}

function updateMarkerElement(element, highlight) {
    const color = highlight ? '33B5E5' : '333';

    element.style.borderColor = `#${color}`;
    element.style.backgroundImage = `url("${livecamSVG.replace('%3e', ` fill='%23${color}'%3e`)}")`;
}

export default class extends Plugin {

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
    }

    onEnabled() {
        const me = this;

        me._mt3d.on('click', me._clickEventListener);

        helpers.loadJSON(LIVECAM_URL).then(data => {
            me._addMarkers(data);
        });
    }

    onDisabled() {
        const me = this;

        me._updatePanel();
        for (const marker of me.markers) {
            marker.remove();
        }
        me.markers = [];

        me._mt3d.map.off('click', me._clickEventListener);
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
            {map} = me._mt3d;

        for (const camera of cameras) {
            const {center, zoom, bearing, pitch, id, name, thumbnail} = camera,
                element = document.createElement('div');
            let popup;

            element.id = `camera-${id}`;
            element.style.width = '40px';
            element.style.height = '40px';
            element.style.borderRadius = '50%';
            element.style.borderStyle = 'solid';
            element.style.borderWidth = '2px';
            element.style.borderColor = '#333';
            element.style.backgroundRepeat = 'no-repeat';
            element.style.backgroundPosition = 'center';
            element.style.backgroundSize = '20px';
            element.style.backgroundColor = 'white';
            element.style.backgroundImage = `url("${livecamSVG.replace('%3e', ' fill=\'%23333\'%3e')}")`;
            element.style.cursor = 'pointer';
            element.addEventListener('click', event => {
                me._updatePanel(camera);
                if (popup) {
                    popup.remove();
                    popup = undefined;
                }
                me._mt3d.trackObject();
                me._mt3d._setViewMode('ground');
                map.easeTo({
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
                        `<div><strong>${name[me._mt3d.lang]}</strong></div>`
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
                me._mt3d.markObject();
                event.stopPropagation();
            });

            me.markers.push(
                new mapboxgl.Marker(element)
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
