import Panel from './panel';
import {includes} from '../helpers/helpers';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({className: 'station-panel'}, options));
    }

    addTo(map) {
        const me = this,
            exitHTML = [],
            stations = me._options.object,
            titles = {},
            exits = [].concat(...stations.map(station => station.exit || [])),
            {clock, container} = map,
            now = clock.getTime();

        for (const {id} of stations) {
            titles[map.getLocalizedStationTitle(id)] = true;
        }

        for (const id of exits) {
            const poi = map.poiLookup[id],
                calendar = clock.getCalendar(),
                uptime = poi.uptime && poi.uptime.reduce((acc, val) => !val.calendar || includes(val.calendar, calendar) ? val : acc, {}),
                closed = uptime && (now < clock.getTime(uptime.open) || now >= clock.getTime(uptime.close) || uptime.open === uptime.close);

            exitHTML.push([
                `<div class="exit-row${closed ? ' closed' : ''}">`,
                '<div class="exit-icon-box"></div>',
                '<div class="exit-title-box">',
                map.getLocalizedPOIDescription(id),
                uptime && uptime.open !== uptime.close ? ` (${uptime.open}-${uptime.close})` : '',
                '</div>',
                (poi.facilities || []).map(facility => `<div class="exit-${facility}-icon"></div>`).join(''),
                '<div class="exit-share-button"></div>',
                '</div>'
            ].join(''));
        }

        super.addTo(map)
            .setTitle(Object.keys(titles).join(map.dict['and']))
            .setHTML(exitHTML.join(''));

        const children = me._container.querySelector('#panel-content').children;

        for (let i = 0, ilen = children.length; i < ilen; i++) {
            const child = children[i];

            child.addEventListener('click', () => {
                map.map.flyTo({
                    center: map.poiLookup[exits[i]].coord,
                    zoom: 19,
                    pitch: 30
                });
            });
            child.addEventListener('mouseenter', () => {
                const element = container.querySelector(`#exit-${i}`);

                if (element) {
                    element.classList.add('highlighted');
                }
            });
            child.addEventListener('mouseleave', () => {
                const element = container.querySelector(`#exit-${i}`);

                if (element) {
                    element.classList.remove('highlighted');
                }
            });
        }

        return me;
    }

}
