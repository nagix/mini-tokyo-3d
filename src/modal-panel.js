import * as helpers from './helpers';

const isWindows = helpers.includes(navigator.userAgent, 'Windows');

export default class {

    constructor(options) {
        this._options = options;
    }

    setTitle(title) {
        const me = this,
            container = me._container;

        me._title = title;
        if (container) {
            container.querySelector('#modal-panel-title').innerHTML = title;
        }

        return me;
    }

    setHTML(html) {
        const me = this,
            container = me._container;

        me._html = html;
        if (container) {
            container.querySelector('#modal-panel-content').innerHTML = html;
        }

        return me;
    }

    addTo(mt3d) {
        const me = this,
            background = me._background = document.createElement('div'),
            container = me._container = document.createElement('div');

        me._mt3d = mt3d;

        background.className = 'modal-panel-background';
        background.addEventListener('click', () => {
            me.remove();
        });

        container.className = 'modal-panel';
        container.innerHTML = `
<div id="modal-panel-header">
    <strong><span id="modal-panel-title"></span></strong>
    <div id="close-button" class="close-button"></div>
</div>
<div id="modal-panel-body"${isWindows ? ' class="windows"' : ''}>
    <div id="modal-panel-content"></div>
</div>`;

        mt3d.container.appendChild(background);
        mt3d.container.appendChild(container);

        if (me._title) {
            container.querySelector('#modal-panel-title').innerHTML = me._title;
        }
        if (me._html) {
            container.querySelector('#modal-panel-content').innerHTML = me._html;
        }

        container.querySelector('#close-button').addEventListener('click', () => {
            me.remove();
        });

        container.querySelector('#modal-panel-body').style.maxHeight =
            `${mt3d.container.clientHeight - 60}px`;

        setTimeout(() => {
            background.style.opacity = 0.5;
            container.style.maxHeight = 'calc(100% - 10px)';
        }, 0);

        return me;
    }

    remove() {
        const me = this,
            background = me._background,
            container = me._container;

        background.style.opacity = 0;
        container.style.maxHeight = 0;

        setTimeout(() => {
            background.parentNode.removeChild(background);
            container.parentNode.removeChild(container);
            delete me._background;
            delete me._container;
            delete me._mt3d;
        }, 300);
    }

    isOpen() {
        return !!this._mt3d;
    }

}
