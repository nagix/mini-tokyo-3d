import AnimatedPopup from 'mapbox-gl-animated-popup';
import Swiper from 'swiper';
import {Pagination} from 'swiper/modules';
import configs from '../configs';
import {createElement, getTimeOffset, getTimeString, includes, loadJSON} from '../helpers/helpers';
import {emptyFeatureCollection, featureFilter} from '../helpers/helpers-geojson';
import {getBounds, setLayerProps} from '../helpers/helpers-mapbox';
import Panel from './panel';

const MODE_CLASSES = ['station-departure', 'station-to', 'station-from', 'station-exits', 'station-searching', 'station-routes', 'station-noroute'];

export default class extends Panel {

    constructor(options) {
        super(Object.assign({className: 'station-panel'}, options));
    }

    addTo(map) {
        const me = this,
            options = me._options,
            stations = options.object,
            titles = [],
            titlesByRailway = {},
            mode = options.mode || 'departure',
            departures = me._departures = [],
            exits = me._exits = [].concat(...stations.map(station => station.exit || [])),
            pitch = map.getPitch(),
            {lang, dict, clock} = map,
            date = clock.getJSTDate(),
            currMonth = date.getMonth() + 1,
            currDate = date.getDate(),
            currHours = date.getHours(),
            currMinutes = date.getMinutes();

        for (const {id, railway} of stations) {
            const title = map.getLocalizedStationTitle(id);

            if (!includes(titles, title)) {
                titles.push(title);
            }
            if (!titlesByRailway[railway]) {
                titlesByRailway[railway] = [];
            }
            if (!includes(titlesByRailway[railway], title)) {
                titlesByRailway[railway].push(title);
            }
        }
        for (const {id: stationID, railway: railwayID, alternate, ascending: altAscending, descending: altDescending} of stations) {
            const {stations: railwayStations, ascending, descending, color} = map.railwayLookup[railwayID];

            for (const {direction, altDirection} of [
                {direction: ascending, altDirection: altAscending},
                {direction: descending, altDirection: altDescending}
            ]) {
                if (altDirection === null) {
                    continue;
                }
                if (!alternate) {
                    let last;

                    if (railwayStations[0] !== railwayStations[railwayStations.length - 1]) {
                        for (let i = 0, ilen = railwayStations.length; i < ilen; i++) {
                            const id = railwayStations[direction === ascending ? ilen - 1 - i : i];

                            if (!map.stationLookup[id].alternate) {
                                last = id;
                                break;
                            }
                        }
                    }
                    if (stationID !== last) {
                        departures.push({
                            railways: [{id: railwayID, station: stationID, direction}],
                            color,
                            label: [
                                map.getLocalizedRailwayTitle(railwayID),
                                titlesByRailway[railwayID].length > 1 ? `(${map.getLocalizedStationTitle(stationID)})` : '',
                                map.getLocalizedRailDirectionTitle(altDirection || direction)
                            ].join(' ')
                        });
                    }
                } else {
                    for (const {railways} of departures) {
                        if (railways[0].station === alternate && railways[0].direction === altDirection) {
                            railways.push({id: railwayID, station: stationID, direction});
                            break;
                        }
                    }
                }
            }
        }

        super.addTo(map)
            .setTitle([
                '<div id="station-title-name">',
                `<div>${titles.join(dict['and'])}</div>`,
                '<div class="station-content-selector">',
                '<span>',
                '<input id="station-departure-button" type="radio" name="station">',
                `<label for="station-departure-button">${dict['departures']}</label>`,
                '</span>',
                '<span>',
                '<input id="station-to-button" type="radio" name="station">',
                `<label for="station-to-button">${dict['to-here']}</label>`,
                '</span>',
                '<span>',
                '<input id="station-from-button" type="radio" name="station">',
                `<label for="station-from-button">${dict['from-here']}</label>`,
                '</span>',
                exits.length ? [
                    '<span>',
                    '<input id="station-exits-button" type="radio" name="station">',
                    `<label for="station-exits-button">${dict['exits']}</label>`,
                    '</span>'
                ].join('') : '',
                '</div>',
                '</div>',
                `<div id="station-title-searching">${dict['route-search']}</div>`,
                '<div id="station-title-routes"></div>'
            ].join(''))
            .setHTML([
                '<div id="station-departure"></div>',
                '<div id="station-to">',
                `<div class="search-form-element">${dict['from-station']} <input id="origin" class="search-input search-focus" type="text" list="stations" placeholder="${dict['enter-station-name']}"></div>`,
                '<div class="search-form-element">',
                '<select id="to-type" class="search-select">',
                `<option value="departure" selected>${dict['depart-at']}</option>`,
                '</select>',
                '<select id="to-month" class="search-select">',
                `<option value="${currMonth}" selected>${date.toLocaleDateString(lang, {month: 'short'})}</option>`,
                '</select>',
                '<select id="to-date" class="search-select">',
                `<option value="${currDate}" selected>${date.toLocaleDateString(lang, {day: 'numeric'})}</option>`,
                '</select>',
                '<select id="to-hours" class="search-select"></select>',
                '<select id="to-minutes" class="search-select"></select>',
                '</div>',
                `<div class="search-form-element"><button id="to-search-button" class="search-button" disabled>${dict['search-route']}</button></div>`,
                '</div>',
                '<div id="station-from">',
                `<div class="search-form-element">${dict['to-station']} <input id="destination" class="search-input search-focus" type="text" list="stations" placeholder="${dict['enter-station-name']}"></div>`,
                '<div class="search-form-element">',
                '<select id="from-type" class="search-select">',
                `<option value="departure" selected>${dict['depart-at']}</option>`,
                '</select>',
                '<select id="from-month" class="search-select">',
                `<option value="${currMonth}" selected>${date.toLocaleDateString(lang, {month: 'short'})}</option>`,
                '</select>',
                '<select id="from-date" class="search-select">',
                `<option value="${currDate}" selected>${date.toLocaleDateString(lang, {day: 'numeric'})}</option>`,
                '</select>',
                '<select id="from-hours" class="search-select"></select>',
                '<select id="from-minutes" class="search-select"></select>',
                '</div>',
                `<div class="search-form-element"><button id="from-search-button" class="search-button" disabled>${dict['search-route']}</button></div>`,
                '</div>',
                '<div id="station-exits"></div>',
                '<div id="station-searching">',
                '<div class="ball-pulse"><div></div><div></div><div></div></div>',
                '</div>',
                '<div id="station-routes" class="swiper">',
                '<div class="swiper-wrapper"></div>',
                '<div class="swiper-pagination"></div>',
                '</div>',
                `<div id="station-noroute">${dict['cannot-find-train']}</div>`
            ].join(''));

        const container = me._container,
            originElement = container.querySelector('#origin'),
            destinationElement = container.querySelector('#destination');

        container.classList.add(`station-${mode}`);
        container.querySelector(`#station-${mode}-button`).checked = true;

        for (const key of ['station-departure', 'station-to', 'station-from', 'station-exits']) {
            const buttonElement = container.querySelector(`#${key}-button`);

            if (buttonElement) {
                buttonElement.addEventListener('click', () => {
                    const classList = container.classList;

                    if (!classList.contains(key)) {
                        classList.remove(...MODE_CLASSES);
                        classList.add(key);
                        if (key === 'station-to') {
                            originElement.focus();
                        } else if (key === 'station-from') {
                            destinationElement.focus();
                        }
                        if (key !== 'station-exits') {
                            map.hideStationExits();
                            map.map.flyTo({center: map.lastCameraParams.center, zoom: 15.5, pitch});
                        } else {
                            map.showStationExits(stations);
                        }
                        map._setSearchMode(includes(['station-to', 'station-from'], key) ? 'edit' : 'none');
                    }
                });
            }
        }

        me.updateContent();

        for (const key of ['to', 'from']) {
            const hoursElement = container.querySelector(`#${key}-hours`),
                minutesElement = container.querySelector(`#${key}-minutes`),
                stationNameElement = key === 'to' ? originElement : destinationElement,
                searchButtonElement = container.querySelector(`#${key}-search-button`);

            for (let i = 0; i < 24; i++) {
                date.setHours(i);
                createElement('option', {
                    value: i,
                    text: date.toLocaleTimeString(lang, {hour: 'numeric'}),
                    selected: i === currHours
                }, hoursElement);
            }
            for (let i = 0; i < 60; i++) {
                date.setMinutes(i);
                createElement('option', {
                    value: i,
                    text: `${date.toLocaleTimeString(lang, {minute: 'numeric'})}${dict['minute']}`,
                    selected: i === currMinutes
                }, minutesElement);
            }
            stationNameElement.addEventListener('input', () => {
                const selectedStation = map.stationTitleLookup[stationNameElement.value.toUpperCase()];

                searchButtonElement.disabled = !selectedStation || includes(stations, selectedStation);
            });
            searchButtonElement.addEventListener('click', () => {
                const classList = container.classList,
                    stationTitleLookup = map.stationTitleLookup,
                    origin = key === 'to' ? stationTitleLookup[originElement.value.toUpperCase()] : stations[0],
                    destination = key === 'from' ? stationTitleLookup[destinationElement.value.toUpperCase()] : stations[0],
                    type = container.querySelector(`#${key}-type`).value,
                    month = container.querySelector(`#${key}-month`).value,
                    date = container.querySelector(`#${key}-date`).value,
                    hours = hoursElement.value,
                    minutes = minutesElement.value;

                classList.remove(...MODE_CLASSES);
                classList.add('station-searching');
                me.setButtons([me._backButton]);

                loadJSON(`${configs.searchUrl}?origin=${origin.id}&destination=${destination.id}&type=${type}&month=${month}&date=${date}&hours=${hours}&minutes=${minutes}`).then(data => {
                    const classList = container.classList;

                    if (classList.contains('station-searching')) {
                        classList.remove(...MODE_CLASSES);
                        me.showResult(data);
                    }
                });
            });
        }

        me.popups = [];

        const backButton = me._backButton = createElement('div', {
            innerHTML: [
                '<button id="back-button" class="back-button">',
                '<span class="back-icon"></span>',
                '</button>'
            ].join('')
        });

        backButton.addEventListener('click', event => {
            event.stopPropagation();
        });
        backButton.querySelector('#back-button').addEventListener('click', () => {
            const swiper = me._swiper,
                classList = container.classList;

            if (swiper) {
                swiper.destroy();
                delete me._swiper;
                me.hideRoute();
            }
            classList.remove(...MODE_CLASSES);
            if (container.querySelector('#station-to-button').checked) {
                classList.add('station-to');
                originElement.focus();
            } else {
                classList.add('station-from');
                destinationElement.focus();
            }
            me.setButtons();
            map.map.flyTo({center: map.lastCameraParams.center, zoom: 15.5});
            map._setSearchMode('edit');
        });

        return me;
    }

    reset() {
        const me = this,
            {_map: map, _container: container, _swiper: swiper} = me,
            classList = me._container.classList;

        if (swiper) {
            swiper.destroy();
            delete me._swiper;
            me.hideRoute();
        }
        classList.remove(...MODE_CLASSES);
        classList.add('station-departure');
        container.querySelector(':checked').checked = false;
        container.querySelector('#station-departure-button').checked = true;
        me.setButtons();
        map.hideStationExits();
        map.map.flyTo({center: map.lastCameraParams.center, zoom: 15.5});
        map._setSearchMode('none');
    }

    updateContent() {
        const me = this,
            {_map: map, _container: container, _exits: exits} = me,
            {dict, clock, container: mapContainer} = map,
            now = clock.getTimeOffset(),
            calendar = clock.getCalendar(),
            exitsElement = container.querySelector('#station-exits');

        if (!me.isOpen()) {
            return;
        }

        for (const departure of me._departures) {
            const trains = [];

            for (const railway of departure.railways) {
                for (const timetable of map.timetables.getByDirectionId(railway.id, railway.direction)) {
                    const train = map.activeTrainLookup[timetable.t] || map.standbyTrainLookup[timetable.id],
                        delay = (train && train.delay) || 0;

                    if (timetable.end + delay <= now) {
                        continue;
                    }
                    for (let i = 0; i < timetable.tt.length - 1; i++) {
                        const {s, d} = timetable.tt[i];

                        if (s.id === railway.station) {
                            const time = d + delay;

                            if (time > now) {
                                if (trains.length === 0 || time < trains[0].time) {
                                    trains.unshift({train: train || timetable, time});
                                    trains.splice(2, 1);
                                } else if (trains.length === 1 || time < trains[1].time) {
                                    trains.splice(1, 1, {train: train || timetable, time});
                                }
                            }
                            break;
                        }
                    }
                }
            }
            departure.trains = trains;
        }

        container.querySelector('#station-departure').innerHTML =
            me._departures.map(({color, label, trains}) => [
                '<div class="direction-row">',
                `<div class="line-strip" style="background-color: ${color};"></div>`,
                `<div class="direction-label">${label}</div>`,
                '</div>',
                '<div class="trains-row">',
                trains.length ? trains.map(({train, time}) => [
                    '<div class="train-row">',
                    `<div class="train-time-box${train.delay >= 60000 ? ' desc-caution' : ''}">${getTimeString(time)}</div>`,
                    '<div class="train-title-box">',
                    `<span class="train-type-label">${map.getLocalizedTrainTypeTitle(train.y.id)}</span> `,
                    train.nm ? `${map.getLocalizedTrainNameOrRailwayTitle(train.nm)} ` : '',
                    map.getLocalizedDestinationTitle(train.ds && train.ds.map(({id}) => id), train.d.id),
                    train.delay >= 60000 ? ` <span class="desc-caution">${dict['delay'].replace('$1', Math.floor(train.delay / 60000))}</span>` : '',
                    '</div>',
                    '</div>'
                ].join('')).join('') : `<div class="train-row desc-caution">${dict['service-has-ended']}</div>`,
                '</div>'
            ].join('')).join('');

        exitsElement.innerHTML = '';
        for (let i = 0, ilen = exits.length; i < ilen; i++) {
            const id = exits[i],
                poi = map.pois.get(id),
                uptime = poi.uptime && poi.uptime.reduce((acc, val) => !val.calendar || includes(val.calendar, calendar) ? val : acc, {}),
                closed = uptime && (now < uptime.open || now >= uptime.close || uptime.open === uptime.close),
                element = createElement('div', {
                    className: `exit-row${closed ? ' closed' : ''}`,
                    innerHTML: [
                        '<div class="exit-icon-box"></div>',
                        '<div class="exit-title-box">',
                        map.getLocalizedPOIDescription(id),
                        uptime && uptime.open !== uptime.close ? ` (${uptime.open}-${uptime.close})` : '',
                        '</div>',
                        (poi.facilities || []).map(facility => `<div class="exit-${facility}-icon"></div>`).join(''),
                        '<div class="exit-share-button"></div>'
                    ].join('')
                }, exitsElement);

            element.addEventListener('click', () => {
                map.map.flyTo({center: poi.coord, zoom: 19, pitch: 30});
            });
            element.addEventListener('mouseenter', () => {
                const popup = mapContainer.querySelector(`#exit-${i}`);

                if (popup) {
                    popup.classList.add('highlighted');
                }
            });
            element.addEventListener('mouseleave', () => {
                const popup = mapContainer.querySelector(`#exit-${i}`);

                if (popup) {
                    popup.classList.remove('highlighted');
                }
            });
        }
    }

    fillStationName(name) {
        const container = this._container,
            classList = container.classList;

        if (classList.contains('station-to')) {
            const element = container.querySelector('#origin');

            element.value = name;
            element.dispatchEvent(new Event('input'));
            element.focus();
        } else if (classList.contains('station-from')) {
            const element = container.querySelector('#destination');

            element.value = name;
            element.dispatchEvent(new Event('input'));
            element.focus();
        }
    }

    showResult(result) {
        const me = this,
            {_map: map, _container: container, _backButton: backButton} = me,
            dict = map.dict,
            classList = container.classList,
            pageController = createElement('div', {
                className: 'page-controller',
                innerHTML: [
                    '<span><button id="previous-button" class="previous-button">',
                    '<span class="previous-icon"></span>',
                    '</button></span>',
                    '<span><button id="next-button" class="next-button">',
                    '<span class="next-icon"></span>',
                    '</button></span>'
                ].join('')
            }),
            swiperElement = container.querySelector('.swiper-wrapper'),
            routes = result.routes;

        me._result = result;

        map._setSearchMode('route');

        pageController.addEventListener('click', event => {
            event.stopPropagation();
        });
        pageController.querySelector('#previous-button').addEventListener('click', () => {
            me._swiper.slidePrev();
        });
        pageController.querySelector('#next-button').addEventListener('click', () => {
            me._swiper.slideNext();
        });

        swiperElement.innerHTML = '';

        if (routes) {
            classList.add('station-routes');
            me.setButtons([backButton, pageController]);

            for (const route of routes) {
                const slideElement = createElement('div', {
                        className: 'swiper-slide',
                        innerHTML: [
                            '<div class="swiper-slide-content">',
                            '<div id="search-routes"></div>',
                            '<svg id="railway-mark"></svg>',
                            '</div>'
                        ].join('')
                    }, swiperElement),
                    routesElement = slideElement.querySelector('#search-routes'),
                    railwayMarkElement = slideElement.querySelector('#railway-mark'),
                    sections = [],
                    stations = [],
                    offsets = [];
                let arrivalTime;

                for (const {r, y, ds, d, tt, nm, transfer, delay} of route.trains) {
                    const departure = tt[0],
                        arrival = tt[tt.length - 1],
                        railwayTitle = map.getLocalizedTrainNameOrRailwayTitle(nm, r),
                        trainTypeTitle = map.getLocalizedTrainTypeTitle(y),
                        destinationTitle = map.getLocalizedDestinationTitle(ds, d),
                        section = {};

                    section.start = stations.length;
                    stations.push([
                        '<div class="station-row">',
                        `<div class="station-title-box">${map.getLocalizedStationTitle(departure.s)}</div>`,
                        `<div class="station-time-box${delay ? ' desc-caution' : ''}">`,
                        arrivalTime !== undefined ? `${getTimeString(arrivalTime + delay * 60000)}<br>` : '',
                        getTimeString(getTimeOffset(departure.d) + delay * 60000),
                        '</div></div>'
                    ].join(''));
                    stations.push([
                        '<div class="station-row">',
                        `<div class="train-title-box">${railwayTitle} <span class="train-type-label">${trainTypeTitle}</span> ${destinationTitle}`,
                        delay ? ` <span class="desc-caution">${dict['delay'].replace('$1', delay)}</span>` : '',
                        '</div></div>'
                    ].join(''));
                    section.end = stations.length;
                    section.color = map.railwayLookup[r].color;
                    sections.push(section);
                    if (transfer === 0) {
                        arrivalTime = getTimeOffset(arrival.a);
                    } else {
                        stations.push([
                            '<div class="station-row">',
                            `<div class="station-title-box">${map.getLocalizedStationTitle(arrival.s)}</div>`,
                            `<div class="station-time-box${delay ? ' desc-caution' : ''}">`,
                            getTimeString(getTimeOffset(arrival.a || arrival.d) + delay * 60000),
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

                for (const child of routesElement.children) {
                    offsets.push(child.offsetTop + child.getBoundingClientRect().height / 2);
                }

                railwayMarkElement.innerHTML = sections.map(({color, start, end}) => color ?
                    `<line stroke="${color}" stroke-width="10" x1="12" y1="${offsets[start]}" x2="12" y2="${offsets[end]}" stroke-linecap="round" />` :
                    `<line stroke="#7f7f7f" stroke-width="4" x1="12" y1="${offsets[start]}" x2="12" y2="${offsets[end]}" stroke-dasharray="4 4" />`
                ).concat(offsets.map((offset, i) =>
                    i % 2 === 0 ? `<circle cx="12" cy="${offset}" r="3" fill="#ffffff" />` : ''
                )).join('');

            }

            me._swiper = new Swiper('.swiper', {
                modules: [Pagination],
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true
                }
            });
            me._swiper.on('slideChange', () => {
                me.hideRoute();
            });
            me._swiper.on('slideChangeTransitionEnd', () => {
                me.switchRoute();
            });

            me.switchRoute();
        } else {
            classList.add('station-noroute');
            me.setButtons([backButton]);

            swiperElement.innerHTML = [
                '<div class="swiper-slide">',
                '<div class="swiper-slide-content">',
                dict['cannot-find-train'],
                '</div></div>'
            ].join('');
        }
    }

    switchRoute() {
        const me = this,
            {_map: map, _container: container, _swiper: swiper} = me,
            {dict, map: mbox, featureCollection} = map,
            index = swiper.activeIndex,
            route = me._result.routes[index],
            trains = route.trains,
            railwaySections = [],
            stationGroups = [],
            coords = [];

        container.querySelector('#station-title-routes').innerHTML = [
            `${dict['route']}${index + 1} `,
            dict['transfers'].replace('$1', route.numTransfers)
        ].join('');

        container.querySelector('#previous-button').disabled = swiper.isBeginning;
        container.querySelector('#next-button').disabled = swiper.isEnd;

        for (const {r, tt, d} of trains) {
            const {stations, ascending} = map.railwayLookup[r],
                startStation = tt[0].s,
                endStation = tt[tt.length - 1].s;

            for (const stop of tt) {
                const station = map.stationLookup[stop.s];

                stationGroups.push(station.group);
                coords.push(station.coord);
            }

            if (d === ascending) {
                const start = stations.indexOf(startStation),
                    end = stations.indexOf(endStation, start);

                for (let i = start; i < end; i++) {
                    railwaySections.push(`${r}.${i + 1}`);
                }
            } else {
                const start = stations.lastIndexOf(startStation),
                    end = stations.lastIndexOf(endStation, start);

                for (let i = start; i > end; i--) {
                    railwaySections.push(`${r}.${i}`);
                }
            }
        }

        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            mbox.getLayer(`railways-routeug-${zoom}`).implementation.setProps({
                data: featureFilter(featureCollection, p =>
                    p.zoom === zoom && p.altitude < 0 && includes(railwaySections, p.section)
                )
            });

            mbox.getLayer(`stations-routeug-${zoom}`).implementation.setProps({
                data: featureFilter(featureCollection, p =>
                    p.zoom === zoom && p.altitude < 0 && includes(stationGroups, p.group)
                )
            });

            mbox.getLayer(`railways-routeog-${zoom}`).implementation.setProps({
                data: featureFilter(featureCollection, p =>
                    p.zoom === zoom && p.altitude === 0 && includes(railwaySections, p.section)
                )
            });

            mbox.getLayer(`stations-routeog-${zoom}`).implementation.setProps({
                data: featureFilter(featureCollection, p =>
                    p.zoom === zoom && p.altitude === 0 && includes(stationGroups, p.group)
                )
            });
        }

        mbox.fitBounds(getBounds(coords), {
            bearing: mbox.getBearing(),
            pitch: mbox.getPitch(),
            offset: [0, -mbox.transform.height / 12],
            padding: {top: 20, bottom: 20, left: 10, right: 50},
            linear: true,
            maxZoom: 18
        });
        map.refreshMap();

        const stationIDs = [trains[0].tt[0].s];

        for (const train of trains) {
            if (train.transfer > 0 || train === trains[trains.length - 1]) {
                stationIDs.push(train.tt[train.tt.length - 1].s);
            }
        }

        me.popups = stationIDs.map((id, index) => {
            return setTimeout(() => {
                const popup = new AnimatedPopup({
                    className: 'popup-route',
                    closeButton: false,
                    closeOnClick: false
                });

                popup.setLngLat(map.stationLookup[id].coord)
                    .setHTML(index === 0 ? dict['from-station'] : index === stationIDs.length - 1 ? dict['to-station'] : `${dict['transfer']}${index}`)
                    .addTo(mbox);

                me.popups[index] = popup;
            }, index / stationIDs.length * 1000 + 500);
        });
    }

    hideRoute() {
        const me = this,
            mbox = me._map.map;

        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            for (const key2 of ['routeug', 'routeog']) {
                for (const key1 of ['railways', 'stations']) {
                    setLayerProps(mbox, `${key1}-${key2}-${zoom}`, {
                        data: emptyFeatureCollection()
                    });
                }
            }
        }

        for (const popup of me.popups) {
            if (popup instanceof AnimatedPopup) {
                popup.remove();
            } else {
                clearTimeout(popup);
            }
        }
    }

    remove() {
        this.hideRoute();

        return super.remove();
    }

}
