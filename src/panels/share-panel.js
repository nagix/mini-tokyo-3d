import configs from '../configs';
import {Train} from '../data-classes';
import {createElement, showNotification} from '../helpers/helpers';

export default class {

    constructor(options) {
        this._object = options.object;
    }

    addTo(map) {
        const me = this,
            dict = map.dict,
            object = me._object,
            isStation = object.type === 'station',
            type = object instanceof Train ? 'train' : 'flight',
            id = isStation ? getStationId(object) : object.id,
            container = me._container = createElement('div', {
                className: 'share-panel closed'
            }, map.container),
            button = me._button = createElement('button', {
                className: 'share-button',
                innerHTML: isStation ? dict['share-station'] : dict['share-this'].replace('$1', dict[type])
            }, container);

        button.onclick = () => {
            window.navigator.share({
                title: isStation ? dict['my-station'] : dict['my'].replace('$1', dict[type]),
                text: isStation ? dict['on-station'] : dict['on-this'].replace('$1', dict[type]),
                url: `${configs.shareUrl}?selection=${id}`
            }).then(() => {
                showNotification(map.container, dict['shared']);
            }).catch(() => {
                /* noop */
            });
        };

        me._map = map;

        requestAnimationFrame(() => {
            container.classList.remove('closed');
        });

        return me;
    }

    remove() {
        const me = this,
            container = me._container;

        container.classList.add('closed');

        setTimeout(() => {
            container.parentNode.removeChild(container);
            delete me._container;
            delete me._map;
        }, 300);

        return me;
    }

}

function getStationId(object) {
    const underground = object.layer === 'underground',
        station = object.stations.find(({altitude}) =>
            underground ? altitude < 0 : !(altitude < 0)
        );

    return (station || object.stations[0]).id;
}
