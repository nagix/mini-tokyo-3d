import {lerp} from './helpers';
import Panel from './panel';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({className: 'train-panel'}, options));
    }

    addTo(map) {
        const me = this,
            {lang, dict, clock} = map,
            trains = [],
            sections = [],
            stationHTML = [],
            offsets = [],
            train = me._options.object,
            {r: railwayID, nm: names, v: vehicle, ds: destination, nextTrains} = train,
            railway = map.railwayLookup[railwayID],
            color = vehicle ? map.trainVehicleLookup[vehicle].color : railway.color,
            delay = train.delay || 0;
        let currSection, scrollTop;

        for (let curr = train; curr; curr = curr.previousTrains && curr.previousTrains[0]) {
            trains.unshift(curr);
        }
        for (let curr = nextTrains && nextTrains[0]; curr; curr = curr.nextTrains && curr.nextTrains[0]) {
            trains.push(curr);
        }
        trains.forEach(curr => {
            const section = {};

            section.start = Math.max(stationHTML.length - 1, 0);
            curr.tt.forEach((s, index) => {
                if (index > 0 || !curr.previousTrains) {
                    stationHTML.push([
                        '<div class="station-row">',
                        `<div class="station-title-box">${map.getLocalizedStationTitle(s.s)}</div>`,
                        '<div class="station-time-box',
                        delay >= 60000 ? ' desc-caution' : '',
                        '">',
                        s.a ? clock.getTimeString(clock.getTime(s.a) + delay) : '',
                        s.a && s.d ? '<br>' : '',
                        s.d ? clock.getTimeString(clock.getTime(s.d) + delay) : '',
                        '</div></div>'
                    ].join(''));
                }
            });
            section.end = stationHTML.length - 1;
            section.color = map.railwayLookup[curr.r].color;
            sections.push(section);
            if (curr === train) {
                currSection = section;
            }
        });

        super.addTo(map)
            .setTitle([
                '<div class="desc-header">',
                Array.isArray(color) ? [
                    '<div>',
                    ...color.slice(0, 3).map(c => `<div class="line-strip-long" style="background-color: ${c};"></div>`),
                    '</div>'
                ].join('') : `<div style="background-color: ${color};"></div>`,
                '<div>',
                names ? names.map(name => name[lang] || name.en).join(dict['and']) : map.getLocalizedRailwayTitle(railwayID),
                '<br><span class="desc-normal-style">',
                `<span class="train-type-label">${map.getLocalizedTrainTypeTitle(train.y)}</span> `,
                destination ?
                    dict['for'].replace('$1', map.getLocalizedStationTitle(destination)) :
                    map.getLocalizedRailDirectionTitle(train.d),
                '</span></div></div>'
            ].join(''))
            .setHTML([
                '<div id="timetable-content">',
                ...stationHTML,
                '</div>',
                '<svg id="railway-mark"></svg>',
                '<svg id="train-mark"></svg>'
            ].join(''));

        const container = me._container,
            bodyElement = container.querySelector('#panel-body'),
            {children} = container.querySelector('#timetable-content');

        for (let i = 0, ilen = children.length; i < ilen; i++) {
            const child = children[i];

            offsets.push(child.offsetTop + child.getBoundingClientRect().height / 2);
        }
        container.querySelector('#railway-mark').innerHTML = sections.map(({color, start, end}) =>
            `<line stroke="${color}" stroke-width="10" x1="12" y1="${offsets[start]}" x2="12" y2="${offsets[end]}" stroke-linecap="round" />`
        ).concat(offsets.map(offset =>
            `<circle cx="12" cy="${offset}" r="3" fill="#ffffff" />`
        )).join('');

        const timetableOffsets = offsets.slice(currSection.start, currSection.end + 1);

        const repeat = () => {
            const {height} = bodyElement.getBoundingClientRect(),
                {timetableIndex: index} = train,
                curr = timetableOffsets[index],
                next = train.arrivalStation ? timetableOffsets[index + 1] : curr,
                y = lerp(curr, next, train._t),
                p = performance.now() % 1500 / 1500;

            container.querySelector('#train-mark').innerHTML =
                `<circle cx="22" cy="${y + 10}" r="${7 + p * 15}" fill="#ffffff" opacity="${1 - p}" />` +
                `<circle cx="22" cy="${y + 10}" r="7" fill="#ffffff" />`;
            if (scrollTop === undefined || scrollTop === bodyElement.scrollTop) {
                bodyElement.scrollTop = Math.round(y - height / 2 + 4);
                scrollTop = bodyElement.scrollTop;
            }
            if (me._container) {
                requestAnimationFrame(repeat);
            }
        };

        repeat();

        return me;
    }

}
