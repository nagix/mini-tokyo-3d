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
import SunCalc from 'suncalc';
import animation from './animation';
import AboutPopup from './about-popup';
import Clock from './clock';
import ClockControl from './clock-control';
import configs from './configs';
import DetailPanel from './detail-panel';
import FireworksLayer from './fireworks-layer';
import * as helpers from './helpers';
import * as helpersThree from './helpers-three';
import MapboxGLButtonControl from './mapbox-gl-button-control';
import SharePanel from './share-panel';
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

const DEGREE_TO_RADIAN = Math.PI / 180;

const modelOrigin = mapboxgl.MercatorCoordinate.fromLngLat(configs.originCoord),
    modelScale = modelOrigin.meterInMercatorCoordinateUnits();

const isEdge = helpers.includes(navigator.userAgent, 'Edge');

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

        me.initialCenter = helpers.valueOrDefault(options.center, configs.originCoord);
        me.initialZoom = helpers.valueOrDefault(options.zoom, configs.defaultZoom);
        me.initialBearing = helpers.valueOrDefault(options.bearing, configs.defaultBearing);
        me.initialPitch = helpers.valueOrDefault(options.pitch, configs.defaultPitch);
        me.frameRate = helpers.valueOrDefault(options.frameRate, configs.defaultFrameRate);

        me.lastDynamicUpdate = {};

        me.container.classList.add('mini-tokyo-3d');
        insertTags(me.container);

        loadData(me.dataUrl, me.lang, me.clock).then(data => {
            Object.assign(me, data);
            me.initialize();
        }).catch(error => {
            showErrorMessage(me.container);
            throw error;
        });
    }

    /**
     * Returns the map's geographical centerpoint.
     * @returns {LngLat} The map's geographical centerpoint
     */
    getCenter() {
        const {map, initialCenter} = this;

        return map ? map.getCenter() : new mapboxgl.LngLat(initialCenter);
    }

    /**
     * Sets the map's geographical centerpoint. Equivalent to jumpTo({center: center}).
     * @param {LngLatLike} center - The centerpoint to set
     * @returns {MiniTokyo3D} this
     */
    setCenter(center) {
        const me = this,
            {map} = me;

        if (map) {
            me.trackObject();
            map.setCenter(center);
        } else {
            me.initialCenter = center;
        }
        return me;
    }

    /**
     * Returns the map's current zoom level.
     * @returns {number} The map's current zoom level
     */
    getZoom() {
        const {map, initialZoom} = this;

        return map ? map.getZoom() : initialZoom;
    }

    /**
     * Sets the map's zoom level. Equivalent to jumpTo({zoom: zoom}).
     * @param {number} zoom - The zoom level to set (0-20)
     * @returns {MiniTokyo3D} this
     */
    setZoom(zoom) {
        const me = this,
            {map} = me;

        if (map) {
            map.setZoom(zoom);
        } else {
            me.initialZoom = zoom;
        }
        return me;
    }

    /**
     * Returns the map's current bearing. The bearing is the compass direction that
     * is "up"; for example, a bearing of 90° orients the map so that east is up.
     * @returns {number} The map's current bearing
     */
    getBearing() {
        const {map, initialBearing} = this;

        return map ? map.getBearing() : initialBearing;
    }

    /**
     * Sets the map's bearing (rotation). The bearing is the compass direction that
     * is "up"; for example, a bearing of 90° orients the map so that east is up.
     * Equivalent to jumpTo({bearing: bearing}).
     * @param {number} bearing - The desired bearing
     * @returns {MiniTokyo3D} this
     */
    setBearing(bearing) {
        const me = this,
            {map} = me;

        if (map) {
            me.trackObject();
            map.setBearing(bearing);
        } else {
            me.initialBearing = bearing;
        }
        return me;
    }

    /**
     * Returns the map's current pitch (tilt).
     * @returns {number} The map's current pitch, measured in degrees away from the
     *     plane of the screen
     */
    getPitch() {
        const {map, initialPitch} = this;

        return map ? map.getPitch() : initialPitch;
    }

    /**
     * Sets the map's pitch (tilt). Equivalent to jumpTo({pitch: pitch}).
     * @param {number} pitch - The pitch to set, measured in degrees away from the
     *     plane of the screen (0-60)
     * @returns {MiniTokyo3D} this
     */
    setPitch(pitch) {
        const me = this,
            {map} = me;

        if (map) {
            map.setPitch(pitch);
        } else {
            me.initialPitch = pitch;
        }
        return me;
    }

    /**
     * Changes any combination of center, zoom, bearing, pitch, and padding with an
     * animated transition between old and new values. The map will retain its current
     * values for any details not specified in options.
     * @param {object} options - Options describing the destination and animation of
     *     the transition. Accepts CameraOptions and AnimationOptions
     * @returns {MiniTokyo3D} this
     */
    easeTo(options) {
        const me = this,
            {map} = me,
            {center, bearing} = options;

        if (map) {
            if (center !== undefined || bearing !== undefined) {
                me.trackObject();
            }
            map.easeTo(options);
        }
        return me;
    }

    /**
     * Changes any combination of center, zoom, bearing, and pitch, animating the
     * transition along a curve that evokes flight. The animation seamlessly incorporates
     * zooming and panning to help the user maintain her bearings even after traversing
     * a great distance.
     * @param {object} options - Options describing the destination and animation of
     *     the transition. Accepts CameraOptions, AnimationOptions, and a few additional
     *     options
     * @returns {MiniTokyo3D} this
     */
    flyTo(options) {
        const me = this,
            {map} = me,
            {center, bearing} = options;

        if (map) {
            if (center !== undefined || bearing !== undefined) {
                me.trackObject();
            }
            map.flyTo(options);
        }
        return me;
    }

    /**
     * Changes any combination of center, zoom, bearing, and pitch, without an animated
     * transition. The map will retain its current values for any details not specified
     * in options.
     * @param {CameraOptions} options - Options object
     * @returns {MiniTokyo3D} this
     */
    jumpTo(options) {
        const me = this,
            {map} = me,
            {center, bearing} = options;

        if (map) {
            if (center !== undefined || bearing !== undefined) {
                me.trackObject();
            }
            map.jumpTo(options);
        }
        return me;
    }

    initialize() {
        const me = this;

        Object.assign(me.secrets, me.options.secrets);
        mapboxgl.accessToken = me.secrets.mapbox;
        const map = me.map = new mapboxgl.Map({
            container: me.container.querySelector('#map'),
            style: `${me.dataUrl}/osm-liberty.json`,
            customAttribution: me.infoControl ? '' : configs.customAttribution,
            hash: helpers.valueOrDefault(me.options.hash, false),
            center: me.initialCenter,
            zoom: me.initialZoom,
            bearing: me.initialBearing,
            pitch: me.initialPitch
        });

        const unit = Math.pow(2, 14 - helpers.clamp(map.getZoom(), 13, 19));

        me.layerZoom = helpers.clamp(Math.floor(map.getZoom()), 13, 18);
        me.objectUnit = Math.max(unit * .19, .02);
        me.objectScale = unit * modelScale * 100;
        // me.carScale = Math.max(.02 / .19 / unit, 1);
        me.aircraftScale = Math.max(.06 / .285 / unit, 1);

        const trainLayers = me.trainLayers = {
            ug: new ThreeLayer('trains-ug', true, true),
            og: new ThreeLayer('trains-og'),
            addObject(object, duration) {
                const layer = object.userData.altitude < 0 ? this.ug : this.og;

                helpersThree.setOpacity(object, 0);
                layer.scene.add(object);
                if (duration > 0) {
                    animation.start({
                        callback: elapsed => {
                            helpersThree.setOpacity(object, getObjectOpacity(object, me.isUndergroundVisible), elapsed / duration);
                        },
                        duration
                    });
                }
            },
            updateObject(object, duration) {
                const layer = object.userData.altitude < 0 ? this.ug : this.og;

                layer.scene.add(object);
                if (duration > 0) {
                    animation.start({
                        callback: elapsed => {
                            helpersThree.setOpacity(object, getObjectOpacity(object, me.isUndergroundVisible, elapsed / duration));
                        },
                        duration
                    });
                }
            },
            removeObject(object, duration) {
                if (!object) {
                    return;
                }

                const layer = object.userData.altitude < 0 ? this.ug : this.og;

                helpersThree.resetPolygonOffsetFactor(object);
                object.renderOrder = 1;
                if (duration > 0) {
                    animation.start({
                        callback: elapsed => {
                            helpersThree.setOpacity(object, getObjectOpacity(object, me.isUndergroundVisible), 1 - elapsed / duration);
                        },
                        complete: () => {
                            layer.scene.remove(object);
                        },
                        duration
                    });
                } else {
                    layer.scene.remove(object);
                }
            },
            pickObject(point) {
                if (me.isUndergroundVisible) {
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

        const weatherLayer = me.weatherLayer = new WeatherLayer('weather');

        me.railwayLookup = helpers.buildLookup(me.railwayData);
        me.stationLookup = helpers.buildLookup(me.stationData);

        // Build feature lookup dictionary and update feature properties
        me.featureLookup = {};
        featureEach(me.featureCollection, feature => {
            const {id} = feature.properties;
            if (id && !id.match(/\.(ug|og)\./)) {
                me.featureLookup[id] = feature;
                updateDistances(feature);
            }
        });

        me.lastTimetableRefresh = me.clock.getTime('03:00');
        me.updateTimetableData(me.timetableData);
        me.trainLookup = helpers.buildLookup(me.timetableData, 't');

        if (me.options.selection) {
            const id = helpers.removePrefix(me.options.selection);

            if (!id.match(/NRT|HND/)) {
                const train = me.trainLookup[id];

                me.selection = train ? getConnectingTrainIds(train) : [id];
            } else {
                me.selection = id;
            }
        }

        me.railDirectionLookup = helpers.buildLookup(me.railDirectionData);
        me.trainTypeLookup = helpers.buildLookup(me.trainTypeData);
        me.trainVehicleLookup = helpers.buildLookup(me.trainVehicleData);
        me.operatorLookup = helpers.buildLookup(me.operatorData);
        me.airportLookup = helpers.buildLookup(me.airportData);
        me.flightStatusLookup = helpers.buildLookup(me.flightStatusData);

        me.activeTrainLookup = {};
        me.realtimeTrainLookup = {};
        me.activeFlightLookup = {};
        me.flightLookup = {};

        map.once('load', () => {
            me.container.querySelector('#loader').style.opacity = 0;
            setTimeout(() => {
                me.container.querySelector('#loader').style.display = 'none';
            }, 1000);
        });

        map.once('styledata', () => {
            ['poi', 'poi_extra'].forEach(id => {
                map.setLayoutProperty(id, 'text-field', `{name_${me.lang.match(/ja|ko|zh-Han[st]/) ? me.lang : 'en'}}`);
            });

            [13, 14, 15, 16, 17, 18].forEach(zoom => {
                const minzoom = zoom <= 13 ? 0 : zoom,
                    maxzoom = zoom >= 18 ? 24 : zoom + 1,
                    lineWidthScale = zoom === 13 ? helpers.clamp(Math.pow(2, map.getZoom() - 12), .125, 1) : 1;

                map.addLayer(new MapboxLayer({
                    id: `railways-ug-${zoom}`,
                    type: GeoJsonLayer,
                    data: featureFilter(me.featureCollection, p =>
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
                    data: featureFilter(me.featureCollection, p =>
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
                        data: featureFilter(me.featureCollection, p =>
                            p.zoom === zoom && p.type === 0 && p.altitude === 0
                        )
                    },
                    stationSource = {
                        type: 'geojson',
                        data: featureFilter(me.featureCollection, p =>
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
                data: featureFilter(me.featureCollection, p =>
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

            map.addLayer(new FireworksLayer('fireworks', me.clock, [{
                // Sumidagawa 1 (2020-07-23 19:00 to 20:30)
                coord: [139.8061467, 35.7168468],
                start: 1595498400000,
                end: 1595503800000
            }, {
                // Sumidagawa 2 (2020-07-23 19:30 to 20:30)
                coord: [139.7957901, 35.7053016],
                start: 1595500200000,
                end: 1595503800000
            }, {
                // Adachi (2020-07-24 19:30 to 20:30)
                coord: [139.7960082, 35.7596802],
                start: 1595586600000,
                end: 1595590200000
            }, {
                // Makuhari (2020-07-25 19:00 to 20:20)
                coord: [140.0265839, 35.6429351],
                start: 1595671200000,
                end: 1595676000000
            }, {
                // Minatomirai (2020-07-26 19:30 to 19:55)
                coord: [139.6411158, 35.4606603],
                start: 1595759400000,
                end: 1595760900000
            }]), 'poi');

            map.addLayer(weatherLayer, 'poi');

            me.styleColors = helpers.getStyleColors(map);
            me.styleOpacities = helpers.getStyleOpacities(map);

            const datalist = document.createElement('datalist');
            datalist.id = 'stations';
            me.stationTitleLookup = {};
            [me.lang, 'en'].forEach(l => {
                me.stationData.forEach(station => {
                    const title = station.title[l],
                        {coord} = station;

                    if (title && !me.stationTitleLookup[title.toUpperCase()] && coord && coord[0] && coord[1]) {
                        const option = document.createElement('option');

                        option.value = title;
                        datalist.appendChild(option);
                        me.stationTitleLookup[title.toUpperCase()] = station;
                    }
                });
            });
            document.body.appendChild(datalist);

            const searchBox = me.container.querySelector('#search-box');
            const searchListener = event => {
                const station = me.stationTitleLookup[event.target.value.toUpperCase()];

                if (station && station.coord) {
                    me.markObject();
                    me.trackObject();
                    if (me.isUndergroundVisible) {
                        me.setUndergroundMode(station.altitude < 0);
                    }
                    if (!me.isUndergroundVisible) {
                        map.once('moveend', () => {
                            me.setUndergroundMode(station.altitude < 0);
                        });
                    }
                    map.flyTo({
                        center: station.coord,
                        zoom: Math.max(map.getZoom(), 15)
                    });
                }
            };
            searchBox.placeholder = me.dict['station-name'];
            searchBox.addEventListener('change', searchListener);

            // Workaround for Edge
            if (isEdge) {
                searchBox.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        searchListener(event);
                    } else {
                        me.typing = true;
                    }
                });
                searchBox.addEventListener('input', event => {
                    if (!me.typing) {
                        searchListener(event);
                    }
                    delete me.typing;
                });
            }

            if (me.searchControl) {
                const control = new MapboxGLButtonControl([{
                    className: 'mapboxgl-ctrl-search',
                    title: me.dict['search'],
                    eventHandler() {
                        const {style} = this;

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

            if (me.navigationControl) {
                const control = new mapboxgl.NavigationControl();

                control._setButtonTitle = function(button) {
                    const {_zoomInButton, _zoomOutButton, _compass} = this,
                        title = button === _zoomInButton ? me.dict['zoom-in'] :
                        button === _zoomOutButton ? me.dict['zoom-out'] :
                        button === _compass ? me.dict['compass'] : '';

                    button.title = title;
                    button.setAttribute('aria-label', title);
                };
                map.addControl(control);
            }

            if (me.fullscreenControl) {
                const control = new mapboxgl.FullscreenControl({container: me.container});

                control._updateTitle = function() {
                    const {_fullscreenButton} = this,
                        title = me.dict[this._isFullscreen() ? 'exit-fullscreen' : 'enter-fullscreen'];

                    _fullscreenButton.title = title;
                    _fullscreenButton.setAttribute('aria-label', title);
                };
                map.addControl(control);
            }

            if (me.modeControl) {
                const control = new MapboxGLButtonControl([{
                    className: 'mapboxgl-ctrl-underground',
                    title: me.dict['enter-underground'],
                    eventHandler() {
                        me.setUndergroundMode(!me.isUndergroundVisible);
                    }
                }, {
                    className: `mapboxgl-ctrl-track mapboxgl-ctrl-track-${me.trackingMode}`,
                    title: me.dict['track'],
                    eventHandler(event) {
                        me.setTrackingMode(me.trackingMode === 'helicopter' ? 'train' : 'helicopter');
                        event.stopPropagation();
                    }
                }, {
                    className: 'mapboxgl-ctrl-playback',
                    title: me.dict['enter-playback'],
                    eventHandler() {
                        me.setPlaybackMode(!me.isPlayback);
                    }
                }, {
                    className: 'mapboxgl-ctrl-weather',
                    title: me.dict['show-weather'],
                    eventHandler() {
                        me.setWeatherMode(!me.isWeatherVisible);
                    }
                }]);
                map.addControl(control, 'top-right');
            }

            const aboutPopup = me.aboutPopup = new AboutPopup();

            if (me.infoControl) {
                map.addControl(new MapboxGLButtonControl([{
                    className: 'mapboxgl-ctrl-about',
                    title: me.dict['about'],
                    eventHandler() {
                        if (!aboutPopup.isOpen()) {
                            aboutPopup.updateContent(me.dict, me.lastDynamicUpdate).addTo(map);
                        } else {
                            aboutPopup.remove();
                        }
                    }
                }]));
            }

            if (me.clockControl) {
                me.clockCtrl = new ClockControl({lang: me.lang, dict: me.dict, clock: me.clock});
                me.clockCtrl.on('change', me.onClockChange.bind(me));
                map.addControl(me.clockCtrl);
            }

            const popup = me.popup = new mapboxgl.Popup({
                className: 'popup-object',
                closeButton: false,
                closeOnClick: false,
                maxWidth: '300px',
                offset: {
                    top: [0, 10],
                    bottom: [0, -30]
                }
            });

            [13, 14, 15, 16, 17, 18].forEach(zoom => {
                map.on('mouseenter', `stations-og-${zoom}`, e => {
                    me.pickedFeature = e.features[0];
                });
                map.on('click', `stations-og-${zoom}`, e => {
                    me.pickedFeature = e.features[0];
                });
                map.on('mouseleave', `stations-og-${zoom}`, () => {
                    delete me.pickedFeature;
                });
            });

            map.on('mousemove', e => {
                me.markObject(me.pickObject(e.point));
            });

            map.on('click', e => {
                const object = me.pickObject(e.point);

                me.markObject(object);
                if (!object || helpersThree.isObject3D(object)) {
                    me.trackObject(object);
                }

                // For development
                console.log(e.lngLat);
            });

            map.on('zoom', () => {
                /*
                if (me.trackedObject) {
                    const {altitude} = me.trackedObject.userData;
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

                me.layerZoom = helpers.clamp(Math.floor(zoom), 13, 18);
                me.objectUnit = Math.max(unit * .19, .02);
                me.objectScale = unit * modelScale * 100;
                // me.carScale = Math.max(.02 / .19 / unit, 1);
                me.aircraftScale = Math.max(.06 / .285 / unit, 1);

                Object.keys(me.activeTrainLookup).forEach(key => {
                    const train = me.activeTrainLookup[key];

                    me.updateTrainProps(train);
                    me.updateTrainShape(train);
                });
                Object.keys(me.activeFlightLookup).forEach(key => {
                    me.updateFlightShape(me.activeFlightLookup[key]);
                });
            });

            map.on('move', () => {
                if (me.isWeatherVisible) {
                    weatherLayer.updateEmitterQueue();
                }
                if (popup.isOpen()) {
                    me.updatePopup();
                }
            });

            map.on('resize', e => {
                trainLayers.onResize(e);
            });

            animation.init();

            animation.start({
                callback: () => {
                    const now = me.clock.getTime();

                    if (now - me.lastTimetableRefresh >= 86400000) {
                        me.loadTimetableData();
                        me.lastTimetableRefresh = me.clock.getTime('03:00');
                    }

                    // Remove all trains if the page has been invisible for certain amount of time
                    if (Date.now() - me.lastFrameRefresh >= configs.refreshTimeout) {
                        me.stopAll();
                    }
                    me.lastFrameRefresh = Date.now();

                    if (Math.floor((now - configs.minDelay) / configs.trainRefreshInterval) !== Math.floor(me.lastTrainRefresh / configs.trainRefreshInterval)) {
                        me.refreshStyleColors();
                        if (me.isPlayback) {
                            me.refreshTrains();
                            // me.refreshFlights();
                        } else {
                            me.loadRealtimeTrainData();
                            me.loadRealtimeFlightData();
                        }
                        me.lastTrainRefresh = now - configs.minDelay;
                    }
                    if (me.trackedObject) {
                        const {coord: center, bearing, altitude} = me.trackedObject.userData;

                        helpersThree.refreshOutline(me.trackedObject);

                        /*
                        // Keep camera off from the tracked aircraft
                        if (altitude > 0 && Math.pow(2, 22 - map.getZoom()) / altitude < .5) {
                            map.setZoom(22 - Math.log2(altitude * .5));
                        }
                        */

                        if (!me.viewAnimationID && !map._zooming && !map._pitching) {
                            me._jumpTo({
                                center,
                                altitude,
                                bearing,
                                bearingFactor: .02
                            });
                        }
                    }
                    if (helpersThree.isObject3D(me.markedObject)) {
                        me.updatePopup({setHTML: true});
                    }
                    if (!me.isPlayback && me.isWeatherVisible) {
                        if (now - (me.lastWeatherRefresh || 0) >= configs.weatherRefreshInterval) {
                            me.loadWeatherData();
                            me.lastWeatherRefresh = now;
                        }
                        weatherLayer.refreshEmitter();
                    }
                }
            });
        });

    }

    _jumpTo(options) {
        const me = this,
            {map, trackingMode, trackingBaseBearing} = me;
        let {center, altitude, bearing, centerFactor, bearingFactor} = options;

        if (trackingMode === 'helicopter') {
            bearing = (trackingBaseBearing + performance.now() / 100) % 360;
        } else if (bearingFactor >= 0) {
            const mapBearing = map.getBearing();

            bearing = mapBearing + ((bearing - mapBearing + 540) % 360 - 180) * bearingFactor;
        }

        center = me.adjustCoord(center, altitude, bearing);
        if (centerFactor >= 0) {
            const {lng: fromLng, lat: fromLat} = map.getCenter(),
                {lng: toLng, lat: toLat} = center;

            center = new mapboxgl.LngLat(
                fromLng + (toLng - fromLng) * centerFactor,
                fromLat + (toLat - fromLat) * centerFactor
            );
        }

        map.jumpTo({center, bearing});
    }

    updateTrainProps(train) {
        const me = this,
            feature = train.railwayFeature = me.featureLookup[`${train.r}.${me.layerZoom}`],
            stationOffsets = feature.properties['station-offsets'],
            {sectionIndex, sectionLength} = train,
            offset = train.offset = stationOffsets[sectionIndex];

        train.interval = stationOffsets[sectionIndex + sectionLength] - offset;
    }

    updateTrainShape(train, t) {
        const me = this,
            {map, trainLayers, objectUnit, objectScale} = me,
            {railwayFeature: feature, offset, interval, direction, cars, delay} = train,
            length = cars.length;
        let marked, tracked, altitudeChanged;

        if (t !== undefined) {
            train._t = t;
        }
        if (train._t === undefined) {
            return;
        }

        if (length === 0) {
            const railway = me.railwayLookup[train.r],
                {v: vehicle} = train,
                car = helpersThree.createGroup(helpersThree.createCube({
                    dimension: {x: .88, y: 1.76, z: .88},
                    color: vehicle ? me.trainVehicleLookup[vehicle].color : railway.color
                }));

            car.userData.object = train;
            cars.push(car);

            // Reset marked/tracked object if it was marked/tracked before
            // Delay calling markObject() and trackObject() as they require the object position to be set
            if (helpersThree.isObject3D(me.markedObject) && me.markedObject.userData.object === train) {
                marked = cars[0];
            }
            if (me.trackedObject && me.trackedObject.userData.object === train) {
                tracked = cars[0];
            }
            if (helpers.includes(me.selection, train.t)) {
                tracked = cars[0];
                delete me.selection;
            }
        }

        if (delay) {
            helpersThree.addDelayMarker(cars[0], helpers.isDarkBackground(map));
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

            if (marked === car) {
                me.markObject(car);
            }
            if (tracked === car) {
                me.trackObject(car);
            }

            if (me.trackedObject === car && !me.viewAnimationID && !map._zooming && !map._pitching) {
                me._jumpTo({
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
                    animation.setFrameRate(animationID, me.frameRate);
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
                if (me.trackedObject === car) {
                    me.setUndergroundMode(!me.isUndergroundVisible);
                }
            }

            if (me.markedObject === car) {
                me.updatePopup();
            }
        }
    }

    updateFlightShape(flight, t) {
        const me = this,
            {map, trainLayers, objectScale} = me;
        let {aircraft, body, wing, vTail} = flight,
            tracked;

        if (t !== undefined) {
            flight._t = t;
        }
        if (flight._t === undefined) {
            return;
        }
        if (!body) {
            const {color, tailcolor} = me.operatorLookup[flight.a];

            body = flight.body = helpersThree.createCube({
                dimension: {x: .88, y: 2.64, z: .88},
                color: color || '#FFFFFF'
            });
            wing = flight.wing = helpersThree.createCube({
                dimension: {x: 2.64, y: .88, z: .1},
                color: color || '#FFFFFF'
            });
            vTail = flight.vTail = helpersThree.createCube({
                dimension: {x: .1, y: .88, z: .88},
                translate: {x: 0, y: -.88, z: .88},
                color: tailcolor || '#FFFFFF'
            });
            aircraft = flight.aircraft = helpersThree.createGroup(body, wing, vTail);
            aircraft.userData.object = flight;

            // Set tracked object if the selection is specified
            // Delay calling trackObject() as they require the object position to be set
            if (me.selection === flight.id) {
                tracked = aircraft;
                delete me.selection;
            }

            trainLayers.addObject(aircraft, 1000);
        }

        const {position, scale, rotation} = aircraft,
            p = getCoordAndBearing(flight.feature, flight._t * flight.feature.properties.length, 1, 0)[0],
            coord = aircraft.userData.coord = p.coord,
            altitude = aircraft.userData.altitude = p.altitude,
            mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord, altitude),
            bearing = aircraft.userData.bearing = p.bearing,
            cameraZ = trainLayers.og.camera.position.z,
            aircraftScale = me.aircraftScale * cameraZ / (cameraZ - mCoord.z);

        if (tracked === aircraft) {
            me.trackObject(aircraft);
        }

        if (me.trackedObject === aircraft && !me.viewAnimationID && !map._zooming && !map._pitching) {
            me._jumpTo({
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
                animation.setFrameRate(animationID, me.frameRate);
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

        if (me.markedObject === aircraft) {
            me.updatePopup();
        }
    }

    refreshTrains() {
        const me = this,
            now = me.clock.getTime();

        me.timetableData.forEach(train => {
            const delay = train.delay || 0;

            if (train.start + delay <= now && now <= train.end + delay &&
                !me.checkActiveTrains(train, true) &&
                (!me.railwayLookup[train.r].status || me.realtimeTrainLookup[train.t])) {
                me.trainStart(train);
            }
        });
    }

    trainStart(train, index) {
        const me = this,
            {clock} = me,
            now = clock.getTime();

        if (!me.setSectionData(train, index)) {
            return; // Out of range
        }
        me.activeTrainLookup[train.t] = train;
        train.cars = [];
        me.updateTrainProps(train);

        const departureTime = clock.getTime(train.departureTime) + (train.delay || 0);

        if (!train.tt && train.sectionLength !== 0) {
            me.trainRepeat(train);
        } else if (train.tt && now >= departureTime) {
            me.trainRepeat(train, now - departureTime);
        } else {
            me.trainStand(train);
        }
    }

    trainStand(train, final) {
        const me = this,
            {clock} = me,
            departureTime = clock.getTime(train.departureTime) + (train.delay || 0);

        if (!train.tt) {
            final = !me.setSectionData(train, undefined, !me.realtimeTrainLookup[train.t]);
        }

        if (!final) {
            me.updateTrainProps(train);
            me.updateTrainShape(train, 0);
        }

        if (!train.tt && train.sectionLength !== 0) {
            me.trainRepeat(train);
        } else {
            me.setTrainStandingStatus(train, true);
            train.animationID = animation.start({
                complete: () => {
                    if (final) {
                        me.stopTrain(train);
                    } else if (train.tt) {
                        me.trainRepeat(train, me.clock.speed === 1 ? undefined : me.clock.getTime() - departureTime);
                    } else {
                        me.trainStand(train);
                    }
                },
                duration: train.tt ?
                    Math.max(departureTime - clock.getTime(), clock.speed === 1 ? configs.minStandingDuration : 0) :
                    final ? configs.minStandingDuration : configs.realtimeTrainCheckInterval,
                clock
            });
        }
    }

    trainRepeat(train, elapsed) {
        const me = this,
            {clock} = me,
            now = clock.getTime(),
            delay = train.delay || 0,
            {arrivalTime, nextDepartureTime} = train;
        let minDuration, maxDuration;

        if (nextDepartureTime) {
            maxDuration = clock.getTime(nextDepartureTime) + delay - now + (elapsed || 0) - configs.minDelay + 60000 - configs.minStandingDuration;
        }
        if (arrivalTime) {
            minDuration = clock.getTime(arrivalTime) + delay - now + (elapsed || 0) - configs.minDelay;
            if (!(maxDuration < minDuration + 60000)) {
                maxDuration = minDuration + 60000;
            }
        }
        me.setTrainStandingStatus(train, false);
        train.animationID = startTrainAnimation(t => {
            // Guard for an unexpected error
            // Probably a bug due to duplicate train IDs in timetable lookup
            if (!train.cars) {
                me.stopTrain(train);
                return;
            }

            me.updateTrainShape(train, t);
        }, () => {
            // Guard for an unexpected error
            // Probably a bug due to duplicate train IDs in timetable lookup
            if (!train.cars || train.tt && train.timetableIndex + 1 >= train.tt.length) {
                me.stopTrain(train);
                return;
            }

            if (!me.setSectionData(train, train.timetableIndex + 1)) {
                const markedObjectIndex = train.cars.indexOf(me.markedObject),
                    trackedObjectIndex = train.cars.indexOf(me.trackedObject),
                    {nextTrains} = train;

                if (nextTrains) {
                    me.stopTrain(train, true);
                    train = nextTrains[0];
                    if (!me.activeTrainLookup[train.t]) {
                        me.trainStart(train, 0);
                    }
                    if (train.cars) {
                        me.updateTrainShape(train, 0);
                        if (markedObjectIndex !== -1) {
                            me.markObject(train.cars[markedObjectIndex]);
                        }
                        if (trackedObjectIndex !== -1) {
                            me.trackObject(train.cars[trackedObjectIndex]);
                        }
                    }
                    return;
                }
                me.trainStand(train, true);
            } else {
                me.trainStand(train);
            }
        }, Math.abs(train.interval), minDuration, maxDuration, elapsed, clock);
    }

    refreshFlights() {
        const me = this,
            now = me.clock.getTime();

        Object.keys(me.flightLookup).forEach(key => {
            const flight = me.flightLookup[key];

            if (flight.standing <= now && now <= flight.end && !me.activeFlightLookup[flight.id]) {
                me.activeFlightLookup[flight.id] = flight;
                if (now >= flight.start) {
                    me.flightRepeat(flight, now - flight.start);
                } else {
                    me.updateFlightShape(flight, 0);
                    me.setFlightStandingStatus(flight, true);
                    flight.animationID = animation.start({
                        complete: () => {
                            me.flightRepeat(flight);
                        },
                        duration: flight.start - now
                    });
                }
            }
        });
    }

    flightRepeat(flight, elapsed) {
        const me = this;

        me.setFlightStandingStatus(flight, false);
        flight.animationID = startFlightAnimation(t => {
            me.updateFlightShape(flight, t);
        }, () => {
            me.setFlightStandingStatus(flight, true);
            flight.animationID = animation.start({
                complete: () => {
                    me.stopFlight(flight);
                },
                duration: Math.max(flight.end - me.clock.getTime(), 0)
            });
        }, flight.feature.properties.length, flight.maxSpeed, flight.acceleration, elapsed);
    }

    startViewAnimation() {
        const me = this;
        let t2 = 0;

        me.trackingBaseBearing = me.map.getBearing() - performance.now() / 100;
        me.viewAnimationID = animation.start({
            callback: (elapsed, duration) => {
                const t1 = easeOutQuart(elapsed / duration),
                    factor = 1 - (1 - t1) / (1 - t2),
                    {coord: center, altitude, bearing} = me.trackedObject.userData;

                me._jumpTo({
                    center,
                    altitude,
                    bearing,
                    centerFactor: factor,
                    bearingFactor: factor
                });
                t2 = t1;
            },
            complete: () => {
                delete me.viewAnimationID;
            },
            duration: 1000
        });
    }

    stopViewAnimation() {
        const me = this;

        if (me.viewAnimationID) {
            animation.stop(me.viewAnimationID);
            delete me.viewAnimationID;
        }
    }

    adjustCoord(coord, altitude, bearing) {
        if (!altitude) {
            return mapboxgl.LngLat.convert(coord);
        }

        const {map, trainLayers} = this,
            mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord, altitude);

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

    getLocalizedRailwayTitle(railway) {
        const me = this,
            title = (me.railwayLookup[railway] || {}).title || {};

        return title[me.lang] || title.en;
    }

    getLocalizedRailDirectionTitle(direction) {
        const me = this,
            title = (me.railDirectionLookup[direction] || {}).title || {};

        return title[me.lang] || title.en;
    }

    getLocalizedTrainTypeTitle(type) {
        const me = this,
            title = (me.trainTypeLookup[type] || {}).title || {};

        return title[me.lang] || title.en;
    }

    getLocalizedStationTitle(array) {
        const me = this,
            stations = Array.isArray(array) ? array : [array];

        return stations.map(station => {
            const title = (me.stationLookup[station] || {}).title || {};
            return title[me.lang] || title.en;
        }).join(me.dict['and']);
    }

    getLocalizedOperatorTitle(operator) {
        const me = this,
            title = (me.operatorLookup[operator] || {}).title || {};

        return title[me.lang] || title.en;
    }

    getLocalizedAirportTitle(airport) {
        const me = this,
            title = (me.airportLookup[airport] || {}).title || {};

        return title[me.lang] || title.en;
    }

    getLocalizedFlightStatusTitle(status) {
        const me = this,
            title = (me.flightStatusLookup[status] || {}).title || {};

        return title[me.lang] || title.en;
    }

    setTrainStandingStatus(train, standing) {
        const me = this,
            {lang, dict, clock} = me,
            {r: railwayID, nm: names, v: vehicle, ds: destination, departureTime, arrivalStation} = train,
            railway = me.railwayLookup[railwayID],
            color = vehicle ? me.trainVehicleLookup[vehicle].color : railway.color,
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
            names ? names.map(name => name[lang] || name.en).join(dict['and']) : me.getLocalizedRailwayTitle(railwayID),
            '</strong>',
            `<br> ${me.getLocalizedTrainTypeTitle(train.y)} `,
            destination ?
                dict['for'].replace('$1', me.getLocalizedStationTitle(destination)) :
                me.getLocalizedRailDirectionTitle(train.d),
            '</div></div>',
            `<strong>${dict['train-number']}:</strong> ${train.n}`,
            !train.tt ? ` <span class="desc-caution">${dict['special']}</span>` : '',
            '<br>',
            delay >= 60000 ? '<span class="desc-caution">' : '',
            '<strong>',
            dict[standing ? 'standing-at' : 'previous-stop'],
            ':</strong> ',
            me.getLocalizedStationTitle(train.departureStation),
            departureTime ? ` ${clock.getTimeString(clock.getTime(departureTime), delay)}` : '',
            arrivalStation ? [
                `<br><strong>${dict['next-stop']}:</strong> `,
                me.getLocalizedStationTitle(arrivalStation),
                arrivalTime ? ` ${clock.getTimeString(clock.getTime(arrivalTime) + delay)}` : ''
            ].join('') : '',
            delay >= 60000 ? `<br>${dict['delay'].replace('$1', Math.floor(delay / 60000))}</span>` : '',
            status && lang === 'ja' ? `<br><span class="desc-caution"><strong>${status}:</strong> ${text}</span>` : ''
        ].join('');
    }

    setFlightStandingStatus(flight) {
        const me = this,
            {dict} = me,
            {a: airlineID, n: flightNumber, ds: destination, or: origin} = flight,
            tailcolor = me.operatorLookup[airlineID].tailcolor || '#FFFFFF',
            scheduledTime = flight.sdt || flight.sat,
            estimatedTime = flight.edt || flight.eat,
            actualTime = flight.adt || flight.aat,
            delayed = (estimatedTime || actualTime) && scheduledTime !== (estimatedTime || actualTime);

        flight.description = [
            '<div class="desc-header">',
            `<div style="background-color: ${tailcolor};"></div>`,
            `<div><strong>${me.getLocalizedOperatorTitle(airlineID)}</strong>`,
            `<br>${flightNumber[0]} `,
            dict[destination ? 'to' : 'from'].replace('$1', me.getLocalizedAirportTitle(destination || origin)),
            '</div></div>',
            `<strong>${dict['status']}:</strong> ${me.getLocalizedFlightStatusTitle(flight.s)}`,
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

    /**
     * Check if any of connecting trains is active
     * @param {object} train - train to check
     * @returns {boolean} True if any of connecting trains is active
     */
    checkActiveTrains(train) {
        const me = this;

        function check(curr, prop) {
            if (me.activeTrainLookup[curr.t]) {
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

    stopTrain(train, keep) {
        const me = this,
            {cars, animationID, t, tt} = train;

        animation.stop(animationID);
        if (cars) {
            cars.forEach(car => {
                me.trainLayers.removeObject(car, 1000);
                if (car === me.markedObject && !keep) {
                    me.markObject();
                }
                if (car === me.trackedObject && !keep) {
                    me.trackObject();
                }
            });
        }
        delete train.cars;
        delete me.activeTrainLookup[t];
        delete train.delay;
        if (!tt) {
            delete me.timetableData.splice(me.timetableData.indexOf(train), 1);
        }
    }

    stopFlight(flight) {
        const me = this,
            {id, animationID, aircraft} = flight;

        animation.stop(animationID);
        me.trainLayers.removeObject(aircraft, 1000);
        if (aircraft === me.markedObject) {
            me.markObject();
        }
        if (aircraft === me.trackedObject) {
            me.trackObject();
        }
        delete flight.aircraft;
        delete flight.body;
        delete flight.wing;
        delete flight.vTail;
        delete me.activeFlightLookup[id];
    }

    stopAll() {
        const me = this;

        Object.keys(me.activeTrainLookup).forEach(key =>
            me.stopTrain(me.activeTrainLookup[key])
        );
        Object.keys(me.activeFlightLookup).forEach(key =>
            me.stopFlight(me.activeFlightLookup[key])
        );
        me.realtimeTrainLookup = {};
        delete me.lastTrainRefresh;
    }

    resetRailwayStatus() {
        this.railwayData.forEach(railway => {
            delete railway.status;
            delete railway.text;
        });
    }

    loadTimetableData() {
        const me = this;

        helpers.loadJSON(`${me.dataUrl}/${getTimetableFileName(me.clock)}`).then(data => {
            me.timetableData = data;
            me.updateTimetableData(me.timetableData);
            me.trainLookup = helpers.buildLookup(me.timetableData, 't');
            delete me.lastTrainRefresh;
        });
    }

    loadRealtimeTrainData() {
        const me = this,
            urls = [];

        Object.keys(OPERATORS_FOR_TRAININFORMATION).forEach(source => {
            const url = configs.apiUrl[source],
                key = me.secrets[source],
                operators = OPERATORS_FOR_TRAININFORMATION[source]
                    .map(operator => `odpt.Operator:${operator}`)
                    .join(',');

            urls.push(`${url}odpt:TrainInformation?odpt:operator=${operators}&acl:consumerKey=${key}`);
        });

        const url = configs.apiUrl.tokyochallenge,
            key = me.secrets.tokyochallenge,
            operators = OPERATORS_FOR_TRAINS
                .map(operator => `odpt.Operator:${operator}`)
                .join(',');

        urls.push(`${url}odpt:Train?odpt:operator=${operators}&acl:consumerKey=${key}`);

        Promise.all(urls.map(helpers.loadJSON)).then(trainData => {
            me.realtimeTrainLookup = {};

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
                let train = me.trainLookup[id] || me.trainLookup[id.replace('.Marunouchi.', '.MarunouchiBranch.')];
                let changed = false;

                if (train) {
                    me.realtimeTrainLookup[id] = train;
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
                    if (changed && me.activeTrainLookup[id]) {
                        me.stopTrain(train, true);
                    }
                } else {
                    const railwayID = helpers.removePrefix(trainRef['odpt:railway']);

                    // Exclude Namboku line trains that connect to/from Mita line
                    if (railwayID === RAILWAY_NAMBOKU && (origin[0].startsWith(RAILWAY_MITA) || destination[0].startsWith(RAILWAY_MITA))) {
                        return;
                    }

                    const railwayRef = me.railwayLookup[railwayID],
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
                        me.timetableData.push(train);
                        me.realtimeTrainLookup[id] = me.trainLookup[id] = train;
                    }
                }
                me.lastDynamicUpdate[helpers.removePrefix(trainRef['odpt:operator'])] = trainRef['dc:date'].replace(/([\d\-])T([\d:]+).*/, '$1 $2');
            });

            me.resetRailwayStatus();

            [].concat(...trainData).forEach(trainInfoRef => {
                const operatorID = helpers.removePrefix(trainInfoRef['odpt:operator']),
                    railwayID = helpers.removePrefix(trainInfoRef['odpt:railway']),
                    status = trainInfoRef['odpt:trainInformationStatus'],
                    text = trainInfoRef['odpt:trainInformationText'];

                // Train information text is provided in Japanese only
                if (railwayID && status && status.ja &&
                    helpers.includes(OPERATORS_FOR_TRAINS, operatorID) &&
                    status.ja.match(/見合わせ|折返し運転|運休|遅延/)) {
                    const railway = me.railwayLookup[railwayID];

                    railway.status = status.ja;
                    railway.text = text.ja;
                    Object.keys(me.activeTrainLookup).forEach(key => {
                        const train = me.activeTrainLookup[key];
                        if (train.r === railwayID && !me.realtimeTrainLookup[train.t]) {
                            me.stopTrain(train);
                        }
                    });
                }
            });

            me.refreshTrains();
            me.refreshDelayMarkers();
            if (me.aboutPopup.isOpen()) {
                me.aboutPopup.updateContent(me.dict, me.lastDynamicUpdate);
            }

            // Check if the selection are trains and any of them is active
            if (me.selection && Array.isArray(me.selection)) {
                if (me.selection.map(id => !!me.activeTrainLookup[id]).indexOf(true) === -1) {
                    helpers.showNotification(me.container, me.dict['train-terminated']);
                    delete me.selection;
                }
            }
        }).catch(error => {
            me.refreshTrains();
            console.log(error);
        });
    }

    loadRealtimeFlightData() {
        const me = this,
            urls = [],
            url = configs.apiUrl.tokyochallenge,
            key = me.secrets.tokyochallenge,
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

            if (me.flightPattern !== pattern) {
                me.flightPattern = pattern;
                me.lastFlightPatternChanged = Date.now();
                Object.keys(me.activeFlightLookup).forEach(key => {
                    me.stopFlight(me.activeFlightLookup[key]);
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
                let flight = me.flightLookup[id],
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
                        airport = me.airportLookup[destinationAirport || originAirport],
                        direction = airport ? airport.direction : 'S',
                        route = departureAirport === 'NRT' ? `NRT.${north ? '34L' : '16R'}.Dep` :
                        arrivalAirport === 'NRT' ? `NRT.${north ? '34R' : '16L'}.Arr` :
                        departureAirport === 'HND' ? `HND.${depRoutes[direction]}.Dep` :
                        arrivalAirport === 'HND' ? `HND.${arrRoutes[direction]}.Arr` : undefined,
                        feature = me.featureLookup[route];

                    if (feature) {
                        flight = me.flightLookup[id] = {
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
                    flight.start = flight.base = me.clock.getTime(departureTime);
                    flight.standing = flight.start - standingDuration;
                    flight.end = flight.start + duration;
                } else {
                    flight.start = flight.standing = me.clock.getTime(arrivalTime) - duration;
                    flight.base = flight.start + duration - standingDuration;
                    flight.end = flight.start + duration + standingDuration;
                }
                flight.maxSpeed = maxSpeed;
                flight.acceleration = acceleration;

                if (flight.base < me.lastFlightPatternChanged) {
                    return;
                }

                const queue = flightQueue[flight.runway] = flightQueue[flight.runway] || [];
                queue.push(flight);

                me.lastDynamicUpdate[helpers.removePrefix(flightRef['odpt:operator'])] = flightRef['dc:date'].replace(/([\d\-])T([\d:]+).*/, '$1 $2');
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

            me.refreshFlights();

            // Check if the selection is a flight and active
            if (me.selection && !Array.isArray(me.selection)) {
                if (!me.activeFlightLookup[me.selection]) {
                    helpers.showNotification(me.container, me.dict['flight-terminated']);
                    delete me.selection;
                }
            }
        }).catch(error => {
            me.refreshFlights();
            console.log(error);
        });
    }

    loadWeatherData() {
        const me = this;

        helpers.loadJSON(configs.nowcastsUrl).then(data => {
            me.weatherLayer.updateEmitterQueue(data);
        });
    }

    updateUndergroundButton(enabled) {
        const {container, dict} = this,
            button = container.querySelector('.mapboxgl-ctrl-underground');

        if (button) {
            const {classList} = button;

            if (enabled) {
                button.title = dict['exit-underground'];
                classList.add('mapboxgl-ctrl-underground-visible');
            } else {
                button.title = dict['enter-underground'];
                classList.remove('mapboxgl-ctrl-underground-visible');
            }
        }
    }

    updateTrackingButton(mode) {
        const button = this.container.querySelector('.mapboxgl-ctrl-track');

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

    updatePlaybackButton(enabled) {
        const {container, dict} = this,
            button = container.querySelector('.mapboxgl-ctrl-playback');

        if (button) {
            const {classList} = button;

            if (enabled) {
                button.title = dict['exit-playback'];
                classList.add('mapboxgl-ctrl-playback-active');
            } else {
                button.title = dict['enter-playback'];
                classList.remove('mapboxgl-ctrl-playback-active');
            }
        }
    }

    updateWeatherButton(enabled) {
        const {container, dict} = this,
            button = container.querySelector('.mapboxgl-ctrl-weather');

        if (button) {
            const {classList} = button;

            if (enabled) {
                button.title = dict['hide-weather'];
                classList.add('mapboxgl-ctrl-weather-active');
            } else {
                button.title = dict['show-weather'];
                classList.remove('mapboxgl-ctrl-weather-active');
            }
        }
    }

    setUndergroundMode(enabled) {
        const me = this,
            {map, trainLayers, clock, styleColors, styleOpacities} = me;

        if (me.isUndergroundVisible === enabled) {
            return;
        }

        me.updateUndergroundButton(enabled);
        trainLayers.ug.setSemitransparent(!enabled);
        trainLayers.og.setSemitransparent(enabled);
        map.setPaintProperty('background', 'background-color',
            enabled ? 'rgb(16,16,16)' : getStyleColorString(styleColors[0], clock));
        map.setPaintProperty('building-underground', 'fill-color',
            enabled ? 'hsla(268,67%,67%,.5)' : getStyleColorString({r: 167, g: 114, b: 227, a: .25}, clock));
        styleOpacities.forEach(({id, key, opacity}) => {
            const factor = helpers.includes(id, '-og-') ? .25 : .0625;

            map.setPaintProperty(id, key, enabled && id !== 'building-underground' ?
                helpers.scaleValues(opacity, factor) : opacity);
        });
        me.isUndergroundVisible = enabled;

        animation.start({
            callback: (elapsed, duration) => {
                const t = elapsed / duration;

                [13, 14, 15, 16, 17, 18].forEach(zoom => {
                    const opacity = me.isUndergroundVisible ?
                        1 * t + .0625 * (1 - t) : 1 * (1 - t) + .0625 * t;

                    helpers.setLayerProps(map, `railways-ug-${zoom}`, {opacity});
                    helpers.setLayerProps(map, `stations-ug-${zoom}`, {opacity});
                });
                Object.keys(me.activeTrainLookup).forEach(key => {
                    me.activeTrainLookup[key].cars.forEach(car => {
                        helpersThree.setOpacity(car, getObjectOpacity(car, me.isUndergroundVisible, t));
                    });
                });
                me.refreshDelayMarkers();
                Object.keys(me.activeFlightLookup).forEach(key => {
                    const aircraft = me.activeFlightLookup[key].aircraft;
                    helpersThree.setOpacity(aircraft, getObjectOpacity(aircraft, me.isUndergroundVisible, t));
                });
            },
            duration: 300
        });
    }

    setTrackingMode(mode) {
        const me = this;

        if (me.trackingMode === mode) {
            return;
        }

        me.updateTrackingButton(mode);
        me.trackingMode = mode;
        if (me.trackedObject) {
            me.startViewAnimation();
        }
    }

    setPlaybackMode(enabled) {
        const me = this;

        if (me.isPlayback === enabled) {
            return;
        }

        me.updatePlaybackButton(enabled);
        me.isPlayback = enabled;
        me.clock.reset();
        me.onClockChange();
        if (me.clockControl) {
            me.clockCtrl.setMode(enabled ? 'playback' : 'realtime');
        }
        if (enabled) {
            me.resetRailwayStatus();
        }
    }

    onClockChange() {
        const me = this,
            baseTime = me.clock.getTime('03:00');

        me.stopAll();
        me.markObject();
        me.trackObject();

        if (me.lastTimetableRefresh !== baseTime) {
            me.loadTimetableData();
            me.lastTimetableRefresh = baseTime;
        }
    }

    setWeatherMode(enabled) {
        const me = this;

        if (me.isWeatherVisible === enabled) {
            return;
        }

        me.updateWeatherButton(enabled);
        if (enabled) {
            me.loadWeatherData();
        } else {
            me.weatherLayer.clear();
        }
        me.isWeatherVisible = enabled;
    }

    refreshStyleColors() {
        const me = this,
            {map, clock} = me;

        me.styleColors.forEach(item => {
            const {id, key, stops, _case} = item;
            let prop;

            if (id === 'background' && me.isUndergroundVisible) {
                prop = 'rgb(16,16,16)';
            } else if (id === 'building-underground' && me.isUndergroundVisible) {
                prop = 'hsla(268,67%,67%,.5)';
            } else {
                const color = getStyleColorString(item, clock);

                if (stops !== undefined) {
                    prop = map.getPaintProperty(id, key);
                    prop.stops[stops][1] = color;
                } else if (_case !== undefined) {
                    prop = map.getPaintProperty(id, key);
                    prop[_case] = color;
                } else {
                    prop = color;
                }
            }
            map.setPaintProperty(id, key, prop);
        });
    }

    refreshDelayMarkers() {
        const me = this,
            dark = helpers.isDarkBackground(me.map);

        Object.keys(me.activeTrainLookup).forEach(key => {
            const car = me.activeTrainLookup[key].cars[0];

            if (car) {
                helpersThree.refreshDelayMarker(car, dark);
            }
        });
    }

    pickObject(point) {
        const me = this,
            deck = me.map.__deck,
            layers = me.isUndergroundVisible ? ['ug', 'og'] : ['og', 'ug'];
        let object;

        for (const layer of layers) {
            object = me.trainLayers[layer].pickObject(point);
            if (object) {
                return object;
            }
            if (layer === 'ug') {
                if (deck.deckPicker) {
                    const {x, y} = point,
                        info = deck.pickObject({x, y, layerIds: [`stations-ug-${me.layerZoom}`]});

                    if (info) {
                        object = info.object;
                    }
                }
            } else {
                object = me.pickedFeature;
            }
            if (object) {
                return object;
            }
        }
    }

    markObject(object) {
        const me = this,
            {map, popup} = me;

        if (me.markedObject && me.markedObject !== object) {
            if (helpersThree.isObject3D(me.markedObject)) {
                helpersThree.removeOutline(me.markedObject, 'outline-marked');
            }
            delete me.markedObject;
            if (popup.isOpen()) {
                map.getCanvas().style.cursor = '';
                popup.remove();
            }
        }

        if (object && object !== me.markedObject) {
            me.markedObject = object;
            map.getCanvas().style.cursor = 'pointer';
            me.updatePopup({setHTML: true, addToMap: true});

            if (helpersThree.isObject3D(object)) {
                helpersThree.addOutline(object, 'outline-marked');
            }
        }
    }

    trackObject(object) {
        const me = this;

        if (me.trackedObject) {
            helpersThree.removeOutline(me.trackedObject, 'outline-tracked');
            delete me.trackedObject;
            me.stopViewAnimation();
            me.updateTrackingButton(false);
            if (me.sharePanel) {
                me.sharePanel.remove();
                delete me.sharePanel;
            }
            if (me.detailPanel) {
                me.detailPanel.remove();
                delete me.detailPanel;
            }
        }

        if (object) {
            const {altitude, object: train} = object.userData;

            me.trackedObject = object;
            me.startViewAnimation();
            me.updateTrackingButton(true);
            me.setUndergroundMode(altitude < 0);

            if (!me.isPlayback && navigator.share) {
                me.sharePanel = new SharePanel({object: train});
                me.sharePanel.addTo(me);
            }
            if (train.tt) {
                me.detailPanel = new DetailPanel({object: train});
                me.detailPanel.addTo(me);
            }

            helpersThree.addOutline(object, 'outline-tracked');
        }
    }

    updatePopup(options) {
        const me = this,
            {map, popup} = me,
            {setHTML, addToMap} = options || {};

        if (helpersThree.isObject3D(me.markedObject)) {
            const {coord, altitude, object} = me.markedObject.userData,
                bearing = me.markedObject === me.trackedObject ? map.getBearing() : undefined;

            popup.setLngLat(me.adjustCoord(coord, altitude, bearing));
            if (setHTML) {
                popup.setHTML(object.description);
            }
        } else {
            const coord = getCoord(centerOfMass(me.markedObject)),
                altitude = getCoords(me.markedObject)[0][0][2];

            popup.setLngLat(me.adjustCoord(coord, altitude));
            if (setHTML) {
                let ids = me.markedObject.properties.ids;
                const stations = {};

                if (typeof ids === 'string') {
                    ids = JSON.parse(ids);
                }
                ids.forEach(id => {
                    const title = me.getLocalizedStationTitle(id),
                        railwayID = me.stationLookup[id].railway,
                        railways = stations[title] = stations[title] || {};

                    railways[me.getLocalizedRailwayTitle(railwayID)] = me.railwayLookup[railwayID].color;
                });
                popup.setHTML([
                    '<div class="station-image-container">',
                    '<div class="ball-pulse"><div></div><div></div><div></div></div>',
                    `<div class="station-image" style="background-image: url(\'${me.stationLookup[ids[0]].thumbnail}\');"></div>`,
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

    updateTimetableData(data) {
        const me = this,
            {clock} = me,
            lookup = helpers.buildLookup(data);

        data.forEach(train => {
            const railway = me.railwayLookup[train.r],
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

    setSectionData(train, index, final) {
        const me = this,
            {clock} = me,
            {stations} = me.railwayLookup[train.r],
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

function insertTags(container) {
    container.innerHTML = `
<div id="map"></div>
<input id="search-box" type="text" list="stations">
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

function adjustTrainID(id, type) {
    if (helpers.includes(TRAINTYPES_FOR_SOBURAPID, type)) {
        return id.replace(/JR-East\.(NaritaAirportBranch|Narita|Sobu)/, RAILWAY_SOBURAPID);
    }
    return id;
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

function getConnectingTrainIds(train) {
    const {nextTrains, t: id} = train,
        ids = id ? [id] : [];

    return nextTrains ? ids.concat(...nextTrains.map(getConnectingTrainIds)) : ids;
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

function getObjectOpacity(object, isUndergroundVisible, t) {
    t = helpers.valueOrDefault(t, 1);
    return isUndergroundVisible === (object.userData.altitude < 0) ?
        .9 * t + .225 * (1 - t) : .9 * (1 - t) + .225 * t;
}

function getTimetableFileName(clock) {
    const calendar = clock.getCalendar() === 'Weekday' ? 'weekday' : 'holiday';

    return `timetable-${calendar}.json.gz`;
}
