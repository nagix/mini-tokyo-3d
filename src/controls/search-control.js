import {createElement, isTouchDevice, normalize} from '../helpers/helpers';

export default class {

    constructor(options) {
        const me = this;

        me._title = options.title;
        me._placeholder = options.placeholder;
        me._list = options.list;
        me._eventHandler = options.eventHandler;
        me._suggestions = options.suggestions || [];
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
            me._suggestionsElement.classList.add('disabled');
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
            list: me._suggestions.length ? undefined : me._list,
            placeholder: me._placeholder
        }, button);

        const suggestionsElement = me._suggestionsElement = createElement('div', {
            className: 'search-suggestions disabled'
        }, container);

        const hideSuggestions = () => {
            suggestionsElement.classList.add('disabled');
        };

        const showSuggestions = () => {
            const query = normalize(searchBox.value).toUpperCase();
            searchBox.removeAttribute('list');
            const matches = me._suggestions
                .filter(({value, city}) =>
                    normalize(`${city ? `${city} ` : ''}${value}`).toUpperCase().includes(query)
                )
                .slice(0, 10);

            suggestionsElement.replaceChildren();
            if (!query || !matches.length) {
                hideSuggestions();
                return;
            }

            let cityColumnWidth = 0;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            context.font = getComputedStyle(searchBox).font;
            for (const {city} of me._suggestions) {
                if (city) {
                    cityColumnWidth = Math.max(cityColumnWidth, context.measureText(city).width);
                }
            }
            suggestionsElement.style.setProperty('--city-column-width', `${Math.ceil(cityColumnWidth)}px`);
            const searchRect = me._button.getBoundingClientRect();
            const popupWidth = 360;
            const left = searchRect.left - popupWidth - 10;
            suggestionsElement.style.left = `${left >= 10 ? left : 10}px`;
            suggestionsElement.style.top = `${searchRect.bottom + 8}px`;

            for (const suggestion of matches) {
                const row = createElement('button', {
                    className: 'search-suggestion',
                    type: 'button'
                }, suggestionsElement);
                if (suggestion.city) {
                    createElement('span', {
                        className: 'search-suggestion-city',
                        textContent: suggestion.city
                    }, row);
                } else {
                    createElement('span', {
                        className: 'search-suggestion-city'
                    }, row);
                }
                createElement('span', {
                    className: 'search-suggestion-name',
                    textContent: suggestion.value
                }, row);

                row.addEventListener('mousedown', event => {
                    event.preventDefault();
                });
                row.addEventListener('click', () => {
                    searchBox.value = suggestion.value;
                    hideSuggestions();
                    if (me._eventHandler({value: suggestion.value, result: suggestion.result})) {
                        searchBox.blur();
                    }
                });
            }
            suggestionsElement.classList.remove('disabled');
        };

        searchBox.addEventListener('blur', onBlur);
        searchBox.addEventListener('change', () => {
            if (document.activeElement === searchBox && me._eventHandler({value: searchBox.value})) {
                searchBox.blur();
            }
        });
        searchBox.addEventListener('input', showSuggestions);

        // Work around for touch device soft keyboard
        searchBox.addEventListener('keydown', event => {
            if (event.code === 'Enter') {
                const query = normalize(searchBox.value).toUpperCase();
                const suggestion = me._suggestions.find(item =>
                    normalize(`${item.city ? `${item.city} ` : ''}${item.value}`).toUpperCase() === query ||
                    normalize(item.value).toUpperCase() === query
                );
                if (suggestion && me._eventHandler({value: suggestion.value, result: suggestion.result})) {
                    searchBox.blur();
                    event.preventDefault();
                    return;
                }
            }
            if (isTouchDevice() && event.code === 'Enter' && me._eventHandler({value: searchBox.value})) {
                searchBox.blur();
            }
        });

        // Prevent event bubbling
        searchBox.addEventListener('click', event => {
            event.stopPropagation();
        });
        searchBox.addEventListener('keyup', event => {
            if (event.code === 'Space') {
                event.preventDefault();
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
