import * as helpers from './helpers';

const isWindows = helpers.includes(navigator.userAgent, 'Windows');

export default class {

    constructor(options) {
        this._object = options.object;
    }

    addTo(mt3d) {
        const me = this,
            {dict} = me._mt3d = mt3d,
            container = me._container = document.createElement('div'),
            exitHTML = [],
            stations = me._object,
            titles = {},
            exits = [].concat(...stations.map(station => station.exit || []));

        container.className = 'panel';
        container.innerHTML = `
<div id="panel-header"></div>
<div id="panel-body"${isWindows ? ' class="windows"' : ''}>
    <div class="scroll-box">
        <div id="panel-content"></div>
    </div>
</div>`;

        mt3d.container.appendChild(container);

        const headerElement = container.querySelector('#panel-header'),
            contentElement = container.querySelector('#panel-content');

        stations.forEach(station => {
            titles[mt3d.getLocalizedStationTitle(station.id)] = true;
        });

        headerElement.innerHTML = [
            '<div class="desc-header">',
            `<strong>${Object.keys(titles).join(dict['and'])}</strong>`,
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
                style.height = '33%';
                classList.remove('slide-up');
                classList.add('slide-down');
            }
        });

        if (exits.length > 0) {
            exits.forEach(id => {
                exitHTML.push([
                    '<div class="exit-row">',
                    '<div class="exit-title-box">',
                    mt3d.getLocalizedPOIDescription(id),
                    '</div>',
                    '<div class="exit-share-button"></div>',
                    '</div>'
                ].join(''));
            });
            contentElement.innerHTML = exitHTML.join('');
        }

        const {children} = contentElement;

        for (let i = 0, ilen = children.length; i < ilen; i++) {
            const child = children[i];

            child.addEventListener('mouseenter', () => {
                const element = mt3d.container.querySelector(`#exit-${i}`);

                if (element) {
                    element.classList.add('highlighted');
                }
            });
            child.addEventListener('mouseleave', () => {
                const element = mt3d.container.querySelector(`#exit-${i}`);

                if (element) {
                    element.classList.remove('highlighted');
                }
            });
        }

        return me;
    }

    remove() {
        const me = this;

        me._container.parentNode.removeChild(me._container);
        delete me._container;
        delete me._mt3d;
    }

}
