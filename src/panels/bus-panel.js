import {lerp} from '../helpers/helpers';
import Panel from './panel';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({className: 'bus-panel'}, options));
    }

    addTo(map) {
        const me = this,
            {lang, busStops, busAgencies} = map,
            busstopHTML = [],
            offsets = [],
            bus = me._options.object,
            {index: busIndex, trip} = bus,
            {shortName, headsign} = trip,
            color = map.data[busIndex].color;

        for (const stopId of trip.stops) {
            const stop = busStops[busIndex].get(stopId),
                name = stop.name;

            busstopHTML.push([
                '<div class="busstop-row">',
                `<div class="busstop-title-box">${name[lang] || name.en}</div>`,
                '<div class="busstop-time-box"></div>',
                '</div>'
            ].join(''));
        }

        super.addTo(map)
            .setTitle([
                '<div class="desc-header">',
                `<div style="background-color: ${color};"></div>`,
                '<div><div class="desc-first-row">',
                busAgencies[busIndex],
                '</div><div class="desc-second-row">',
                shortName.en ? ` <span class="bus-route-label" style="color: ${trip.textColor}; background-color: ${trip.color};">${shortName[lang] || shortName.en}</span> ` : '',
                headsign[lang] || headsign.en,
                '</div></div></div>'
            ].join(''))
            .setHTML([
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
            `<line stroke="${color}" stroke-width="10" x1="12" y1="${offsets[0]}" x2="12" y2="${offsets[offsets.length - 1]}" stroke-linecap="round" />`,
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

    reset() {
        delete this._scrollTop;
    }

}
