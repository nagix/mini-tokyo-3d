import {createElement, isTouchDevice} from '../helpers/helpers';

export default class {

    constructor(options) {
        const me = this;

        me._title = options.title;
        me._placeholder = options.placeholder;
        me._list = options.list;
        me._eventHandler = options.eventHandler;
    }

    onAdd(map) {
        const me = this;

        me._map = map;

        const container = me._container = createElement('div', {
            className: 'mapboxgl-ctrl mapboxgl-ctrl-group'
        });

        const onBlur = () => {
            me._button.classList.remove('expanded');
            me._searchBox.classList.add('disabled');
        };

        const button = me._button = createElement('button', {
            className: 'mapboxgl-ctrl-search',
            type: 'button',
            title: me._title,
            onmousedown: () => {
                me._searchBox.removeEventListener('blur', onBlur);
            },
            onmouseup: () => {
                me._searchBox.addEventListener('blur', onBlur);
            },
            onclick: () => {
                const searchBox = me._searchBox;

                searchBox.classList.toggle('disabled');
                if (me._button.classList.toggle('expanded')) {
                    searchBox.value = '';
                    searchBox.focus();
                } else {
                    me._eventHandler({value: searchBox.value});
                }
            }
        }, container);

        const icon = createElement('span', {
            className: 'mapboxgl-ctrl-icon',
        }, button);

        // For Firefox
        button.setAttribute('aria-label', me._title);
        icon.setAttribute('aria-hidden', true);

        const searchBox = me._searchBox = createElement('input', {
            className: 'search-box disabled',
            type: 'text',
            list: me._list,
            placeholder: me._placeholder
        }, container);

        searchBox.addEventListener('blur', onBlur);
        searchBox.addEventListener('change', () => {
            if (document.activeElement === searchBox && me._eventHandler({value: searchBox.value})) {
                searchBox.blur();
            }
        });

        // Work around for touch device soft keyboard
        searchBox.addEventListener('keydown', event => {
            if (isTouchDevice() && event.key === 'Enter' && me._eventHandler({value: searchBox.value})) {
                searchBox.blur();
            }
        });

        return container;
    }

    onRemove() {
        const me = this,
            container = me._container;

        container.parentNode.removeChild(container);
        delete me._map;
    }

}
