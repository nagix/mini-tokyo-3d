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
            layers = me._options.layers;

        if (map.isHelsinkiProfile()) {
            const labels = {
                routes: 'HSL-reitit',
                stops: 'Pysäkit',
                alerts: 'Liikennetiedotteet',
                vehicles: 'Reaaliaikaiset ajoneuvot',
                ports: 'Satamat',
                buildings: 'Rakennukset'
            };
            const categories = [
                'routes',
                'stops',
                'alerts',
                'vehicles',
                'ports',
                'buildings'
            ];

            super.addTo(map)
                .setTitle(map.dict['layers'])
                .setHTML(categories.map(category => [
                    `<div id="hsl-${category}-layer" class="layer-row">`,
                    '<div class="layer-icon"></div>',
                    `<div>${labels[category]}</div>`,
                    '</div>'
                ].join('')).concat(layers.map(layer => [
                    `<div id="${layer.getId()}-layer" class="layer-row">`,
                    '<div class="layer-icon"></div>',
                    `<div>${layer.getName(map.lang)}</div>`,
                    '</div>'
                ].join(''))).join(''));

            for (const category of categories) {
                const element = me._container.querySelector(`#hsl-${category}-layer .layer-icon`);

                if (map.getHelsinkiLayerVisibility(category) === 'visible') {
                    element.classList.add('layer-icon-enabled');
                }
                element.addEventListener('click', () => {
                    const visible = map.getHelsinkiLayerVisibility(category) === 'visible';
                    map.setHelsinkiLayerVisibility(category, visible ? 'none' : 'visible');
                    element.classList.toggle('layer-icon-enabled', !visible);
                });
            }

            for (const layer of layers) {
                const element = me._container.querySelector(`#${layer.getId()}-layer .layer-icon`),
                    classList = element.classList;

                Object.assign(element.style, layer.getIconStyle());
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

        super.addTo(map)
            .setTitle(map.dict['layers'])
            .setHTML(layers.map(layer => [
                `<div id="${layer.getId()}-layer" class="layer-row">`,
                '<div class="layer-icon"></div>',
                `<div>${layer.getName(map.lang)}</div>`,
                '</div>'
            ].join('')).join(''));

        for (const layer of layers) {
            const element = me._container.querySelector(`#${layer.getId()}-layer .layer-icon`),
                classList = element.classList;

            Object.assign(element.style, layer.getIconStyle());
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
