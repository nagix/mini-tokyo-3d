import Panel from './panel';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({
            className: 'layer-panel',
            modal: true
        }, options));
    }

    addTo(map) {
        const me = this,
            {layers} = me._options,
            {lang, dict} = map;

        super.addTo(map)
            .setTitle(dict['layers'])
            .setHTML(layers.map(layer => [
                `<div id="${layer.getId()}-layer" class="layer-row">`,
                `<div class="layer-icon"></div>`,
                `<div>${layer.getName(lang)}</div>`,
                '</div>'
            ].join('')).join(''));

        for (const layer of layers) {
            const element = me._container.querySelector(`#${layer.getId()}-layer .layer-icon`),
                {style, classList} = element;

            Object.assign(style, layer.getIconStyle());
            if (layer.isEnabled()) {
                classList.add('layer-icon-enabled');
            }

            element.addEventListener('click', () => {
                if (layer.isEnabled()) {
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
