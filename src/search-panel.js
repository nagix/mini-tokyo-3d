import configs from './configs';
import * as helpers from './helpers';
import * as helpersGeojson from './helpers-geojson';
import * as helpersMapbox from './helpers-mapbox';

const isWindows = helpers.includes(navigator.userAgent, 'Windows');

export default class {

    addTo(mt3d) {
        const me = this,
            {lang, dict} = me._mt3d = mt3d,
            container = me._container = document.createElement('div'),
            date = mt3d.clock.getJSTDate(),
            currMonth = date.getMonth() + 1,
            currDate = date.getDate(),
            currHours = date.getHours(),
            currMinutes = date.getMinutes();

        mt3d.trackObject();

        container.className = 'search-panel';
        container.innerHTML = `
<div id="search-header"></div>
<div id="search-body"${isWindows ? ' class="windows"' : ''}>
    <div class="scroll-box">
        <div id="search-form">
            <div class="search-form-element">${dict['from-station']} <input id="origin" class="search-input" type="text" list="stations"></div>
            <div class="search-form-element">${dict['to-station']} <input id="destination" class="search-input" type="text" list="stations"></div>
            <div class="search-form-element">
                <select id="type" class="search-select">
                    <option value="departure" selected>${dict['depart-at']}</option>
                </select>
                <select id="month" class="search-select">
                    <option value="${currMonth}" selected>${date.toLocaleDateString(lang, {month: 'short'})}</option>
                </select>
                <select id="date" class="search-select">
                    <option value="${currDate}" selected>${date.toLocaleDateString(lang, {day: 'numeric'})}</option>
                </select>
                <select id="hours" class="search-select"></select>
                <select id="minutes" class="search-select"></select>
            </div>
            <div class="search-form-element"><button id="search-button" class="search-button">${dict['search-route']}</button></div>
        </div>
        <div id="search-load">
            <div class="ball-pulse"><div></div><div></div><div></div></div>
        </div>
        <div id="search-result">
            <div id="search-routes"></div>
            <svg id="railway-mark"></svg>
        </div>
    </div>
</div>`;

        const headerElement = container.querySelector('#search-header'),
            formElement = container.querySelector('#search-form'),
            loadElement = container.querySelector('#search-load'),
            originElement = container.querySelector('#origin'),
            destinationElement = container.querySelector('#destination'),
            hoursElement = container.querySelector('#hours'),
            minutesElement = container.querySelector('#minutes'),
            searchButtonElement = container.querySelector('#search-button');

        headerElement.addEventListener('click', () => {
            const {style} = container,
                {classList} = container.querySelector('#slide-button');

            if (style.height !== '50px') {
                style.height = '50px';
                classList.remove('slide-down');
                classList.add('slide-up');
            } else {
                style.height = 'max(33%, 176px)';
                classList.remove('slide-up');
                classList.add('slide-down');
            }
        });

        const onInput = ({target}) => {
            target.style.borderColor = '#777';
            if (target.value) {
                delete me.focus;
                target.classList.remove('search-focus');
            } else {
                me.focus = target.id;
                target.classList.add('search-focus');
            }
        };
        const onFocus = ({target}) => {
            originElement.classList.remove('search-focus');
            destinationElement.classList.remove('search-focus');
            me.focus = target.id;
            target.classList.add('search-focus');
        };

        originElement.addEventListener('input', onInput);
        originElement.addEventListener('focus', onFocus);
        destinationElement.addEventListener('input', onInput);
        destinationElement.addEventListener('focus', onFocus);

        originElement.placeholder = dict['station-name'];
        destinationElement.placeholder = dict['station-name'];

        for (let i = 0; i < 24; i++) {
            const option = document.createElement('option');

            option.value = i;
            date.setHours(i);
            option.text = date.toLocaleTimeString(lang, {hour: 'numeric'});
            if (i === currHours) {
                option.selected = true;
            }
            hoursElement.appendChild(option);
        }
        for (let i = 0; i < 60; i++) {
            const option = document.createElement('option');

            option.value = i;
            date.setMinutes(i);
            option.text = `${date.toLocaleTimeString(lang, {minute: 'numeric'})}${dict['minute']}`;
            if (i === currMinutes) {
                option.selected = true;
            }
            minutesElement.appendChild(option);
        }

        searchButtonElement.addEventListener('click', () => {
            const origin = mt3d.stationTitleLookup[originElement.value.toUpperCase()],
                destination = mt3d.stationTitleLookup[destinationElement.value.toUpperCase()],
                type = container.querySelector('#type').value,
                month = container.querySelector('#month').value,
                date = container.querySelector('#date').value,
                hours = hoursElement.value,
                minutes = minutesElement.value;

            delete me.focus;
            originElement.classList.remove('search-focus');
            destinationElement.classList.remove('search-focus');

            if (!origin || !destination || origin === destination) {
                originElement.style.borderColor = origin && origin !== destination ? '#777' : '#f90';
                destinationElement.style.borderColor = destination && origin !== destination ? '#777' : '#f90';
                return;
            }

            originElement.style.borderColor = '#777';
            destinationElement.style.borderColor = '#777';

            formElement.style.display = 'none';
            loadElement.style.display = 'block';

            helpers.loadJSON(`${configs.searchUrl}?origin=${origin.id}&destination=${destination.id}&type=${type}&month=${month}&date=${date}&hours=${hours}&minutes=${minutes}`).then(data => {
                loadElement.style.display = 'none';
                me.showRoutes(data, 0);
            });
        });

        mt3d.container.appendChild(container);

        me.showForm();

        if (!mt3d.touchDevice) {
            originElement.focus();
        } else {
            me.focus = 'origin';
            originElement.classList.add('search-focus');
        }

        return me;
    }

    showForm() {
        const me = this,
            mt3d = me._mt3d,
            container = me._container,
            {dict} = mt3d;

        container.querySelector('#search-header').innerHTML = [
            '<div class="desc-header">',
            `<strong>${dict['route-search']}</strong>`,
            '</div>',
            '<div id="slide-button" class="slide-down"></div>'
        ].join('');

        container.querySelector('#search-form').style.display = 'block';
    }

    fillStationName(name) {
        const me = this;

        if (me.focus) {
            const container = me._container;
            let focusedElement = container.querySelector(`#${me.focus}`);

            focusedElement.style.borderColor = '#777';
            focusedElement.value = name;
            focusedElement.classList.remove('search-focus');
            me.focus = me.focus === 'origin' ? 'destination' : 'origin';
            focusedElement = container.querySelector(`#${me.focus}`);
            if (!focusedElement.value) {
                focusedElement.classList.add('search-focus');
                if (!me._mt3d.touchDevice) {
                    focusedElement.focus();
                }
            } else {
                delete me.focus;
            }
        }
    }

    showRoutes(result, index) {
        const me = this,
            mt3d = me._mt3d,
            {lang, dict, clock, map} = mt3d,
            container = me._container,
            headerElement = container.querySelector('#search-header'),
            resultElement = container.querySelector('#search-result'),
            routesElement = container.querySelector('#search-routes'),
            railwayMarkElement = container.querySelector('#railway-mark'),
            sections = [],
            stations = [],
            offsets = [];

        mt3d._setSearchMode('route');

        headerElement.innerHTML = [
            '<div class="desc-header">',
            `<strong>${dict['route']}${index + 1}</strong>`,
            result.routes ? ` ${dict['transfers'].replace('$1', result.routes[index].numTransfers)}` : '',
            '</div>',
            '<div class="page-controller">',
            '<span><button id="previous-button" class="previous-button"',
            !result.routes || index === 0 ? ' disabled' : '',
            '><span class="previous-icon"></span></button></span>',
            '<span><button id="next-button" class="next-button"',
            !result.routes || index === result.routes.length - 1 ? ' disabled' : '',
            '><span class="next-icon"></span></button></span>',
            '</div>',
            '<button id="back-button" class="back-button"><span class="back-icon"></span></button>',
            '<div id="slide-button" class="slide-down"></div>'
        ].join('');

        container.querySelector('.page-controller').addEventListener('click', event => {
            event.stopPropagation();
        });
        container.querySelector('#previous-button').addEventListener('click', () => {
            me.hideRoute();
            me.showRoutes(result, index - 1);
        });
        container.querySelector('#next-button').addEventListener('click', () => {
            me.hideRoute();
            me.showRoutes(result, index + 1);
        });
        container.querySelector('#back-button').addEventListener('click', event => {
            resultElement.style.display = 'none';
            me.hideRoute();
            me.showForm();
            event.stopPropagation();
            mt3d._setSearchMode('edit');
            mt3d.refreshMap();
        });

        if (result.routes) {

            resultElement.style.display = 'block';
            routesElement.innerHTML = '';

            const route = result.routes[index];
            let arrivalTime;

            for (const {r, y, ds, d, tt, nm, transfer, delay} of route.trains) {
                const railwayTitle = nm ? nm.map(name => name[lang] || name.en).join(dict['and']) : mt3d.getLocalizedRailwayTitle(r),
                    trainTypeTitle = mt3d.getLocalizedTrainTypeTitle(y),
                    destinationTitle = ds ? dict['for'].replace('$1', mt3d.getLocalizedStationTitle(ds)) : mt3d.getLocalizedRailDirectionTitle(d),
                    section = {};

                section.start = stations.length;
                stations.push([
                    '<div class="station-row">',
                    `<div class="station-title-box">${mt3d.getLocalizedStationTitle(tt[0].s)}</div>`,
                    '<div class="station-time-box',
                    delay ? ' desc-caution' : '',
                    '">',
                    arrivalTime ? `${clock.getTimeString(clock.getTime(arrivalTime) + delay * 60000)}<br>` : '',
                    clock.getTimeString(clock.getTime(tt[0].d) + delay * 60000),
                    '</div></div>'
                ].join(''));
                stations.push([
                    '<div class="station-row">',
                    `<div class="train-title-box">${railwayTitle} ${trainTypeTitle} ${destinationTitle}`,
                    delay ? ` <span class="desc-caution">${dict['delay'].replace('$1', delay)}</span>` : '',
                    '</div></div>'
                ].join(''));
                section.end = stations.length;
                section.color = mt3d.railwayLookup[r].color;
                sections.push(section);
                if (transfer === 0) {
                    arrivalTime = tt[tt.length - 1].a;
                } else {
                    stations.push([
                        '<div class="station-row">',
                        `<div class="station-title-box">${mt3d.getLocalizedStationTitle(tt[tt.length - 1].s)}</div>`,
                        '<div class="station-time-box',
                        delay ? ' desc-caution' : '',
                        '">',
                        clock.getTimeString(clock.getTime(tt[tt.length - 1].a || tt[tt.length - 1].d) + delay * 60000),
                        '</div></div>'
                    ].join(''));
                    if (transfer > 0) {
                        const section = {};

                        section.start = stations.length - 1;
                        stations.push([
                            '<div class="station-row">',
                            `<div class="train-title-box">${dict['transfer-and-wait'].replace('$1', transfer)}</div>`,
                            '</div>'
                        ].join(''));
                        section.end = stations.length;
                        sections.push(section);
                    }
                    arrivalTime = undefined;
                }
            }

            routesElement.innerHTML = stations.join('');

            const {children} = routesElement;

            for (let i = 0, ilen = children.length; i < ilen; i++) {
                const child = children[i];

                offsets.push(child.offsetTop + child.getBoundingClientRect().height / 2);
            }

            railwayMarkElement.innerHTML = sections.map(({color, start, end}) => color ?
                `<line stroke="${color}" stroke-width="10" x1="12" y1="${offsets[start]}" x2="12" y2="${offsets[end]}" stroke-linecap="round" />` :
                `<line stroke="#7f7f7f" stroke-width="4" x1="12" y1="${offsets[start]}" x2="12" y2="${offsets[end]}" stroke-dasharray="4 4" />`
            ).concat(offsets.map((offset, i) =>
                i % 2 === 0 ? `<circle cx="12" cy="${offset}" r="3" fill="#ffffff" />` : ''
            )).join('');

            const railwaySections = [],
                stationGroups = [],
                coords = [];

            for (const {r, tt, d} of route.trains) {
                const {stations, ascending} = mt3d.railwayLookup[r];

                for (const {s} of tt) {
                    const station = mt3d.stationLookup[s];

                    stationGroups.push(station.group);
                    coords.push(station.coord);
                }

                if (d === ascending) {
                    const start = stations.indexOf(tt[0].s),
                        end = stations.indexOf(tt[tt.length - 1].s, start);

                    for (let i = start; i < end; i++) {
                        railwaySections.push(`${r}.${i + 1}`);
                    }
                } else {
                    const start = stations.lastIndexOf(tt[0].s),
                        end = stations.lastIndexOf(tt[tt.length - 1].s, start);

                    for (let i = start; i > end; i--) {
                        railwaySections.push(`${r}.${i}`);
                    }
                }
            }

            for (const zoom of [13, 14, 15, 16, 17, 18]) {
                let layer = map.getLayer(`railways-routeug-${zoom}`).implementation;

                layer.setProps({
                    data: helpersGeojson.featureFilter(mt3d.featureCollection, p =>
                        p.zoom === zoom && p.altitude < 0 && helpers.includes(railwaySections, p.section)
                    )
                });

                layer = map.getLayer(`stations-routeug-${zoom}`).implementation;

                layer.setProps({
                    data: helpersGeojson.featureFilter(mt3d.featureCollection, p =>
                        p.zoom === zoom && p.altitude < 0 && helpers.includes(stationGroups, p.group)
                    )
                });

                layer = map.getLayer(`railways-routeog-${zoom}`).implementation;

                layer.setProps({
                    data: helpersGeojson.featureFilter(mt3d.featureCollection, p =>
                        p.zoom === zoom && p.altitude === 0 && helpers.includes(railwaySections, p.section)
                    )
                });

                layer = map.getLayer(`stations-routeog-${zoom}`).implementation;

                layer.setProps({
                    data: helpersGeojson.featureFilter(mt3d.featureCollection, p =>
                        p.zoom === zoom && p.altitude === 0 && helpers.includes(stationGroups, p.group)
                    )
                });
            }

            map.fitBounds(helpersMapbox.getBounds(coords), {
                bearing: map.getBearing(),
                offset: [0, -map.transform.height / 12],
                padding: {top: 20, bottom: 20, left: 10, right: 50},
                linear: true,
                maxZoom: 18
            });
            mt3d.refreshMap();
        } else {
            resultElement.style.display = 'block';
            routesElement.innerHTML = dict['cannot-find-train'];
            railwayMarkElement.innerHTML = '';
        }
    }

    hideRoute() {
        const map = this._mt3d.map;

        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            for (const id of [`railways-routeug-${zoom}`, `stations-routeug-${zoom}`, `railways-routeog-${zoom}`, `stations-routeog-${zoom}`]) {
                map.getLayer(id).implementation.setProps({
                    data: helpersGeojson.emptyFeatureCollection()
                });
            }
        }
    }

    remove() {
        const me = this;

        me.hideRoute();
        me._container.parentNode.removeChild(me._container);
        delete me._container;
        delete me._mt3d;
    }

}
