import {createElement} from './helpers';

export default class {

    constructor(optionArray) {
        this._options = optionArray.map(options => ({
            className: options.className || '',
            title: options.title || '',
            eventHandler: options.eventHandler
        }));
    }

    onAdd(map) {
        const me = this;

        me._map = map;

        me._container = createElement('div', {
            className: 'mapboxgl-ctrl mapboxgl-ctrl-group'
        });

        me._buttons = me._options.map(options => {
            const button = createElement('button', {
                    className: options.className,
                    type: 'button',
                    title: options.title,
                    onclick: options.eventHandler
                }, me._container),
                icon = createElement('span', {
                    className: 'mapboxgl-ctrl-icon',
                }, button);

            // For Firefox
            button.setAttribute('aria-label', options.title);
            icon.setAttribute('aria-hidden', true);

            return button;
        });

        return me._container;
    }

    onRemove() {
        const me = this;

        me._container.parentNode.removeChild(me._container);
        me._map = undefined;
    }

}
