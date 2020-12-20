import mapboxgl from 'mapbox-gl';
import AnimatedPopup from 'mapbox-gl-animated-popup';
import Plugin from './plugin';
import livecamSVG from '../../node_modules/@fortawesome/fontawesome-free/svgs/solid/video.svg';

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
        me._cameras = [{
            id: 'Akabane',
            name: {
                en: 'Akabane Live Camera',
                ja: '赤羽ライブカメラ',
                ko: '아카바네 실시간 웹캠',
                ne: 'Akabane प्रत्यक्ष क्यामेरा',
                th: 'Akabane กล้องถ่ายทอดสด',
                'zh-Hans': '赤羽实时摄像头',
                'zh-Hant': '赤羽實時攝像頭'
            },
            html: '<iframe width="100%" height="202" src="https://www.youtube.com/embed/WHTcwjwrCyw?autoplay=1&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
            thumbnail: 'https://i.ytimg.com/vi/0IhBsiR27Ko/hqdefault_live.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLDoRiEmIiUmxJH_mOF1-IR-ceInJQ',
            center: [139.7187645, 35.78110601],
            zoom: 17,
            bearing: -160,
            pitch: 60
        }, {
            id: 'Shiodome',
            name: {
                en: 'Shiodome Live Camera',
                ja: '汐留ライブカメラ',
                ko: '시오도메 실시간 웹캠',
                ne: 'Shiodome प्रत्यक्ष क्यामेरा',
                th: 'Shiodome กล้องถ่ายทอดสด',
                'zh-Hans': '汐留实时摄像头',
                'zh-Hant': '汐留實時攝像頭'
            },
            html: '<iframe width="100%" height="202" src="https://www.youtube.com/embed/6YRUWrkV2R4?autoplay=1&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
            thumbnail: 'https://i.ytimg.com/vi/6YRUWrkV2R4/hqdefault_live.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLAmCp81NQ2tlL0rkycGKFdRG8vq2A',
            center: [139.7585034, 35.65859265],
            zoom: 17,
            bearing: 160,
            pitch: 60
        }, {
            id: 'Saitama-Shintoshin',
            name: {
                en: 'Saitama-Shintoshin Live Camera',
                ja: 'さいたま新都心ライブカメラ',
                ko: '사이타마 신도심 실시간 웹캠',
                ne: 'Saitama-Shintoshin प्रत्यक्ष क्यामेरा',
                th: 'Saitama-Shintoshin กล้องถ่ายทอดสด',
                'zh-Hans': '埼玉新都心 实时摄像头',
                'zh-Hant': '埼玉新都心 實時攝像頭'
            },
            html: '<iframe width="100%" height="202" src="https://www.youtube.com/embed/xnxU1B3yFN0?autoplay=1&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
            thumbnail: 'https://i.ytimg.com/vi/xnxU1B3yFN0/hqdefault_live.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLAkWR7D89Rf4cwGDKKX-_y39s5z3Q',
            center: [139.6354502, 35.89088422],
            zoom: 17,
            bearing: -75,
            pitch: 60
        }, {
            id: 'Shinjuku',
            name: {
                en: 'Shinjuku Live Camera',
                ja: '新宿ライブカメラ',
                ko: '신주쿠 실시간 웹캠',
                ne: 'Shinjuku प्रत्यक्ष क्यामेरा',
                th: 'Shinjuku กล้องถ่ายทอดสด',
                'zh-Hans': '新宿实时摄像头',
                'zh-Hant': '新宿實時攝像頭'
            },
            html: '<iframe width="100%" height="202" src="https://www.youtube.com/embed/1VfE8AW7Gug?autoplay=1&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
            thumbnail: 'https://i.ytimg.com/vi/1VfE8AW7Gug/hqdefault_live.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLDnO9xNY7In8c61KhKpc6naohDWAw',
            center: [139.6996717, 35.6944661],
            zoom: 17,
            bearing: 120,
            pitch: 60
        }, {
            id: 'Sasazuka',
            name: {
                en: 'Sasazuka Live Camera',
                ja: '笹塚ライブカメラ',
                ko: '사사즈카 실시간 웹캠',
                ne: 'Sasazuka प्रत्यक्ष क्यामेरा',
                th: 'Sasazuka กล้องถ่ายทอดสด',
                'zh-Hans': '笹冢实时摄像头',
                'zh-Hant': '笹塚實時攝像頭'
            },
            html: '<iframe width="100%" height="202" src="https://www.youtube.com/embed/1hpqAAV6m9A?autoplay=1&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
            thumbnail: 'https://i.ytimg.com/vi/cGVd088cyKk/hqdefault.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLDF30ouiy4NOGv3E6TPT77jXOocRg',
            center: [139.6654579, 35.6730154],
            zoom: 17,
            bearing: 90,
            pitch: 60
        }, {
            id: 'Hino',
            name: {
                en: 'Hino Live Camera',
                ja: '日野ライブカメラ',
                ko: '히노 실시간 웹캠',
                ne: 'Hino प्रत्यक्ष क्यामेरा',
                th: 'Hino กล้องถ่ายทอดสด',
                'zh-Hans': '日野实时摄像头',
                'zh-Hant': '日野實時攝像頭'
            },
            html: '<iframe width="100%" height="202" src="https://www.youtube.com/embed/Cxwu7r_qhpk?autoplay=1&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
            thumbnail: 'https://i.ytimg.com/vi/Cxwu7r_qhpk/hqdefault_live.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLBAWU7MlKGOXyWrXhFcjCFvamSnMQ',
            center: [139.3897684, 35.6671238],
            zoom: 17,
            bearing: -20,
            pitch: 60
        }, {
            id: 'Toyoda',
            name: {
                en: 'Toyoda Live Camera',
                ja: '豊田ライブカメラ',
                ko: '도요다 실시간 웹캠',
                ne: 'Toyoda प्रत्यक्ष क्यामेरा',
                th: 'Toyoda กล้องถ่ายทอดสด',
                'zh-Hans': '丰田实时摄像头',
                'zh-Hant': '豐田實時攝像頭'
            },
            html: '<iframe width="100%" height="202" src="https://www.youtube.com/embed/mqqcUNDrFKw?autoplay=1&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
            thumbnail: 'https://i.ytimg.com/vi/mqqcUNDrFKw/hqdefault_live.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLBqjHkEkncDX1do9SyXCOKXvqZxjA',
            center: [139.3892629, 35.6660765],
            zoom: 17,
            bearing: -135,
            pitch: 60
        }, {
            id: 'Koganecho',
            name: {
                en: 'Koganecho Live Camera',
                ja: '黄金町ライブカメラ',
                ko: '고가네초 실시간 웹캠',
                ne: 'Koganecho प्रत्यक्ष क्यामेरा',
                th: 'Koganecho กล้องถ่ายทอดสด',
                'zh-Hans': '黄金町实时摄像头',
                'zh-Hant': '黃金町實時攝像頭'
            },
            html: '<iframe width="100%" height="202" src="https://www.youtube.com/embed/_KzI7yjt1bI?autoplay=1&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
            thumbnail: 'https://i.ytimg.com/vi/_KzI7yjt1bI/hqdefault_live.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLC-UeOhSIQPoQHZcFWDpFxQVmMpXg',
            center: [139.6242287, 35.4404758],
            zoom: 17,
            bearing: 0,
            pitch: 60
        }, {
            id: 'Hon-Atsugi',
            name: {
                en: 'Hon-Atsugi Live Camera',
                ja: '本厚木ライブカメラ',
                ko: '혼아쓰기 실시간 웹캠',
                ne: 'Hon-Atsugi प्रत्यक्ष क्यामेरा',
                th: 'Hon-Atsugi กล้องถ่ายทอดสด',
                'zh-Hans': '本厚木实时摄像头',
                'zh-Hant': '本厚木實時攝像頭'
            },
            html: '<iframe width="100%" height="202" src="https://www.youtube.com/embed/s14UTbrV0MY?autoplay=1&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
            thumbnail: 'https://i.ytimg.com/vi/s14UTbrV0MY/hqdefault_live.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLDelYZKxhv_k-fB6AoxYX3621uzMA',
            center: [139.3717856, 35.4418281],
            zoom: 17,
            bearing: 110,
            pitch: 60
        }];
        me._clickEventListener = () => {
            me._updatePanel();
        };
    }

    onEnabled() {
        const me = this,
            {map} = me._mt3d;

        map.on('click', me._clickEventListener);

        for (const camera of me._cameras) {
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
