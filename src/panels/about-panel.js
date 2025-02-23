import configs from '../configs';
import Panel from './panel';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({
            className: 'about-panel',
            modal: true
        }, options));
    }

    addTo(map) {
        return super.addTo(map)
            .setTitle(map.dict['about'])
            .updateContent();
    }

    updateContent() {
        const me = this;

        if (me.isOpen()) {
            const {dict, gtfs, lastDynamicUpdate} = me._map,
                gtfsArray = [...gtfs.values()];

            me.setHTML([
                dict['description'].replace(/<h3>.*<\/h3>/, ''),
                `<p>${configs.copyright}</p>`,
                `<div class="card-title">${dict['static-update']}</div>`,
                `<div class="card-body">${configs.lastStaticUpdate}</div>`,
                `<div class="card-title">${dict['dynamic-update']}</div>`,
                '<div class="card-body">',
                lastDynamicUpdate['Toei'] || 'N/A',
                ` (${dict['toei']})<br>`,
                lastDynamicUpdate['JR-East'] || 'N/A',
                ` (${dict['jr-east']})<br>`,
                lastDynamicUpdate['Keikyu'] || 'N/A',
                ` (${dict['keikyu']})<br>`,
                lastDynamicUpdate['Tobu'] || 'N/A',
                ` (${dict['tobu']})<br>`,
                lastDynamicUpdate['HND-JAT'] || 'N/A',
                ` (${dict['hnd-jat']})<br>`,
                lastDynamicUpdate['HND-TIAT'] || 'N/A',
                ` (${dict['hnd-tiat']})<br>`,
                lastDynamicUpdate['NAA'] || 'N/A',
                ` (${dict['naa']})<br>`,
                gtfsArray.filter(({date}) => date).map(({date, agency}) => `${date} (${agency})`).join('<br>'),
                '</div>',
                gtfsArray.length > 0 ? [
                    `<div class="card-title">${dict['gtfs-feed-version']}</div>`,
                    '<div class="card-body">',
                    gtfsArray.map(({version, agency}) => `${version} (${agency})`).join('<br>'),
                    '</div>'
                ].join('') : ''
            ].join(''));
        }

        return me;
    }

}
