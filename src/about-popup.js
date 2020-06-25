import {Popup} from 'mapbox-gl';
import configs from './configs';

let id = 1;

export default class extends Popup {

    constructor() {
        super({
            closeButton: false,
            closeOnClick: false,
            anchor: 'right',
            maxWidth: '300px'
        });

        this.id = id++;
    }

    addTo(map) {
        const me = this;

        super.addTo(map);
        me.updatePosition();

        me.listener = () => {
            me.updatePosition(map);
        };
        map.on('move', me.listener);

        return me;
    }

    remove() {
        const me = this;

        me._map.off('move', me.listener);
        return super.remove();
    }

    updateContent(dict, lastDynamicUpdate) {
        const me = this,
            id = me.id,
            element = me.getElement(),
            staticCheck = element && element.querySelector(`#acd-static-${id}`),
            dynamicCheck = element && element.querySelector(`#acd-dynamic-${id}`);

        return me.setHTML([
            dict['description'],
            `<input id="acd-static-${id}" class="acd-check" type="checkbox"`,
            staticCheck && staticCheck.checked ? ' checked' : '',
            '>',
            `<label class="acd-label" for="acd-static-${id}"><span class="acd-icon"></span>${dict['static-update']}</label>`,
            `<div class="acd-content">${configs.lastStaticUpdate}</div>`,
            `<input id="acd-dynamic-${id}" class="acd-check" type="checkbox"`,
            dynamicCheck && dynamicCheck.checked ? ' checked' : '',
            '>',
            `<label class="acd-label" for="acd-dynamic-${id}"><span class="acd-icon"></span>${dict['dynamic-update']}</label>`,
            '<div class="acd-content">',
            lastDynamicUpdate['JR-East'] || 'N/A',
            ` (${dict['jr-east']})<br>`,
            lastDynamicUpdate['TokyoMetro'] || 'N/A',
            ` (${dict['tokyo-metro']})<br>`,
            lastDynamicUpdate['Toei'] || 'N/A',
            ` (${dict['toei']})<br>`,
            lastDynamicUpdate['HND-JAT'] || 'N/A',
            ` (${dict['hnd-jat']})<br>`,
            lastDynamicUpdate['HND-TIAT'] || 'N/A',
            ` (${dict['hnd-tiat']})<br>`,
            lastDynamicUpdate['NAA'] || 'N/A',
            ` (${dict['naa']})</div>`
        ].join(''));
    }

    updatePosition() {
        const me = this,
            map = me._map,
            container = map.getContainer(),
            r1 = container.getBoundingClientRect(),
            r2 = container.querySelector('.mapboxgl-ctrl-about').getBoundingClientRect();

        return me.setLngLat(map.unproject([r2.left - r1.left - 5, r2.top - r1.top + 15]));
    }
}
