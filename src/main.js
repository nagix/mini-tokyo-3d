import {WebMercatorViewport} from '@deck.gl/core';
import {MapboxLayer} from '@deck.gl/mapbox';
import {GeoJsonLayer} from '@deck.gl/layers';
import mapboxgl from 'mapbox-gl';
import turfDistance from '@turf/distance';
import turfBearing from '@turf/bearing';
import {featureEach} from '@turf/meta';
import {getCoords} from '@turf/invariant';
import * as THREE from 'three';
import SPE from './spe/SPE';
import JapaneseHolidays from 'japanese-holidays';
import SunCalc from 'suncalc';
import animation from './animation';
import clock from './clock';
import configs from './configs';
import * as helpers from './helpers';
import MapboxGLButtonControl from './mapboxGLButtonControl';
import ThreeLayer from './threeLayer';
import destination from './turf/destination';
import featureFilter from './turf/featureFilter';

const OPERATORS_FOR_TRAININFORMATION = [
    'JR-East',
    'TWR',
    'TokyoMetro',
    'Toei',
    'YokohamaMunicipal',
    'Keio',
    'Keikyu',
    'Keisei',
    'Tobu',
    'Seibu',
    'Tokyu'
];

const OPERATORS_FOR_TRAINS = [
    'JR-East',
    'TokyoMetro',
    'Toei'
];

const OPERATORS_FOR_FLIGHTINFORMATION = [
    'HND-JAT',
    'HND-TIAT',
    'NAA'
];

const RAILWAY_SOBURAPID = 'JR-East.SobuRapid';
const RAILWAY_NAMBOKU = 'TokyoMetro.Namboku';
const RAILWAY_MITA = 'Toei.Mita';

const TRAINTYPES_FOR_SOBURAPID = [
    'JR-East.Rapid',
    'JR-East.LimitedExpress'
];

const DATE_FORMAT = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short'
};

const DEGREE_TO_RADIAN = Math.PI / 180;

const modelOrigin = mapboxgl.MercatorCoordinate.fromLngLat(configs.originCoord);
const modelScale = modelOrigin.meterInMercatorCoordinateUnits();

const lang = helpers.getLang();
const isWindows = helpers.includes(navigator.userAgent, 'Windows');
const isEdge = helpers.includes(navigator.userAgent, 'Edge');
let isUndergroundVisible = false;
let isPlayback = false;
let isEditingTime = false;
let isWeatherVisible = false;
const rainTexture = new THREE.TextureLoader().load('images/raindrop.png');
let trackingMode = 'helicopter';
let styleColors = [];
let styleOpacities = [];
let emitterBounds = {};
let emitterQueue = [];
const featureLookup = {};
const activeTrainLookup = {};
let realtimeTrainLookup = {};
const flightLookup = {};
const activeFlightLookup = {};
const lastDynamicUpdate = {};
let stationLookup, stationTitleLookup, railwayLookup, railDirectionLookup, trainTypeLookup, trainVehicleLookup, trainLookup, operatorLookup, airportLookup, flightStatusLookup;
let trackedObject, markedObject, tempDate, lastTimetableRefresh, lastTrainRefresh, lastClockRefresh, lastFrameRefresh, trackingBaseBearing, viewAnimationID, layerZoom, objectUnit, objectScale, /*carScale, */aircraftScale;
let flightPattern, lastFlightPatternChanged;
let lastNowCastRefresh, nowCastData, fgGroup, imGroup, bgGroup;

// Replace MapboxLayer.render to support underground rendering
const render = MapboxLayer.prototype.render;
MapboxLayer.prototype.render = function(...args) {
    const me = this,
        {deck: _deck, map} = me,
        center = map.getCenter();

    if (!_deck.layerManager) {
        // Not yet initialized
        return;
    }

    if (!_deck.props.userData.currentViewport) {
        _deck.props.userData.currentViewport = new WebMercatorViewport({
            x: 0,
            y: 0,
            width: _deck.width,
            height: _deck.height,
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
            nearZMultiplier: 0,
            farZMultiplier: 10
        });
    }
    render.apply(me, args);
};

Promise.all([
    helpers.loadJSON(`data/dictionary-${lang}.json`),
    helpers.loadJSON('data/railways.json.gz'),
    helpers.loadJSON('data/stations.json.gz'),
    helpers.loadJSON('data/features.json.gz'),
    helpers.loadJSON(`data/${getTimetableFileName()}`),
    helpers.loadJSON('data/rail-directions.json.gz'),
    helpers.loadJSON('data/train-types.json.gz'),
    helpers.loadJSON('data/train-vehicles.json.gz'),
    helpers.loadJSON('data/operators.json.gz'),
    helpers.loadJSON('data/airports.json.gz'),
    helpers.loadJSON('data/flight-statuses.json.gz'),
    helpers.loadJSON(configs.secretsURL)
]).then(([
    dict, railwayRefData, stationRefData, railwayFeatureCollection, timetableRefData, railDirectionRefData,
    trainTypeRefData, trainVehicleRefData, operatorRefData, airportRefData, flightStatusRefData, e
]) => {

    mapboxgl.accessToken = e.mapbox;
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'data/osm-liberty.json',
        attributionControl: true,
        hash: true,
        center: configs.originCoord,
        zoom: configs.defaultZoom,
        pitch: configs.defaultPitch
    });

    const unit = Math.pow(2, 14 - helpers.clamp(map.getZoom(), 13, 19));

    layerZoom = helpers.clamp(Math.floor(map.getZoom()), 13, 18);
    objectUnit = Math.max(unit * .19, .02);
    objectScale = unit * modelScale * 100;
    // carScale = Math.max(.02 / .19 / unit, 1);
    aircraftScale = Math.max(.06 / .285 / unit, 1);

    const trainLayers = {
        ug: new ThreeLayer('trains-ug', modelOrigin, true, true),
        og: new ThreeLayer('trains-og', modelOrigin),
        addObject(object, duration) {
            const layer = object.userData.altitude < 0 ? this.ug : this.og;

            setOpacity(object, 0);
            layer.scene.add(object);
            if (duration > 0) {
                animation.start({
                    callback: elapsed =>
                        setOpacity(object, getObjectOpacity(object) * elapsed / duration),
                    duration
                });
            }
        },
        updateObject(object, duration) {
            const layer = object.userData.altitude < 0 ? this.ug : this.og;

            layer.scene.add(object);
            if (duration > 0) {
                animation.start({
                    callback: elapsed =>
                        setOpacity(object, getObjectOpacity(object, elapsed / duration)),
                    duration
                });
            }
        },
        removeObject(object, duration) {
            if (!object) {
                return;
            }

            const layer = object.userData.altitude < 0 ? this.ug : this.og;

            object.traverse(descendant => {
                if (descendant.material) {
                    descendant.material.polygonOffsetFactor = 0;
                }
            });
            object.renderOrder = 1;
            if (duration > 0) {
                animation.start({
                    callback: elapsed =>
                        setOpacity(object, getObjectOpacity(object) * (1 - elapsed / duration)),
                    complete: () =>
                        layer.scene.remove(object),
                    duration
                });
            } else {
                layer.scene.remove(object);
            }
        },
        pickObject(point) {
            if (isUndergroundVisible) {
                return this.ug.pickObject(point) || this.og.pickObject(point);
            } else {
                return this.og.pickObject(point) || this.ug.pickObject(point);
            }
        },
        onResize(event) {
            this.ug.onResize(event);
            this.og.onResize(event);
        }
    };

    const rainLayer = new ThreeLayer('rain', modelOrigin);

    railwayLookup = helpers.buildLookup(railwayRefData);
    stationLookup = helpers.buildLookup(stationRefData);

    stationRefData.forEach(({title}) => {
        if (!dict[title.ja]) {
            dict[title.ja] = title[lang] || '';
        }
    });

    // Build feature lookup dictionary and update feature properties
    featureEach(railwayFeatureCollection, feature => {
        const {id} = feature.properties;
        if (id && !id.match(/\.(ug|og)\./)) {
            featureLookup[id] = feature;
            updateDistances(feature);
        }
    });

    lastTimetableRefresh = clock.getTime('03:00');
    updateTimetableRefData(timetableRefData);
    trainLookup = helpers.buildLookup(timetableRefData, 't');

    railDirectionLookup = helpers.buildLookup(railDirectionRefData);
    trainTypeLookup = helpers.buildLookup(trainTypeRefData);
    trainVehicleLookup = helpers.buildLookup(trainVehicleRefData);
    operatorLookup = helpers.buildLookup(operatorRefData);
    airportLookup = helpers.buildLookup(airportRefData);
    flightStatusLookup = helpers.buildLookup(flightStatusRefData);

    map.once('load', () => {
        document.getElementById('loader').style.opacity = 0;
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
        }, 1000);
    });

    map.once('styledata', () => {
        ['poi', 'poi_extra'].forEach(id => {
            map.setLayoutProperty(id, 'text-field', lang === 'ja' ? '{name_ja}' : ['get', ['get', 'name_ja'], ['literal', dict]]);
        });

        [13, 14, 15, 16, 17, 18].forEach(zoom => {
            const minzoom = zoom <= 13 ? 0 : zoom,
                maxzoom = zoom >= 18 ? 24 : zoom + 1,
                lineWidthScale = zoom === 13 ? helpers.clamp(Math.pow(2, map.getZoom() - 12), .125, 1) : 1;

            map.addLayer(new MapboxLayer({
                id: `railways-ug-${zoom}`,
                type: GeoJsonLayer,
                data: featureFilter(railwayFeatureCollection, p =>
                    p.zoom === zoom && p.type === 0 && p.altitude < 0
                ),
                filled: false,
                stroked: true,
                getLineWidth: d => d.properties.width,
                getLineColor: d => helpers.colorToRGBArray(d.properties.color),
                lineWidthUnits: 'pixels',
                lineWidthScale,
                lineJointRounded: true,
                opacity: .0625
            }), 'building-3d');
            map.setLayerZoomRange(`railways-ug-${zoom}`, minzoom, maxzoom);
            map.addLayer(new MapboxLayer({
                id: `stations-ug-${zoom}`,
                type: GeoJsonLayer,
                data: featureFilter(railwayFeatureCollection, p =>
                    p.zoom === zoom && p.type === 1 && p.altitude < 0
                ),
                filled: true,
                stroked: true,
                getLineWidth: 4,
                getLineColor: [0, 0, 0],
                lineWidthUnits: 'pixels',
                lineWidthScale,
                getFillColor: [255, 255, 255, 179],
                opacity: .0625
            }), 'building-3d');
            map.setLayerZoomRange(`stations-ug-${zoom}`, minzoom, maxzoom);
        });

        // Workaround for deck.gl #3522
        map.__deck.props.getCursor = () => map.getCanvas().style.cursor;

        map.addLayer(trainLayers.ug, 'building-3d');

        [13, 14, 15, 16, 17, 18].forEach(zoom => {
            const minzoom = zoom <= 13 ? 0 : zoom,
                maxzoom = zoom >= 18 ? 24 : zoom + 1,
                width = ['get', 'width'],
                color = ['get', 'color'],
                outlineColor = ['get', 'outlineColor'],
                lineWidth = zoom === 13 ?
                    ['interpolate', ['exponential', 2], ['zoom'], 9, ['/', width, 8], 12, width] : width,
                railwaySource = {
                    type: 'geojson',
                    data: featureFilter(railwayFeatureCollection, p =>
                        p.zoom === zoom && p.type === 0 && p.altitude === 0
                    )
                },
                stationSource = {
                    type: 'geojson',
                    data: featureFilter(railwayFeatureCollection, p =>
                        p.zoom === zoom && p.type === 1 && p.altitude === 0
                    )
                };

            map.addLayer({
                id: `railways-og-${zoom}`,
                type: 'line',
                source: railwaySource,
                paint: {
                    'line-color': color,
                    'line-width': lineWidth
                },
                minzoom,
                maxzoom
            }, 'building-3d');
            map.addLayer({
                id: `stations-og-${zoom}`,
                type: 'fill',
                source: stationSource,
                paint: {
                    'fill-color': color,
                    'fill-opacity': .7
                },
                minzoom,
                maxzoom
            }, 'building-3d');
            map.addLayer({
                id: `stations-outline-og-${zoom}`,
                type: 'line',
                source: stationSource,
                paint: {
                    'line-color': outlineColor,
                    'line-width': lineWidth
                },
                minzoom,
                maxzoom
            }, 'building-3d');
        });

        map.addLayer(trainLayers.og, 'building-3d');

        map.addLayer(rainLayer, 'poi');

        styleColors = helpers.getStyleColors(map);
        styleOpacities = helpers.getStyleOpacities(map);

        const clockElement = document.createElement('div');
        clockElement.id = 'clock';
        document.getElementById('map').appendChild(clockElement);

        const datalist = document.createElement('datalist');
        datalist.id = 'stations';
        stationTitleLookup = {};
        [lang, 'en'].forEach(l => {
            stationRefData.forEach(station => {
                const title = station.title[l],
                    {coord} = station;

                if (title && !stationTitleLookup[title.toUpperCase()] && coord && coord[0] && coord[1]) {
                    const option = document.createElement('option');

                    option.value = title;
                    datalist.appendChild(option);
                    stationTitleLookup[title.toUpperCase()] = station;
                }
            });
        });
        document.body.appendChild(datalist);

        const searchBox = document.getElementById('search-box');
        const searchListener = event => {
            const station = stationTitleLookup[event.target.value.toUpperCase()];

            if (station && station.coord) {
                markedObject = trackedObject = undefined;
                popup.remove();
                hideTimetable();
                stopViewAnimation();
                disableTracking();
                if (isUndergroundVisible && !(station.altitude < 0)) {
                    helpers.dispatchClickEvent('mapboxgl-ctrl-underground');
                }
                if (!isUndergroundVisible && (station.altitude < 0)) {
                    map.once('moveend', () => {
                        helpers.dispatchClickEvent('mapboxgl-ctrl-underground');
                    });
                }
                map.flyTo({
                    center: station.coord,
                    zoom: Math.max(map.getZoom(), 15)
                });
            }
        };
        searchBox.placeholder = dict['station-name'];
        searchBox.addEventListener(isEdge ? 'blur' : 'change', searchListener);

        // Workaround for Edge
        if (isEdge) {
            searchBox.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    searchListener(event);
                }
            });
        }

        let control = new MapboxGLButtonControl([{
            className: 'mapboxgl-ctrl-search',
            title: dict['search'],
            eventHandler() {
                const me = this,
                    {style} = me;

                if (style.width !== '240px') {
                    style.width = '240px';
                    searchBox.style.display = 'block';
                    searchBox.value = '';
                    searchBox.focus();
                    setTimeout(() => {
                        searchBox.style.opacity = 1;
                    }, 300);
                } else {
                    style.width = '29px';
                    searchBox.style.display = 'none';
                    searchBox.style.opacity = 0;
                }
            }
        }]);
        map.addControl(control);

        control = new mapboxgl.NavigationControl();
        control._setButtonTitle = function(button) {
            const me = this,
                title = button === me._zoomInButton ? dict['zoom-in'] :
                button === me._zoomOutButton ? dict['zoom-out'] :
                button === me._compass ? dict['compass'] : '';

            button.title = title;
            button.setAttribute('aria-label', title);
        };
        map.addControl(control);

        control = new mapboxgl.FullscreenControl();
        control._updateTitle = function() {
            const me = this,
                title = dict[me._isFullscreen() ? 'exit-fullscreen' : 'enter-fullscreen'];

            me._fullscreenButton.title = title;
            me._fullscreenButton.setAttribute('aria-label', title);
        };
        map.addControl(control);

        map.addControl(new MapboxGLButtonControl([{
            className: 'mapboxgl-ctrl-underground',
            title: dict['enter-underground'],
            eventHandler() {
                const me = this,
                    {classList} = me;

                isUndergroundVisible = !isUndergroundVisible;
                me.title = dict[isUndergroundVisible ? 'exit-underground' : 'enter-underground'];
                trainLayers.ug.setSemitransparent(!isUndergroundVisible);
                trainLayers.og.setSemitransparent(isUndergroundVisible);
                if (isUndergroundVisible) {
                    classList.add('mapboxgl-ctrl-underground-visible');
                    map.setPaintProperty('background', 'background-color', 'rgb(16,16,16)');
                } else {
                    classList.remove('mapboxgl-ctrl-underground-visible');
                    map.setPaintProperty('background', 'background-color', getStyleColorString(styleColors[0]));
                }
                styleOpacities.forEach(({id, key, opacity}) => {
                    const factor = helpers.includes(id, '-og-') ? .25 : .0625;

                    map.setPaintProperty(id, key, isUndergroundVisible ?
                        helpers.scaleValues(opacity, factor) : opacity);
                });

                animation.start({
                    callback: (elapsed, duration) => {
                        const t = elapsed / duration;

                        [13, 14, 15, 16, 17, 18].forEach(zoom => {
                            const opacity = isUndergroundVisible ?
                                1 * t + .0625 * (1 - t) : 1 * (1 - t) + .0625 * t;

                            helpers.setLayerProps(map, `railways-ug-${zoom}`, {opacity});
                            helpers.setLayerProps(map, `stations-ug-${zoom}`, {opacity});
                        });
                        Object.keys(activeTrainLookup).forEach(key => {
                            activeTrainLookup[key].cars.forEach(car => {
                                setOpacity(car, getObjectOpacity(car, t));
                            });
                        });
                        refreshDelayMarkers();
                        Object.keys(activeFlightLookup).forEach(key => {
                            const aircraft = activeFlightLookup[key].aircraft;
                            setOpacity(aircraft, getObjectOpacity(aircraft, t));
                        });
                    },
                    duration: 300
                });
            }
        }, {
            className: 'mapboxgl-ctrl-track mapboxgl-ctrl-track-helicopter',
            title: dict['track'],
            eventHandler(event) {
                const {classList} = this;

                if (trackingMode === 'helicopter') {
                    trackingMode = 'train';
                    classList.remove('mapboxgl-ctrl-track-helicopter');
                    classList.add('mapboxgl-ctrl-track-train');
                } else {
                    trackingMode = 'helicopter';
                    classList.remove('mapboxgl-ctrl-track-train');
                    classList.add('mapboxgl-ctrl-track-helicopter');
                }
                if (trackedObject) {
                    startViewAnimation();
                }
                event.stopPropagation();
            }
        }, {
            className: 'mapboxgl-ctrl-playback',
            title: dict['enter-playback'],
            eventHandler() {
                const me = this,
                    {classList} = me;

                isPlayback = !isPlayback;
                me.title = dict[isPlayback ? 'exit-playback' : 'enter-playback'];
                stopAll();
                markedObject = trackedObject = undefined;
                popup.remove();
                hideTimetable();
                stopViewAnimation();
                disableTracking();
                if (isPlayback) {
                    resetRailwayStatus();
                    classList.add('mapboxgl-ctrl-playback-active');
                } else {
                    classList.remove('mapboxgl-ctrl-playback-active');
                }
                isEditingTime = false;
                clock.reset();
                tempDate = undefined;
                if (lastTimetableRefresh !== clock.getTime('03:00')) {
                    loadTimetableData();
                    lastTimetableRefresh = clock.getTime('03:00');
                }
                updateClock();
                refreshStyleColors();
            }
        }, {
            className: 'mapboxgl-ctrl-weather',
            title: dict['show-weather'],
            eventHandler() {
                const me = this,
                    {classList} = me;

                isWeatherVisible = !isWeatherVisible;
                me.title = dict[isWeatherVisible ? 'hide-weather' : 'show-weather'];
                if (isWeatherVisible) {
                    classList.add('mapboxgl-ctrl-weather-active');
                    loadNowCastData();
                } else {
                    classList.remove('mapboxgl-ctrl-weather-active');
                    if (fgGroup) {
                        rainLayer.scene.remove(fgGroup.mesh);
                        // fgGroup.dispose();
                        imGroup = undefined;
                    }
                }
            }
        }]), 'top-right');

        const aboutPopup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            anchor: 'right',
            maxWidth: '300px'
        });

        map.addControl(new MapboxGLButtonControl([{
            className: 'mapboxgl-ctrl-about',
            title: dict['about'],
            eventHandler() {
                if (!aboutPopup.isOpen()) {
                    updateAboutPopup();
                    aboutPopup.addTo(map);
                } else {
                    aboutPopup.remove();
                }
            }
        }]));

        updateClock();

        const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            maxWidth: '300px',
            offset: {
                top: [0, 10],
                bottom: [0, -30]
            }
        });

        document.getElementById('timetable-header').addEventListener('click', () => {
            const {style} = document.getElementById('timetable'),
                {classList} = document.getElementById('timetable-button');

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

        if (isWindows) {
            document.getElementById('timetable-body').classList.add('windows');
        }

        map.on('mousemove', e => {
            const prevMarkedObject = markedObject;

            markedObject = trainLayers.pickObject(e.point);
            if (markedObject) {
                const {coord, altitude, object} = markedObject.userData;

                map.getCanvas().style.cursor = 'pointer';
                popup.setLngLat(adjustCoord(coord, altitude))
                    .setHTML(object.description)
                    .addTo(map);

                if (!markedObject.getObjectByName('outline')) {
                    markedObject.traverse(descendant => {
                        if (descendant.name === 'cube') {
                            descendant.add(createOutline(descendant));
                        }
                    });
                }
            } else if (popup.isOpen()) {
                map.getCanvas().style.cursor = '';
                popup.remove();
            }

            if (markedObject !== prevMarkedObject && prevMarkedObject) {
                prevMarkedObject.traverse(descendant => {
                    if (descendant.name === 'cube') {
                        descendant.remove(...descendant.children);
                    }
                });
            }
        });

        map.on('click', e => {
            stopViewAnimation();
            trackedObject = trainLayers.pickObject(e.point);
            if (trackedObject) {
                const {altitude, object} = trackedObject.userData;

                startViewAnimation();
                enableTracking();
                if (isUndergroundVisible !== (altitude < 0)) {
                    helpers.dispatchClickEvent('mapboxgl-ctrl-underground');
                }
                if (object.tt) {
                    showTimetable();
                    setTrainTimetableText(object);
                } else {
                    hideTimetable();
                }
            } else {
                disableTracking();
                hideTimetable();
            }

            // For development
            console.log(e.lngLat);
        });

        map.on('zoom', () => {
            if (trackedObject) {
                const {altitude} = trackedObject.userData;
                // Keep camera off from the tracked aircraft
                if (altitude > 0 && Math.pow(2, 22 - map.getZoom()) / altitude < .5) {
                    map.setZoom(22 - Math.log2(altitude * .5));
                }
            }

            const zoom = map.getZoom(),
                unit = Math.pow(2, 14 - helpers.clamp(zoom, 13, 19)),
                lineWidthScale = helpers.clamp(Math.pow(2, zoom - 12), .125, 1);

            helpers.setLayerProps(map, 'railways-ug-13', {lineWidthScale});
            helpers.setLayerProps(map, 'stations-ug-13', {lineWidthScale});

            layerZoom = helpers.clamp(Math.floor(zoom), 13, 18);
            objectUnit = Math.max(unit * .19, .02);
            objectScale = unit * modelScale * 100;
            // carScale = Math.max(.02 / .19 / unit, 1);
            aircraftScale = Math.max(.06 / .285 / unit, 1);

            Object.keys(activeTrainLookup).forEach(key => {
                const train = activeTrainLookup[key];

                updateTrainProps(train);
                updateTrainShape(train);
            });
            Object.keys(activeFlightLookup).forEach(key => {
                updateFlightShape(activeFlightLookup[key]);
            });
        });

        map.on('move', () => {
            if (isWeatherVisible) {
                updateEmitterQueue();
            }
            if (aboutPopup.isOpen()) {
                updateAboutPopup();
            }
        });

        map.on('resize', e => {
            trainLayers.onResize(e);
        });

        animation.init();

        animation.start({
            callback: () => {
                const now = clock.getTime();

                if (now - lastTimetableRefresh >= 86400000) {
                    loadTimetableData();
                    lastTimetableRefresh = clock.getTime('03:00');
                }
                if (Math.floor(now / 1000) !== Math.floor(lastClockRefresh / 1000)) {
                    refreshClock();
                    lastClockRefresh = now;
                }

                // Remove all trains if the page has been invisible for more than ten seconds
                if (Date.now() - lastFrameRefresh >= configs.refreshTimeout) {
                    stopAll();
                }
                lastFrameRefresh = Date.now();

                if (Math.floor((now - configs.minDelay) / configs.trainRefreshInterval) !== Math.floor(lastTrainRefresh / configs.trainRefreshInterval)) {
                    if (isPlayback) {
                        refreshTrains();
                        // refreshFlights();
                    } else {
                        loadRealtimeTrainData();
                        loadRealtimeFlightData();
                    }
                    refreshStyleColors();
                    lastTrainRefresh = now - configs.minDelay;
                }
                if (markedObject) {
                    const {coord, altitude, object} = markedObject.userData;

                    popup.setLngLat(adjustCoord(coord, altitude))
                        .setHTML(object.description);
                }
                if (trackedObject) {
                    const {altitude, object} = trackedObject.userData;

                    if (object.timetableOffsets) {
                        setTrainTimetableMark(object);
                    }

                    // Keep camera off from the tracked aircraft
                    if (altitude > 0 && Math.pow(2, 22 - map.getZoom()) / altitude < .5) {
                        map.setZoom(22 - Math.log2(altitude * .5));
                    }

                    if (!viewAnimationID) {
                        const {coord, bearing} = trackedObject.userData,
                            mapBearing = map.getBearing();

                        map.easeTo({
                            center: adjustCoord(coord, altitude),
                            bearing: trackingMode === 'helicopter' ?
                                (trackingBaseBearing + performance.now() / 100) % 360 :
                                mapBearing + ((bearing - mapBearing + 540) % 360 - 180) * .02,
                            duration: 0
                        });
                    }
                }
                if (!isPlayback && isWeatherVisible) {
                    if (now - (lastNowCastRefresh || 0) >= configs.weatherRefreshInterval) {
                        loadNowCastData();
                        lastNowCastRefresh = now;
                    }
                    refreshEmitter();
                }
            }
        });

        function updateTrainProps(train) {
            const feature = train.railwayFeature = featureLookup[`${train.r}.${layerZoom}`],
                stationOffsets = feature.properties['station-offsets'],
                {sectionIndex, sectionLength} = train,
                offset = train.offset = stationOffsets[sectionIndex];

            train.interval = stationOffsets[sectionIndex + sectionLength] - offset;
        }

        function updateTrainShape(train, t) {
            const {railwayFeature: feature, offset, interval, direction, cars, delay} = train,
                length = cars.length;
            let altitudeChanged;

            if (t !== undefined) {
                train._t = t;
            }
            if (train._t === undefined) {
                return;
            }

            if (length === 0) {
                const railway = railwayLookup[train.r],
                    {v: vehicle, tt: table} = train,
                    car = new THREE.Group();

                car.add(createCube(.88, 1.76, .88, vehicle ? trainVehicleLookup[vehicle].color : railway.color));
                car.rotation.order = 'ZYX';
                car.userData.object = train;

                cars.push(car);

                // Reset marked/tracked object if it was marked/tracked before
                if (markedObject && markedObject.userData.object === train) {
                    markedObject = cars[0];
                }
                if (trackedObject && trackedObject.userData.object === train) {
                    trackedObject = cars[0];
                    if (table) {
                        setTrainTimetableText(train);
                    }
                }
            }

            const pArr = getCoordAndBearing(feature, offset + train._t * interval, 1, objectUnit);
            for (let i = 0, ilen = cars.length; i < ilen; i++) {
                const car = cars[i],
                    {position, scale, rotation, userData} = car,
                    p = pArr[i],
                    coord = userData.coord = p.coord,
                    altitude = p.altitude,
                    mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord, altitude),
                    bearing = userData.bearing = p.bearing + (direction < 0 ? 180 : 0);

                altitudeChanged = (userData.altitude < 0 && altitude >= 0) || (userData.altitude >= 0 && altitude < 0);
                userData.altitude = altitude;

                if (isNaN(coord[0]) || isNaN(coord[1])) {
                    console.log(train);
                }

                if (animation.isActive(train.animationID)) {
                    const bounds = map.getBounds(),
                        [lng, lat] = coord,
                        {animationID} = train;

                    if (lng >= bounds.getWest() - .005 &&
                        lng <= bounds.getEast() + .005 &&
                        lat >= bounds.getSouth() - .005 &&
                        lat <= bounds.getNorth() + .005) {
                        animation.setFrameRate(animationID);
                    } else {
                        animation.setFrameRate(animationID, 1);
                    }
                }

                position.x = mCoord.x - modelOrigin.x;
                position.y = -(mCoord.y - modelOrigin.y);
                position.z = mCoord.z + objectScale / 2;
                scale.x = scale.y = scale.z = objectScale;
                rotation.x = p.pitch * direction;
                rotation.z = -bearing * DEGREE_TO_RADIAN;

                if (!car.parent) {
                    trainLayers.addObject(car, 1000);
                }
                if (altitudeChanged) {
                    trainLayers.updateObject(car, 1000);
                    if (trackedObject === car) {
                        helpers.dispatchClickEvent('mapboxgl-ctrl-underground');
                    }
                }
            }

            const delayMarker = cars[0].getObjectByName('marker');

            if (delay) {
                if (!delayMarker) {
                    cars[0].add(createDelayMarker(helpers.isDarkBackground(map)));
                }
            } else if (delayMarker) {
                cars[0].remove(delayMarker);
            }
        }

        function updateFlightShape(flight, t) {
            let {aircraft, body, wing, vTail} = flight;

            if (t !== undefined) {
                flight._t = t;
            }
            if (flight._t === undefined) {
                return;
            }
            if (!body) {
                const {color, tailcolor} = operatorLookup[flight.a];

                aircraft = flight.aircraft = new THREE.Group();
                body = flight.body = createCube(.88, 2.64, .88, color || '#FFFFFF');
                wing = flight.wing = createCube(2.64, .88, .1, color || '#FFFFFF');
                vTail = flight.vTail = createCube(.1, .88, .88, tailcolor || '#FFFFFF');
                vTail.geometry.translate(0, -.88, .88);
                vTail.geometry.userData.translate = {x: 0, y: -.88, z: .88};
                aircraft.add(body, wing, vTail);
                aircraft.rotation.order = 'ZYX';
                aircraft.userData.object = flight;

                trainLayers.addObject(aircraft, 1000);
            }

            const {position, scale, rotation} = aircraft,
                p = getCoordAndBearing(flight.feature, flight._t * flight.feature.properties.length, 1, 0)[0],
                coord = aircraft.userData.coord = p.coord,
                altitude = aircraft.userData.altitude = p.altitude,
                mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord, altitude),
                bearing = aircraft.userData.bearing = p.bearing;

            if (animation.isActive(flight.animationID)) {
                const bounds = map.getBounds(),
                    [lng, lat] = coord,
                    {animationID} = flight;

                if (lng >= bounds.getWest() - .005 &&
                    lng <= bounds.getEast() + .005 &&
                    lat >= bounds.getSouth() - .005 &&
                    lat <= bounds.getNorth() + .005) {
                    animation.setFrameRate(animationID);
                } else {
                    animation.setFrameRate(animationID, 1);
                }
            }

            position.x = mCoord.x - modelOrigin.x;
            position.y = -(mCoord.y - modelOrigin.y);
            position.z = mCoord.z + objectScale / 2;
            scale.x = scale.y = scale.z = objectScale;
            rotation.x = p.pitch;
            rotation.z = -bearing * DEGREE_TO_RADIAN;

            body.scale.y = wing.scale.x = vTail.scale.y = aircraftScale;
        }

        function refreshTrains() {
            const now = clock.getTime();

            timetableRefData.forEach(train => {
                const delay = train.delay || 0;

                if (train.start + delay <= now && now <= train.end + delay &&
                    !checkActiveTrains(train, true) &&
                    (!railwayLookup[train.r].status || realtimeTrainLookup[train.t])) {
                    trainStart(train);
                }
            });
        }

        function trainStart(train, index) {
            const now = clock.getTime();

            if (!setSectionData(train, index)) {
                return; // Out of range
            }
            activeTrainLookup[train.t] = train;
            train.cars = [];
            updateTrainProps(train);

            const departureTime = clock.getTime(train.departureTime) + (train.delay || 0);

            if (!train.tt && train.sectionLength !== 0) {
                trainRepeat(train);
            } else if (train.tt && now >= departureTime) {
                trainRepeat(train, now - departureTime);
            } else {
                trainStand(train);
            }
        }

        function trainStand(train, final) {
            const departureTime = clock.getTime(train.departureTime) + (train.delay || 0);

            if (!train.tt) {
                final = !setSectionData(train, undefined, !realtimeTrainLookup[train.t]);
            }

            if (!final) {
                updateTrainProps(train);
                updateTrainShape(train, 0);
            }

            if (!train.tt && train.sectionLength !== 0) {
                trainRepeat(train);
            } else {
                setTrainStandingStatus(train, true);
                train.animationID = animation.start({
                    complete: () => {
                        if (final) {
                            stopTrain(train);
                        } else if (train.tt) {
                            trainRepeat(train, clock.speed === 1 ? undefined : clock.getTime() - departureTime);
                        } else {
                            trainStand(train);
                        }
                    },
                    duration: train.tt ?
                        Math.max(departureTime - clock.getTime(), clock.speed === 1 ? configs.minStandingDuration : 0) :
                        final ? configs.minStandingDuration : configs.realtimeTrainCheckInterval,
                    clock
                });
            }
        }

        function trainRepeat(train, elapsed) {
            const delay = train.delay || 0,
                {arrivalTime, nextDepartureTime} = train;
            let minDuration, maxDuration;

            if (nextDepartureTime) {
                maxDuration = clock.getTime(nextDepartureTime) + delay - clock.getTime() + (elapsed || 0) - configs.minDelay + 60000 - configs.minStandingDuration;
            }
            if (arrivalTime) {
                minDuration = clock.getTime(arrivalTime) + delay - clock.getTime() + (elapsed || 0) - configs.minDelay;
                if (!(maxDuration < minDuration + 60000)) {
                    maxDuration = minDuration + 60000;
                }
            }
            setTrainStandingStatus(train, false);
            train.animationID = startTrainAnimation(t => {
                // Guard for an unexpected error
                // Probably a bug due to duplicate train IDs in timetable lookup
                if (!train.cars) {
                    stopTrain(train);
                    return;
                }

                updateTrainShape(train, t);
            }, () => {
                // Guard for an unexpected error
                // Probably a bug due to duplicate train IDs in timetable lookup
                if (!train.cars || train.tt && train.timetableIndex + 1 >= train.tt.length) {
                    stopTrain(train);
                    return;
                }

                if (!setSectionData(train, train.timetableIndex + 1)) {
                    const markedObjectIndex = train.cars.indexOf(markedObject),
                        trackedObjectIndex = train.cars.indexOf(trackedObject),
                        {nextTrains} = train;

                    if (nextTrains) {
                        stopTrain(train, true);
                        train = nextTrains[0];
                        if (!activeTrainLookup[train.t]) {
                            trainStart(train, 0);
                        }
                        if (train.cars) {
                            updateTrainShape(train, 0);
                            if (markedObjectIndex !== -1) {
                                markedObject = train.cars[markedObjectIndex];
                            }
                            if (trackedObjectIndex !== -1) {
                                trackedObject = train.cars[trackedObjectIndex];
                                setTrainTimetableText(train);
                            }
                        }
                        return;
                    }
                    trainStand(train, true);
                } else {
                    trainStand(train);
                }
            }, Math.abs(train.interval), minDuration, maxDuration, elapsed);
        }

        function refreshFlights() {
            const now = clock.getTime();

            Object.keys(flightLookup).forEach(key => {
                const flight = flightLookup[key];

                if (flight.standing <= now && now <= flight.end && !activeFlightLookup[flight.id]) {
                    activeFlightLookup[flight.id] = flight;
                    if (now >= flight.start) {
                        flightRepeat(flight, now - flight.start);
                    } else {
                        updateFlightShape(flight, 0);
                        setFlightStandingStatus(flight, true);
                        flight.animationID = animation.start({
                            complete: () => {
                                flightRepeat(flight);
                            },
                            duration: flight.start - now
                        });
                    }
                }
            });
        }

        function flightRepeat(flight, elapsed) {
            setFlightStandingStatus(flight, false);
            flight.animationID = startFlightAnimation(t => {
                updateFlightShape(flight, t);
            }, () => {
                setFlightStandingStatus(flight, true);
                flight.animationID = animation.start({
                    complete: () => stopFlight(flight),
                    duration: Math.max(flight.end - clock.getTime(), 0)
                });
            }, flight.feature.properties.length, flight.maxSpeed, flight.acceleration, elapsed);
        }

        function startViewAnimation() {
            let t2 = 0;

            trackingBaseBearing = map.getBearing() - performance.now() / 100;
            viewAnimationID = animation.start({
                callback: (elapsed, duration) => {
                    const t1 = easeOutQuart(elapsed / duration),
                        factor = (1 - t1) / (1 - t2),
                        {coord, altitude, bearing} = trackedObject.userData,
                        [lng, lat] = adjustCoord(coord, altitude),
                        center = map.getCenter();

                    map.easeTo({
                        center: [lng - (lng - center.lng) * factor, lat - (lat - center.lat) * factor],
                        bearing: trackingMode === 'helicopter' ?
                            (trackingBaseBearing + performance.now() / 100) % 360 :
                            bearing - ((bearing - map.getBearing() + 540) % 360 - 180) * factor,
                        duration: 0
                    });
                    t2 = t1;
                },
                complete: () => {
                    viewAnimationID = undefined;
                },
                duration: 1000
            });
        }

        function stopViewAnimation() {
            if (viewAnimationID) {
                animation.stop(viewAnimationID);
                viewAnimationID = undefined;
            }
        }

        function adjustCoord(coord, altitude) {
            if (!altitude) {
                return coord;
            }

            const {transform} = map,
                mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord, altitude),
                pos = new THREE.Vector3(
                    mCoord.x - modelOrigin.x,
                    -(mCoord.y - modelOrigin.y),
                    mCoord.z
                ).project(trainLayers.ug.camera),
                world = map.unproject([
                    (pos.x + 1) / 2 * transform.width,
                    (1 - pos.y) / 2 * transform.height
                ]);

            return [world.lng, world.lat];
        }

        function getLocalizedRailwayTitle(railway) {
            const title = (railwayLookup[railway] || {}).title || {};
            return title[lang] || title['en'];
        }

        function getLocalizedRailDirectionTitle(direction) {
            const title = (railDirectionLookup[direction] || {}).title || {};
            return title[lang] || title['en'];
        }

        function getLocalizedTrainTypeTitle(type) {
            const title = (trainTypeLookup[type] || {}).title || {};
            return title[lang] || title['en'];
        }

        function getLocalizedStationTitle(array) {
            const stations = Array.isArray(array) ? array : [array];

            return stations.map(station => {
                const title = (stationLookup[station] || {}).title || {};
                return title[lang] || title['en'];
            }).join(dict['and']);
        }

        function getLocalizedOperatorTitle(operator) {
            const title = (operatorLookup[operator] || {}).title || {};
            return title[lang] || title['en'];
        }

        function getLocalizedAirportTitle(airport) {
            const title = (airportLookup[airport] || {}).title || {};
            return title[lang] || title['en'];
        }

        function getLocalizedFlightStatusTitle(status) {
            const title = (flightStatusLookup[status] || {}).title || {};
            return title[lang] || title['en'];
        }

        function setTrainStandingStatus(train, standing) {
            const {r: railwayID, nm: name, v: vehicle, ds: destination, departureTime, arrivalStation} = train,
                railway = railwayLookup[railwayID],
                color = vehicle ? trainVehicleLookup[vehicle].color : railway.color,
                delay = train.delay || 0,
                arrivalTime = train.arrivalTime || train.nextDepartureTime,
                {status, text} = railway;

            train.standing = standing;
            train.description = [
                '<div class="desc-header">',
                Array.isArray(color) ? [
                    '<div>',
                    ...color.slice(0, 3).map(c => `<div class="line-strip" style="background-color: ${c};"></div>`),
                    '</div>'
                ].join('') : `<div style="background-color: ${color};"></div>`,
                '<div><strong>',
                name ? name[0][lang] : getLocalizedRailwayTitle(railwayID),
                '</strong>',
                `<br> ${getLocalizedTrainTypeTitle(train.y)} `,
                destination ?
                    dict['for'].replace('$1', getLocalizedStationTitle(destination)) :
                    getLocalizedRailDirectionTitle(train.d),
                '</div></div>',
                `<strong>${dict['train-number']}:</strong> ${train.n}`,
                !train.tt ? ` <span class="desc-caution">${dict['special']}</span>` : '',
                '<br>',
                delay >= 60000 ? '<span class="desc-caution">' : '',
                '<strong>',
                dict[standing ? 'standing-at' : 'previous-stop'],
                ':</strong> ',
                getLocalizedStationTitle(train.departureStation),
                departureTime ? ` ${clock.getTimeString(clock.getTime(departureTime), delay)}` : '',
                arrivalStation ? [
                    `<br><strong>${dict['next-stop']}:</strong> `,
                    getLocalizedStationTitle(arrivalStation),
                    arrivalTime ? ` ${clock.getTimeString(clock.getTime(arrivalTime) + delay)}` : ''
                ].join('') : '',
                delay >= 60000 ? `<br>${dict['delay'].replace('$1', Math.floor(delay / 60000))}</span>` : '',
                status && lang === 'ja' ? `<br><span class="desc-caution"><strong>${status}:</strong> ${text}</span>` : ''
            ].join('');
        }

        function setFlightStandingStatus(flight) {
            const {a: airlineID, n: flightNumber, ds: destination, or: origin} = flight,
                tailcolor = operatorLookup[airlineID].tailcolor || '#FFFFFF',
                scheduledTime = flight.sdt || flight.sat,
                estimatedTime = flight.edt || flight.eat,
                actualTime = flight.adt || flight.aat,
                delayed = (estimatedTime || actualTime) && scheduledTime !== (estimatedTime || actualTime);

            flight.description = [
                '<div class="desc-header">',
                `<div style="background-color: ${tailcolor};"></div>`,
                `<div><strong>${getLocalizedOperatorTitle(airlineID)}</strong>`,
                `<br>${flightNumber[0]} `,
                dict[destination ? 'to' : 'from'].replace('$1', getLocalizedAirportTitle(destination || origin)),
                '</div></div>',
                `<strong>${dict['status']}:</strong> ${getLocalizedFlightStatusTitle(flight.s)}`,
                '<br><strong>',
                dict[destination ? 'scheduled-departure-time' : 'scheduled-arrival-time'],
                `:</strong> ${scheduledTime}`,
                delayed ? '<span class="desc-caution">' : '',
                estimatedTime ? [
                    '<br><strong>',
                    dict[destination ? 'estimated-departure-time' : 'estimated-arrival-time'],
                    `:</strong> ${estimatedTime}`
                ].join('') : actualTime ? [
                    '<br><strong>',
                    dict[destination ? 'actual-departure-time' : 'actual-arrival-time'],
                    `:</strong> ${actualTime}`
                ].join('') : '',
                delayed ? '</span>' : '',
                flightNumber.length > 1 ? `<br><strong>${dict['code-share']}:</strong> ${flightNumber.slice(1).join(' ')}` : ''
            ].join('');
        }

        function setTrainTimetableText(train) {
            const contentElement = document.getElementById('timetable-content'),
                trains = [],
                sections = [],
                stations = [],
                offsets = [],
                {r: railwayID, nm: name, v: vehicle, ds: destination, nextTrains} = train,
                railway = railwayLookup[railwayID],
                color = vehicle ? trainVehicleLookup[vehicle].color : railway.color,
                delay = train.delay || 0;
            let currSection;

            document.getElementById('timetable-header').innerHTML = [
                '<div class="desc-header">',
                Array.isArray(color) ? [
                    '<div>',
                    ...color.slice(0, 3).map(c => `<div class="line-strip-long" style="background-color: ${c};"></div>`),
                    '</div>'
                ].join('') : `<div style="background-color: ${color};"></div>`,
                '<div><strong>',
                name ? name[0][lang] : getLocalizedRailwayTitle(railwayID),
                '</strong>',
                `<br>${getLocalizedTrainTypeTitle(train.y)} `,
                destination ?
                    dict['for'].replace('$1', getLocalizedStationTitle(destination)) :
                    getLocalizedRailDirectionTitle(train.d),
                '</div></div>'
            ].join('');

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
                            `<div class="station-title-box">${getLocalizedStationTitle(s.s)}</div>`,
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
                section.color = railwayLookup[curr.r].color;
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
            document.getElementById('railway-mark').innerHTML = sections.map(({color, start, end}) =>
                `<line stroke="${color}" stroke-width="10" x1="12" y1="${offsets[start]}" x2="12" y2="${offsets[end]}" stroke-linecap="round" />`
            ).concat(offsets.map(offset =>
                `<circle cx="12" cy="${offset}" r="3" fill="#ffffff" />`
            )).join('');
            train.timetableOffsets = offsets.slice(currSection.start, currSection.end + 1);
            train.scrollTop = document.getElementById('timetable-body').scrollTop;
        }

        function setTrainTimetableMark(train) {
            const bodyElement = document.getElementById('timetable-body'),
                {height} = bodyElement.getBoundingClientRect(),
                {timetableOffsets: offsets, timetableIndex: index} = train,
                curr = offsets[index],
                next = train.arrivalStation ? offsets[index + 1] : curr,
                y = curr + (next - curr) * train._t,
                p = performance.now() % 1500 / 1500;

            document.getElementById('train-mark').innerHTML =
                `<circle cx="22" cy="${y + 10}" r="${7 + p * 15}" fill="#ffffff" opacity="${1 - p}" />` +
                `<circle cx="22" cy="${y + 10}" r="7" fill="#ffffff" />`;
            if (bodyElement.scrollTop === train.scrollTop) {
                bodyElement.scrollTop = y - height / 2 + 4;
                train.scrollTop = bodyElement.scrollTop;
            } else {
                delete train.scrollTop;
            }
        }

        /**
          * Check if any of connecting trains is active
          * @param {object} train - train to check
          * @returns {boolean} True if any of connecting trains is active
         */
        function checkActiveTrains(train) {
            function check(curr, prop) {
                if (activeTrainLookup[curr.t]) {
                    return true;
                }

                const trains = curr[prop];

                if (trains) {
                    for (let i = 0, ilen = trains.length; i < ilen; i++) {
                        if (check(trains[i], prop)) {
                            return true;
                        }
                    }
                }
                return false;
            }

            return check(train, 'previousTrains') || check(train, 'nextTrains');
        }

        function stopTrain(train, keep) {
            const {cars, animationID, t, tt} = train;

            animation.stop(animationID);
            if (cars) {
                cars.forEach(car => {
                    trainLayers.removeObject(car, 1000);
                    if (car === markedObject && !keep) {
                        markedObject = undefined;
                        popup.remove();
                    }
                    if (car === trackedObject && !keep) {
                        trackedObject = undefined;
                        hideTimetable();
                    }
                });
            }
            delete train.cars;
            delete activeTrainLookup[t];
            delete train.delay;
            if (!tt) {
                delete timetableRefData.splice(timetableRefData.indexOf(train), 1);
            }
        }

        function stopFlight(flight) {
            const {id, animationID, aircraft} = flight;

            animation.stop(animationID);
            trainLayers.removeObject(aircraft, 1000);
            if (aircraft === markedObject) {
                markedObject = undefined;
                popup.remove();
            }
            if (aircraft === trackedObject) {
                trackedObject = undefined;
            }
            delete flight.aircraft;
            delete flight.body;
            delete flight.wing;
            delete flight.vTail;
            delete activeFlightLookup[id];
        }

        function stopAll() {
            Object.keys(activeTrainLookup).forEach(key =>
                stopTrain(activeTrainLookup[key])
            );
            Object.keys(activeFlightLookup).forEach(key =>
                stopFlight(activeFlightLookup[key])
            );
            realtimeTrainLookup = {};
            lastTrainRefresh = undefined;
        }

        function resetRailwayStatus() {
            railwayRefData.forEach(railway => {
                delete railway.status;
                delete railway.text;
            });
        }

        function adjustTrainID(id, type) {
            if (helpers.includes(TRAINTYPES_FOR_SOBURAPID, type)) {
                return id.replace(/JR-East\.(NaritaAirportBranch|Narita|Sobu)/, RAILWAY_SOBURAPID);
            }
            return id;
        }

        function loadTimetableData() {
            helpers.loadJSON(`data/${getTimetableFileName()}`).then(data => {
                timetableRefData = data;
                updateTimetableRefData(timetableRefData);
                trainLookup = helpers.buildLookup(timetableRefData, 't');
                lastTrainRefresh = undefined;
            });
        }

        function loadRealtimeTrainData() {
            const operators1 = OPERATORS_FOR_TRAININFORMATION
                    .map(operator => `odpt.Operator:${operator}`)
                    .join(','),
                operators2 = OPERATORS_FOR_TRAINS
                    .map(operator => `odpt.Operator:${operator}`)
                    .join(',');

            Promise.all([
                helpers.loadJSON(`${configs.apiURL}odpt:TrainInformation?odpt:operator=${operators1}&acl:consumerKey=${e.odpt}`),
                helpers.loadJSON(`${configs.apiURL}odpt:Train?odpt:operator=${operators2}&acl:consumerKey=${e.odpt}`)
            ]).then(([trainInfoRefData, trainRefData]) => {
                realtimeTrainLookup = {};

                trainRefData.forEach(trainRef => {
                    const delay = trainRef['odpt:delay'] * 1000,
                        carComposition = trainRef['odpt:carComposition'],
                        trainType = helpers.removePrefix(trainRef['odpt:trainType']),
                        origin = helpers.removePrefix(trainRef['odpt:originStation']),
                        destination = helpers.removePrefix(trainRef['odpt:destinationStation']),
                        id = adjustTrainID(helpers.removePrefix(trainRef['owl:sameAs'])),
                        toStation = helpers.removePrefix(trainRef['odpt:toStation']),
                        fromStation = helpers.removePrefix(trainRef['odpt:fromStation']);
                    // Retry lookup replacing Marunouchi line with MarunouchiBranch line
                    let train = trainLookup[id] || trainLookup[id.replace('.Marunouchi.', '.MarunouchiBranch.')];
                    let changed = false;

                    if (train) {
                        realtimeTrainLookup[id] = train;
                        if (delay && train.delay !== delay) {
                            train.delay = delay;
                            changed = true;
                        }
                        if (carComposition && train.carComposition !== carComposition) {
                            train.carComposition = carComposition;
                            changed = true;
                        }
                        if (trainType && train.y !== trainType) {
                            train.y = trainType;
                            changed = true;
                        }
                        if (truncateTrainTimetable(train, origin, destination)) {
                            changed = true;
                        }
                        if (!train.tt) {
                            train.ts = toStation;
                            train.fs = fromStation;
                        }
                        if (changed && activeTrainLookup[id]) {
                            stopTrain(train, true);
                        }
                    } else {
                        const railwayID = helpers.removePrefix(trainRef['odpt:railway']);

                        // Exclude Namboku line trains that connect to/from Mita line
                        if (railwayID === RAILWAY_NAMBOKU && (origin[0].startsWith(RAILWAY_MITA) || destination[0].startsWith(RAILWAY_MITA))) {
                            return;
                        }

                        const railwayRef = railwayLookup[railwayID],
                            direction = helpers.removePrefix(trainRef['odpt:railDirection']);

                        if (railwayRef.color) {
                            train = {
                                t: id,
                                id: `${id}.Today`,
                                r: railwayID,
                                y: trainType,
                                n: trainRef['odpt:trainNumber'],
                                os: origin,
                                d: direction,
                                ds: destination,
                                ts: toStation,
                                fs: fromStation,
                                start: Date.now(),
                                end: Date.now() + 86400000,
                                delay,
                                direction: direction === railwayRef.ascending ? 1 : -1,
                                altitude: railwayRef.altitude,
                                carComposition: carComposition || railwayRef.carComposition
                            };
                            timetableRefData.push(train);
                            realtimeTrainLookup[id] = trainLookup[id] = train;
                        }
                    }
                    lastDynamicUpdate[helpers.removePrefix(trainRef['odpt:operator'])] = trainRef['dc:date'].replace(/([\d\-])T([\d:]+).*/, '$1 $2');
                });

                resetRailwayStatus();

                trainInfoRefData.forEach(trainInfoRef => {
                    const operatorID = helpers.removePrefix(trainInfoRef['odpt:operator']),
                        railwayID = helpers.removePrefix(trainInfoRef['odpt:railway']),
                        status = trainInfoRef['odpt:trainInformationStatus'],
                        text = trainInfoRef['odpt:trainInformationText'];

                    // Train information text is provided in Japanese only
                    if (railwayID && status && status.ja &&
                        helpers.includes(OPERATORS_FOR_TRAINS, operatorID) &&
                        status.ja.match(/見合わせ|折返し運転|運休|遅延/)) {
                        const railway = railwayLookup[railwayID];

                        railway.status = status.ja;
                        railway.text = text.ja;
                        Object.keys(activeTrainLookup).forEach(key => {
                            const train = activeTrainLookup[key];
                            if (train.r === railwayID && !realtimeTrainLookup[train.t]) {
                                stopTrain(train);
                            }
                        });
                    }
                });

                refreshTrains();
                refreshDelayMarkers();
                updateAboutPopup();
            }).catch(error => {
                refreshTrains();
                console.log(error);
            });
        }

        function loadRealtimeFlightData() {
            const operators = OPERATORS_FOR_FLIGHTINFORMATION
                .map(operator => `odpt.Operator:${operator}`)
                .join(',');

            Promise.all([
                helpers.loadJSON(configs.atisURL)
            ].concat(['Arrival', 'Departure'].map(type =>
                helpers.loadJSON(`${configs.apiURL}odpt:FlightInformation${type}?odpt:operator=${operators}&acl:consumerKey=${e.odpt}`)
            ))).then(([atisData, arrivalData, departureData]) => {
                const {landing, departure} = atisData,
                    pattern = [landing.join('/'), departure.join('/')].join(' '),
                    flightQueue = {};
                let arrRoutes = {},
                    depRoutes = {},
                    north = true;

                if (flightPattern !== pattern) {
                    flightPattern = pattern;
                    lastFlightPatternChanged = Date.now();
                    Object.keys(activeFlightLookup).forEach(key => {
                        stopFlight(activeFlightLookup[key]);
                    });
                }

                if (helpers.includes(landing, ['L22', 'L23'])) { // South wind, good weather
                    arrRoutes = {S: 'L23', N: 'L22'};
                    depRoutes = {S: '16R', N: '16L'};
                    north = false;
                } else if (helpers.includes(landing, ['I22', 'I23'])) { // South wind, bad weather
                    arrRoutes = {S: 'I23', N: 'I22'};
                    depRoutes = {S: '16R', N: '16L'};
                    north = false;
                } else if (helpers.includes(landing, ['I34L', 'H34R'])) { // North wind, good weather
                    arrRoutes = {S: 'IX34L', N: 'H34R'};
                    depRoutes = {S: '05', N: '34R'};
                    north = true;
                } else if (helpers.includes(landing, ['I34L', 'I34R'])) { // North wind, bad weather
                    arrRoutes = {S: 'IZ34L', N: 'H34R'};
                    depRoutes = {S: '05', N: '34R'};
                    north = true;
                } else if (landing.length !== 1) {
                    console.log(`Unexpected RWY: ${landing}`);
                } else { // Midnight
                    if (helpers.includes(landing, 'I23')) {
                        arrRoutes = {S: 'IY23', N: 'IY23'};
                        north = false;
                    } else if (helpers.includes(landing, 'L23')) {
                        arrRoutes = {S: 'LY23', N: 'LY23'};
                        north = false;
                    } else if (helpers.includes(landing, 'I34L')) {
                        arrRoutes = {S: 'IX34L', N: 'IX34L'};
                        north = true;
                    } else if (helpers.includes(landing, 'I34R')) {
                        arrRoutes = {S: 'IY34R', N: 'IY34R'};
                        north = true;
                    } else {
                        console.log(`Unexpected LDG RWY: ${landing[0]}`);
                    }
                    if (helpers.includes(departure, '16L')) {
                        depRoutes = {S: 'N16L', N: 'N16L'};
                    } else if (helpers.includes(departure, '05')) {
                        depRoutes = {S: 'N05', N: 'N05'};
                    } else {
                        console.log(`Unexpected DEP RWY: ${departure[0]}`);
                    }
                }

                arrivalData.concat(departureData).forEach(flightRef => {
                    const id = helpers.removePrefix(flightRef['owl:sameAs']);
                    let flight = flightLookup[id],
                        status = helpers.removePrefix(flightRef['odpt:flightStatus']),
                        {maxFlightSpeed: maxSpeed, flightAcceleration: acceleration} = configs;

                    if (!flight) {
                        if (status === 'Cancelled') {
                            return;
                        }
                        const departureAirport = helpers.removePrefix(flightRef['odpt:departureAirport']),
                            arrivalAirport = helpers.removePrefix(flightRef['odpt:arrivalAirport']),
                            destinationAirport = helpers.removePrefix(flightRef['odpt:destinationAirport']),
                            originAirport = helpers.removePrefix(flightRef['odpt:originAirport']),
                            airport = airportLookup[destinationAirport || originAirport],
                            direction = airport ? airport.direction : 'S',
                            route = departureAirport === 'NRT' ? `NRT.${north ? '34L' : '16R'}.Dep` :
                            arrivalAirport === 'NRT' ? `NRT.${north ? '34R' : '16L'}.Arr` :
                            departureAirport === 'HND' ? `HND.${depRoutes[direction]}.Dep` :
                            arrivalAirport === 'HND' ? `HND.${arrRoutes[direction]}.Arr` : undefined,
                            feature = featureLookup[route];

                        if (feature) {
                            flight = flightLookup[id] = {
                                id,
                                n: flightRef['odpt:flightNumber'],
                                a: helpers.removePrefix(flightRef['odpt:airline']),
                                dp: departureAirport,
                                ar: arrivalAirport,
                                ds: destinationAirport,
                                or: originAirport,
                                runway: route.replace(/^([^.]+\.)[A-Z]*([^.]+).+/, '$1$2'),
                                feature
                            };
                        } else {
                            return;
                        }
                    }
                    Object.assign(flight, {
                        edt: flightRef['odpt:estimatedDepartureTime'],
                        adt: flightRef['odpt:actualDepartureTime'],
                        sdt: flightRef['odpt:scheduledDepartureTime'],
                        eat: flightRef['odpt:estimatedArrivalTime'],
                        aat: flightRef['odpt:actualArrivalTime'],
                        sat: flightRef['odpt:scheduledArrivalTime']
                    });

                    const departureTime = flight.edt || flight.adt || flight.sdt,
                        arrivalTime = flight.eat || flight.aat || flight.sat;

                    if (!status) {
                        if (arrivalTime < flight.sat) {
                            status = 'NewTime';
                        } else if (arrivalTime > flight.sat) {
                            status = 'Delayed';
                        } else if (arrivalTime === flight.sat) {
                            status = 'OnTime';
                        }
                    } else if (status === 'CheckIn' || status === 'NowBoarding' || status === 'BoardingComplete' || status === 'Departed') {
                        if (departureTime < flight.sdt) {
                            status = 'NewTime';
                        } else if (departureTime > flight.sdt) {
                            status = 'Delayed';
                        } else if (departureTime === flight.sdt) {
                            status = 'OnTime';
                        }
                    }
                    flight.s = status;

                    if (arrivalTime) {
                        maxSpeed /= 2;
                        acceleration /= -2;
                    }

                    const duration = maxSpeed / Math.abs(acceleration) / 2 + flight.feature.properties.length / maxSpeed,
                        standingDuration = configs.standingDuration;

                    if (departureTime) {
                        flight.start = flight.base = clock.getTime(departureTime);
                        flight.standing = flight.start - standingDuration;
                        flight.end = flight.start + duration;
                    } else {
                        flight.start = flight.standing = clock.getTime(arrivalTime) - duration;
                        flight.base = flight.start + duration - standingDuration;
                        flight.end = flight.start + duration + standingDuration;
                    }
                    flight.maxSpeed = maxSpeed;
                    flight.acceleration = acceleration;

                    if (flight.base < lastFlightPatternChanged) {
                        return;
                    }

                    const queue = flightQueue[flight.runway] = flightQueue[flight.runway] || [];
                    queue.push(flight);

                    lastDynamicUpdate[helpers.removePrefix(flightRef['odpt:operator'])] = flightRef['dc:date'].replace(/([\d\-])T([\d:]+).*/, '$1 $2');
                });

                Object.keys(flightQueue).forEach(key => {
                    const queue = flightQueue[key];
                    let latest = 0;

                    queue.sort((a, b) => a.base - b.base);
                    queue.forEach(flight => {
                        const delay = Math.max(flight.base, latest + configs.minFlightInterval) - flight.base;

                        if (delay) {
                            flight.start += delay;
                            flight.base += delay;
                            flight.standing += delay;
                            flight.end += delay;
                        }
                        latest = flight.base;
                    });
                });

                refreshFlights();
            }).catch(error => {
                refreshFlights();
                console.log(error);
            });
        }

        function loadNowCastData() {
            helpers.loadJSON(configs.nowcastsURL).then(data => {
                nowCastData = data;
                emitterBounds = {};
                updateEmitterQueue();
            });
        }

        function updateEmitterQueue() {
            const bounds = map.getBounds(),
                ne = mapboxgl.MercatorCoordinate.fromLngLat(bounds.getNorthEast()),
                sw = mapboxgl.MercatorCoordinate.fromLngLat(bounds.getSouthWest()),
                resolution = helpers.clamp(Math.pow(2, Math.floor(17 - map.getZoom())), 0, 1) * 1088,
                currBounds = {
                    left: Math.floor(helpers.clamp((sw.x - modelOrigin.x) / modelScale + 50000, 0, 108800) / resolution) * resolution,
                    right: Math.ceil(helpers.clamp((ne.x - modelOrigin.x) / modelScale + 50000, 0, 108800) / resolution) * resolution,
                    top: Math.floor(helpers.clamp((ne.y - modelOrigin.y) / modelScale + 42500 + 0, 0, 78336) / resolution) * resolution,
                    bottom: Math.ceil(helpers.clamp((sw.y - modelOrigin.y) / modelScale + 42500 + 0, 0, 78336) / resolution) * resolution
                };

            if (currBounds.left !== emitterBounds.left ||
                currBounds.right !== emitterBounds.right ||
                currBounds.top !== emitterBounds.top ||
                currBounds.bottom !== emitterBounds.bottom) {
                bgGroup = new SPE.Group({
                    texture: {
                        value: rainTexture
                    },
                    blending: THREE.NormalBlending,
                    transparent: true,
                    maxParticleCount: 500000
                });
                emitterQueue = [];
                for (let y = currBounds.top; y < currBounds.bottom; y += resolution) {
                    for (let x = currBounds.left; x < currBounds.right; x += resolution) {
                        emitterQueue.push({
                            index: {
                                x: Math.floor(x / 1088),
                                y: Math.floor(y / 1088)
                            },
                            rect: {
                                x,
                                y,
                                w: resolution,
                                h: resolution
                            }
                        });
                    }
                }
            }
            emitterBounds = currBounds;
        }

        function refreshEmitter() {
            if (bgGroup) {
                const zoom = map.getZoom(),
                    n = zoom >= 17 ? 20 : helpers.clamp(Math.floor(Math.pow(3, zoom - 13)), 3, 10000000),
                    h = helpers.clamp(Math.pow(2, 14 - zoom), 0, 1) * 1000,
                    v = helpers.clamp(Math.pow(1.7, 14 - zoom), 0, 1) * 2000,
                    s = helpers.clamp(Math.pow(1.2, zoom - 14.5) * map.transform.cameraToCenterDistance / 800, 0, 1);
                let emitterCount = 30;

                while (emitterCount > 0) {
                    const e = emitterQueue.shift();

                    if (!e) {
                        imGroup = bgGroup;
                        bgGroup = undefined;
                        setTimeout(finalizeEmitterRefresh, 500);
                        break;
                    }
                    if (!nowCastData || !nowCastData[e.index.y][e.index.x]) {
                        continue;
                    }
                    bgGroup.addEmitter(new SPE.Emitter({
                        maxAge: {
                            value: h / v
                        },
                        position: {
                            value: new THREE.Vector3((e.rect.x - 50000 + e.rect.w / 2) * modelScale, (42500 - e.rect.h / 2 - e.rect.y) * modelScale, h * modelScale),
                            spread: new THREE.Vector3(e.rect.w * modelScale, e.rect.h * modelScale, 0)
                        },
                        acceleration: {
                            value: new THREE.Vector3(0, 0, 0),
                            spread: new THREE.Vector3(v / 20 * modelScale, 0, 0)
                        },
                        velocity: {
                            value: new THREE.Vector3(0, 0, -v * modelScale),
                            spread: new THREE.Vector3(v / 200 * modelScale, v / 200 * modelScale)
                        },
                        color: {
                            value: new THREE.Color('blue')
                        },
                        size: {
                            value: 1e-6 / modelScale * s
                        },
                        particleCount: Math.pow(nowCastData[e.index.y][e.index.x], 2) * n
                    }));
                    emitterCount--;
                }
            }
            if (fgGroup) {
                fgGroup.tick();
            }
            if (imGroup) {
                imGroup.tick();
            }
        }

        function finalizeEmitterRefresh() {
            if (imGroup) {
                if (fgGroup) {
                    rainLayer.scene.remove(fgGroup.mesh);
                    // fgGroup.dispose();
                }
                fgGroup = imGroup;
                imGroup = undefined;
                rainLayer.scene.add(fgGroup.mesh);
            }
        }

        function refreshStyleColors() {
            styleColors.forEach(item => {
                const {id, key, stops} = item;

                if (id === 'background' && isUndergroundVisible) {
                    map.setPaintProperty(id, key, 'rgb(16,16,16)');
                } else if (stops === undefined) {
                    map.setPaintProperty(id, key, getStyleColorString(item));
                } else {
                    const prop = map.getPaintProperty(id, key);

                    prop.stops[stops][1] = getStyleColorString(item);
                    map.setPaintProperty(id, key, prop);
                }
            });
        }

        function refreshDelayMarkers() {
            const dark = helpers.isDarkBackground(map),
                base = dark ? 0 : 1,
                blending = dark ? THREE.AdditiveBlending : THREE.MultiplyBlending;

            Object.keys(activeTrainLookup).forEach(key => {
                const car = activeTrainLookup[key].cars[0],
                    delayMarker = car && car.getObjectByName('marker');

                if (delayMarker) {
                    const {material} = delayMarker;

                    material.uniforms.base.value = base;
                    material.blending = blending;
                }
            });
        }

        const dateComponents = [
            {id: 'year', fn: 'FullYear', digits: 4, extra: 0},
            {id: 'month', fn: 'Month', digits: 2, extra: 1},
            {id: 'day', fn: 'Date', digits: 2, extra: 0},
            {id: 'hour', fn: 'Hours', digits: 2, extra: 0},
            {id: 'minute', fn: 'Minutes', digits: 2, extra: 0},
            {id: 'second', fn: 'Seconds', digits: 2, extra: 0}
        ];

        function refreshClock() {
            let date = clock.getJSTDate(),
                dateString = date.toLocaleDateString(lang, DATE_FORMAT);

            if (lang === 'ja' && JapaneseHolidays.isHoliday(date)) {
                dateString = dateString.replace(/\(.+\)/, '(祝)');
            }
            if (!isEditingTime) {
                document.getElementById('date').innerHTML = dateString;
                document.getElementById('time').innerHTML = date.toLocaleTimeString(lang);
            } else {
                if (tempDate) {
                    date = tempDate;
                    dateComponents.forEach(({id}) => {
                        document.getElementById(id).classList.add('desc-caution');
                    });
                    document.getElementById('edit-time-ok-button').disabled = false;
                }
                dateComponents.forEach(({id, fn, digits, extra}) => {
                    document.getElementById(id).innerHTML =
                        `0${date[`get${fn}`]() + extra}`.slice(-digits);
                });
            }
        }

        function updateClock() {
            document.getElementById('clock').innerHTML = [
                !isPlayback || !isEditingTime ?
                    '<span id="date"></span><br><span id="time"></span><br>' : '',
                isPlayback && !isEditingTime ? [
                    '<div class="clock-button">',
                    `<span><button id="edit-time-button">${dict['edit-date-time']}</button></span>`,
                    '</div>'
                ].join('') : '',
                isPlayback && isEditingTime ? [
                    '<div class="clock-controller">',
                    dateComponents.slice(0, 3).map(({id}) => [
                        '<span class="spin-box">',
                        `<div><button id="${id}-increase-button" class="top-button"><span class="increase-icon"></span></button></div>`,
                        `<div id="${id}"></div>`,
                        `<div><button id="${id}-decrease-button" class="bottom-button"><span class="decrease-icon"></span></button></div>`,
                        '</span>'
                    ].join('')).join('<span class="clock-controller-separator">-</span>'),
                    '<span class="clock-controller-separator"></span>',
                    dateComponents.slice(-3).map(({id}) => [
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
                isPlayback ? [
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

            refreshClock();
            document.getElementById('clock').style.display = 'block';

            if (isPlayback && isEditingTime) {
                document.getElementById('edit-time-cancel-button').addEventListener('click', () => {
                    tempDate = undefined;
                    isEditingTime = false;
                    updateClock();
                });
                document.getElementById('edit-time-ok-button').addEventListener('click', () => {
                    if (tempDate) {
                        stopAll();
                        markedObject = trackedObject = undefined;
                        popup.remove();
                        hideTimetable();
                        stopViewAnimation();
                        disableTracking();

                        clock.setDate(tempDate);
                        tempDate = undefined;

                        if (lastTimetableRefresh !== clock.getTime('03:00')) {
                            loadTimetableData();
                            lastTimetableRefresh = clock.getTime('03:00');
                        }
                    }

                    isEditingTime = false;
                    updateClock();
                });
            }

            if (isPlayback && !isEditingTime) {
                document.getElementById('edit-time-button').addEventListener('click', () => {
                    isEditingTime = true;
                    updateClock();
                });
            }

            if (isPlayback && isEditingTime) {
                dateComponents.forEach(({id, fn}) => {
                    document.getElementById(`${id}-increase-button`).addEventListener('click', () => {
                        tempDate = tempDate || clock.getJSTDate();
                        tempDate[`set${fn}`](tempDate[`get${fn}`]() + 1);
                        refreshClock();
                    });
                    document.getElementById(`${id}-decrease-button`).addEventListener('click', () => {
                        tempDate = tempDate || clock.getJSTDate();
                        tempDate[`set${fn}`](tempDate[`get${fn}`]() - 1);
                        refreshClock();
                    });
                });
            }

            if (isPlayback) {
                document.getElementById('speed-increase-button').addEventListener('click', function() {
                    clock.setSpeed(clock.speed + (clock.speed < 10 ? 1 : clock.speed < 100 ? 10 : 100));
                    this.disabled = clock.speed === 600;
                    document.getElementById('speed-decrease-button').disabled = false;
                    document.getElementById('clock-speed').innerHTML = clock.speed + dict['x-speed'];
                });
                document.getElementById('speed-decrease-button').addEventListener('click', function() {
                    clock.setSpeed(clock.speed - (clock.speed <= 10 ? 1 : clock.speed <= 100 ? 10 : 100));
                    this.disabled = clock.speed === 1;
                    document.getElementById('speed-increase-button').disabled = false;
                    document.getElementById('clock-speed').innerHTML = clock.speed + dict['x-speed'];
                });
            }
        }

        function updateAboutPopup() {
            const r1 = document.getElementById('map').getBoundingClientRect(),
                r2 = document.getElementsByClassName('mapboxgl-ctrl-about')[0].getBoundingClientRect(),
                staticCheck = document.getElementById('acd-static'),
                dynamicCheck = document.getElementById('acd-dynamic'),
                html = [
                    dict['description'],
                    '<input id="acd-static" class="acd-check" type="checkbox"',
                    staticCheck && staticCheck.checked ? ' checked' : '',
                    '>',
                    `<label class="acd-label" for="acd-static"><span class="acd-icon"></span>${dict['static-update']}</label>`,
                    `<div class="acd-content">${configs.lastStaticUpdate}</div>`,
                    '<input id="acd-dynamic" class="acd-check" type="checkbox"',
                    dynamicCheck && dynamicCheck.checked ? ' checked' : '',
                    '>',
                    `<label class="acd-label" for="acd-dynamic"><span class="acd-icon"></span>${dict['dynamic-update']}</label>`,
                    '<div class="acd-content">',
                    lastDynamicUpdate['JR-East'] || 'N/A',
                    ` (${dict['jr-east']})<br>`,
                    lastDynamicUpdate['TokyoMetro'] || 'N/A',
                    ` (${dict['tokyo-metro']})<br>`,
                    lastDynamicUpdate['Toei'] || 'N/A',
                    ` (${dict['toei']})<br>`,
                    lastDynamicUpdate['HND-JAT'] || 'N/A',
                    ` (${dict['hnd-jat']})<br>`,
                    lastDynamicUpdate['HND-TIAT'] || 'N/A',
                    ` (${dict['hnd-tiat']})<br>`,
                    lastDynamicUpdate['NAA'] || 'N/A',
                    ` (${dict['naa']})</div>`
                ].join('');

            aboutPopup.setLngLat(map.unproject([r2.left - r1.left - 5, r2.top - r1.top + 15])).setHTML(html);
        }
    });

    function updateTimetableRefData(data) {
        const lookup = helpers.buildLookup(data);

        data.forEach(train => {
            const railway = railwayLookup[train.r],
                direction = train.d === railway.ascending ? 1 : -1,
                {tt: table, pt: previousTableIDs, nt: nextTableIDs} = train,
                length = table.length;
            let start = Infinity,
                previousTrains, nextTrains;

            if (previousTableIDs) {
                previousTableIDs.forEach(id => {
                    const previousTrain = lookup[id];

                    if (previousTrain) {
                        const tt = previousTrain.tt;

                        start = Math.min(start,
                            clock.getTime(tt[tt.length - 1].a || tt[tt.length - 1].d || table[0].d) - configs.standingDuration);
                        previousTrains = previousTrains || [];
                        previousTrains.push(previousTrain);
                    }
                });
            }
            if (nextTableIDs) {
                nextTableIDs.forEach(id => {
                    const nextTrain = lookup[id];

                    if (nextTrain) {
                        nextTrains = nextTrains || [];
                        nextTrains.push(nextTrain);
                    }
                });
                if (nextTrains) {
                    table[length - 1].d = nextTrains[0].tt[0].d;
                }
            }
            train.start = Math.min(start, clock.getTime(table[0].d) - configs.standingDuration);
            train.end = clock.getTime(table[length - 1].a ||
                table[length - 1].d ||
                table[Math.max(length - 2, 0)].d);
            train.direction = direction;
            train.altitude = railway.altitude;
            train.carComposition = railway.carComposition;
            train.previousTrains = previousTrains;
            train.nextTrains = nextTrains;
        });
    }

}).catch(error => {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('loading-error').innerHTML = 'Loading failed. Please reload the page.';
    document.getElementById('loading-error').style.display = 'block';
    throw error;
});

function enableTracking() {
    document.getElementsByClassName('mapboxgl-ctrl-track')[0]
        .classList.add('mapboxgl-ctrl-track-active');
}

function disableTracking() {
    document.getElementsByClassName('mapboxgl-ctrl-track')[0]
        .classList.remove('mapboxgl-ctrl-track-active');
}

function showTimetable() {
    const {style} = document.getElementById('timetable'),
        {classList} = document.getElementById('timetable-button');

    style.display = 'block';
    style.height = '33%';
    classList.remove('slide-up');
    classList.add('slide-down');
}

function hideTimetable() {
    document.getElementById('timetable').style.display = 'none';
}

function updateDistances(line) {
    const coords = getCoords(line),
        distances = [];
    let travelled = 0,
        nextCoord = coords[0],
        bearing, slope, pitch;

    for (let i = 0, ilen = coords.length; i < ilen - 1; i++) {
        const currCoord = nextCoord;

        nextCoord = coords[i + 1];

        const distance = turfDistance(currCoord, nextCoord);

        bearing = turfBearing(currCoord, nextCoord);
        slope = ((nextCoord[2] || 0) - (currCoord[2] || 0)) / distance;
        pitch = Math.atan(slope / 1000);

        distances.push([travelled, bearing, slope, pitch]);
        travelled += distance;
    }

    distances.push([travelled, bearing, slope, pitch]);
    line.properties.distances = distances;
}

/**
  * Returns coordinates, altitude, bearing and patch of the train from its distance
  * @param {object} line - lineString of the railway
  * @param {number} distance - Distance from the beginning of the lineString
  * @param {number} composition - Number of cars
  * @param {number} unit - Unit of car length
  * @returns {Array} Array of coord, altitude, bearing and pitch for cars
  */
function getCoordAndBearing(line, distance, composition, unit) {
    const coords = line.geometry.coordinates,
        distances = line.properties.distances,
        length = coords.length,
        result = [];
    let start = 0,
        end = length - 1;

    distance -= unit * (composition - 1) / 2;

    while (start !== end - 1) {
        const center = Math.floor((start + end) / 2);

        if (distance < distances[center][0]) {
            end = center;
        } else {
            start = center;
        }
    }

    let index = start;

    for (let i = 0; i < composition; distance += unit, i++) {
        while (distance > distances[index + 1][0] && index < length - 2) {
            index++;
        }

        const [baseDistance, bearing, slope, pitch] = distances[index],
            coord = coords[index],
            overshot = distance - baseDistance;

        result.push({
            coord: destination(coord, overshot, bearing),
            altitude: (coord[2] || 0) + slope * overshot,
            bearing,
            pitch
        });
    }
    return result;
}

function startTrainAnimation(callback, endCallback, distance, minDuration, maxDuration, start) {
    let {maxSpeed, acceleration, maxAccelerationTime, maxAccDistance} = configs,
        duration, accelerationTime;

    if (distance <= maxAccDistance * 2) {
        duration = Math.sqrt(distance / acceleration) * 2;
        accelerationTime = duration / 2;
    } else {
        duration = maxAccelerationTime * 2 + (distance - maxAccDistance * 2) / maxSpeed;
        if (maxDuration > 0) {
            duration = helpers.clamp(duration, minDuration || 0, maxDuration);
            maxAccDistance = acceleration * duration * duration / 8;
            if (distance >= maxAccDistance * 2) {
                maxSpeed = distance * 2 / duration;
                acceleration = maxSpeed * 2 / duration;
            } else {
                maxSpeed = acceleration * duration / 2 - Math.sqrt(acceleration * (maxAccDistance * 2 - distance));
            }
        }
        accelerationTime = maxSpeed / acceleration;
    }

    return animation.start({
        callback: elapsed => {
            const left = duration - elapsed;
            let d;

            if (elapsed <= accelerationTime) {
                d = acceleration / 2 * elapsed * elapsed;
            } else if (left <= accelerationTime) {
                d = distance - acceleration / 2 * left * left;
            } else {
                d = maxSpeed * (elapsed - accelerationTime / 2);
            }
            callback(d / distance);
        },
        complete: endCallback,
        duration,
        start: start > 0 ? clock.getHighResTime() - start : undefined,
        clock
    });
}

function startFlightAnimation(callback, endCallback, distance, maxSpeed, acceleration, start) {
    const accelerationTime = maxSpeed / Math.abs(acceleration),
        duration = accelerationTime / 2 + distance / maxSpeed;

    return animation.start({
        callback: elapsed => {
            const left = duration - elapsed;
            let d;

            if (acceleration > 0) {
                if (elapsed <= accelerationTime) {
                    d = acceleration / 2 * elapsed * elapsed;
                } else {
                    d = maxSpeed * (elapsed - accelerationTime / 2);
                }
            } else {
                if (left <= accelerationTime) {
                    d = distance + acceleration / 2 * left * left;
                } else {
                    d = maxSpeed * elapsed;
                }
            }
            callback(d / distance);
        },
        complete: endCallback,
        duration,
        start: start > 0 ? performance.now() - start : undefined
    });
}

function easeOutQuart(t) {
    return -((t = t - 1) * t * t * t - 1);
}

function truncateTrainTimetable(train, origin, destination) {
    const {tt, os, ds} = train;
    let changed = false;

    if (os && origin && os[0] !== origin[0]) {
        train.os = origin;
        if (tt) {
            for (let i = 0, ilen = tt.length; i < ilen; i++) {
                const item = tt[i];

                if (item.s === origin[0]) {
                    delete item.a;
                    tt.splice(0, i);
                    break;
                }
            }
        }
        changed = true;
    }
    if (ds && destination && ds[0] !== destination[0]) {
        train.ds = destination;
        if (tt) {
            for (let i = 0, ilen = tt.length; i < ilen; i++) {
                const item = tt[i];

                if (item.s === destination[0]) {
                    item.a = item.a || item.d;
                    delete item.d;
                    tt.splice(i + 1);
                    break;
                }
            }
        }
        changed = true;
    }
    return changed;
}

/**
  * Returns the modified style color based on the current date and time.
  * In the playback mode, the time in the simulation clock is used.
  * @param {object} color - Style color object
  * @returns {string} Modified style color string
  */
function getStyleColorString(color) {
    const [lng, lat] = configs.originCoord,
        times = SunCalc.getTimes(new Date(clock.getTime()), lat, lng),
        sunrise = clock.getJSTDate(times.sunrise.getTime()).getTime(),
        sunset = clock.getJSTDate(times.sunset.getTime()).getTime(),
        now = clock.getJSTDate().getTime();
    let t, r, g, b;

    if (now >= sunrise - 3600000 && now < sunrise) {
        // Night to sunrise
        t = (now - sunrise) / 3600000 + 1;
        r = .4 * (1 - t) + .8 * t;
        g = .4 * (1 - t) + .9 * t;
        b = .5 * (1 - t) + t;
    } else if (now >= sunrise && now < sunrise + 3600000) {
        // Sunrise to day
        t = (now - sunrise) / 3600000;
        r = .8 * (1 - t) + t;
        g = .9 * (1 - t) + t;
        b = 1;
    } else if (now >= sunrise + 3600000 && now < sunset - 3600000) {
        // Day
        r = g = b = 1;
    } else if (now >= sunset - 3600000 && now < sunset) {
        // Day to sunset
        t = (now - sunset) / 3600000 + 1;
        r = 1;
        g = (1 - t) + .9 * t;
        b = (1 - t) + .8 * t;
    } else if (now >= sunset && now < sunset + 3600000) {
        // Sunset to night
        t = (now - sunset) / 3600000;
        r = (1 - t) + .4 * t;
        g = .9 * (1 - t) + .4 * t;
        b = .8 * (1 - t) + .5 * t;
    } else {
        // Night
        r = g = .4;
        b = .5;
    }
    return `rgba(${[color.r * r, color.g * g, color.b * b, color.a].join(',')})`;
}

/**
  * Returns a cube mesh object.
  * @param {number} x - Length of the edges parallel to the X axis
  * @param {number} y - Length of the edges parallel to the Y axis
  * @param {number} z - Length of the edges parallel to the Z axis
  * @param {string|Array} color - Cube color. If it is an array, the first three colors
  *     will be used on the side surface, the fourth color will be used on the front surface
  * @returns {Mesh} Cube mesh object
  */
function createCube(x, y, z, color) {
    const materialParams = {
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: Math.random()
    };
    let geometry, material;

    if (Array.isArray(color)) {
        const hasFaceColor = color.length > 3;

        geometry = new THREE.BoxBufferGeometry(x, y, z, 1, 1, 3);
        geometry.clearGroups();
        [0, 1, 2, 2, 1, 0, 2, 1, 0, 0, 1, 2, 0].forEach((index, i) => {
            geometry.addGroup(i * 6, 6, i >= 6 && i < 12 && hasFaceColor ? 3 : index);
        });
        material = color.map(c =>
            new THREE.MeshLambertMaterial(Object.assign({
                color: c
            }, materialParams))
        );
    } else {
        geometry = new THREE.BoxBufferGeometry(x, y, z);
        material = new THREE.MeshLambertMaterial(Object.assign({color}, materialParams));
    }

    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = 'cube';
    return mesh;
}

/**
  * Sets the opacity of an object and its decendants.
  * @param {Object3D} object - Target object
  * @param {number} opacity - Float in the range of 0.0 - 1.0 indicating how
  *     transparent the material is
  */
function setOpacity(object, opacity) {
    object.traverse(descendant => {
        const materials = descendant.material;

        if (materials) {
            const uniforms = materials.uniforms;

            if (uniforms) {
                uniforms.opacity.value = opacity;
            } else if (Array.isArray(materials)) {
                materials.forEach(material => {
                    material.opacity = opacity;
                });
            } else {
                materials.opacity = opacity;
            }
        }
    });
}

function createDelayMarker(dark) {
    const geometry = new THREE.SphereBufferGeometry(1.8, 32, 32),
        material = new THREE.ShaderMaterial({
            uniforms: {
                glowColor: {type: 'c', value: new THREE.Color(0xff9900)},
                base: {type: 'f', value: dark ? 0 : 1},
                opacity: {type: 'f'}
            },
            vertexShader: `
                varying float intensity;

                void main() {
                    vec3 vNormal = normalize( normalMatrix * normal );
                    vec3 vNormel = normalize( vec3( modelViewMatrix * vec4( position, 1.0 ) ) );
                    intensity = -dot( vNormal, vNormel );

                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                uniform float base;
                uniform float opacity;
                varying float intensity;

                void main() {
                    float r = base - ( base - glowColor.r ) * (1.0 - intensity) * opacity;
                    float g = base - ( base - glowColor.g ) * (1.0 - intensity) * opacity;
                    float b = base - ( base - glowColor.b ) * (1.0 - intensity) * opacity;
                    gl_FragColor = vec4( r, g, b, 1.0 );
                }
            `,
            blending: dark ? THREE.AdditiveBlending : THREE.MultiplyBlending,
            depthWrite: false
        }),
        mesh = new THREE.Mesh(geometry, material);

    mesh.name = 'marker';
    return mesh;
}

function createOutline(object) {
    const {width, height, depth} = object.geometry.parameters,
        {translate} = object.geometry.userData,
        outline = new THREE.Mesh(
            new THREE.BoxBufferGeometry(width + .2, height + .2, depth + .2),
            new THREE.MeshBasicMaterial({color: '#FFFFFF', side: THREE.BackSide})
        );

    outline.name = 'outline';
    if (translate) {
        outline.geometry.translate(translate.x, translate.y, translate.z);
    }
    return outline;
}

function getObjectOpacity(object, t) {
    t = helpers.valueOrDefault(t, 1);
    return isUndergroundVisible === (object.userData.altitude < 0) ?
        .9 * t + .225 * (1 - t) : .9 * (1 - t) + .225 * t;
}

function getTimetableFileName() {
    const date = clock.getJSTDate(),
        hours = date.getHours();

    if (hours < 3) {
        date.setHours(hours - 24);
    }

    const calendar = JapaneseHolidays.isHoliday(date) ||
        (date.getFullYear() === 2019 && date.getMonth() === 11 && date.getDate() >= 28) ||
        (date.getFullYear() === 2020 && date.getMonth() === 0 && date.getDate() <= 5) ||
        date.getDay() === 6 || date.getDay() === 0 ? 'holiday' : 'weekday';

    return `timetable-${calendar}.json.gz`;
}

function setSectionData(train, index, final) {
    const {stations} = railwayLookup[train.r],
        {direction, tt: table} = train,
        destination = (train.ds || [])[0],
        delay = train.delay || 0,
        now = clock.getTime();
    let ttIndex, current, next, departureStation, arrivalStation, currentSection, nextSection, finalSection;

    if (table) {
        ttIndex = helpers.valueOrDefault(index, table.reduce((acc, cur, i) => {
            return cur.d && clock.getTime(cur.d) + delay <= now ? i : acc;
        }, 0));
        current = table[ttIndex];
        next = table[ttIndex + 1];
        departureStation = current.s;
        arrivalStation = next && next.s;
    } else {
        departureStation = train.fs || train.ts;
        arrivalStation = train.ts || train.fs;
    }

    if (direction > 0) {
        currentSection = stations.indexOf(departureStation);
        nextSection = stations.indexOf(arrivalStation, currentSection);
        finalSection = stations.indexOf(destination, currentSection);
    } else {
        currentSection = stations.lastIndexOf(departureStation);
        nextSection = stations.lastIndexOf(arrivalStation, currentSection);
        finalSection = stations.lastIndexOf(destination, currentSection);
    }

    if (table) {
        train.timetableIndex = ttIndex;
        train.departureStation = departureStation;
        train.departureTime = current.d || current.a;

        if (currentSection >= 0 && nextSection >= 0) {
            train.sectionIndex = currentSection;
            train.sectionLength = nextSection - currentSection;
            train.arrivalStation = arrivalStation;
            train.arrivalTime = next.a;
            train.nextDepartureTime = next.d;

            return true;
        }

    } else {
        const actualSection = helpers.numberOrDefault(train.sectionIndex + train.sectionLength, currentSection);

        train.departureStation = departureStation;

        if (actualSection >= 0 && actualSection !== finalSection && ((!final && nextSection >= 0) || (final && finalSection >= 0))) {
            train.sectionIndex = actualSection;
            train.sectionLength = (final ? finalSection : nextSection) - actualSection;
            train.arrivalStation = arrivalStation === departureStation ? stations[currentSection + direction] : arrivalStation;

            return true;
        }
    }

    train.arrivalStation = train.arrivalTime = train.nextDepartureTime = undefined;
}
