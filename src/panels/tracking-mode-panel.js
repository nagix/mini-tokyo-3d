import Panel from './panel';

const trackingModes = [
    'position',
    'back',
    'topback',
    'front',
    'topfront',
    'helicopter',
    'drone',
    'bird'
];

export default class extends Panel {

    constructor(options) {
        super(Object.assign({
            className: 'tracking-mode-panel',
            modal: true
        }, options));

        const me = this;

        me._onModeChanged = e => {
            const mode = e.mode.replace('heading', 'topback');

            me._container.querySelector('.tracking-mode-icon-enabled').classList.remove('tracking-mode-icon-enabled');
            me._container.querySelector(`#${mode}-tracking-mode .tracking-mode-icon`).classList.add('tracking-mode-icon-enabled');
        };
    }

    addTo(map) {
        const me = this,
            {dict} = map,
            trackingMode = map.getTrackingMode();

        super.addTo(map)
            .setTitle(dict['tracking-modes'])
            .setHTML(trackingModes.map(mode => [
                `<div id="${mode}-tracking-mode" class="tracking-mode-row">`,
                '<div class="tracking-mode-icon"></div>',
                `<div>${dict[mode]}</div>`,
                '</div>'
            ].join('')).join(''));

        for (const mode of trackingModes) {
            const element = me._container.querySelector(`#${mode}-tracking-mode .tracking-mode-icon`);

            if (mode === trackingMode || (mode === 'topback' && trackingMode === 'heading')) {
                element.classList.add('tracking-mode-icon-enabled');
            }

            element.addEventListener('click', () => {
                if (map.getTrackingMode() !== mode) {
                    map.setTrackingMode(mode);
                }
            });
        }

        map.on('trackingmode', me._onModeChanged);

        return me;
    }

    remove() {
        const me = this;

        me._map.off('trackingmode', me._onModeChanged);

        return super.remove();
    }

}
