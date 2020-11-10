import configs from './configs';
import ModalPanel from './modal-panel';

export default class extends ModalPanel {

    constructor(options) {
        super(options);
        this.setTitle(options.dict['about'])
            .updateContent();
    }

    updateContent() {
        const me = this,
            {dict, lastDynamicUpdate} = me._options;

        return me.setHTML([
            dict['description'].replace(/<h3>.*<\/h3>/, ''),
            `<div class="card-title">${dict['static-update']}</div>`,
            `<div class="card-body">${configs.lastStaticUpdate}</div>`,
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

}
