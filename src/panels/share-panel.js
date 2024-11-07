import configs from '../configs';
import Train from '../data-classes/train';
import {createElement, showNotification} from '../helpers/helpers';

export default class {

    constructor(options) {
        this._object = options.object;
    }

    addTo(map) {
        const me = this,
            dict = map.dict,
            object = me._object,
            type = object instanceof Train ? 'train' : 'flight',
            container = me._container = createElement('div', {
                className: 'share-panel'
            }, map.container),
            button = me._button = createElement('button', {
                className: 'share-button',
                innerHTML: dict['share-this'].replace('$1', dict[type])
            }, container);

        button.onclick = () => {
            window.navigator.share({
                title: dict['my'].replace('$1', dict[type]),
                text: dict['on-this'].replace('$1', dict[type]),
                url: `${configs.shareUrl}?selection=${object.id}`
            }).then(() => {
                showNotification(map.container, dict['shared']);
            }).catch(() => {
                /* noop */
            });
        };

        me._map = map;

        return me;
    }

    remove() {
        const me = this,
            container = me._container;

        container.parentNode.removeChild(container);
        delete me._container;
        delete me._map;

        return me;
    }

}
