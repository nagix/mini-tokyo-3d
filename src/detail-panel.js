import * as helpers from './helpers';

const isWindows = helpers.includes(navigator.userAgent, 'Windows');

export default class {

    constructor(options) {
        this._object = options.object;
    }

    addTo(mt3d) {
        const me = this,
            {lang, dict, clock} = me._mt3d = mt3d,
            container = me._container = document.createElement('div'),
            trains = [],
            sections = [],
            stations = [],
            offsets = [],
            train = me._object,
            {r: railwayID, nm: names, v: vehicle, ds: destination, nextTrains} = train,
            railway = mt3d.railwayLookup[railwayID],
            color = vehicle ? mt3d.trainVehicleLookup[vehicle].color : railway.color,
            delay = train.delay || 0;
        let currSection, scrollTop;

        container.className = 'timetable-panel';
        container.innerHTML = `
<div id="timetable-header"></div>
<div id="timetable-body"${isWindows ? ' class="windows"' : ''}>
    <div class="scroll-box">
        <div id="timetable-content"></div>
        <svg id="railway-mark"></svg>
        <svg id="train-mark"></svg>
    </div>
</div>`;

        mt3d.container.appendChild(container);

        const headerElement = container.querySelector('#timetable-header'),
            bodyElement = container.querySelector('#timetable-body'),
            contentElement = container.querySelector('#timetable-content');

        headerElement.innerHTML = [
            '<div class="desc-header">',
            Array.isArray(color) ? [
                '<div>',
                ...color.slice(0, 3).map(c => `<div class="line-strip-long" style="background-color: ${c};"></div>`),
                '</div>'
            ].join('') : `<div style="background-color: ${color};"></div>`,
            '<div><strong>',
            names ? names.map(name => name[lang] || name.en).join(dict['and']) : mt3d.getLocalizedRailwayTitle(railwayID),
            '</strong>',
            `<br>${mt3d.getLocalizedTrainTypeTitle(train.y)} `,
            destination ?
                dict['for'].replace('$1', mt3d.getLocalizedStationTitle(destination)) :
                mt3d.getLocalizedRailDirectionTitle(train.d),
            '</div></div>',
            '<div id="slide-button" class="slide-down"></div>'
        ].join('');

        headerElement.addEventListener('click', () => {
            const {style} = container,
                {classList} = container.querySelector('#slide-button');

            if (style.height !== '68px') {
                style.height = '68px';
                classList.remove('slide-down');
                classList.add('slide-up');
            } else {
                style.height = '33%';
                classList.remove('slide-up');
                classList.add('slide-down');
            }
        });

        for (let curr = train; curr; curr = curr.previousTrains && curr.previousTrains[0]) {
            trains.unshift(curr);
        }
        for (let curr = nextTrains && nextTrains[0]; curr; curr = curr.nextTrains && curr.nextTrains[0]) {
            trains.push(curr);
        }
        trains.forEach(curr => {
            const section = {};

            section.start = Math.max(stations.length - 1, 0);
            curr.tt.forEach((s, index) => {
                if (index > 0 || !curr.previousTrains) {
                    stations.push([
                        '<div class="station-row">',
                        `<div class="station-title-box">${mt3d.getLocalizedStationTitle(s.s)}</div>`,
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
            section.end = stations.length - 1;
            section.color = mt3d.railwayLookup[curr.r].color;
            sections.push(section);
            if (curr === train) {
                currSection = section;
            }
        });
        contentElement.innerHTML = stations.join('');

        const {children} = contentElement;

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
                y = curr + (next - curr) * train._t,
                p = performance.now() % 1500 / 1500;

            container.querySelector('#train-mark').innerHTML =
                `<circle cx="22" cy="${y + 10}" r="${7 + p * 15}" fill="#ffffff" opacity="${1 - p}" />` +
                `<circle cx="22" cy="${y + 10}" r="7" fill="#ffffff" />`;
            if (scrollTop === undefined || scrollTop === bodyElement.scrollTop) {
                scrollTop = bodyElement.scrollTop = Math.round(y - height / 2 + 4);
            }
            if (me._container) {
                requestAnimationFrame(repeat);
            }
        };

        repeat();

        return me;
    }

    remove() {
        const me = this;

        me._container.parentNode.removeChild(me._container);
        delete me._container;
        delete me._mt3d;
    }

}
