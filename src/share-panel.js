import configs from './configs';
import {createElement, showNotification} from './helpers';

export default class {

    constructor(options) {
        this._object = options.object;
    }

    addTo(map) {
        const me = this,
            {dict} = me._map = map,
            type = me._object.t ? 'train' : 'flight',
            id = me._object.t || me._object.id,
            container = me._container = createElement('div', {
                className: 'share-panel'
            }, map.container),
            button = me._button = createElement('button', {
                className: 'share-button',
                innerHTML: dict[`share-this`].replace('$1', dict[type])
            }, container);

        button.onclick = () => {
            window.navigator.share({
                title: dict['my'].replace('$1', dict[type]),
                text: dict['on-this'].replace('$1', dict[type]),
                url: `${configs.shareUrl}?selection=${id}`
            }).then(() => {
                showNotification(map.container, dict['shared']);
            }).catch(() => {
                /* noop */
            });
        };

        return me;
    }

    remove() {
        const me = this;

        me._container.parentNode.removeChild(me._container);
        delete me._container;
        delete me._map;
    }

}
