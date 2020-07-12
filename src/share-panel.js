import configs from './configs';
import * as helpers from './helpers';

export default class {

    constructor(options) {
        this._object = options.object;
    }

    addTo(mt3d) {
        const me = this,
            {dict} = me._mt3d = mt3d,
            type = me._object.t ? 'train' : 'flight',
            id = me._object.t || me._object.id,
            parentNode = mt3d.container,
            container = me._container = document.createElement('div'),
            button = me._button = document.createElement('button');

        container.className = 'share-panel';
        button.className = 'share-button';
        button.innerHTML = dict[`share-this`].replace('$1', dict[type]);
        button.onclick = () => {
            window.navigator.share({
                title: dict['my'].replace('$1', dict[type]),
                text: dict['on-this'].replace('$1', dict[type]),
                url: `${configs.shareUrl}?selection=${id}`
            }).then(() => {
                helpers.showNotification(parentNode, dict['shared']);
            }).catch(() => {
                /* noop */
            });
        };

        container.appendChild(button);
        parentNode.appendChild(container);

        return me;
    }

    remove() {
        const me = this;

        me._container.parentNode.removeChild(me._container);
        delete me._container;
        delete me._mt3d;
    }

}
