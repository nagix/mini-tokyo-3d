import {addColor, createElement} from '../helpers/helpers';
import {getBounds} from '../helpers/helpers-mapbox';
import triangleExclamationSvg from '@fortawesome/fontawesome-free/svgs/solid/triangle-exclamation.svg';

// Marquee scroll speed for a title/text line that overflows its box, and how
// long it pauses at each end before scrolling again.
const MARQUEE_SPEED = 40; // pixels per second
const MARQUEE_PAUSE = 3; // seconds

// Shows the list of railways currently carrying a non-empty "status" (set by
// Map#refreshRealtimeTrainData from trainInfoData). Implements
// NotificationModuleInterface - see notification-control.js.
export default class {

    constructor(options) {
        const me = this;

        me.id = 'train-status';
        me.name = options.dict['train-status'];
        me.iconStyle = {backgroundImage: `url("${addColor(triangleExclamationSvg, '#fff')}")`};
        me.width = 284;
        me.height = 0;
        me.visible = false;
        me.count = 0;

        me._lang = options.lang;
        me._railways = options.railways;
        me._map = options.map;
        // Keyed by railway id - refresh() only touches an item's DOM (and
        // restarts its marquee) when its own signature actually changes, so
        // an unrelated item's marquee animation and the list's scroll
        // position survive a refresh untouched.
        me._items = new Map();
        // Keyed by marquee id ("<railway id>-title"/"-text") - holds every
        // currently-relevant @keyframes rule, since me._style's textContent
        // is shared by the whole list and a partial refresh must not drop
        // the rules of items it didn't touch.
        me._marqueeRules = new Map();
    }

    onAdd(container) {
        const me = this;

        me._list = createElement('div', {className: 'traininfo-list'}, container);
        // Holds the @keyframes generated per overflowing title/text line - its
        // distance and duration depend on that line's own overflow amount, so
        // a single static rule can't cover every line.
        me._style = createElement('style', {}, container);
    }

    onSelect() {
        const me = this;

        me._selected = true;
        me._setupMarquee();
    }

    onDeselect() {
        this._selected = false;
    }

    // Measures each title/text line's overflow now that it's actually laid
    // out (display:none while deselected makes scrollWidth/clientWidth
    // meaningless, so this only runs once the list is visible) and builds a
    // scroll-pause-scroll-pause @keyframes for every line that overflows, at
    // a constant px/s speed regardless of how far it needs to travel. Scoped
    // to root (defaulting to the whole list) so refreshing a single changed
    // item only recomputes that item's lines, not every other item's.
    _setupMarquee(root) {
        const me = this;

        for (const outer of (root || me._list).querySelectorAll('[data-marquee-id]')) {
            const inner = outer.firstElementChild,
                overflow = inner.scrollWidth - outer.clientWidth,
                id = outer.dataset.marqueeId,
                // Railway ids contain dots (e.g. "JR-East.Utsunomiya"), which
                // aren't valid in a CSS custom-ident - used raw as an
                // animation-name, the browser silently rejects the whole
                // "animation" shorthand, leaving it unset.
                name = `traininfo-marquee-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

            inner.style.animation = '';
            if (overflow <= 0) {
                me._marqueeRules.delete(id);
                continue;
            }

            const scrollDuration = overflow / MARQUEE_SPEED,
                total = MARQUEE_PAUSE * 2 + scrollDuration,
                pauseEnd = (MARQUEE_PAUSE / total * 100).toFixed(2),
                scrollEnd = ((MARQUEE_PAUSE + scrollDuration) / total * 100).toFixed(2);

            me._marqueeRules.set(id, [
                `@keyframes ${name} {`,
                `0%, ${pauseEnd}% { transform: translateX(0); }`,
                `${scrollEnd}%, 100% { transform: translateX(-${overflow}px); }`,
                '}'
            ].join(' '));
            inner.style.animation = `${name} ${total}s linear infinite`;
        }

        me._style.textContent = [...me._marqueeRules.values()].join('\n');
    }

    // A railway's rendered content depends only on these fields - used both
    // to detect whether an item actually changed and, when it did, to
    // rebuild just that item's markup.
    _signature(railway) {
        const suspended = (railway.ranges || []).some(range => range.kind === 'suspended');

        return `${railway.status}\n${railway.text}\n${railway.color}\n${suspended}`;
    }

    _itemContent(railway) {
        const lang = this._lang,
            id = railway.id,
            suspended = (railway.ranges || []).some(range => range.kind === 'suspended');

        return [
            `<div class="traininfo-icon traininfo-icon-${suspended ? 'suspended' : 'delay'}"></div>`,
            `<div class="traininfo-band" style="background-color: ${railway.color}"></div>`,
            '<div class="traininfo-event-label">',
            `<div class="traininfo-event-title" data-marquee-id="${id}-title"><span class="traininfo-marquee">${railway.title[lang] || railway.title.en}</span></div>`,
            `<div class="traininfo-event-text" data-marquee-id="${id}-text"><span class="traininfo-marquee">${railway.text}</span></div>`,
            '</div>'
        ].join('');
    }

    // Fits the map view to the stations spanned by every one of the
    // railway's ranges, mirroring StationPanel#switchRoute's own
    // getBounds()/fitBounds() use for a selected route.
    _focusRailway(railway) {
        const me = this,
            stationIds = railway.stations.map(({id}) => id),
            coords = [];

        for (const {from, to} of railway.ranges) {
            const start = stationIds.indexOf(from),
                // Skip past "from" itself, so a loop line's from===to
                // whole-line range resolves to its closing occurrence.
                end = stationIds.indexOf(to, start + 1);

            if (start === -1 || end === -1) {
                continue;
            }
            for (let i = start; i <= end; i++) {
                coords.push(railway.stations[i].coord);
            }
        }

        if (coords.length === 0) {
            return;
        }

        const mbox = me._map.map;

        me._map.trackObject();
        me._map.setViewMode(railway.altitude < 0 ? 'underground' : 'ground');
        mbox.fitBounds(getBounds(coords), {
            bearing: mbox.getBearing(),
            pitch: mbox.getPitch(),
            padding: {top: 20, bottom: 20, left: 10, right: 60},
            retainPadding: false,
            linear: true,
            maxZoom: 18
        });
    }

    _clearItems() {
        const me = this;

        for (const {element} of me._items.values()) {
            element.remove();
        }
        me._items.clear();
        me._marqueeRules.clear();
        me._style.textContent = '';
    }

    refresh() {
        const me = this,
            railways = [...me._railways.getAll()].filter(railway => railway.status && railway.ranges && railway.ranges.length > 0);

        me.visible = railways.length > 0;
        me.count = railways.length;
        // 39px per item plus a 10px gap between items - one fewer gap than
        // items, since the last one has no trailing margin.
        me.height = railways.length * 49 - 10;

        if (railways.length === 0) {
            me._clearItems();
            return;
        }

        const seen = new Set();
        let previous = null;

        for (const railway of railways) {
            const id = railway.id,
                signature = me._signature(railway),
                existing = me._items.get(id);
            let element;

            seen.add(id);

            let changed;

            if (existing) {
                element = existing.element;
                changed = existing.signature !== signature;
                if (changed) {
                    element.innerHTML = me._itemContent(railway);
                    existing.signature = signature;
                }
            } else {
                element = createElement('button', {
                    className: 'traininfo-event',
                    innerHTML: me._itemContent(railway)
                });
                element.addEventListener('click', () => me._focusRailway(railway));
                me._items.set(id, {signature, element});
                changed = true;
            }

            // Attach (or reposition) before measuring - a detached element's
            // scrollWidth/clientWidth are both 0, which would misread as
            // "no overflow" and skip its marquee entirely.
            const afterNode = previous ? previous.nextElementSibling : me._list.firstElementChild;

            if (afterNode !== element) {
                me._list.insertBefore(element, afterNode);
            }
            previous = element;

            if (changed && me._selected) {
                me._setupMarquee(element);
            }
        }

        // Only rewrite the shared stylesheet when a rule actually dropped out
        // of me._marqueeRules - reassigning style.textContent restarts every
        // CSS animation it defines, even when set to the same string, so an
        // unconditional rewrite here would restart every item's marquee on
        // every refresh regardless of whether anything changed.
        let rulesRemoved = false;

        for (const [id, {element}] of me._items) {
            if (!seen.has(id)) {
                element.remove();
                me._items.delete(id);
                rulesRemoved = me._marqueeRules.delete(`${id}-title`) || rulesRemoved;
                rulesRemoved = me._marqueeRules.delete(`${id}-text`) || rulesRemoved;
            }
        }
        if (rulesRemoved) {
            me._style.textContent = [...me._marqueeRules.values()].join('\n');
        }
    }

}
