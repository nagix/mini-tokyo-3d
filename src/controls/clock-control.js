import {Evented} from 'mapbox-gl';
import JapaneseHolidays from 'japanese-holidays';
import {createElement} from '../helpers/helpers';

const DATE_FORMAT = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short'
};

const DATE_COMPONENTS = [
    {id: 'year', fn: 'FullYear', digits: 4, extra: 0},
    {id: 'month', fn: 'Month', digits: 2, extra: 1},
    {id: 'day', fn: 'Date', digits: 2, extra: 0},
    {id: 'hour', fn: 'Hours', digits: 2, extra: 0},
    {id: 'minute', fn: 'Minutes', digits: 2, extra: 0},
    {id: 'second', fn: 'Seconds', digits: 2, extra: 0}
];

export default class extends Evented {

    constructor(options) {
        super();

        const me = this;

        me._lang = options.lang;
        me._dict = options.dict;
        me._clock = options.clock;
        me._mode = options.mode || 'realtime';
    }

    getDefaultPosition() {
        return 'top-left';
    }

    onAdd(map) {
        const me = this;

        me._map = map;

        me._container = createElement('div', {className: 'mapboxgl-ctrl ctrl-group'});
        me._element = createElement('div', {className: 'clock-ctrl'}, me._container);
        me._update();

        (function repeat() {
            const now = me._clock.getTime();

            if (Math.floor(now / 1000) !== Math.floor(me._lastRefresh / 1000)) {
                me._refresh();
                me._lastRefresh = now;
            }
            if (me._container) {
                requestAnimationFrame(repeat);
            }
        })();

        return me._container;
    }

    onRemove() {
        const me = this,
            container = me._container;

        container.parentNode.removeChild(container);
        delete me._container;
        delete me._map;
    }

    setMode(mode) {
        const me = this;

        me._mode = mode;
        delete me._tempDate;
        me._editing = false;
        me._update();
    }

    _onChange() {
        const me = this;

        me.fire({type: 'change', clock: me._clock});
    }

    _update() {
        const me = this,
            element = me._element,
            dict = me._dict,
            clock = me._clock,
            mode = me._mode,
            editing = me._editing;

        element.innerHTML = [
            mode === 'realtime' || !editing ?
                '<span id="date"></span><br><span id="time"></span><br>' : '',
            mode === 'playback' && !editing ? [
                '<div class="clock-button">',
                `<span><button id="edit-time-button">${dict['edit-date-time']}</button></span>`,
                '</div>'
            ].join('') : '',
            mode === 'playback' && editing ? [
                '<div class="clock-controller">',
                DATE_COMPONENTS.slice(0, 3).map(({id}) => [
                    '<span class="spin-box">',
                    `<div><button id="${id}-increase-button" class="top-button"><span class="increase-icon"></span></button></div>`,
                    `<div id="${id}"></div>`,
                    `<div><button id="${id}-decrease-button" class="bottom-button"><span class="decrease-icon"></span></button></div>`,
                    '</span>'
                ].join('')).join('<span class="clock-controller-separator">-</span>'),
                '<span class="clock-controller-separator"></span>',
                DATE_COMPONENTS.slice(-3).map(({id}) => [
                    '<span class="spin-box">',
                    `<div><button id="${id}-increase-button" class="top-button"><span class="increase-icon"></span></button></div>`,
                    `<div id="${id}"></div>`,
                    `<div><button id="${id}-decrease-button" class="bottom-button"><span class="decrease-icon"></span></button></div>`,
                    '</span>'
                ].join('')).join('<span class="clock-controller-separator">:</span>'),
                '</div>',
                '<div class="clock-button">',
                `<span><button id="edit-time-cancel-button">${dict['cancel']}</button></span>`,
                '<span class="clock-controller-separator"></span>',
                `<span><button id="edit-time-ok-button" disabled>${dict['ok']}</button></span>`,
                '</div>'
            ].join('') : '',
            mode === 'playback' ? [
                '<div class="speed-controller">',
                '<span><button id="speed-decrease-button" class="left-button"',
                clock.speed === 1 ? ' disabled' : '',
                '><span class="decrease-icon"></span></button></span>',
                `<span id="clock-speed">${clock.speed}${dict['x-speed']}</span>`,
                '<span><button id="speed-increase-button" class="right-button"',
                clock.speed === 600 ? ' disabled' : '',
                '><span class="increase-icon"></span></button></span>',
                '</div>'
            ].join('') : ''
        ].join('');

        me._refresh();

        if (mode === 'playback' && editing) {
            element.querySelector('#edit-time-cancel-button').addEventListener('click', () => {
                delete me._tempDate;
                me._editing = false;
                me._update();
            });
            element.querySelector('#edit-time-ok-button').addEventListener('click', () => {
                const date = me._tempDate;

                if (date) {
                    clock.setDate(date);
                    me._onChange();
                    delete me._tempDate;
                }

                me._editing = false;
                me._update();
            });
        }

        if (mode === 'playback' && !editing) {
            element.querySelector('#edit-time-button').addEventListener('click', () => {
                me._editing = true;
                me._update();
            });
        }

        if (mode === 'playback' && editing) {
            for (const {id, fn} of DATE_COMPONENTS) {
                element.querySelector(`#${id}-increase-button`).addEventListener('click', () => {
                    const date = me._tempDate = me._tempDate || clock.getJSTDate();

                    date[`set${fn}`](date[`get${fn}`]() + 1);
                    me._refresh();
                });
                element.querySelector(`#${id}-decrease-button`).addEventListener('click', () => {
                    const date = me._tempDate = me._tempDate || clock.getJSTDate();

                    date[`set${fn}`](date[`get${fn}`]() - 1);
                    me._refresh();
                });
            }
        }

        if (mode === 'playback') {
            element.querySelector('#speed-increase-button').addEventListener('click', e => {
                let speed = clock.speed;

                speed += speed < 10 ? 1 : speed < 100 ? 10 : 100;
                clock.setSpeed(speed);
                e.currentTarget.disabled = speed === 600;
                element.querySelector('#speed-decrease-button').disabled = false;
                element.querySelector('#clock-speed').innerHTML = speed + dict['x-speed'];
            });
            element.querySelector('#speed-decrease-button').addEventListener('click', e => {
                let speed = clock.speed;

                speed -= speed <= 10 ? 1 : speed <= 100 ? 10 : 100;
                clock.setSpeed(speed);
                e.currentTarget.disabled = speed === 1;
                element.querySelector('#speed-increase-button').disabled = false;
                element.querySelector('#clock-speed').innerHTML = speed + dict['x-speed'];
            });
        }
    }

    _refresh() {
        const me = this,
            element = me._element;
        let date = me._clock.getJSTDate();

        if (!me._editing) {
            const lang = me._lang;
            let dateString = date.toLocaleDateString(lang, DATE_FORMAT);

            if (lang === 'ja' && JapaneseHolidays.isHoliday(date)) {
                dateString = dateString.replace(/\(.+\)/, '(祝)');
            }
            element.querySelector('#date').innerHTML = dateString;
            element.querySelector('#time').innerHTML = date.toLocaleTimeString(lang);
        } else {
            const tempDate = me._tempDate;

            if (tempDate) {
                date = tempDate;
                for (const {id} of DATE_COMPONENTS) {
                    element.querySelector(`#${id}`).classList.add('desc-caution');
                }
                element.querySelector('#edit-time-ok-button').disabled = false;
            }
            for (const {id, fn, digits, extra} of DATE_COMPONENTS) {
                element.querySelector(`#${id}`).innerHTML =
                    `0${date[`get${fn}`]() + extra}`.slice(-digits);
            }
        }
    }
}
