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
            .setHTML(layers.map(({id, name}) => [
                `<div id="${id}-layer" class="layer-row">`,
                `<div class="layer-icon"></div>`,
                `<div>${name[lang]}</div>`,
                '</div>'
            ].join('')).join(''));

        for (const layer of layers) {
            const {id, iconStyle, enabled} = layer,
                element = me._container.querySelector(`#${id}-layer .layer-icon`),
                {style, classList} = element;

            Object.assign(style, iconStyle);
            if (enabled) {
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
