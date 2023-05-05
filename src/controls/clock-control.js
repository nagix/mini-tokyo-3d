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

        const me = this,
            {lang, dict, clock, mode} = options;

        me._lang = lang;
        me._dict = dict;
        me._clock = clock;
        me._mode = mode || 'realtime';
    }

    getDefaultPosition() {
        return 'top-left';
    }

    onAdd(map) {
        const me = this;

        me._map = map;

        me._container = createElement('div', {className: 'clock-ctrl'});
        me._update();

        const repeat = () => {
            const now = me._clock.getTime();

            if (Math.floor(now / 1000) !== Math.floor(me._lastRefresh / 1000)) {
                me._refresh();
                me._lastRefresh = now;
            }
            if (me._container) {
                requestAnimationFrame(repeat);
            }
        };

        repeat();

        return me._container;
    }

    onRemove() {
        const me = this;

        me._container.parentNode.removeChild(me._container);
        me._container = undefined;
        me._map = undefined;
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
            container = me._container,
            dict = me._dict,
            clock = me._clock,
            mode = me._mode;

        container.innerHTML = [
            mode === 'realtime' || !me._editing ?
                '<span id="date"></span><br><span id="time"></span><br>' : '',
            mode === 'playback' && !me._editing ? [
                '<div class="clock-button">',
                `<span><button id="edit-time-button">${dict['edit-date-time']}</button></span>`,
                '</div>'
            ].join('') : '',
            mode === 'playback' && me._editing ? [
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

        if (mode === 'playback' && me._editing) {
            container.querySelector('#edit-time-cancel-button').addEventListener('click', () => {
                delete me._tempDate;
                me._editing = false;
                me._update();
            });
            container.querySelector('#edit-time-ok-button').addEventListener('click', () => {
                if (me._tempDate) {
                    clock.setDate(me._tempDate);
                    me._onChange();
                    delete me._tempDate;
                }

                me._editing = false;
                me._update();
            });
        }

        if (mode === 'playback' && !me._editing) {
            container.querySelector('#edit-time-button').addEventListener('click', () => {
                me._editing = true;
                me._update();
            });
        }

        if (mode === 'playback' && me._editing) {
            DATE_COMPONENTS.forEach(({id, fn}) => {
                container.querySelector(`#${id}-increase-button`).addEventListener('click', () => {
                    me._tempDate = me._tempDate || clock.getJSTDate();
                    me._tempDate[`set${fn}`](me._tempDate[`get${fn}`]() + 1);
                    me._refresh();
                });
                container.querySelector(`#${id}-decrease-button`).addEventListener('click', () => {
                    me._tempDate = me._tempDate || clock.getJSTDate();
                    me._tempDate[`set${fn}`](me._tempDate[`get${fn}`]() - 1);
                    me._refresh();
                });
            });
        }

        if (mode === 'playback') {
            container.querySelector('#speed-increase-button').addEventListener('click', function() {
                let {speed} = clock;

                speed += speed < 10 ? 1 : speed < 100 ? 10 : 100;
                clock.setSpeed(speed);
                this.disabled = speed === 600;
                container.querySelector('#speed-decrease-button').disabled = false;
                container.querySelector('#clock-speed').innerHTML = speed + dict['x-speed'];
            });
            container.querySelector('#speed-decrease-button').addEventListener('click', function() {
                let {speed} = clock;

                speed -= speed <= 10 ? 1 : speed <= 100 ? 10 : 100;
                clock.setSpeed(speed);
                this.disabled = speed === 1;
                container.querySelector('#speed-increase-button').disabled = false;
                container.querySelector('#clock-speed').innerHTML = speed + dict['x-speed'];
            });
        }
    }

    _refresh() {
        const me = this,
            lang = me._lang,
            container = me._container;
        let date = me._clock.getJSTDate(),
            dateString = date.toLocaleDateString(lang, DATE_FORMAT);

        if (lang === 'ja' && JapaneseHolidays.isHoliday(date)) {
            dateString = dateString.replace(/\(.+\)/, '(祝)');
        }
        if (!me._editing) {
            container.querySelector('#date').innerHTML = dateString;
            container.querySelector('#time').innerHTML = date.toLocaleTimeString(lang);
        } else {
            if (me._tempDate) {
                date = me._tempDate;
                DATE_COMPONENTS.forEach(({id}) => {
                    container.querySelector(`#${id}`).classList.add('desc-caution');
                });
                container.querySelector('#edit-time-ok-button').disabled = false;
            }
            DATE_COMPONENTS.forEach(({id, fn, digits, extra}) => {
                container.querySelector(`#${id}`).innerHTML =
                    `0${date[`get${fn}`]() + extra}`.slice(-digits);
            });
        }
    }
}
