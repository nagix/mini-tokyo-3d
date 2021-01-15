import configs from './configs';
import Panel from './panel';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({
            className: 'about-panel',
            modal: true
        }, options));
    }

    addTo(mt3d) {
        return super.addTo(mt3d)
            .setTitle(mt3d.dict['about'])
            .updateContent();
    }

    updateContent() {
        const me = this;

        if (me.isOpen()) {
            const {dict, lastDynamicUpdate} = me._mt3d,
                {copyright, lastStaticUpdate} = configs;

            me.setHTML([
                dict['description'].replace(/<h3>.*<\/h3>/, ''),
                `<p>${copyright}</p>`,
                `<div class="card-title">${dict['static-update']}</div>`,
                `<div class="card-body">${lastStaticUpdate}</div>`,
                `<div class="card-title">${dict['dynamic-update']}</div>`,
                '<div class="card-body">',
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

        return me;
    }

}
