import configs from './configs';
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
            const {dict, lastDynamicUpdate} = me._map,
                {copyright, lastStaticUpdate} = configs;

            me.setHTML([
                dict['description'].replace(/<h3>.*<\/h3>/, ''),
                `<p>${copyright}</p>`,
                `<div class="card-title">${dict['static-update']}</div>`,
                `<div class="card-body">${lastStaticUpdate}</div>`,
                `<div class="card-title">${dict['dynamic-update']}</div>`,
                '<div class="card-body">',
                lastDynamicUpdate['Toei'] || 'N/A',
                ` (${dict['toei']})<br>`,
                lastDynamicUpdate['JAL'] || 'N/A',
                ` (${dict['jal']})<br>`,
                lastDynamicUpdate['ANA'] || 'N/A',
                ` (${dict['ana']})</div>`
            ].join(''));
        }

        return me;
    }

}
