import ModalPanel from './modal-panel';

export default class extends ModalPanel {

    constructor(options) {
        super(options);
        this.setTitle(options.dict['layers'])
            .setHTML(options.layers.map(layer => [
                `<div id="${layer.id}-layer" class="layer-row">`,
                `<div class="layer-icon"></div>`,
                `<div>${layer.name[options.lang]}</div>`,
                '</div>'
            ].join('')).join(''));
    }

    addTo(mt3d) {
        const me = this;

        super.addTo(mt3d);

        for (const layer of me._options.layers) {
            const element = me._container.querySelector(`#${layer.id}-layer .layer-icon`),
                {classList} = element;

            Object.assign(element.style, layer.iconStyle);
            if (layer.enabled) {
                classList.add('layer-icon-enabled');
            }

            element.addEventListener('click', () => {
                if (layer.enabled) {
                    classList.remove('layer-icon-enabled');
                    layer.disable();
                } else {
                    classList.add('layer-icon-enabled');
                    layer.enable();
                }
            });
        }

        return me;
    }

}
