import {WebMercatorViewport} from '@deck.gl/core';
import {MapboxLayer} from '@deck.gl/mapbox';
import {GeoJsonLayer} from '@deck.gl/layers';
import mapboxgl from 'mapbox-gl';
import turfDistance from '@turf/distance';
import turfBearing from '@turf/bearing';
import centerOfMass from '@turf/center-of-mass';
import {featureEach} from '@turf/meta';
import {getCoord, getCoords} from '@turf/invariant';
import * as THREE from 'three';
import JapaneseHolidays from 'japanese-holidays';
import SunCalc from 'suncalc';
import animation from './animation';
import Clock from './clock';
import configs from './configs';
import * as helpers from './helpers';
import MapboxGLButtonControl from './mapbox-gl-button-control';
import ThreeLayer from './three-layer';
import WeatherLayer from './weather-layer';
import destination from './turf/destination';
import featureFilter from './turf/feature-filter';

const OPERATORS_FOR_TRAININFORMATION = {
    tokyochallenge: [
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
    ],
    odpt: [
        'MIR',
        'TamaMonorail'
    ]
};

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

const RAILWAY_SOBURAPID = 'JR-East.SobuRapid',
    RAILWAY_NAMBOKU = 'TokyoMetro.Namboku',
    RAILWAY_MITA = 'Toei.Mita';

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

const modelOrigin = mapboxgl.MercatorCoordinate.fromLngLat(configs.originCoord),
    modelScale = modelOrigin.meterInMercatorCoordinateUnits();

const isWindows = helpers.includes(navigator.userAgent, 'Windows'),
    isEdge = helpers.includes(navigator.userAgent, 'Edge');

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

export default class {

    constructor(options) {
        const me = this;

        me.options = options;
        me.lang = helpers.getLang(options.lang);
        me.dataUrl = options.dataUrl || configs.dataUrl;
        me.container = typeof options.container === 'string' ?
            document.getElementById(options.container) : options.container;

        me.clockControl = helpers.valueOrDefault(options.clockControl, true);
        me.searchControl = helpers.valueOrDefault(options.searchControl, true);
        me.navigationControl = helpers.valueOrDefault(options.navigationControl, true);
        me.fullscreenControl = helpers.valueOrDefault(options.fullscreenControl, true);
        me.modeControl = helpers.valueOrDefault(options.modeControl, true);
        me.infoControl = helpers.valueOrDefault(options.infoControl, true);
        me.clock = new Clock();

        me.isUndergroundVisible = false;
        me.trackingMode = helpers.valueOrDefault(options.trackingMode, configs.defaultTrackingMode);
        me.isPlayback = false;
        me.isEditingTime = false;
        me.isWeatherVisible = false;

        me.frameRate = helpers.valueOrDefault(options.frameRate, configs.defaultFrameRate);

        me.lastDynamicUpdate = {};

        me.container.classList.add('mini-tokyo-3d');
        insertTags(me.container);

        loadData(me.dataUrl, me.lang, me.clock).then(data => {
            Object.assign(me, data);
            initialize(me);
        }).catch(error => {
            showErrorMessage(me.container);
            throw error;
        });
    }

}

function loadData(dataUrl, lang, clock) {
    return Promise.all([
        `${dataUrl}/dictionary-${lang}.json`,
        `${dataUrl}/railways.json.gz`,
        `${dataUrl}/stations.json.gz`,
        `${dataUrl}/features.json.gz`,
        `${dataUrl}/${getTimetableFileName(clock)}`,
        `${dataUrl}/rail-directions.json.gz`,
        `${dataUrl}/train-types.json.gz`,
        `${dataUrl}/train-vehicles.json.gz`,
        `${dataUrl}/operators.json.gz`,
        `${dataUrl}/airports.json.gz`,
        `${dataUrl}/flight-statuses.json.gz`,
        configs.secretsUrl
    ].map(helpers.loadJSON)).then(data => ({
        dict: data[0],
        railwayData: data[1],
        stationData: data[2],
        featureCollection: data[3],
        timetableData: data[4],
        railDirectionData: data[5],
        trainTypeData: data[6],
        trainVehicleData: data[7],
        operatorData: data[8],
        airportData: data[9],
        flightStatusData: data[10],
        secrets: data[11]
    }));
}

function initialize(mt3d) {

    Object.assign(mt3d.secrets, mt3d.options.secrets);
    mapboxgl.accessToken = mt3d.secrets.mapbox;
    const map = new mapboxgl.Map({
        container: mt3d.container.querySelector('#map'),
        style: `${mt3d.dataUrl}/osm-liberty.json`,
        customAttribution: mt3d.infoControl ? '' : configs.customAttribution,
        hash: helpers.valueOrDefault(mt3d.options.hash, false),
        center: helpers.valueOrDefault(mt3d.options.center, configs.originCoord),
        zoom: helpers.valueOrDefault(mt3d.options.zoom, configs.defaultZoom),
        bearing: helpers.valueOrDefault(mt3d.options.bearing, configs.defaultBearing),
        pitch: helpers.valueOrDefault(mt3d.options.pitch, configs.defaultPitch)
    });

    const unit = Math.pow(2, 14 - helpers.clamp(map.getZoom(), 13, 19));

    mt3d.layerZoom = helpers.clamp(Math.floor(map.getZoom()), 13, 18);
    mt3d.objectUnit = Math.max(unit * .19, .02);
    mt3d.objectScale = unit * modelScale * 100;
    // mt3d.carScale = Math.max(.02 / .19 / unit, 1);
    mt3d.aircraftScale = Math.max(.06 / .285 / unit, 1);

    const trainLayers = {
        ug: new ThreeLayer('trains-ug', true, true),
        og: new ThreeLayer('trains-og'),
        addObject(object, duration) {
            const layer = object.userData.altitude < 0 ? this.ug : this.og;

            setOpacity(object, 0);
            layer.scene.add(object);
            if (duration > 0) {
                animation.start({
                    callback: elapsed =>
                        setOpacity(object, getObjectOpacity(object, mt3d.isUndergroundVisible), elapsed / duration),
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
                        setOpacity(object, getObjectOpacity(object, mt3d.isUndergroundVisible, elapsed / duration)),
                    duration
                });
            }
        },
        removeObject(object, duration) {
            if (!object) {
                return;
            }

            const layer = object.userData.altitude < 0 ? this.ug : this.og;

            object.traverse(({material}) => {
                if (material) {
                    material.polygonOffsetFactor = 0;
                }
            });
            object.renderOrder = 1;
            if (duration > 0) {
                animation.start({
                    callback: elapsed =>
                        setOpacity(object, getObjectOpacity(object, mt3d.isUndergroundVisible), 1 - elapsed / duration),
                    complete: () =>
                        layer.scene.remove(object),
                    duration
                });
            } else {
                layer.scene.remove(object);
            }
        },
        pickObject(point) {
            if (mt3d.isUndergroundVisible) {
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

    const weatherLayer = new WeatherLayer('weather');

    mt3d.railwayLookup = helpers.buildLookup(mt3d.railwayData);
    mt3d.stationLookup = helpers.buildLookup(mt3d.stationData);

    // Build feature lookup dictionary and update feature properties
    mt3d.featureLookup = {};
    featureEach(mt3d.featureCollection, feature => {
        const {id} = feature.properties;
        if (id && !id.match(/\.(ug|og)\./)) {
            mt3d.featureLookup[id] = feature;
            updateDistances(feature);
        }
    });

    mt3d.lastTimetableRefresh = mt3d.clock.getTime('03:00');
    updateTimetableData(mt3d.timetableData);
    mt3d.trainLookup = helpers.buildLookup(mt3d.timetableData, 't');

    mt3d.railDirectionLookup = helpers.buildLookup(mt3d.railDirectionData);
    mt3d.trainTypeLookup = helpers.buildLookup(mt3d.trainTypeData);
    mt3d.trainVehicleLookup = helpers.buildLookup(mt3d.trainVehicleData);
    mt3d.operatorLookup = helpers.buildLookup(mt3d.operatorData);
    mt3d.airportLookup = helpers.buildLookup(mt3d.airportData);
    mt3d.flightStatusLookup = helpers.buildLookup(mt3d.flightStatusData);

    mt3d.activeTrainLookup = {};
    mt3d.realtimeTrainLookup = {};
    mt3d.activeFlightLookup = {};
    mt3d.flightLookup = {};

    map.once('load', () => {
        mt3d.container.querySelector('#loader').style.opacity = 0;
        setTimeout(() => {
            mt3d.container.querySelector('#loader').style.display = 'none';
        }, 1000);
    });

    map.once('styledata', () => {
        ['poi', 'poi_extra'].forEach(id => {
            map.setLayoutProperty(id, 'text-field', `{name_${mt3d.lang.match(/ja|ko|zh-Han[st]/) ? mt3d.lang : 'en'}}`);
        });

        [13, 14, 15, 16, 17, 18].forEach(zoom => {
            const minzoom = zoom <= 13 ? 0 : zoom,
                maxzoom = zoom >= 18 ? 24 : zoom + 1,
                lineWidthScale = zoom === 13 ? helpers.clamp(Math.pow(2, map.getZoom() - 12), .125, 1) : 1;

            map.addLayer(new MapboxLayer({
                id: `railways-ug-${zoom}`,
                type: GeoJsonLayer,
                data: featureFilter(mt3d.featureCollection, p =>
                    p.zoom === zoom && p.type === 0 && p.altitude < 0
                ),
                filled: false,
                stroked: true,
                getLineWidth: d => d.properties.width,
                getLineColor: d => helpers.colorToRGBArray(d.properties.color),
                lineWidthUnits: 'pixels',
                lineWidthScale,
                lineJointRounded: true,
                opacity: .0625,
                pickable: true
            }), 'building-3d');
            map.setLayerZoomRange(`railways-ug-${zoom}`, minzoom, maxzoom);
            map.addLayer(new MapboxLayer({
                id: `stations-ug-${zoom}`,
                type: GeoJsonLayer,
                data: featureFilter(mt3d.featureCollection, p =>
                    p.zoom === zoom && p.type === 1 && p.altitude < 0
                ),
                filled: true,
                stroked: true,
                getLineWidth: 4,
                getLineColor: [0, 0, 0],
                lineWidthUnits: 'pixels',
                lineWidthScale,
                getFillColor: [255, 255, 255, 179],
                opacity: .0625,
                pickable: true
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
                    data: featureFilter(mt3d.featureCollection, p =>
                        p.zoom === zoom && p.type === 0 && p.altitude === 0
                    )
                },
                stationSource = {
                    type: 'geojson',
                    data: featureFilter(mt3d.featureCollection, p =>
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

        /* For development
        map.addLayer(new MapboxLayer({
            id: `airway-og-`,
            type: GeoJsonLayer,
            data: featureFilter(mt3d.featureCollection, p =>
                p.type === 0 && p.altitude > 0
            ),
            filled: false,
            stroked: true,
            getLineWidth: d => d.properties.width,
            getLineColor: d => helpers.colorToRGBArray(d.properties.color),
            lineWidthUnits: 'pixels',
            lineWidthScale: 1,
            opacity: .0625
        }), 'poi');
        */

        map.addLayer(weatherLayer, 'poi');

        mt3d.styleColors = helpers.getStyleColors(map);
        mt3d.styleOpacities = helpers.getStyleOpacities(map);

        const datalist = document.createElement('datalist');
        datalist.id = 'stations';
        mt3d.stationTitleLookup = {};
        [mt3d.lang, 'en'].forEach(l => {
            mt3d.stationData.forEach(station => {
                const title = station.title[l],
                    {coord} = station;

                if (title && !mt3d.stationTitleLookup[title.toUpperCase()] && coord && coord[0] && coord[1]) {
                    const option = document.createElement('option');

                    option.value = title;
                    datalist.appendChild(option);
                    mt3d.stationTitleLookup[title.toUpperCase()] = station;
                }
            });
        });
        document.body.appendChild(datalist);

        const searchBox = mt3d.container.querySelector('#search-box');
        const searchListener = event => {
            const station = mt3d.stationTitleLookup[event.target.value.toUpperCase()];

            if (station && station.coord) {
                markObject();
                trackObject();
                if (mt3d.isUndergroundVisible) {
                    setUndergroundMode(station.altitude < 0);
                }
                if (!mt3d.isUndergroundVisible) {
                    map.once('moveend', () => {
                        setUndergroundMode(station.altitude < 0);
                    });
                }
                map.flyTo({
                    center: station.coord,
                    zoom: Math.max(map.getZoom(), 15)
                });
            }
        };
        searchBox.placeholder = mt3d.dict['station-name'];
        searchBox.addEventListener(isEdge ? 'blur' : 'change', searchListener);

        // Workaround for Edge
        if (isEdge) {
            searchBox.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    searchListener(event);
                }
            });
        }

        if (mt3d.searchControl) {
            const control = new MapboxGLButtonControl([{
                className: 'mapboxgl-ctrl-search',
                title: mt3d.dict['search'],
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
        }

        if (mt3d.navigationControl) {
            const control = new mapboxgl.NavigationControl();

            control._setButtonTitle = function(button) {
                const me = this,
                    title = button === me._zoomInButton ? mt3d.dict['zoom-in'] :
                    button === me._zoomOutButton ? mt3d.dict['zoom-out'] :
                    button === me._compass ? mt3d.dict['compass'] : '';

                button.title = title;
                button.setAttribute('aria-label', title);
            };
            map.addControl(control);
        }

        if (mt3d.fullscreenControl) {
            const control = new mapboxgl.FullscreenControl();

            control._updateTitle = function() {
                const me = this,
                    title = mt3d.dict[me._isFullscreen() ? 'exit-fullscreen' : 'enter-fullscreen'];

                me._fullscreenButton.title = title;
                me._fullscreenButton.setAttribute('aria-label', title);
            };
            map.addControl(control);
        }

        if (mt3d.modeControl) {
            const control = new MapboxGLButtonControl([{
                className: 'mapboxgl-ctrl-underground',
                title: mt3d.dict['enter-underground'],
                eventHandler() {
                    setUndergroundMode(!mt3d.isUndergroundVisible);
                }
            }, {
                className: `mapboxgl-ctrl-track mapboxgl-ctrl-track-${mt3d.trackingMode}`,
                title: mt3d.dict['track'],
                eventHandler(event) {
                    setTrackingMode(mt3d.trackingMode === 'helicopter' ? 'train' : 'helicopter');
                    event.stopPropagation();
                }
            }, {
                className: 'mapboxgl-ctrl-playback',
                title: mt3d.dict['enter-playback'],
                eventHandler() {
                    setPlaybackMode(!mt3d.isPlayback);
                }
            }, {
                className: 'mapboxgl-ctrl-weather',
                title: mt3d.dict['show-weather'],
                eventHandler() {
                    setWeatherMode(!mt3d.isWeatherVisible);
                }
            }]);
            map.addControl(control, 'top-right');
        }

        const aboutPopup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            anchor: 'right',
            maxWidth: '300px'
        });

        if (mt3d.infoControl) {
            map.addControl(new MapboxGLButtonControl([{
                className: 'mapboxgl-ctrl-about',
                title: mt3d.dict['about'],
                eventHandler() {
                    if (!aboutPopup.isOpen()) {
                        updateAboutPopup();
                        aboutPopup.addTo(map);
                    } else {
                        aboutPopup.remove();
                    }
                }
            }]));
        }

        if (!mt3d.clockControl) {
            mt3d.container.querySelector('#clock').style.visibility = 'hidden';
        }
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

        mt3d.container.querySelector('#timetable-header').addEventListener('click', () => {
            const {style} = mt3d.container.querySelector('#timetable'),
                {classList} = mt3d.container.querySelector('#timetable-button');

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
            mt3d.container.querySelector('#timetable-body').classList.add('windows');
        }

        [13, 14, 15, 16, 17, 18].forEach(zoom => {
            map.on('mouseenter', `stations-og-${zoom}`, e => {
                mt3d.pickedFeature = e.features[0];
            });
            map.on('click', `stations-og-${zoom}`, e => {
                mt3d.pickedFeature = e.features[0];
            });
            map.on('mouseleave', `stations-og-${zoom}`, () => {
                delete mt3d.pickedFeature;
            });
        });

        map.on('mousemove', e => {
            markObject(pickObject(e.point));
        });

        map.on('click', e => {
            const object = pickObject(e.point);

            markObject(object);
            if (!object || object instanceof THREE.Group) {
                trackObject(object);
            }

            // For development
            console.log(e.lngLat);
        });

        map.on('zoom', () => {
            /*
            if (mt3d.trackedObject) {
                const {altitude} = mt3d.trackedObject.userData;
                // Keep camera off from the tracked aircraft
                if (altitude > 0 && Math.pow(2, 22 - map.getZoom()) / altitude < .5) {
                    map.setZoom(22 - Math.log2(altitude * .5));
                }
            }
            */

            const zoom = map.getZoom(),
                unit = Math.pow(2, 14 - helpers.clamp(zoom, 13, 19)),
                lineWidthScale = helpers.clamp(Math.pow(2, zoom - 12), .125, 1);

            helpers.setLayerProps(map, 'railways-ug-13', {lineWidthScale});
            helpers.setLayerProps(map, 'stations-ug-13', {lineWidthScale});

            mt3d.layerZoom = helpers.clamp(Math.floor(zoom), 13, 18);
            mt3d.objectUnit = Math.max(unit * .19, .02);
            mt3d.objectScale = unit * modelScale * 100;
            // mt3d.carScale = Math.max(.02 / .19 / unit, 1);
            mt3d.aircraftScale = Math.max(.06 / .285 / unit, 1);

            Object.keys(mt3d.activeTrainLookup).forEach(key => {
                const train = mt3d.activeTrainLookup[key];

                updateTrainProps(train);
                updateTrainShape(train);
            });
            Object.keys(mt3d.activeFlightLookup).forEach(key => {
                updateFlightShape(mt3d.activeFlightLookup[key]);
            });
        });

        map.on('move', () => {
            if (mt3d.isWeatherVisible) {
                weatherLayer.updateEmitterQueue();
            }
            if (popup.isOpen()) {
                updatePopup();
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
                const now = mt3d.clock.getTime();

                if (now - mt3d.lastTimetableRefresh >= 86400000) {
                    loadTimetableData();
                    mt3d.lastTimetableRefresh = mt3d.clock.getTime('03:00');
                }
                if (Math.floor(now / 1000) !== Math.floor(mt3d.lastClockRefresh / 1000)) {
                    refreshClock();
                    mt3d.lastClockRefresh = now;
                }

                // Remove all trains if the page has been invisible for certain amount of time
                if (Date.now() - mt3d.lastFrameRefresh >= configs.refreshTimeout) {
                    stopAll();
                }
                mt3d.lastFrameRefresh = Date.now();

                if (Math.floor((now - configs.minDelay) / configs.trainRefreshInterval) !== Math.floor(mt3d.lastTrainRefresh / configs.trainRefreshInterval)) {
                    refreshStyleColors();
                    if (mt3d.isPlayback) {
                        refreshTrains();
                        // refreshFlights();
                    } else {
                        loadRealtimeTrainData();
                        loadRealtimeFlightData();
                    }
                    mt3d.lastTrainRefresh = now - configs.minDelay;
                }
                if (mt3d.trackedObject) {
                    const {coord: center, bearing, altitude, object} = mt3d.trackedObject.userData;

                    refreshOutline();
                    if (object.timetableOffsets) {
                        setTrainTimetableMark(object);
                    }

                    /*
                    // Keep camera off from the tracked aircraft
                    if (altitude > 0 && Math.pow(2, 22 - map.getZoom()) / altitude < .5) {
                        map.setZoom(22 - Math.log2(altitude * .5));
                    }
                    */

                    if (!mt3d.viewAnimationID) {
                        easeTo({
                            center,
                            altitude,
                            bearing,
                            bearingFactor: .02
                        });
                    }
                }
                if (mt3d.markedObject instanceof THREE.Group) {
                    updatePopup({setHTML: true});
                }
                if (!mt3d.isPlayback && mt3d.isWeatherVisible) {
                    if (now - (mt3d.lastWeatherRefresh || 0) >= configs.weatherRefreshInterval) {
                        loadWeatherData();
                        mt3d.lastWeatherRefresh = now;
                    }
                    weatherLayer.refreshEmitter();
                }
            }
        });

        function easeTo(options) {
            let {center, altitude, bearing, centerFactor, bearingFactor} = options;

            if (mt3d.trackingMode === 'helicopter') {
                bearing = (mt3d.trackingBaseBearing + performance.now() / 100) % 360;
            } else if (bearingFactor >= 0) {
                const mapBearing = map.getBearing();

                bearing = mapBearing + ((bearing - mapBearing + 540) % 360 - 180) * bearingFactor;
            }

            center = adjustCoord(center, altitude, bearing);
            if (centerFactor >= 0) {
                const {lng: fromLng, lat: fromLat} = map.getCenter(),
                    {lng: toLng, lat: toLat} = center;

                center = new mapboxgl.LngLat(
                    fromLng + (toLng - fromLng) * centerFactor,
                    fromLat + (toLat - fromLat) * centerFactor
                );
            }

            map.easeTo({center, bearing, duration: 0});
        }

        function updateTrainProps(train) {
            const feature = train.railwayFeature = mt3d.featureLookup[`${train.r}.${mt3d.layerZoom}`],
                stationOffsets = feature.properties['station-offsets'],
                {sectionIndex, sectionLength} = train,
                offset = train.offset = stationOffsets[sectionIndex];

            train.interval = stationOffsets[sectionIndex + sectionLength] - offset;
        }

        function updateTrainShape(train, t) {
            const {railwayFeature: feature, offset, interval, direction, cars, delay} = train,
                length = cars.length;
            let marked, tracked, altitudeChanged;

            if (t !== undefined) {
                train._t = t;
            }
            if (train._t === undefined) {
                return;
            }

            if (length === 0) {
                const railway = mt3d.railwayLookup[train.r],
                    {v: vehicle} = train,
                    car = new THREE.Group();

                car.add(createCube(.88, 1.76, .88, vehicle ? mt3d.trainVehicleLookup[vehicle].color : railway.color));
                car.rotation.order = 'ZYX';
                car.userData.object = train;

                cars.push(car);

                // Reset marked/tracked object if it was marked/tracked before
                // Delay calling markObject() and trackObject() as they require the object position to be set
                if (mt3d.markedObject instanceof THREE.Group && mt3d.markedObject.userData.object === train) {
                    marked = cars[0];
                }
                if (mt3d.trackedObject && mt3d.trackedObject.userData.object === train) {
                    tracked = cars[0];
                }
            }

            if (delay) {
                if (!cars[0].getObjectByName('marker')) {
                    cars[0].add(createDelayMarker(helpers.isDarkBackground(map)));
                }
            }

            const pArr = getCoordAndBearing(feature, offset + train._t * interval, 1, mt3d.objectUnit);
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

                if (marked === car) {
                    markObject(car);
                }
                if (tracked === car) {
                    trackObject(car);
                }

                if (mt3d.trackedObject === car && !mt3d.viewAnimationID) {
                    easeTo({
                        center: coord,
                        altitude,
                        bearing,
                        bearingFactor: .02
                    });
                }

                if (animation.isActive(train.animationID)) {
                    const bounds = map.getBounds(),
                        [lng, lat] = coord,
                        {animationID} = train;

                    if (lng >= bounds.getWest() - .005 &&
                        lng <= bounds.getEast() + .005 &&
                        lat >= bounds.getSouth() - .005 &&
                        lat <= bounds.getNorth() + .005) {
                        animation.setFrameRate(animationID, mt3d.frameRate);
                    } else {
                        animation.setFrameRate(animationID, 1);
                    }
                }

                position.x = mCoord.x - modelOrigin.x;
                position.y = -(mCoord.y - modelOrigin.y);
                position.z = mCoord.z + mt3d.objectScale / 2;
                scale.x = scale.y = scale.z = mt3d.objectScale;
                rotation.x = p.pitch * direction;
                rotation.z = -bearing * DEGREE_TO_RADIAN;

                if (!car.parent) {
                    trainLayers.addObject(car, 1000);
                }
                if (altitudeChanged) {
                    trainLayers.updateObject(car, 1000);
                    if (mt3d.trackedObject === car) {
                        setUndergroundMode(!mt3d.isUndergroundVisible);
                    }
                }

                if (mt3d.markedObject === car) {
                    updatePopup();
                }
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
                const {color, tailcolor} = mt3d.operatorLookup[flight.a];

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
                bearing = aircraft.userData.bearing = p.bearing,
                cameraZ = trainLayers.og.camera.position.z,
                aircraftScale = mt3d.aircraftScale * cameraZ / (cameraZ - mCoord.z);

            if (mt3d.trackedObject === aircraft && !mt3d.viewAnimationID) {
                easeTo({
                    center: coord,
                    altitude,
                    bearing,
                    bearingFactor: .02
                });
            }

            if (animation.isActive(flight.animationID)) {
                const bounds = map.getBounds(),
                    [lng, lat] = coord,
                    {animationID} = flight;

                if (lng >= bounds.getWest() - .005 &&
                    lng <= bounds.getEast() + .005 &&
                    lat >= bounds.getSouth() - .005 &&
                    lat <= bounds.getNorth() + .005) {
                    animation.setFrameRate(animationID, mt3d.frameRate);
                } else {
                    animation.setFrameRate(animationID, 1);
                }
            }

            position.x = mCoord.x - modelOrigin.x;
            position.y = -(mCoord.y - modelOrigin.y);
            position.z = mCoord.z + mt3d.objectScale / 2;
            scale.x = scale.y = scale.z = mt3d.objectScale;
            rotation.x = p.pitch;
            rotation.z = -bearing * DEGREE_TO_RADIAN;

            body.scale.y = wing.scale.x = vTail.scale.y = aircraftScale;

            if (mt3d.markedObject === aircraft) {
                updatePopup();
            }
        }

        function refreshTrains() {
            const now = mt3d.clock.getTime();

            mt3d.timetableData.forEach(train => {
                const delay = train.delay || 0;

                if (train.start + delay <= now && now <= train.end + delay &&
                    !checkActiveTrains(train, true) &&
                    (!mt3d.railwayLookup[train.r].status || mt3d.realtimeTrainLookup[train.t])) {
                    trainStart(train);
                }
            });
        }

        function trainStart(train, index) {
            const now = mt3d.clock.getTime();

            if (!setSectionData(train, index)) {
                return; // Out of range
            }
            mt3d.activeTrainLookup[train.t] = train;
            train.cars = [];
            updateTrainProps(train);

            const departureTime = mt3d.clock.getTime(train.departureTime) + (train.delay || 0);

            if (!train.tt && train.sectionLength !== 0) {
                trainRepeat(train);
            } else if (train.tt && now >= departureTime) {
                trainRepeat(train, now - departureTime);
            } else {
                trainStand(train);
            }
        }

        function trainStand(train, final) {
            const departureTime = mt3d.clock.getTime(train.departureTime) + (train.delay || 0);

            if (!train.tt) {
                final = !setSectionData(train, undefined, !mt3d.realtimeTrainLookup[train.t]);
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
                            trainRepeat(train, mt3d.clock.speed === 1 ? undefined : mt3d.clock.getTime() - departureTime);
                        } else {
                            trainStand(train);
                        }
                    },
                    duration: train.tt ?
                        Math.max(departureTime - mt3d.clock.getTime(), mt3d.clock.speed === 1 ? configs.minStandingDuration : 0) :
                        final ? configs.minStandingDuration : configs.realtimeTrainCheckInterval,
                    clock: mt3d.clock
                });
            }
        }

        function trainRepeat(train, elapsed) {
            const delay = train.delay || 0,
                {arrivalTime, nextDepartureTime} = train;
            let minDuration, maxDuration;

            if (nextDepartureTime) {
                maxDuration = mt3d.clock.getTime(nextDepartureTime) + delay - mt3d.clock.getTime() + (elapsed || 0) - configs.minDelay + 60000 - configs.minStandingDuration;
            }
            if (arrivalTime) {
                minDuration = mt3d.clock.getTime(arrivalTime) + delay - mt3d.clock.getTime() + (elapsed || 0) - configs.minDelay;
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
                    const markedObjectIndex = train.cars.indexOf(mt3d.markedObject),
                        trackedObjectIndex = train.cars.indexOf(mt3d.trackedObject),
                        {nextTrains} = train;

                    if (nextTrains) {
                        stopTrain(train, true);
                        train = nextTrains[0];
                        if (!mt3d.activeTrainLookup[train.t]) {
                            trainStart(train, 0);
                        }
                        if (train.cars) {
                            updateTrainShape(train, 0);
                            if (markedObjectIndex !== -1) {
                                markObject(train.cars[markedObjectIndex]);
                            }
                            if (trackedObjectIndex !== -1) {
                                trackObject(train.cars[trackedObjectIndex]);
                            }
                        }
                        return;
                    }
                    trainStand(train, true);
                } else {
                    trainStand(train);
                }
            }, Math.abs(train.interval), minDuration, maxDuration, elapsed, mt3d.clock);
        }

        function refreshFlights() {
            const now = mt3d.clock.getTime();

            Object.keys(mt3d.flightLookup).forEach(key => {
                const flight = mt3d.flightLookup[key];

                if (flight.standing <= now && now <= flight.end && !mt3d.activeFlightLookup[flight.id]) {
                    mt3d.activeFlightLookup[flight.id] = flight;
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
                    duration: Math.max(flight.end - mt3d.clock.getTime(), 0)
                });
            }, flight.feature.properties.length, flight.maxSpeed, flight.acceleration, elapsed);
        }

        function startViewAnimation() {
            let t2 = 0;

            mt3d.trackingBaseBearing = map.getBearing() - performance.now() / 100;
            mt3d.viewAnimationID = animation.start({
                callback: (elapsed, duration) => {
                    const t1 = easeOutQuart(elapsed / duration),
                        factor = 1 - (1 - t1) / (1 - t2),
                        {coord: center, altitude, bearing} = mt3d.trackedObject.userData;

                    easeTo({
                        center,
                        altitude,
                        bearing,
                        centerFactor: factor,
                        bearingFactor: factor
                    });
                    t2 = t1;
                },
                complete: () => {
                    delete mt3d.viewAnimationID;
                },
                duration: 1000
            });
        }

        function stopViewAnimation() {
            if (mt3d.viewAnimationID) {
                animation.stop(mt3d.viewAnimationID);
                delete mt3d.viewAnimationID;
            }
        }

        function adjustCoord(coord, altitude, bearing) {
            if (!altitude) {
                return mapboxgl.LngLat.convert(coord);
            }

            const mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord, altitude);

            if (!isNaN(bearing)) {
                const offset = mCoord.z * Math.tan(map.getPitch() * DEGREE_TO_RADIAN),
                    x = mCoord.x + offset * Math.sin(bearing * DEGREE_TO_RADIAN),
                    y = mCoord.y - offset * Math.cos(bearing * DEGREE_TO_RADIAN);

                return new mapboxgl.MercatorCoordinate(x, y, 0).toLngLat();
            } else {
                const {width, height} = map.transform,
                    {x, y} = new THREE.Vector3(
                        mCoord.x - modelOrigin.x,
                        -(mCoord.y - modelOrigin.y),
                        mCoord.z
                    ).project(trainLayers.ug.camera);

                return map.unproject([(x + 1) / 2 * width, (1 - y) / 2 * height]);
            }
        }

        function getLocalizedRailwayTitle(railway) {
            const title = (mt3d.railwayLookup[railway] || {}).title || {};
            return title[mt3d.lang] || title['en'];
        }

        function getLocalizedRailDirectionTitle(direction) {
            const title = (mt3d.railDirectionLookup[direction] || {}).title || {};
            return title[mt3d.lang] || title['en'];
        }

        function getLocalizedTrainTypeTitle(type) {
            const title = (mt3d.trainTypeLookup[type] || {}).title || {};
            return title[mt3d.lang] || title['en'];
        }

        function getLocalizedStationTitle(array) {
            const stations = Array.isArray(array) ? array : [array];

            return stations.map(station => {
                const title = (mt3d.stationLookup[station] || {}).title || {};
                return title[mt3d.lang] || title['en'];
            }).join(mt3d.dict['and']);
        }

        function getLocalizedOperatorTitle(operator) {
            const title = (mt3d.operatorLookup[operator] || {}).title || {};
            return title[mt3d.lang] || title['en'];
        }

        function getLocalizedAirportTitle(airport) {
            const title = (mt3d.airportLookup[airport] || {}).title || {};
            return title[mt3d.lang] || title['en'];
        }

        function getLocalizedFlightStatusTitle(status) {
            const title = (mt3d.flightStatusLookup[status] || {}).title || {};
            return title[mt3d.lang] || title['en'];
        }

        function setTrainStandingStatus(train, standing) {
            const {lang, dict} = mt3d,
                {r: railwayID, nm: name, v: vehicle, ds: destination, departureTime, arrivalStation} = train,
                railway = mt3d.railwayLookup[railwayID],
                color = vehicle ? mt3d.trainVehicleLookup[vehicle].color : railway.color,
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
                departureTime ? ` ${mt3d.clock.getTimeString(mt3d.clock.getTime(departureTime), delay)}` : '',
                arrivalStation ? [
                    `<br><strong>${dict['next-stop']}:</strong> `,
                    getLocalizedStationTitle(arrivalStation),
                    arrivalTime ? ` ${mt3d.clock.getTimeString(mt3d.clock.getTime(arrivalTime) + delay)}` : ''
                ].join('') : '',
                delay >= 60000 ? `<br>${dict['delay'].replace('$1', Math.floor(delay / 60000))}</span>` : '',
                status && lang === 'ja' ? `<br><span class="desc-caution"><strong>${status}:</strong> ${text}</span>` : ''
            ].join('');
        }

        function setFlightStandingStatus(flight) {
            const {dict} = mt3d,
                {a: airlineID, n: flightNumber, ds: destination, or: origin} = flight,
                tailcolor = mt3d.operatorLookup[airlineID].tailcolor || '#FFFFFF',
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
            const {lang, container, dict} = mt3d,
                contentElement = container.querySelector('#timetable-content'),
                trains = [],
                sections = [],
                stations = [],
                offsets = [],
                {r: railwayID, nm: name, v: vehicle, ds: destination, nextTrains} = train,
                railway = mt3d.railwayLookup[railwayID],
                color = vehicle ? mt3d.trainVehicleLookup[vehicle].color : railway.color,
                delay = train.delay || 0;
            let currSection;

            container.querySelector('#timetable-header').innerHTML = [
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
                            s.a ? mt3d.clock.getTimeString(mt3d.clock.getTime(s.a) + delay) : '',
                            s.a && s.d ? '<br>' : '',
                            s.d ? mt3d.clock.getTimeString(mt3d.clock.getTime(s.d) + delay) : '',
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
            train.timetableOffsets = offsets.slice(currSection.start, currSection.end + 1);
            train.scrollTop = container.querySelector('#timetable-body').scrollTop;
        }

        function setTrainTimetableMark(train) {
            const {container} = mt3d,
                bodyElement = container.querySelector('#timetable-body'),
                {height} = bodyElement.getBoundingClientRect(),
                {timetableOffsets: offsets, timetableIndex: index} = train,
                curr = offsets[index],
                next = train.arrivalStation ? offsets[index + 1] : curr,
                y = curr + (next - curr) * train._t,
                p = performance.now() % 1500 / 1500;

            container.querySelector('#train-mark').innerHTML =
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
                if (mt3d.activeTrainLookup[curr.t]) {
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
                    if (car === mt3d.markedObject && !keep) {
                        markObject();
                    }
                    if (car === mt3d.trackedObject && !keep) {
                        trackObject();
                    }
                });
            }
            delete train.cars;
            delete mt3d.activeTrainLookup[t];
            delete train.delay;
            if (!tt) {
                delete mt3d.timetableData.splice(mt3d.timetableData.indexOf(train), 1);
            }
        }

        function stopFlight(flight) {
            const {id, animationID, aircraft} = flight;

            animation.stop(animationID);
            trainLayers.removeObject(aircraft, 1000);
            if (aircraft === mt3d.markedObject) {
                markObject();
            }
            if (aircraft === mt3d.trackedObject) {
                trackObject();
            }
            delete flight.aircraft;
            delete flight.body;
            delete flight.wing;
            delete flight.vTail;
            delete mt3d.activeFlightLookup[id];
        }

        function stopAll() {
            Object.keys(mt3d.activeTrainLookup).forEach(key =>
                stopTrain(mt3d.activeTrainLookup[key])
            );
            Object.keys(mt3d.activeFlightLookup).forEach(key =>
                stopFlight(mt3d.activeFlightLookup[key])
            );
            mt3d.realtimeTrainLookup = {};
            delete mt3d.lastTrainRefresh;
        }

        function resetRailwayStatus() {
            mt3d.railwayData.forEach(railway => {
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
            helpers.loadJSON(`${mt3d.dataUrl}/${getTimetableFileName(mt3d.clock)}`).then(data => {
                mt3d.timetableData = data;
                updateTimetableData(mt3d.timetableData);
                mt3d.trainLookup = helpers.buildLookup(mt3d.timetableData, 't');
                delete mt3d.lastTrainRefresh;
            });
        }

        function loadRealtimeTrainData() {
            const urls = [];

            Object.keys(OPERATORS_FOR_TRAININFORMATION).forEach(source => {
                const url = configs.apiUrl[source],
                    key = mt3d.secrets[source],
                    operators = OPERATORS_FOR_TRAININFORMATION[source]
                        .map(operator => `odpt.Operator:${operator}`)
                        .join(',');

                urls.push(`${url}odpt:TrainInformation?odpt:operator=${operators}&acl:consumerKey=${key}`);
            });

            const url = configs.apiUrl.tokyochallenge,
                key = mt3d.secrets.tokyochallenge,
                operators = OPERATORS_FOR_TRAINS
                    .map(operator => `odpt.Operator:${operator}`)
                    .join(',');

            urls.push(`${url}odpt:Train?odpt:operator=${operators}&acl:consumerKey=${key}`);

            Promise.all(urls.map(helpers.loadJSON)).then(trainData => {
                mt3d.realtimeTrainLookup = {};

                trainData.pop().forEach(trainRef => {
                    const delay = (trainRef['odpt:delay'] || 0) * 1000,
                        carComposition = trainRef['odpt:carComposition'],
                        trainType = helpers.removePrefix(trainRef['odpt:trainType']),
                        origin = helpers.removePrefix(trainRef['odpt:originStation']),
                        destination = helpers.removePrefix(trainRef['odpt:destinationStation']),
                        id = adjustTrainID(helpers.removePrefix(trainRef['owl:sameAs'])),
                        toStation = helpers.removePrefix(trainRef['odpt:toStation']),
                        fromStation = helpers.removePrefix(trainRef['odpt:fromStation']);
                    // Retry lookup replacing Marunouchi line with MarunouchiBranch line
                    let train = mt3d.trainLookup[id] || mt3d.trainLookup[id.replace('.Marunouchi.', '.MarunouchiBranch.')];
                    let changed = false;

                    if (train) {
                        mt3d.realtimeTrainLookup[id] = train;
                        if (train.delay !== delay) {
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
                        if (changed && mt3d.activeTrainLookup[id]) {
                            stopTrain(train, true);
                        }
                    } else {
                        const railwayID = helpers.removePrefix(trainRef['odpt:railway']);

                        // Exclude Namboku line trains that connect to/from Mita line
                        if (railwayID === RAILWAY_NAMBOKU && (origin[0].startsWith(RAILWAY_MITA) || destination[0].startsWith(RAILWAY_MITA))) {
                            return;
                        }

                        const railwayRef = mt3d.railwayLookup[railwayID],
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
                            mt3d.timetableData.push(train);
                            mt3d.realtimeTrainLookup[id] = mt3d.trainLookup[id] = train;
                        }
                    }
                    mt3d.lastDynamicUpdate[helpers.removePrefix(trainRef['odpt:operator'])] = trainRef['dc:date'].replace(/([\d\-])T([\d:]+).*/, '$1 $2');
                });

                resetRailwayStatus();

                [].concat(...trainData).forEach(trainInfoRef => {
                    const operatorID = helpers.removePrefix(trainInfoRef['odpt:operator']),
                        railwayID = helpers.removePrefix(trainInfoRef['odpt:railway']),
                        status = trainInfoRef['odpt:trainInformationStatus'],
                        text = trainInfoRef['odpt:trainInformationText'];

                    // Train information text is provided in Japanese only
                    if (railwayID && status && status.ja &&
                        helpers.includes(OPERATORS_FOR_TRAINS, operatorID) &&
                        status.ja.match(/見合わせ|折返し運転|運休|遅延/)) {
                        const railway = mt3d.railwayLookup[railwayID];

                        railway.status = status.ja;
                        railway.text = text.ja;
                        Object.keys(mt3d.activeTrainLookup).forEach(key => {
                            const train = mt3d.activeTrainLookup[key];
                            if (train.r === railwayID && !mt3d.realtimeTrainLookup[train.t]) {
                                stopTrain(train);
                            }
                        });
                    }
                });

                refreshTrains();
                refreshDelayMarkers();
                if (aboutPopup.isOpen()) {
                    updateAboutPopup();
                }
            }).catch(error => {
                refreshTrains();
                console.log(error);
            });
        }

        function loadRealtimeFlightData() {
            const urls = [],
                url = configs.apiUrl.tokyochallenge,
                key = mt3d.secrets.tokyochallenge,
                operators = OPERATORS_FOR_FLIGHTINFORMATION
                    .map(operator => `odpt.Operator:${operator}`)
                    .join(',');

            ['Arrival', 'Departure'].forEach(type => {
                urls.push(`${url}odpt:FlightInformation${type}?odpt:operator=${operators}&acl:consumerKey=${key}`);
            });

            Promise.all([
                configs.atisUrl,
                ...urls
            ].map(helpers.loadJSON)).then(([atisData, arrivalData, departureData]) => {
                const {landing, departure} = atisData,
                    pattern = [landing.join('/'), departure.join('/')].join(' '),
                    flightQueue = {};
                let arrRoutes = {},
                    depRoutes = {},
                    north = true;

                if (mt3d.flightPattern !== pattern) {
                    mt3d.flightPattern = pattern;
                    mt3d.lastFlightPatternChanged = Date.now();
                    Object.keys(mt3d.activeFlightLookup).forEach(key => {
                        stopFlight(mt3d.activeFlightLookup[key]);
                    });
                }

                if (helpers.includes(landing, ['R16L', 'R16R'])) { // South wind, good weather, rush hour
                    arrRoutes = {S: 'R16L', N: 'R16R'};
                    depRoutes = {S: '22', N: '16R'};
                    north = false;
                } else if (helpers.includes(landing, ['L22', 'L23'])) { // South wind, good weather
                    arrRoutes = {S: 'L23', N: 'L22'};
                    depRoutes = {S: 'O16R', N: '16L'};
                    north = false;
                } else if (helpers.includes(landing, ['I16L', 'I16R'])) { // South wind, bad weather, rush hour
                    arrRoutes = {S: 'I16L', N: 'I16R'};
                    depRoutes = {S: '22', N: '16R'};
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
                    let flight = mt3d.flightLookup[id],
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
                            airport = mt3d.airportLookup[destinationAirport || originAirport],
                            direction = airport ? airport.direction : 'S',
                            route = departureAirport === 'NRT' ? `NRT.${north ? '34L' : '16R'}.Dep` :
                            arrivalAirport === 'NRT' ? `NRT.${north ? '34R' : '16L'}.Arr` :
                            departureAirport === 'HND' ? `HND.${depRoutes[direction]}.Dep` :
                            arrivalAirport === 'HND' ? `HND.${arrRoutes[direction]}.Arr` : undefined,
                            feature = mt3d.featureLookup[route];

                        if (feature) {
                            flight = mt3d.flightLookup[id] = {
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
                        flight.start = flight.base = mt3d.clock.getTime(departureTime);
                        flight.standing = flight.start - standingDuration;
                        flight.end = flight.start + duration;
                    } else {
                        flight.start = flight.standing = mt3d.clock.getTime(arrivalTime) - duration;
                        flight.base = flight.start + duration - standingDuration;
                        flight.end = flight.start + duration + standingDuration;
                    }
                    flight.maxSpeed = maxSpeed;
                    flight.acceleration = acceleration;

                    if (flight.base < mt3d.lastFlightPatternChanged) {
                        return;
                    }

                    const queue = flightQueue[flight.runway] = flightQueue[flight.runway] || [];
                    queue.push(flight);

                    mt3d.lastDynamicUpdate[helpers.removePrefix(flightRef['odpt:operator'])] = flightRef['dc:date'].replace(/([\d\-])T([\d:]+).*/, '$1 $2');
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

        function loadWeatherData() {
            helpers.loadJSON(configs.nowcastsUrl).then(data => {
                weatherLayer.updateEmitterQueue(data);
            });
        }

        function updateUndergroundButton(enabled) {
            const button = mt3d.container.querySelector('.mapboxgl-ctrl-underground');

            if (button) {
                const {classList} = button;

                if (enabled) {
                    button.title = mt3d.dict['exit-underground'];
                    classList.add('mapboxgl-ctrl-underground-visible');
                } else {
                    button.title = mt3d.dict['enter-underground'];
                    classList.remove('mapboxgl-ctrl-underground-visible');
                }
            }
        }

        function updateTrackingButton(mode) {
            const button = mt3d.container.querySelector('.mapboxgl-ctrl-track');

            if (button) {
                const {classList} = button;

                if (mode === 'helicopter') {
                    classList.remove('mapboxgl-ctrl-track-train');
                    classList.add('mapboxgl-ctrl-track-helicopter');
                } else if (mode === 'train') {
                    classList.remove('mapboxgl-ctrl-track-helicopter');
                    classList.add('mapboxgl-ctrl-track-train');
                } else if (mode) {
                    classList.add('mapboxgl-ctrl-track-active');
                } else {
                    classList.remove('mapboxgl-ctrl-track-active');
                }
            }
        }

        function updatePlaybackButton(enabled) {
            const button = mt3d.container.querySelector('.mapboxgl-ctrl-playback');

            if (button) {
                const {classList} = button;

                if (enabled) {
                    button.title = mt3d.dict['exit-playback'];
                    classList.add('mapboxgl-ctrl-playback-active');
                } else {
                    button.title = mt3d.dict['enter-playback'];
                    classList.remove('mapboxgl-ctrl-playback-active');
                }
            }
        }

        function updateWeatherButton(enabled) {
            const button = mt3d.container.querySelector('.mapboxgl-ctrl-weather');

            if (button) {
                const {classList} = button;

                if (enabled) {
                    button.title = mt3d.dict['hide-weather'];
                    classList.add('mapboxgl-ctrl-weather-active');
                } else {
                    button.title = mt3d.dict['show-weather'];
                    classList.remove('mapboxgl-ctrl-weather-active');
                }
            }
        }

        function setUndergroundMode(enabled) {
            if (mt3d.isUndergroundVisible === enabled) {
                return;
            }

            updateUndergroundButton(enabled);
            trainLayers.ug.setSemitransparent(!enabled);
            trainLayers.og.setSemitransparent(enabled);
            map.setPaintProperty('background', 'background-color',
                enabled ? 'rgb(16,16,16)' : getStyleColorString(mt3d.styleColors[0], mt3d.clock));
            mt3d.styleOpacities.forEach(({id, key, opacity}) => {
                const factor = helpers.includes(id, '-og-') ? .25 : .0625;

                map.setPaintProperty(id, key, enabled ?
                    helpers.scaleValues(opacity, factor) : opacity);
            });
            mt3d.isUndergroundVisible = enabled;

            animation.start({
                callback: (elapsed, duration) => {
                    const t = elapsed / duration;

                    [13, 14, 15, 16, 17, 18].forEach(zoom => {
                        const opacity = mt3d.isUndergroundVisible ?
                            1 * t + .0625 * (1 - t) : 1 * (1 - t) + .0625 * t;

                        helpers.setLayerProps(map, `railways-ug-${zoom}`, {opacity});
                        helpers.setLayerProps(map, `stations-ug-${zoom}`, {opacity});
                    });
                    Object.keys(mt3d.activeTrainLookup).forEach(key => {
                        mt3d.activeTrainLookup[key].cars.forEach(car => {
                            setOpacity(car, getObjectOpacity(car, mt3d.isUndergroundVisible, t));
                        });
                    });
                    refreshDelayMarkers();
                    Object.keys(mt3d.activeFlightLookup).forEach(key => {
                        const aircraft = mt3d.activeFlightLookup[key].aircraft;
                        setOpacity(aircraft, getObjectOpacity(aircraft, mt3d.isUndergroundVisible, t));
                    });
                },
                duration: 300
            });
        }

        function setTrackingMode(mode) {
            if (mt3d.trackingMode === mode) {
                return;
            }

            updateTrackingButton(mode);
            mt3d.trackingMode = mode;
            if (mt3d.trackedObject) {
                startViewAnimation();
            }
        }

        function setPlaybackMode(enabled) {
            if (mt3d.isPlayback === enabled) {
                return;
            }

            updatePlaybackButton(enabled);
            stopAll();
            markObject();
            trackObject();
            if (enabled) {
                resetRailwayStatus();
            }
            mt3d.isEditingTime = false;
            mt3d.clock.reset();
            delete mt3d.tempDate;
            if (mt3d.lastTimetableRefresh !== mt3d.clock.getTime('03:00')) {
                loadTimetableData();
                mt3d.lastTimetableRefresh = mt3d.clock.getTime('03:00');
            }
            mt3d.isPlayback = enabled;
            updateClock();
            refreshStyleColors();
        }

        function setWeatherMode(enabled) {
            if (mt3d.isWeatherVisible === enabled) {
                return;
            }

            updateWeatherButton(enabled);
            if (enabled) {
                loadWeatherData();
            } else {
                weatherLayer.clear();
            }
            mt3d.isWeatherVisible = enabled;
        }

        function refreshStyleColors() {
            mt3d.styleColors.forEach(item => {
                const {id, key, stops} = item;

                if (id === 'background' && mt3d.isUndergroundVisible) {
                    map.setPaintProperty(id, key, 'rgb(16,16,16)');
                } else if (stops === undefined) {
                    map.setPaintProperty(id, key, getStyleColorString(item, mt3d.clock));
                } else {
                    const prop = map.getPaintProperty(id, key);

                    prop.stops[stops][1] = getStyleColorString(item, mt3d.clock);
                    map.setPaintProperty(id, key, prop);
                }
            });
        }

        function refreshDelayMarkers() {
            const dark = helpers.isDarkBackground(map),
                base = dark ? 0 : 1,
                blending = dark ? THREE.AdditiveBlending : THREE.MultiplyBlending;

            Object.keys(mt3d.activeTrainLookup).forEach(key => {
                const car = mt3d.activeTrainLookup[key].cars[0],
                    delayMarker = car && car.getObjectByName('marker');

                if (delayMarker) {
                    const {material} = delayMarker;

                    material.uniforms.base.value = base;
                    material.blending = blending;
                }
            });
        }

        function pickObject(point) {
            const layers = mt3d.isUndergroundVisible ? ['ug', 'og'] : ['og', 'ug'];
            let object;

            for (const layer of layers) {
                object = trainLayers[layer].pickObject(point);
                if (object) {
                    return object;
                }
                if (layer === 'ug') {
                    if (map.__deck.deckPicker) {
                        const {x, y} = point,
                            info = map.__deck.pickObject({x, y, layerIds: [`stations-ug-${mt3d.layerZoom}`]});

                        if (info) {
                            object = info.object;
                        }
                    }
                } else {
                    object = mt3d.pickedFeature;
                }
                if (object) {
                    return object;
                }
            }
        }

        function markObject(object) {
            if (mt3d.markedObject && mt3d.markedObject !== object) {
                let outline;

                if (mt3d.markedObject instanceof THREE.Group) {
                    while ((outline = mt3d.markedObject.getObjectByName('outline-marked'))) {
                        outline.parent.remove(outline);
                    }
                }
                delete mt3d.markedObject;
                if (popup.isOpen()) {
                    map.getCanvas().style.cursor = '';
                    popup.remove();
                }
            }

            if (object && object !== mt3d.markedObject) {
                mt3d.markedObject = object;
                map.getCanvas().style.cursor = 'pointer';
                updatePopup({setHTML: true, addToMap: true});

                if (object instanceof THREE.Group && !object.getObjectByName('outline-marked')) {
                    object.traverse(descendant => {
                        if (descendant.name === 'cube') {
                            descendant.add(createOutline(descendant, 'outline-marked'));
                        }
                    });
                }
            }
        }

        function trackObject(object) {
            if (mt3d.trackedObject) {
                let outline;

                while ((outline = mt3d.trackedObject.getObjectByName('outline-tracked'))) {
                    outline.parent.remove(outline);
                }
                delete mt3d.trackedObject;
                stopViewAnimation();
                updateTrackingButton(false);
                hideTimetable(mt3d.container);
            }

            if (object) {
                const {altitude, object: train} = object.userData;

                mt3d.trackedObject = object;
                startViewAnimation();
                updateTrackingButton(true);
                setUndergroundMode(altitude < 0);
                if (train.tt) {
                    showTimetable(mt3d.container);
                    setTrainTimetableText(train);
                }

                if (!object.getObjectByName('outline-tracked')) {
                    object.traverse(descendant => {
                        if (descendant.name === 'cube') {
                            descendant.add(createOutline(descendant, 'outline-tracked'));
                        }
                    });
                }
            }
        }

        function refreshOutline() {
            const p = performance.now() % 1500 / 1500 * 2;

            mt3d.trackedObject.traverse(descendant => {
                if (descendant.name === 'outline-tracked') {
                    descendant.material.opacity = p < 1 ? p : 2 - p;
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
            const {lang, container} = mt3d;
            let date = mt3d.clock.getJSTDate(),
                dateString = date.toLocaleDateString(lang, DATE_FORMAT);

            if (lang === 'ja' && JapaneseHolidays.isHoliday(date)) {
                dateString = dateString.replace(/\(.+\)/, '(祝)');
            }
            if (!mt3d.isEditingTime) {
                container.querySelector('#date').innerHTML = dateString;
                container.querySelector('#time').innerHTML = date.toLocaleTimeString(lang);
            } else {
                if (mt3d.tempDate) {
                    date = mt3d.tempDate;
                    dateComponents.forEach(({id}) => {
                        container.querySelector(`#${id}`).classList.add('desc-caution');
                    });
                    container.querySelector('#edit-time-ok-button').disabled = false;
                }
                dateComponents.forEach(({id, fn, digits, extra}) => {
                    container.querySelector(`#${id}`).innerHTML =
                        `0${date[`get${fn}`]() + extra}`.slice(-digits);
                });
            }
        }

        function updateClock() {
            const {container, dict} = mt3d;

            container.querySelector('#clock').innerHTML = [
                !mt3d.isPlayback || !mt3d.isEditingTime ?
                    '<span id="date"></span><br><span id="time"></span><br>' : '',
                mt3d.isPlayback && !mt3d.isEditingTime ? [
                    '<div class="clock-button">',
                    `<span><button id="edit-time-button">${dict['edit-date-time']}</button></span>`,
                    '</div>'
                ].join('') : '',
                mt3d.isPlayback && mt3d.isEditingTime ? [
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
                mt3d.isPlayback ? [
                    '<div class="speed-controller">',
                    '<span><button id="speed-decrease-button" class="left-button"',
                    mt3d.clock.speed === 1 ? ' disabled' : '',
                    '><span class="decrease-icon"></span></button></span>',
                    `<span id="clock-speed">${mt3d.clock.speed}${dict['x-speed']}</span>`,
                    '<span><button id="speed-increase-button" class="right-button"',
                    mt3d.clock.speed === 600 ? ' disabled' : '',
                    '><span class="increase-icon"></span></button></span>',
                    '</div>'
                ].join('') : ''
            ].join('');

            refreshClock();
            container.querySelector('#clock').style.display = 'block';

            if (mt3d.isPlayback && mt3d.isEditingTime) {
                container.querySelector('#edit-time-cancel-button').addEventListener('click', () => {
                    delete mt3d.tempDate;
                    mt3d.isEditingTime = false;
                    updateClock();
                });
                container.querySelector('#edit-time-ok-button').addEventListener('click', () => {
                    if (mt3d.tempDate) {
                        stopAll();
                        markObject();
                        trackObject();

                        mt3d.clock.setDate(mt3d.tempDate);
                        delete mt3d.tempDate;

                        if (mt3d.lastTimetableRefresh !== mt3d.clock.getTime('03:00')) {
                            loadTimetableData();
                            mt3d.lastTimetableRefresh = mt3d.clock.getTime('03:00');
                        }
                    }

                    mt3d.isEditingTime = false;
                    updateClock();
                });
            }

            if (mt3d.isPlayback && !mt3d.isEditingTime) {
                container.querySelector('#edit-time-button').addEventListener('click', () => {
                    mt3d.isEditingTime = true;
                    updateClock();
                });
            }

            if (mt3d.isPlayback && mt3d.isEditingTime) {
                dateComponents.forEach(({id, fn}) => {
                    container.querySelector(`#${id}-increase-button`).addEventListener('click', () => {
                        mt3d.tempDate = mt3d.tempDate || mt3d.clock.getJSTDate();
                        mt3d.tempDate[`set${fn}`](mt3d.tempDate[`get${fn}`]() + 1);
                        refreshClock();
                    });
                    container.querySelector(`#${id}-decrease-button`).addEventListener('click', () => {
                        mt3d.tempDate = mt3d.tempDate || mt3d.clock.getJSTDate();
                        mt3d.tempDate[`set${fn}`](mt3d.tempDate[`get${fn}`]() - 1);
                        refreshClock();
                    });
                });
            }

            if (mt3d.isPlayback) {
                container.querySelector('#speed-increase-button').addEventListener('click', function() {
                    mt3d.clock.setSpeed(mt3d.clock.speed + (mt3d.clock.speed < 10 ? 1 : mt3d.clock.speed < 100 ? 10 : 100));
                    this.disabled = mt3d.clock.speed === 600;
                    container.querySelector('#speed-decrease-button').disabled = false;
                    container.querySelector('#clock-speed').innerHTML = mt3d.clock.speed + dict['x-speed'];
                });
                container.querySelector('#speed-decrease-button').addEventListener('click', function() {
                    mt3d.clock.setSpeed(mt3d.clock.speed - (mt3d.clock.speed <= 10 ? 1 : mt3d.clock.speed <= 100 ? 10 : 100));
                    this.disabled = mt3d.clock.speed === 1;
                    container.querySelector('#speed-increase-button').disabled = false;
                    container.querySelector('#clock-speed').innerHTML = mt3d.clock.speed + dict['x-speed'];
                });
            }
        }

        function updatePopup(options) {
            const {setHTML, addToMap} = options || {};

            if (mt3d.markedObject instanceof THREE.Group) {
                const {coord, altitude, object} = mt3d.markedObject.userData,
                    bearing = mt3d.markedObject === mt3d.trackedObject ? map.getBearing() : undefined;

                popup.setLngLat(adjustCoord(coord, altitude, bearing));
                if (setHTML) {
                    popup.setHTML(object.description);
                }
            } else {
                const coord = getCoord(centerOfMass(mt3d.markedObject)),
                    altitude = getCoords(mt3d.markedObject)[0][0][2];

                popup.setLngLat(adjustCoord(coord, altitude));
                if (setHTML) {
                    let ids = mt3d.markedObject.properties.ids;
                    const stations = {};

                    if (typeof ids === 'string') {
                        ids = JSON.parse(ids);
                    }
                    ids.forEach(id => {
                        const title = getLocalizedStationTitle(id),
                            railwayID = mt3d.stationLookup[id].railway,
                            railways = stations[title] = stations[title] || {};

                        railways[getLocalizedRailwayTitle(railwayID)] = mt3d.railwayLookup[railwayID].color;
                    });
                    popup.setHTML([
                        '<div class="station-image-container">',
                        '<div class="ball-pulse"><div></div><div></div><div></div></div>',
                        `<div class="station-image" style="background-image: url(\'${mt3d.stationLookup[ids[0]].thumbnail}\');"></div>`,
                        '</div>',
                        '<div class="railway-list">',
                        Object.keys(stations).map(station => {
                            const railways = Object.keys(stations[station])
                                .map(railway => `<div class="line-strip" style="background-color: ${stations[station][railway]};"></div><span>${railway}</span>`)
                                .join('<br>');

                            return `<strong>${station}</strong><br>${railways}`;
                        }).join('<br>'),
                        '</div>'
                    ].join(''));
                }
            }
            if (addToMap) {
                popup.addTo(map);
            }
        }

        function updateAboutPopup() {
            const {container, dict} = mt3d,
                r1 = container.querySelector('#map').getBoundingClientRect(),
                r2 = container.querySelector('.mapboxgl-ctrl-about').getBoundingClientRect(),
                staticCheck = container.querySelector('#acd-static'),
                dynamicCheck = container.querySelector('#acd-dynamic'),
                html = [
                    dict['description'],
                    `<input id="${container.id}-acd-static" class="acd-check" type="checkbox"`,
                    staticCheck && staticCheck.checked ? ' checked' : '',
                    '>',
                    `<label class="acd-label" for="${container.id}-acd-static"><span class="acd-icon"></span>${dict['static-update']}</label>`,
                    `<div class="acd-content">${configs.lastStaticUpdate}</div>`,
                    `<input id="${container.id}-acd-dynamic" class="acd-check" type="checkbox"`,
                    dynamicCheck && dynamicCheck.checked ? ' checked' : '',
                    '>',
                    `<label class="acd-label" for="${container.id}-acd-dynamic"><span class="acd-icon"></span>${dict['dynamic-update']}</label>`,
                    '<div class="acd-content">',
                    mt3d.lastDynamicUpdate['JR-East'] || 'N/A',
                    ` (${dict['jr-east']})<br>`,
                    mt3d.lastDynamicUpdate['TokyoMetro'] || 'N/A',
                    ` (${dict['tokyo-metro']})<br>`,
                    mt3d.lastDynamicUpdate['Toei'] || 'N/A',
                    ` (${dict['toei']})<br>`,
                    mt3d.lastDynamicUpdate['HND-JAT'] || 'N/A',
                    ` (${dict['hnd-jat']})<br>`,
                    mt3d.lastDynamicUpdate['HND-TIAT'] || 'N/A',
                    ` (${dict['hnd-tiat']})<br>`,
                    mt3d.lastDynamicUpdate['NAA'] || 'N/A',
                    ` (${dict['naa']})</div>`
                ].join('');

            aboutPopup.setLngLat(map.unproject([r2.left - r1.left - 5, r2.top - r1.top + 15])).setHTML(html);
        }
    });

    function updateTimetableData(data) {
        const lookup = helpers.buildLookup(data);

        data.forEach(train => {
            const railway = mt3d.railwayLookup[train.r],
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
                            mt3d.clock.getTime(tt[tt.length - 1].a || tt[tt.length - 1].d || table[0].d) - configs.standingDuration);
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
            train.start = Math.min(start, mt3d.clock.getTime(table[0].d) - configs.standingDuration);
            train.end = mt3d.clock.getTime(table[length - 1].a ||
                table[length - 1].d ||
                table[Math.max(length - 2, 0)].d);
            train.direction = direction;
            train.altitude = railway.altitude;
            train.carComposition = railway.carComposition;
            train.previousTrains = previousTrains;
            train.nextTrains = nextTrains;
        });
    }

    function setSectionData(train, index, final) {
        const {stations} = mt3d.railwayLookup[train.r],
            {direction, tt: table} = train,
            destination = (train.ds || [])[0],
            delay = train.delay || 0,
            now = mt3d.clock.getTime();
        let ttIndex, current, next, departureStation, arrivalStation, currentSection, nextSection, finalSection;

        if (table) {
            ttIndex = helpers.valueOrDefault(index, table.reduce((acc, cur, i) => {
                return cur.d && mt3d.clock.getTime(cur.d) + delay <= now ? i : acc;
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

}

function insertTags(container) {
    container.innerHTML = `
<div id="map"></div>
<div id="clock"></div>
<input id="search-box" type="text" list="stations">
<div id="timetable">
    <div id="timetable-header"></div>
    <div id="timetable-body">
        <div class="scroll-box">
            <div id="timetable-content"></div>
            <svg id="railway-mark"></svg>
            <svg id="train-mark"></svg>
        </div>
    </div>
    <div id="timetable-button" class="slide-down"></div>
</div>
<div id="loader" class="loader-inner ball-pulse">
    <div></div><div></div><div></div>
</div>
<div id="loading-error"></div>`;
}

function showErrorMessage(container) {
    container.querySelector('#loader').style.display = 'none';
    container.querySelector('#loading-error').innerHTML = 'Loading failed. Please reload the page.';
    container.querySelector('#loading-error').style.display = 'block';
}

function showTimetable(container) {
    const {style} = container.querySelector('#timetable'),
        {classList} = container.querySelector('#timetable-button');

    style.display = 'block';
    style.height = '33%';
    classList.remove('slide-up');
    classList.add('slide-down');
}

function hideTimetable(container) {
    container.querySelector('#timetable').style.display = 'none';
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

function startTrainAnimation(callback, endCallback, distance, minDuration, maxDuration, start, clock) {
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
  * @param {object} clock - Clock object
  * @returns {string} Modified style color string
  */
function getStyleColorString(color, clock) {
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
  * @param {number} factor - Float in the range of 0.0 - 1.0 indicating the
  *     factor of the opacity when fading in or out
  */
function setOpacity(object, opacity, factor) {
    object.traverse(({material: materials, name}) => {
        const value = (name === 'outline-marked' ? 1 : opacity) * helpers.valueOrDefault(factor, 1);

        if (materials && name !== 'outline-tracked') {
            const uniforms = materials.uniforms;

            if (uniforms) {
                uniforms.opacity.value = value;
            } else if (Array.isArray(materials)) {
                materials.forEach(material => {
                    material.opacity = value;
                });
            } else {
                materials.opacity = value;
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

function createOutline(object, name) {
    const {width, height, depth} = object.geometry.parameters,
        {translate} = object.geometry.userData,
        outline = new THREE.Mesh(
            new THREE.BoxBufferGeometry(width + .2, height + .2, depth + .2),
            new THREE.MeshBasicMaterial({color: '#FFFFFF', side: THREE.BackSide, transparent: true})
        );

    outline.name = name;
    if (translate) {
        outline.geometry.translate(translate.x, translate.y, translate.z);
    }
    return outline;
}

function getObjectOpacity(object, isUndergroundVisible, t) {
    t = helpers.valueOrDefault(t, 1);
    return isUndergroundVisible === (object.userData.altitude < 0) ?
        .9 * t + .225 * (1 - t) : .9 * (1 - t) + .225 * t;
}

function getTimetableFileName(clock) {
    const calendar = clock.getCalendar() === 'Weekday' ? 'weekday' : 'holiday';

    return `timetable-${calendar}.json.gz`;
}
