import {getTimeString, lerp} from '../helpers/helpers';
import Panel from './panel';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({className: 'bus-panel'}, options));
    }

    addTo(map) {
        const me = this,
            busstopHTML = [],
            offsets = [],
            bus = me._options.object,
            gtfs = map.gtfs.get(bus.gtfsId),
            trip = bus.trip,
            {route, stops, departureTimes} = trip,
            color = gtfs.routeLookup.get(route).color,
            stopLookup = gtfs.stopLookup;

        for (let i = 0, ilen = stops.length; i < ilen; i++) {
            const stop = stopLookup.get(stops[i]),
                departureTime = getTimeString(departureTimes[i]);

            busstopHTML.push([
                '<div class="busstop-row">',
                `<div class="busstop-title-box">${stop.name}</div>`,
                `<div class="busstop-time-box">${departureTime}</div>`,
                '</div>'
            ].join(''));
        }

        super.addTo(map);
        me.updateHeader();
        me.setHTML([
            '<div id="timetable-content">',
            ...busstopHTML,
            '</div>',
            '<svg id="busroute-mark"></svg>',
            '<svg id="bus-mark"></svg>'
        ].join(''));

        const container = me._container,
            bodyElement = container.querySelector('#panel-body');

        for (const child of container.querySelector('#timetable-content').children) {
            offsets.push(child.offsetTop + child.getBoundingClientRect().height / 2);
        }
        container.querySelector('#busroute-mark').innerHTML = [
            `<line stroke="${color || gtfs.color}" stroke-width="10" x1="12" y1="${offsets[0]}" x2="12" y2="${offsets[offsets.length - 1]}" stroke-linecap="round" />`,
        ].concat(offsets.map(offset =>
            `<circle cx="12" cy="${offset}" r="3" fill="#ffffff" />`
        )).join('');

        (function repeat() {
            const height = bodyElement.getBoundingClientRect().height,
                index = bus.sectionIndex,
                curr = offsets[index],
                next = offsets[Math.min(index + 1, offsets.length - 1)],
                y = lerp(curr, next, bus._t),
                p = performance.now() % 1500 / 1500;

            container.querySelector('#bus-mark').innerHTML =
                `<circle cx="22" cy="${y}" r="${7 + p * 15}" fill="#ffffff" opacity="${1 - p}" />` +
                `<circle cx="22" cy="${y}" r="7" fill="#ffffff" />`;
            if (me._scrollTop === undefined || me._scrollTop === bodyElement.scrollTop) {
                me._scrollTop = bodyElement.scrollTop = Math.round(y - height / 2 + 4);
            }
            if (me._container) {
                requestAnimationFrame(repeat);
            }
        })();

        return me;
    }

    updateHeader() {
        const me = this,
            map = me._map,
            bus = me._options.object,
            gtfs = map.gtfs.get(bus.gtfsId),
            {route, headsigns} = bus.trip,
            {shortName, longName, color, textColor} = gtfs.routeLookup.get(route),
            labelStyle = [
                textColor ? `color: ${textColor};` : '',
                color ? `background-color: ${color};` : ''
            ].join(' ');

        this.setTitle([
            '<div class="desc-header">',
            `<div style="background-color: ${gtfs.color};"></div>`,
            '<div><div class="desc-first-row">',
            gtfs.agency,
            bus.stop !== undefined ? '<span class="realtime-icon"></span>' : '',
            '</div><div class="desc-second-row">',
            shortName || longName ? ` <span class="bus-route-label" style="${labelStyle}">${shortName || longName}</span> ` : '',
            headsigns.length === 0 ? longName : headsigns[headsigns.length === 1 ? 0 : bus.sectionIndex],
            '</div></div></div>'
        ].join(''));
    }

    reset() {
        delete this._scrollTop;
    }

}
