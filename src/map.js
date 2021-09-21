import {MapboxLayer} from '@deck.gl/mapbox';
import {GeoJsonLayer} from '@deck.gl/layers';
import {featureEach} from '@turf/meta';
import {Evented, FullscreenControl, LngLat, Map, MercatorCoordinate, NavigationControl} from 'mapbox-gl';
import AnimatedPopup from 'mapbox-gl-animated-popup';
import SunCalc from 'suncalc';
import animation from './animation';
import AboutPanel from './about-panel';
import Clock from './clock';
import ClockControl from './clock-control';
import configs from './configs';
import extend from './extend';
import * as helpers from './helpers';
import {getViewport, pickObject} from './helpers-deck';
import * as helpersGeojson from './helpers-geojson';
import * as helpersMapbox from './helpers-mapbox';
import LayerPanel from './layer-panel';
import * as loader from './loader';
import MapboxGLButtonControl from './mapbox-gl-button-control';
import SearchPanel from './search-panel';
import SharePanel from './share-panel';
import StationPanel from './station-panel';
import TrafficLayer from './traffic-layer';
import TrainPanel from './train-panel';

const OPERATORS_FOR_DYNAMIC_TRAIN_DATA = [
    'JR-East',
    'TokyoMetro',
    'Toei'
];

const RAILWAY_NAMBOKU = 'TokyoMetro.Namboku',
    RAILWAY_MITA = 'Toei.Mita';

const AIRLINES_FOR_ANA_CODE_SHARE = ['ADO', 'SFJ', 'SNJ'];

const DEGREE_TO_RADIAN = Math.PI / 180;

// Replace MapboxLayer.render to support underground rendering
const render = MapboxLayer.prototype.render;
MapboxLayer.prototype.render = function(...args) {
    const me = this,
        {deck, map} = me;

    if (!deck.layerManager) {
        // Not yet initialized
        return;
    }

    if (!deck.props.userData.currentViewport) {
        deck.props.userData.currentViewport = getViewport(deck, map);
    }
    render.apply(me, args);
};

export default class extends Evented {

    constructor(options) {
        super();

        const me = this;

        options = extend({
            hash: false,
            center: configs.defaultCenter,
            zoom: configs.defaultZoom,
            bearing: configs.defaultBearing,
            pitch: configs.defaultPitch,
            dataUrl: configs.dataUrl,
            clockControl: true,
            searchControl: true,
            navigationControl: true,
            fullscreenControl: true,
            modeControl: true,
            configControl: true,
            trackingMode: configs.defaultTrackingMode,
            ecoMode: configs.defaultEcoMode,
            ecoFrameRate: configs.defaultEcoFrameRate
        }, options);

        me.lang = helpers.getLang(options.lang);
        me.dataUrl = options.dataUrl;
        me.container = typeof options.container === 'string' ?
            document.getElementById(options.container) : options.container;
        me.secrets = options.secrets;
        me.exitPopups = [];

        me.clockControl = options.clockControl;
        me.searchControl = options.searchControl;
        me.navigationControl = options.navigationControl;
        me.fullscreenControl = options.fullscreenControl;
        me.modeControl = options.modeControl;
        me.configControl = options.configControl;
        me.clock = new Clock();
        me.plugins = options.plugins || [];

        me.searchMode = 'none';
        me.viewMode = configs.defaultViewMode;
        me.trackingMode = options.trackingMode;
        me.initialSelection = options.selection;
        me.clockMode = configs.defaultClockMode;
        me.isEditingTime = false;
        me.ecoMode = options.ecoMode;
        me.ecoFrameRate = options.ecoFrameRate;

        me.lastDynamicUpdate = {};
        me.lastRepaint = 0;

        me.container.addEventListener('touchstart', () => {
            me.touchDevice = true;
        });

        // The inner map container overrides the option
        options.container = initContainer(me.container);

        // This style overrides the option
        options.style = `${options.dataUrl}/osm-liberty.json`;

        // The custom attribution will be appended only if ConfigControl is visible
        if (!options.configControl) {
            options.customAttribution = helpers.flat([options.customAttribution, configs.customAttribution]);
        }

        me.map = new Map(options);

        configs.events.forEach(event => {
            me.map.on(event, me.fire.bind(me));
        });

        me.map.once('load', () => {
            hideLoader(me.container);
        });

        Promise.all([
            loader.loadStaticData(me.dataUrl, me.lang, me.clock)
                .then(me.initData.bind(me))
                .catch(error => {
                    showErrorMessage(me.container);
                    throw error;
                }),
            new Promise(resolve => {
                me.map.once('styledata', resolve);
            })
        ]).then(me.initialize.bind(me));
    }

    /**
     * Returns the map's geographical centerpoint.
     * @returns {LngLat} The map's geographical centerpoint
     */
    getCenter() {
        return this.map.getCenter();
    }

    /**
     * Sets the map's geographical centerpoint. Equivalent to jumpTo({center: center}).
     * @param {LngLatLike} center - The centerpoint to set
     * @returns {Map} this
     */
    setCenter(center) {
        const me = this;

        me.trackObject();
        me.map.setCenter(center);
        return me;
    }

    /**
     * Returns the map's current zoom level.
     * @returns {number} The map's current zoom level
     */
    getZoom() {
        return this.map.getZoom();
    }

    /**
     * Sets the map's zoom level. Equivalent to jumpTo({zoom: zoom}).
     * @param {number} zoom - The zoom level to set (0-20)
     * @returns {Map} this
     */
    setZoom(zoom) {
        const me = this;

        me.map.setZoom(zoom);
        return me;
    }

    /**
     * Returns the map's current bearing. The bearing is the compass direction that
     * is "up"; for example, a bearing of 90° orients the map so that east is up.
     * @returns {number} The map's current bearing
     */
    getBearing() {
        return this.map.getBearing();
    }

    /**
     * Sets the map's bearing (rotation). The bearing is the compass direction that
     * is "up"; for example, a bearing of 90° orients the map so that east is up.
     * Equivalent to jumpTo({bearing: bearing}).
     * @param {number} bearing - The desired bearing
     * @returns {Map} this
     */
    setBearing(bearing) {
        const me = this;

        me.trackObject();
        me.map.setBearing(bearing);
        return me;
    }

    /**
     * Returns the map's current pitch (tilt).
     * @returns {number} The map's current pitch, measured in degrees away from the
     *     plane of the screen
     */
    getPitch() {
        return this.map.getPitch();
    }

    /**
     * Sets the map's pitch (tilt). Equivalent to jumpTo({pitch: pitch}).
     * @param {number} pitch - The pitch to set, measured in degrees away from the
     *     plane of the screen (0-60)
     * @returns {Map} this
    */
    setPitch(pitch) {
        const me = this;

        me.map.setPitch(pitch);
        return me;
    }

    /**
     * Changes any combination of center, zoom, bearing, pitch, and padding with an
     * animated transition between old and new values. The map will retain its current
     * values for any details not specified in options.
     * @param {object} options - Options describing the destination and animation of
     *     the transition. Accepts CameraOptions and AnimationOptions
     * @returns {Map} this
     */
    easeTo(options) {
        const me = this,
            {center, bearing} = options;

        if (center !== undefined || bearing !== undefined) {
            me.trackObject();
        }
        me.map.easeTo(options);
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
     * @returns {Map} this
     */
    flyTo(options) {
        const me = this,
            {center, bearing} = options;

        if (center !== undefined || bearing !== undefined) {
            me.trackObject();
        }
        me.map.flyTo(options);
        return me;
    }

    /**
     * Changes any combination of center, zoom, bearing, and pitch, without an animated
     * transition. The map will retain its current values for any details not specified
     * in options.
     * @param {CameraOptions} options - Options object
     * @returns {Map} this
     */
    jumpTo(options) {
        const me = this,
            {center, bearing} = options;

        if (center !== undefined || bearing !== undefined) {
            me.trackObject();
        }
        me.map.jumpTo(options);
        return me;
    }

    /**
     * Returns the current view mode.
     * @returns {string} Current view mode: 'ground' or 'underground'
     */
    getViewMode() {
        return this.viewMode;
    }

    /**
     * Sets the view mode.
     * @param {string} mode - View mode: 'ground' or 'underground'
     * @returns {Map} this
     */
    setViewMode(mode) {
        const me = this;

        if (me.initialized) {
            me._setViewMode(mode);
        }
        return me;
    }

    /**
     * Returns the current tracking mode.
     * @returns {string} Current tracking mode: 'helicopter' or 'heading'
     */
    getTrackingMode() {
        return this.trackingMode;
    }

    /**
     * Sets the tracking mode.
     * @param {string} mode - Tracking mode: 'helicopter' or 'heading'
     * @returns {Map} this
     */
    setTrackingMode(mode) {
        const me = this;

        me._setTrackingMode(mode);
        return me;
    }

    /**
     * Returns ID or the selected object.
     * @returns {string} ID for the selected object
     */
    getSelection() {
        const me = this;

        if (isTrainOrFlight(me.trackedObject)) {
            const object = me.trackedObject.object;

            return object.t || object.id;
        }
    }

    /**
     * Selects a train or flight.
     * @param {string} id - ID for the object to select
     * @returns {Map} this
     */
    setSelection(id) {
        const me = this,
            selection = helpers.removePrefix(id);

        if (!selection.match(/NRT|HND/)) {
            if (me.trainLoaded) {
                const train = me.trainLookup[selection];
                let activeTrain;

                if (train) {
                    for (const id of getConnectingTrainIds(train)) {
                        if ((activeTrain = me.activeTrainLookup[id])) {
                            break;
                        }
                    }
                }
                if (activeTrain) {
                    if (activeTrain.cars[0]) {
                        me.trackObject(activeTrain.cars[0]);
                    } else {
                        me.selection = activeTrain.t;
                    }
                } else {
                    helpers.showNotification(me.container, me.dict['train-terminated']);
                }
                delete me.initialSelection;
            } else {
                me.initialSelection = selection;
            }
        } else {
            if (me.flightLoaded) {
                const activeFlight = me.activeFlightLookup[selection];

                if (activeFlight) {
                    if (activeFlight.aircraft) {
                        me.trackObject(activeFlight.aircraft);
                    } else {
                        me.selection = activeFlight.id;
                    }
                } else {
                    helpers.showNotification(me.container, me.dict['flight-terminated']);
                }
                delete me.initialSelection;
            } else {
                me.initialSelection = selection;
            }
        }

        return me;
    }

    /**
     * Returns the current clock mode.
     * @returns {string} Current clock mode: 'realtime' or 'playback'
     */
    getClockMode() {
        return this.clockMode;
    }

    /**
     * Sets the clock mode.
     * @param {string} mode - Clock mode: 'realtime' or 'playback'
     * @returns {Map} this
     */
    setClockMode(mode) {
        const me = this;

        if (me.initialized) {
            me._setClockMode(mode);
        }
        return me;
    }

    /**
     * Returns the current eco mode.
     * @returns {string} Current eco mode: 'normal' or 'eco'
     */
    getEcoMode() {
        return this.ecoMode;
    }

    /**
     * Sets the eco mode.
     * @param {string} mode - Eco mode: 'normal' or 'eco'
     * @returns {Map} this
     */
    setEcoMode(mode) {
        const me = this;

        me._setEcoMode(mode);
        return me;
    }

    initData(data) {
        const me = this;

        Object.assign(me, data);

        me.railwayLookup = helpers.buildLookup(me.railwayData);
        me.stationLookup = helpers.buildLookup(me.stationData);

        // Build feature lookup dictionary and update feature properties
        me.featureLookup = {};
        featureEach(me.featureCollection, feature => {
            const {id, type} = feature.properties;

            if (id && !id.match(/\.(ug|og)\./)) {
                me.featureLookup[id] = feature;
                helpersGeojson.updateDistances(feature);
            }
            if (type === 1) {
                me.featureLookup[id] = feature;
            }
        });

        me.lastTimetableRefresh = me.clock.getTime('03:00');
        me.updateTimetableData(me.timetableData);
        me.trainLookup = helpers.buildLookup(me.timetableData, 't');

        me.railDirectionLookup = helpers.buildLookup(me.railDirectionData);
        me.trainTypeLookup = helpers.buildLookup(me.trainTypeData);
        me.trainVehicleLookup = helpers.buildLookup(me.trainVehicleData);
        me.operatorLookup = helpers.buildLookup(me.operatorData);
        me.airportLookup = helpers.buildLookup(me.airportData);
        me.flightStatusLookup = helpers.buildLookup(me.flightStatusData);
        me.poiLookup = helpers.buildLookup(me.poiData);

        me.activeTrainLookup = {};
        me.realtimeTrainLookup = {};
        me.activeFlightLookup = {};
        me.flightLookup = {};
    }

    initialize() {
        const me = this,
            {lang, dict, clock, map} = me,
            unit = Math.pow(2, 14 - helpers.clamp(map.getZoom(), 13, 19));

        me.layerZoom = helpers.clamp(Math.floor(map.getZoom()), 13, 18);
        me.objectUnit = Math.max(unit * .19, .02);
        // me.carScale = Math.max(.02 / .19 / unit, 1);
        // me.aircraftScale = Math.max(.06 / .285 / unit, 1);

        me.trafficLayer = new TrafficLayer({id: 'traffic'});

        ['poi', 'poi_extra'].forEach(id => {
            map.setLayoutProperty(id, 'text-field', `{name_${lang.match(/ja|ko|zh-Han[st]/) ? lang : 'en'}}`);
        });

        [13, 14, 15, 16, 17, 18].forEach(zoom => {
            const minzoom = zoom <= 13 ? 0 : zoom,
                maxzoom = zoom >= 18 ? 24 : zoom + 1,
                lineWidthScale =
                    zoom === 13 ? helpers.clamp(Math.pow(2, map.getZoom() - 12), .125, 1) :
                    zoom === 18 ? helpers.clamp(Math.pow(2, map.getZoom() - 19), 1, 8) : 1;

            map.addLayer(new MapboxLayer({
                id: `stations-marked-${zoom}`,
                type: GeoJsonLayer,
                filled: true,
                stroked: true,
                getLineWidth: 12,
                getLineColor: [255, 255, 255],
                lineWidthUnits: 'pixels',
                lineWidthScale,
                getFillColor: [255, 255, 255],
                visible: false,
                parameters: {depthTest: false}
            }), 'building-3d');
            map.setLayerZoomRange(`stations-marked-${zoom}`, minzoom, maxzoom);
            map.addLayer(new MapboxLayer({
                id: `stations-selected-${zoom}`,
                type: GeoJsonLayer,
                filled: true,
                stroked: true,
                getLineWidth: 12,
                getLineColor: [255, 255, 255],
                lineWidthUnits: 'pixels',
                lineWidthScale,
                getFillColor: [255, 255, 255],
                visible: false,
                parameters: {depthTest: false}
            }), 'building-3d');
            map.setLayerZoomRange(`stations-selected-${zoom}`, minzoom, maxzoom);
            map.addLayer(new MapboxLayer({
                id: `railways-ug-${zoom}`,
                type: GeoJsonLayer,
                data: helpersGeojson.featureFilter(me.featureCollection, p =>
                    p.zoom === zoom && p.type === 0 && p.altitude < 0
                ),
                filled: false,
                stroked: true,
                getLineWidth: d => d.properties.width,
                getLineColor: d => helpers.colorToRGBArray(d.properties.color),
                lineWidthUnits: 'pixels',
                lineWidthScale,
                opacity: .0625,
                pickable: true,
                parameters: {depthTest: false}
            }), 'building-3d');
            map.setLayerZoomRange(`railways-ug-${zoom}`, minzoom, maxzoom);
            map.addLayer(new MapboxLayer({
                id: `stations-ug-${zoom}`,
                type: GeoJsonLayer,
                data: helpersGeojson.featureFilter(me.featureCollection, p =>
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
                pickable: true,
                parameters: {depthTest: false}
            }), 'building-3d');
            map.setLayerZoomRange(`stations-ug-${zoom}`, minzoom, maxzoom);
            map.addLayer(new MapboxLayer({
                id: `railways-routeug-${zoom}`,
                type: GeoJsonLayer,
                data: helpersGeojson.emptyFeatureCollection(),
                filled: false,
                stroked: true,
                getLineWidth: d => d.properties.width,
                getLineColor: d => helpers.colorToRGBArray(d.properties.color),
                lineWidthUnits: 'pixels',
                lineWidthScale,
                opacity: .0625,
                parameters: {depthTest: false}
            }), 'building-3d');
            map.setLayerZoomRange(`railways-routeug-${zoom}`, minzoom, maxzoom);
            map.addLayer(new MapboxLayer({
                id: `stations-routeug-${zoom}`,
                type: GeoJsonLayer,
                data: helpersGeojson.emptyFeatureCollection(),
                filled: true,
                stroked: true,
                getLineWidth: 4,
                getLineColor: [0, 0, 0],
                lineWidthUnits: 'pixels',
                lineWidthScale,
                getFillColor: [255, 255, 255, 179],
                opacity: .0625,
                parameters: {depthTest: false}
            }), 'building-3d');
            map.setLayerZoomRange(`stations-routeug-${zoom}`, minzoom, maxzoom);
            map.addLayer(new MapboxLayer({
                id: `railways-routeog-${zoom}`,
                type: GeoJsonLayer,
                data: helpersGeojson.emptyFeatureCollection(),
                filled: false,
                stroked: true,
                getLineWidth: d => d.properties.width,
                getLineColor: d => helpers.colorToRGBArray(d.properties.color),
                lineWidthUnits: 'pixels',
                lineWidthScale,
                parameters: {depthTest: false}
            }), 'building-3d');
            map.setLayerZoomRange(`railways-routeog-${zoom}`, minzoom, maxzoom);
            map.addLayer(new MapboxLayer({
                id: `stations-routeog-${zoom}`,
                type: GeoJsonLayer,
                data: helpersGeojson.emptyFeatureCollection(),
                filled: true,
                stroked: true,
                getLineWidth: 4,
                getLineColor: [0, 0, 0],
                lineWidthUnits: 'pixels',
                lineWidthScale,
                getFillColor: [255, 255, 255, 179],
                parameters: {depthTest: false}
            }), 'building-3d');
            map.setLayerZoomRange(`stations-routeog-${zoom}`, minzoom, maxzoom);
        });

        // Workaround for deck.gl #3522
        map.__deck.props.getCursor = () => map.getCanvas().style.cursor;

        [13, 14, 15, 16, 17, 18].forEach(zoom => {
            const minzoom = zoom <= 13 ? 0 : zoom,
                maxzoom = zoom >= 18 ? 24 : zoom + 1,
                width = ['get', 'width'],
                color = ['get', 'color'],
                outlineColor = ['get', 'outlineColor'],
                lineWidth =
                    zoom === 13 ? ['interpolate', ['exponential', 2], ['zoom'], 9, ['/', width, 8], 12, width] :
                    zoom === 18 ? ['interpolate', ['exponential', 2], ['zoom'], 19, width, 22, ['*', width, 8]] : width,
                railwaySource = {
                    type: 'geojson',
                    data: helpersGeojson.featureFilter(me.featureCollection, p =>
                        p.zoom === zoom && p.type === 0 && p.altitude === 0
                    )
                },
                stationSource = {
                    type: 'geojson',
                    data: helpersGeojson.featureFilter(me.featureCollection, p =>
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

        map.addLayer(me.trafficLayer, 'building-3d');

        map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
                'sky-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0,
                    0,
                    5,
                    0.3,
                    8,
                    1
                ],
                'sky-type': 'atmosphere',
                'sky-atmosphere-sun-intensity': 20
            }
        });

        /* For development
        map.addLayer(new MapboxLayer({
            id: `airway-og-`,
            type: GeoJsonLayer,
            data: helpersGeojson.featureFilter(me.featureCollection, p =>
                p.type === 0 && p.altitude > 0
            ),
            filled: false,
            stroked: true,
            getLineWidth: d => d.properties.width,
            getLineColor: d => helpers.colorToRGBArray(d.properties.color),
            lineWidthUnits: 'pixels',
            lineWidthScale: 1,
            opacity: .0625,
            parameters: {depthTest: false}
        }), 'poi');
        */

        me.styleColors = helpersMapbox.getStyleColors(map);
        me.styleOpacities = helpersMapbox.getStyleOpacities(map);

        const datalist = helpers.createElement('datalist', {id: 'stations'}, document.body);
        me.stationTitleLookup = {};
        [lang, 'en'].forEach(l => {
            me.railwayData.forEach(railway => {
                railway.stations.forEach(id => {
                    const station = me.stationLookup[id],
                        utitle = station.utitle && station.utitle[l],
                        title = utitle || helpers.normalize(station.title[l] || station.title.en),
                        key = title.toUpperCase();

                    if (!me.stationTitleLookup[key]) {
                        helpers.createElement('option', {value: title}, datalist);
                        me.stationTitleLookup[key] = station;
                    }
                });
            });
        });

        if (me.searchControl) {
            const control = new MapboxGLButtonControl([{
                className: 'mapboxgl-ctrl-search',
                title: dict['enter-search'],
                eventHandler() {
                    me._setSearchMode(me.searchMode === 'none' ? 'edit' : 'none');
                }
            }]);
            map.addControl(control);
        }

        if (me.navigationControl) {
            const control = new NavigationControl();

            control._setButtonTitle = function(button) {
                const {_zoomInButton, _zoomOutButton, _compass} = this,
                    title = button === _zoomInButton ? dict['zoom-in'] :
                    button === _zoomOutButton ? dict['zoom-out'] :
                    button === _compass ? dict['compass'] : '';

                button.title = title;
                button.setAttribute('aria-label', title);
            };
            map.addControl(control);
        }

        if (me.fullscreenControl) {
            const control = new FullscreenControl({container: me.container});

            control._updateTitle = function() {
                const {_fullscreenButton} = this,
                    title = dict[this._isFullscreen() ? 'exit-fullscreen' : 'enter-fullscreen'];

                _fullscreenButton.title = title;
                _fullscreenButton.setAttribute('aria-label', title);
            };
            map.addControl(control);
        }

        if (me.modeControl) {
            const control = new MapboxGLButtonControl([{
                className: 'mapboxgl-ctrl-underground',
                title: dict['enter-underground'],
                eventHandler() {
                    me._setViewMode(me.viewMode === 'ground' ? 'underground' : 'ground');
                }
            }, {
                className: `mapboxgl-ctrl-track mapboxgl-ctrl-track-${me.trackingMode === 'helicopter' ? 'helicopter' : 'train'}`,
                title: dict['track'],
                eventHandler(event) {
                    me._setTrackingMode(me.trackingMode === 'helicopter' ? 'heading' : 'helicopter');
                    event.stopPropagation();
                }
            }, {
                className: 'mapboxgl-ctrl-playback',
                title: dict['enter-playback'],
                eventHandler() {
                    me._setClockMode(me.clockMode === 'realtime' ? 'playback' : 'realtime');
                }
            }, {
                className: 'mapboxgl-ctrl-eco',
                title: dict['enter-eco'],
                eventHandler() {
                    me._setEcoMode(me.ecoMode === 'eco' ? 'normal' : 'eco');
                }
            }]);
            map.addControl(control);
        }

        me.layerPanel = new LayerPanel({layers: me.plugins});
        me.aboutPanel = new AboutPanel();

        if (me.configControl) {
            map.addControl(new MapboxGLButtonControl([{
                className: 'mapboxgl-ctrl-layers',
                title: dict['select-layers'],
                eventHandler() {
                    me.layerPanel.addTo(me);
                }
            }, {
                className: 'mapboxgl-ctrl-about',
                title: dict['about'],
                eventHandler() {
                    me.aboutPanel.addTo(me);
                }
            }]));
        }

        if (me.clockControl) {
            me.clockCtrl = new ClockControl({lang, dict, clock});
            me.clockCtrl.on('change', me.onClockChange.bind(me));
            map.addControl(me.clockCtrl);
        }

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

        map.on('mouseout', () => {
            me.markObject();
        });

        map.on('click', e => {
            const object = me.pickObject(e.point);

            me.markObject(object);
            me.trackObject(object);

            // For development
            console.log(e.lngLat);
        });

        map.on('zoom', e => {
            if (!e.tracking) {
                if (isTrainOrFlight(me.trackedObject)) {
                    const {type, coord, altitude} = me.trackedObject;

                    if (type === 'flight') {
                        me.updateBaseZoom(coord, altitude);
                    }
                }
            }
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
                unit = Math.pow(2, 14 - helpers.clamp(zoom, 13, 19));

            if (zoom < 13) {
                const lineWidthScale = helpers.clamp(Math.pow(2, zoom - 12), .125, 1);

                ['stations-marked-13', 'stations-selected-13', 'railways-ug-13', 'stations-ug-13', 'railways-routeug-13', 'stations-routeug-13', 'railways-routeog-13', 'stations-routeog-13'].forEach(id => {
                    helpersMapbox.setLayerProps(map, id, {lineWidthScale});
                });
            } else if (zoom > 19) {
                const lineWidthScale = helpers.clamp(Math.pow(2, zoom - 19), 1, 8);

                ['stations-marked-18', 'stations-selected-18', 'railways-ug-18', 'stations-ug-18', 'railways-routeug-18', 'stations-routeug-18', 'railways-routeog-18', 'stations-routeog-18'].forEach(id => {
                    helpersMapbox.setLayerProps(map, id, {lineWidthScale});
                });
            }

            const prevLayerZoom = me.layerZoom;
            me.layerZoom = helpers.clamp(Math.floor(zoom), 13, 18);
            me.objectUnit = Math.max(unit * .19, .02);
            // me.carScale = Math.max(.02 / .19 / unit, 1);
            // me.aircraftScale = Math.max(.06 / .285 / unit, 1);

            if (prevLayerZoom !== me.layerZoom) {
                // If the layer is switched, all object positions need to be recalculated
                Object.keys(me.activeTrainLookup).forEach(key => {
                    const train = me.activeTrainLookup[key];

                    me.updateTrainProps(train);
                    me.updateTrainShape(train);
                });
                Object.keys(me.activeFlightLookup).forEach(key => {
                    me.updateFlightShape(me.activeFlightLookup[key]);
                });
            }
        });

        map.on('render', () => {
            if (me.markedObject) {
                // Popup for a 3D object needs to be updated every time
                // because the adjustment for altitude is required
                if (isTrainOrFlight(me.markedObject)) {
                    me.updatePopup({setHTML: true});
                } else {
                    me.updatePopup();
                }
            }
        });

        map.on('resize', e => {
            me.trafficLayer.onResize(e);
        });

        for (const plugin of me.plugins.slice().reverse()) {
            plugin.addTo(me);
        }

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

                me.updateVisibleArea();

                if (Math.floor((now - configs.minDelay) / configs.trainRefreshInterval) !== Math.floor(me.lastTrainRefresh / configs.trainRefreshInterval)) {
                    me.refreshStyleColors();
                    me.setSunPosition();
                    if (me.searchMode === 'none') {
                        if (me.clockMode === 'realtime') {
                            me.loadRealtimeTrainData();
                            me.loadRealtimeFlightData();
                        } else {
                            me.refreshTrains();
                            me.refreshFlights();
                        }
                    }
                    me.lastTrainRefresh = now - configs.minDelay;
                }

                if (!isTrainOrFlight(me.trackedObject) && (me.ecoMode === 'normal' && map._loaded || Date.now() - me.lastRepaint >= 1000 / me.ecoFrameRate)) {
                    if (me.trackedObject) {
                        me.refreshStationOutline();
                    }
                    map.triggerRepaint();
                    me.lastRepaint = Date.now();
                }
            }
        });

        me.initialized = true;
    }

    _jumpTo(options) {
        const me = this,
            {map, trackingMode, trackingBaseBearing} = me,
            scrollZooming = map.scrollZoom._active;
        let {center, altitude, bearing, centerFactor, bearingFactor} = options;

        if (trackingMode === 'helicopter') {
            bearing = (trackingBaseBearing + performance.now() / 100) % 360;
        } else if (bearingFactor >= 0) {
            const currentBearing = map.getBearing();

            bearing = currentBearing + ((bearing - currentBearing + 540) % 360 - 180) * bearingFactor;
        }

        center = me.adjustCoord(center, altitude, bearing);
        if (centerFactor >= 0) {
            const {lng: fromLng, lat: fromLat} = map.getCenter(),
                {lng: toLng, lat: toLat} = center;

            center = new LngLat(
                fromLng + (toLng - fromLng) * centerFactor,
                fromLat + (toLat - fromLat) * centerFactor
            );
        }

        map.jumpTo({center, bearing});

        // Workaround for the issue of the scroll zoom during tracking
        if (scrollZooming) {
            map.scrollZoom._active = true;
        }
    }

    updateVisibleArea() {
        const me = this,
            {map, trafficLayer} = me,
            {width, height} = map.transform,
            topLeft = trafficLayer.getModelPosition(map.unproject([0, 0])),
            topRight = trafficLayer.getModelPosition(map.unproject([width, 0])),
            bottomLeft = trafficLayer.getModelPosition(map.unproject([0, height])),
            bottomRight = trafficLayer.getModelPosition(map.unproject([width, height]));

        me.visibleArea = helpers.bufferTrapezoid([
            [topLeft.x, topLeft.y],
            [topRight.x, topRight.y],
            [bottomRight.x, bottomRight.y],
            [bottomLeft.x, bottomLeft.y]
        ], Math.max(1.4e-5, 5e-5 * Math.sin(map.getPitch() * DEGREE_TO_RADIAN)));
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
            {map, trafficLayer, objectUnit} = me,
            {railwayFeature: feature, offset, interval, direction, cars, delay} = train,
            length = cars.length;
        let marked, tracked, viewMode;

        if (t !== undefined) {
            train._t = t;
        }
        if (train._t === undefined) {
            return;
        }

        if (length === 0) {
            const railway = me.railwayLookup[train.r],
                {v: vehicle} = train,
                car = {
                    type: 'train',
                    object: train,
                    color: vehicle ? me.trainVehicleLookup[vehicle].color : railway.color,
                    delay: 0
                };

            cars.push(car);

            // Reset marked/tracked object if it was marked/tracked before
            // Delay calling markObject() and trackObject() as they require the object position to be set
            if (me.markedObject && me.markedObject.object === train) {
                marked = cars[0];
            }
            if (me.trackedObject && me.trackedObject.object === train) {
                tracked = cars[0];
            }
            if (me.selection === train.t) {
                tracked = cars[0];
                delete me.selection;
            }
        }

        cars[0].delay = delay ? 1 : 0;

        const pArr = helpersGeojson.getCoordAndBearing(feature, offset + train._t * interval, 1, objectUnit);
        for (let i = 0, ilen = cars.length; i < ilen; i++) {
            const car = cars[i],
                p = pArr[i];

            if (car.altitude < 0 && p.altitude >= 0) {
                viewMode = 'ground';
            } else if (car.altitude >= 0 && p.altitude < 0) {
                viewMode = 'underground';
            }
            car.coord = p.coord;
            car.altitude = p.altitude;
            car.bearing = p.bearing + (direction < 0 ? 180 : 0);
            car.pitch = p.pitch * direction;

            if (marked === car) {
                me.markObject(car);
            }
            if (tracked === car) {
                me.trackObject(car);
            }
            if (me.markedObject === car) {
                car.outline = 1;
            } else if (me.trackedObject === car) {
                car.outline = helpers.blink();
            } else {
                car.outline = 0;
            }

            if (me.trackedObject === car && !me.viewAnimationID && !map._zooming && !map._pitching) {
                me._jumpTo({
                    center: car.coord,
                    altitude: car.altitude,
                    bearing: car.bearing,
                    bearingFactor: .02
                });
            }

            // Reduce the frame rate of invisible objects for performance optimization
            if (animation.isActive(train.animationID)) {
                const {x, y} = trafficLayer.getModelPosition(car.coord),
                    frameRate = helpers.pointInTrapezoid([x, y], me.visibleArea) ? me.ecoMode === 'normal' && map._loaded ? 60 : me.ecoFrameRate : 1;

                animation.setFrameRate(train.animationID, frameRate);
            }

            if (car.meshIndex === undefined) {
                trafficLayer.addObject(car);
            } else {
                trafficLayer.updateObject(car);
            }
            if (viewMode && me.trackedObject === car) {
                me._setViewMode(viewMode);
            }

            if (me.trackedObject === car && me.markedObject === car) {
                me.updatePopup();
            }
        }
    }

    updateFlightShape(flight, t) {
        const me = this,
            {map, trafficLayer} = me;
        let {aircraft} = flight,
            tracked;

        if (t !== undefined) {
            flight._t = t;
        }
        if (flight._t === undefined) {
            return;
        }
        if (!aircraft) {
            const {color, tailcolor} = me.operatorLookup[flight.a];

            aircraft = flight.aircraft = {
                type: 'flight',
                object: flight,
                color: [color || '#FFFFFF', tailcolor || '#FFFFFF']
            };

            // Set tracked object if the selection is specified
            // Delay calling trackObject() as they require the object position to be set
            if (me.selection === flight.id) {
                tracked = aircraft;
                delete me.selection;
            }
        }

        const p = helpersGeojson.getCoordAndBearing(flight.feature, flight._t * flight.feature.properties.length, 1, 0)[0];

        aircraft.coord = p.coord;
        aircraft.altitude = p.altitude;
        aircraft.bearing = p.bearing;
        aircraft.pitch = p.pitch;

        if (tracked === aircraft) {
            me.trackObject(aircraft);
        }
        if (me.markedObject === aircraft) {
            aircraft.outline = 1;
        } else if (me.trackedObject === aircraft) {
            aircraft.outline = helpers.blink();
        } else {
            aircraft.outline = 0;
        }

        if (me.trackedObject === aircraft && !me.viewAnimationID && !map._zooming && !map._pitching) {
            me._jumpTo({
                center: aircraft.coord,
                altitude: aircraft.altitude,
                bearing: aircraft.bearing,
                bearingFactor: .02
            });

            /*
            // Keep camera off from the tracked aircraft
            if (altitude > 0 && Math.pow(2, 22 - map.getZoom()) / altitude < .5) {
                map.setZoom(22 - Math.log2(altitude * .5));
            }
            */

            if (!isNaN(me.baseZoom)) {
                const {baseDistance, baseZoom} = me,
                    z = trafficLayer.getModelPosition(aircraft.coord, aircraft.altitude).z,
                    zoom = baseZoom - Math.log2((z / Math.cos(map.getPitch() * DEGREE_TO_RADIAN) + baseDistance) / baseDistance),
                    scrollZooming = map.scrollZoom._active;

                map.setZoom(zoom, {tracking: true});

                // Workaround for the issue of the scroll zoom during tracking
                if (scrollZooming) {
                    map.scrollZoom._active = true;
                }
            }
        }

        // Reduce the frame rate of invisible objects for performance optimization
        if (animation.isActive(flight.animationID)) {
            const {x, y} = trafficLayer.getModelPosition(aircraft.coord),
                frameRate = helpers.pointInTrapezoid([x, y], me.visibleArea) ? me.ecoMode === 'normal' && map._loaded ? 60 : me.ecoFrameRate : 1;

            animation.setFrameRate(flight.animationID, frameRate);
        }

        if (aircraft.meshIndex === undefined) {
            trafficLayer.addObject(aircraft);
        } else {
            trafficLayer.updateObject(aircraft);
        }

        if (me.trackedObject === aircraft && me.markedObject === aircraft) {
            me.updatePopup();
        }
    }

    refreshTrains() {
        const me = this,
            now = me.clock.getTime();

        me.timetableData.forEach(train => {
            const delay = train.delay || 0,
                railway = me.railwayLookup[train.r];

            if (train.start + delay <= now && now <= train.end + delay &&
                !me.checkActiveTrains(train, true) &&
                (!railway.dynamic || !railway.status || me.realtimeTrainLookup[train.t])) {
                me.trainStart(train);
            }
        });

        me.trafficLayer.refreshDelayMarkers();

        me.trainLoaded = true;
        if (me.initialSelection) {
            me.setSelection(me.initialSelection);
        }
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

        if (!final && train.arrivalStation) {
            me.updateTrainProps(train);
            me.updateTrainShape(train, 0);
        }

        if (!train.tt && train.sectionLength !== 0) {
            me.trainRepeat(train);
        } else {
            me.setTrainStandingStatus(train, true);
            train.animationID = animation.start({
                callback: () => {
                    if (me.trackedObject && me.trackedObject.object === train) {
                        me.updateTrainShape(train);
                    }
                },
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
            if (!train.cars || isNaN(t)) {
                console.log('Invalid train', train);
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
                const {nextTrains} = train;

                if (nextTrains) {
                    let needToStand = false;

                    for (const previousTrain of nextTrains[0].previousTrains) {
                        if (previousTrain.arrivalStation) {
                            needToStand = true;
                        }
                    }
                    if (needToStand) {
                        me.trainStand(train);
                    } else {
                        let markedObjectIndex = -1,
                            trackedObjectIndex = -1;

                        for (const previousTrain of nextTrains[0].previousTrains) {
                            if (markedObjectIndex === -1 && previousTrain.cars) {
                                markedObjectIndex = previousTrain.cars.indexOf(me.markedObject);
                            }
                            if (trackedObjectIndex === -1 && previousTrain.cars) {
                                trackedObjectIndex = previousTrain.cars.indexOf(me.trackedObject);
                            }
                            me.stopTrain(previousTrain);
                        }
                        nextTrains.forEach((train, index) => {
                            if (!me.activeTrainLookup[train.t]) {
                                me.trainStart(train, 0);
                            }
                            if (index === 0 && train.cars) {
                                me.updateTrainShape(train, 0);
                                if (markedObjectIndex !== -1) {
                                    me.markObject(train.cars[markedObjectIndex]);
                                }
                                if (trackedObjectIndex !== -1) {
                                    me.trackObject(train.cars[trackedObjectIndex]);
                                }
                            }
                        });
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
            {clock} = me,
            now = clock.getTime();

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
                        callback: () => {
                            if (me.trackedObject && me.trackedObject.object === flight) {
                                me.updateFlightShape(flight);
                            }
                        },
                        complete: () => {
                            me.flightRepeat(flight);
                        },
                        duration: flight.start - now,
                        clock
                    });
                }
            }
        });

        me.flightLoaded = true;
        if (me.initialSelection) {
            me.setSelection(me.initialSelection);
        }
    }

    flightRepeat(flight, elapsed) {
        const me = this,
            {clock} = me;

        me.setFlightStandingStatus(flight, false);
        flight.animationID = startFlightAnimation(t => {
            me.updateFlightShape(flight, t);
        }, () => {
            me.setFlightStandingStatus(flight, true);
            flight.animationID = animation.start({
                callback: () => {
                    if (me.trackedObject && me.trackedObject.object === flight) {
                        me.updateFlightShape(flight);
                    }
                },
                complete: () => {
                    me.stopFlight(flight);
                },
                duration: Math.max(flight.end - clock.getTime(), 0),
                clock
            });
        }, flight.feature.properties.length, flight.maxSpeed, flight.acceleration, elapsed, clock);
    }

    startViewAnimation() {
        const me = this;
        let t2 = 0;

        me.trackingBaseBearing = me.map.getBearing() - performance.now() / 100;
        me.viewAnimationID = animation.start({
            callback: (elapsed, duration) => {
                const t1 = easeOutQuart(elapsed / duration),
                    factor = 1 - (1 - t1) / (1 - t2),
                    {coord: center, altitude, bearing} = me.trackedObject;

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

    /**
     * Returns a LngLat representing geographical coordinates on the ground
     * that shares the same projected pixel coordinates with the specified
     * geographical location and altitude.
     * @param {LngLatLike} coord - The geographical location to adjust
     * @param {number} altitude - The altitude in meters of the position
     * @param {number} bearing - The desired bearing of the camera in degrees.
     *     If not specified, the coordinates will be calculated using the
     *     current camera projection matrix
     * @returns {LngLat} The adjusted LngLat.
     */
    adjustCoord(coord, altitude, bearing) {
        if (!altitude) {
            return LngLat.convert(coord);
        }

        const {map, trafficLayer} = this;

        if (!isNaN(bearing)) {
            const mCoord = MercatorCoordinate.fromLngLat(coord, altitude),
                offset = mCoord.z * Math.tan(map.getPitch() * DEGREE_TO_RADIAN),
                x = mCoord.x + offset * Math.sin(bearing * DEGREE_TO_RADIAN),
                y = mCoord.y - offset * Math.cos(bearing * DEGREE_TO_RADIAN);

            return new MercatorCoordinate(x, y, 0).toLngLat();
        } else {
            return map.unproject(trafficLayer.project(coord, altitude));
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

    getLocalizedPOITitle(poi) {
        const me = this,
            title = (me.poiLookup[poi] || {}).title || {};

        return title[me.lang] || title.en;
    }

    getLocalizedPOIDescription(poi) {
        const me = this,
            description = (me.poiLookup[poi] || {}).description || {};

        return description[me.lang] || description.en;
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
            `<br> <span class="train-type-label">${me.getLocalizedTrainTypeTitle(train.y)}</span> `,
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
            departureTime ? ` ${clock.getTimeString(clock.getTime(departureTime) + delay)}` : '',
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
            const activeTrain = me.activeTrainLookup[curr.t];

            if (activeTrain && curr.id === activeTrain.id) {
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
                me.trafficLayer.removeObject(car);
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
        if (!keep) {
            delete train.delay;
        }
        if (!tt) {
            delete me.timetableData.splice(me.timetableData.indexOf(train), 1);
        }
    }

    stopFlight(flight) {
        const me = this,
            {id, animationID, aircraft} = flight;

        animation.stop(animationID);
        me.trafficLayer.removeObject(aircraft);
        if (aircraft === me.markedObject) {
            me.markObject();
        }
        if (aircraft === me.trackedObject) {
            me.trackObject();
        }
        delete flight.aircraft;
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
            delete railway.dynamic;
        });
    }

    loadTimetableData() {
        const me = this;

        loader.loadTimetableData(me.dataUrl, me.clock).then(data => {
            me.timetableData = data;
            me.updateTimetableData(me.timetableData);
            me.trainLookup = helpers.buildLookup(me.timetableData, 't');
            delete me.lastTrainRefresh;
        });
    }

    loadRealtimeTrainData() {
        const me = this;

        loader.loadDynamicTrainData(me.secrets).then(({trainData, trainInfoData}) => {
            me.realtimeTrainLookup = {};

            trainData.forEach(trainRef => {
                const {id} = trainRef;

                // Retry lookup replacing Marunouchi line with MarunouchiBranch line
                let train = me.trainLookup[id] || me.trainLookup[id.replace('.Marunouchi.', '.MarunouchiBranch.')];
                let changed = false;

                if (train) {
                    me.realtimeTrainLookup[id] = train;
                    if (train.delay !== trainRef.delay) {
                        train.delay = trainRef.delay;
                        changed = true;
                    }
                    if (trainRef.carComposition && train.carComposition !== trainRef.carComposition) {
                        train.carComposition = trainRef.carComposition;
                        changed = true;
                    }
                    if (trainRef.y && train.y !== trainRef.y) {
                        train.y = trainRef.y;
                        changed = true;
                    }
                    if (truncateTrainTimetable(train, trainRef.os, trainRef.ds)) {
                        changed = true;
                    }
                    if (!train.tt) {
                        train.ts = trainRef.ts;
                        train.fs = trainRef.fs;
                    }
                    if (changed && me.activeTrainLookup[id]) {
                        me.stopTrain(train, true);
                    }
                } else if (trainRef.r) {
                    // Exclude Namboku line trains that connect to/from Mita line
                    if (trainRef.r === RAILWAY_NAMBOKU && (trainRef.os[0].startsWith(RAILWAY_MITA) || trainRef.ds[0].startsWith(RAILWAY_MITA))) {
                        return;
                    }

                    const railwayRef = me.railwayLookup[trainRef.r];

                    if (railwayRef) {
                        train = {
                            t: id,
                            id: `${id}.Today`,
                            r: trainRef.r,
                            y: trainRef.y,
                            n: trainRef.n,
                            os: trainRef.os,
                            d: trainRef.d,
                            ds: trainRef.ds,
                            ts: trainRef.ts,
                            fs: trainRef.fs,
                            start: Date.now(),
                            end: Date.now() + 86400000,
                            delay: trainRef.delay,
                            direction: trainRef.d === railwayRef.ascending ? 1 : -1,
                            altitude: railwayRef.altitude,
                            carComposition: trainRef.carComposition || railwayRef.carComposition
                        };
                        me.timetableData.push(train);
                        me.realtimeTrainLookup[id] = me.trainLookup[id] = train;
                    }
                }
                me.lastDynamicUpdate[trainRef.o] = trainRef.date;
            });

            me.resetRailwayStatus();

            trainInfoData.forEach(trainInfoRef => {
                const railway = me.railwayLookup[trainInfoRef.railway];

                // Train information text is provided in Japanese only
                if (railway && trainInfoRef.status && trainInfoRef.status.ja) {
                    railway.status = trainInfoRef.status.ja;
                    railway.text = trainInfoRef.text.ja;
                    if (helpers.includes(OPERATORS_FOR_DYNAMIC_TRAIN_DATA, trainInfoRef.operator)) {
                        railway.dynamic = true;
                        Object.keys(me.activeTrainLookup).forEach(key => {
                            const train = me.activeTrainLookup[key];
                            if (train.r === railway.id && !me.realtimeTrainLookup[train.t]) {
                                me.stopTrain(train);
                            }
                        });
                    }
                }
            });

            me.refreshTrains();
            me.aboutPanel.updateContent();
        }).catch(error => {
            me.refreshTrains();
            console.log(error);
        });
    }

    loadRealtimeFlightData() {
        const me = this;

        loader.loadDynamicFlightData(me.secrets).then(({atisData, flightData}) => {
            const {landing, departure} = atisData,
                pattern = [landing.join('/'), departure.join('/')].join(' '),
                codeShareFlights = {},
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

            // Create code share flight lookup
            for (const flightRef of flightData) {
                if (helpers.includes(AIRLINES_FOR_ANA_CODE_SHARE, flightRef.a)) {
                    const {dp, ds, sdt, or, ar, sat} = flightRef,
                        key = `${dp || or}.${ds || ar}.${sdt || sat}`;

                    codeShareFlights[key] = flightRef;
                }
            }

            for (const flightRef of flightData) {
                const {id} = flightRef;
                let flight = me.flightLookup[id],
                    status = flightRef.s,
                    {maxFlightSpeed: maxSpeed, flightAcceleration: acceleration} = configs;

                // Check code share flight
                if (id.match(/NH\d{4}$/)) {
                    const {dp, ds, sdt, or, ar, sat} = flightRef,
                        key = `${dp || or}.${ds || ar}.${sdt || sat}`,
                        codeShareFlight = codeShareFlights[key];

                    if (codeShareFlight) {
                        codeShareFlight.n.push(...flightRef.n);
                        continue;
                    }
                }

                if (!flight) {
                    if (status === 'Cancelled') {
                        continue;
                    }
                    const airport = me.airportLookup[flightRef.ds || flightRef.or],
                        direction = airport ? airport.direction : 'S',
                        route = flightRef.dp === 'NRT' ? `NRT.${north ? '34L' : '16R'}.Dep` :
                        flightRef.ar === 'NRT' ? `NRT.${north ? '34R' : '16L'}.Arr` :
                        flightRef.dp === 'HND' ? `HND.${depRoutes[direction]}.Dep` :
                        flightRef.ar === 'HND' ? `HND.${arrRoutes[direction]}.Arr` : undefined,
                        feature = me.featureLookup[route];

                    if (feature) {
                        flight = me.flightLookup[id] = {
                            id,
                            n: flightRef.n,
                            a: flightRef.a,
                            dp: flightRef.dp,
                            ar: flightRef.ar,
                            ds: flightRef.ds,
                            or: flightRef.or,
                            runway: route.replace(/^([^.]+\.)[A-Z]*([^.]+).+/, '$1$2'),
                            feature
                        };
                    } else {
                        continue;
                    }
                }
                Object.assign(flight, {
                    edt: flightRef.edt,
                    adt: flightRef.adt,
                    sdt: flightRef.sdt,
                    eat: flightRef.eat,
                    aat: flightRef.aat,
                    sat: flightRef.sat
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

                const queue = flightQueue[flight.runway] = flightQueue[flight.runway] || [];
                queue.push(flight);

                me.lastDynamicUpdate[flightRef.o] = flightRef.date;
            }

            for (const key of Object.keys(flightQueue)) {
                const queue = flightQueue[key];
                let latest = 0;

                queue.sort((a, b) => a.base - b.base);
                for (const flight of queue) {
                    const delay = Math.max(flight.base, latest + configs.minFlightInterval) - flight.base;

                    if (delay) {
                        flight.start += delay;
                        flight.base += delay;
                        flight.standing += delay;
                        flight.end += delay;
                    }
                    latest = flight.base;
                }
            }

            me.refreshFlights();
        }).catch(error => {
            me.refreshFlights();
            console.log(error);
        });
    }

    updateSearchButton(mode) {
        const {container, dict} = this,
            button = container.querySelector('.mapboxgl-ctrl-search');

        if (button) {
            const {classList} = button;

            if (mode === 'edit' || mode === 'route' || mode === 'playback') {
                button.title = dict['exit-search'];
                classList.add('mapboxgl-ctrl-search-active');
            } else {
                button.title = dict['enter-search'];
                classList.remove('mapboxgl-ctrl-search-active');
            }
        }
    }

    updateUndergroundButton(mode) {
        const {container, dict} = this,
            button = container.querySelector('.mapboxgl-ctrl-underground');

        if (button) {
            const {classList} = button;

            if (mode === 'underground') {
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
            } else if (mode === 'heading') {
                classList.remove('mapboxgl-ctrl-track-helicopter');
                classList.add('mapboxgl-ctrl-track-train');
            } else if (mode) {
                classList.add('mapboxgl-ctrl-track-active');
            } else {
                classList.remove('mapboxgl-ctrl-track-active');
            }
        }
    }

    updatePlaybackButton(mode) {
        const {container, dict} = this,
            button = container.querySelector('.mapboxgl-ctrl-playback');

        if (button) {
            const {classList} = button;

            if (mode === 'playback') {
                button.title = dict['exit-playback'];
                classList.add('mapboxgl-ctrl-playback-active');
            } else {
                button.title = dict['enter-playback'];
                classList.remove('mapboxgl-ctrl-playback-active');
            }
        }
    }

    updateEcoButton(mode) {
        const {container, dict} = this,
            button = container.querySelector('.mapboxgl-ctrl-eco');

        if (button) {
            const {classList} = button;

            if (mode === 'eco') {
                button.title = dict['exit-eco'];
                classList.add('mapboxgl-ctrl-eco-active');
            } else {
                button.title = dict['enter-eco'];
                classList.remove('mapboxgl-ctrl-eco-active');
            }
        }
    }

    refreshMap() {
        const me = this,
            {map, trafficLayer, viewMode, searchMode, styleColors, styleOpacities} = me,
            isUndergroundMode = viewMode === 'underground',
            lightColor = me.getLightColor();

        map.setPaintProperty('background', 'background-color',
            isUndergroundMode ? 'rgb(16,16,16)' : helpersMapbox.getScaledColorString(styleColors[0], lightColor));
        map.setPaintProperty('building-underground', 'fill-color',
            isUndergroundMode ? 'hsla(268,67%,67%,.5)' : helpersMapbox.getScaledColorString({r: 167, g: 114, b: 227, a: .25}, lightColor));
        for (const {id, key, opacity} of styleOpacities) {
            const factor = getLayerOpacity(id, viewMode, searchMode);

            map.setPaintProperty(id, key, helpersMapbox.scaleValues(opacity, factor));
        }

        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            for (const id of [`railways-ug-${zoom}`, `stations-ug-${zoom}`, `railways-routeug-${zoom}`, `stations-routeug-${zoom}`, `railways-routeog-${zoom}`, `stations-routeog-${zoom}`]) {
                setLayerOpacity(map, id, getLayerOpacity(id, viewMode, searchMode));
            }
        }

        trafficLayer.setMode(viewMode, searchMode);
    }

    _setSearchMode(mode) {
        const me = this;

        me.updateSearchButton(mode);
        if (mode === 'none') {
            if (me.searchPanel) {
                me.searchPanel.remove();
                delete me.searchPanel;
            }
        } else {
            if (!me.searchPanel) {
                me.searchPanel = new SearchPanel();
                me.searchPanel.addTo(me);
            }
        }
        me.searchMode = mode;
        me.stopAll();
        for (const plugin of me.plugins) {
            plugin.setVisibility(mode === 'none');
        }
        me.refreshMap();
    }

    _setViewMode(mode) {
        const me = this;

        if (me.viewMode === mode) {
            return;
        }

        me.updateUndergroundButton(mode);
        me.viewMode = mode;
        me.refreshMap();
        me.fire({type: 'viewmode', mode});
    }

    _setTrackingMode(mode) {
        const me = this;

        if (me.trackingMode === mode) {
            return;
        }

        me.updateTrackingButton(mode);
        me.trackingMode = mode;
        if (isTrainOrFlight(me.trackedObject)) {
            me.startViewAnimation();
        }
        me.fire({type: 'trackingmode', mode});
    }

    _setClockMode(mode) {
        const me = this;

        if (me.clockMode === mode) {
            return;
        }

        me.updatePlaybackButton(mode);
        me.clockMode = mode;
        me.clock.reset();
        me.onClockChange();
        if (me.clockControl) {
            me.clockCtrl.setMode(mode);
        }
        if (mode === 'playback') {
            me.resetRailwayStatus();
        }
        me.fire({type: 'clockmode', mode});
    }

    _setEcoMode(mode) {
        const me = this;

        if (me.ecoMode === mode) {
            return;
        }

        me.updateEcoButton(mode);
        me.ecoMode = mode;
        me.fire({type: 'ecomode', mode});
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

    /**
     * Returns the color based on the current date and time.
     * In the playback mode, the time in the simulation clock is used.
     * @returns {object} Color object
     */
    getLightColor() {
        const [lng, lat] = configs.defaultCenter,
            {clock} = this,
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
        return {r, g, b};
    }

    isDarkBackground() {
        return helpersMapbox.isDarkBackground(this.map);
    }

    refreshStyleColors() {
        const me = this,
            {map, viewMode} = me,
            isUndergroundMode = viewMode === 'underground',
            lightColor = me.getLightColor();

        me.styleColors.forEach(item => {
            const {id, key, stops, _case} = item;
            let prop;

            if (id === 'background' && isUndergroundMode) {
                prop = 'rgb(16,16,16)';
            } else if (id === 'building-underground' && isUndergroundMode) {
                prop = 'hsla(268,67%,67%,.5)';
            } else {
                const color = helpersMapbox.getScaledColorString(item, lightColor);

                if (stops !== undefined) {
                    prop = map.getPaintProperty(id, key);
                    prop.stops[stops][1] = color;
                } else if (_case !== undefined) {
                    // Bug: transition doesn't work (mapbox-gl-js #7121)
                    prop = map.getPaintProperty(id, key);
                    prop[_case] = color;
                } else {
                    prop = color;
                }
            }
            map.setPaintProperty(id, key, prop);
        });
    }

    setSunPosition() {
        const {map, clock} = this,
            center = map.getCenter(),
            sunPos = SunCalc.getPosition(
                clock.getTime(),
                center.lat,
                center.lng
            ),
            sunAzimuth = 180 + (sunPos.azimuth * 180) / Math.PI,
            sunAltitude = 90 - (sunPos.altitude * 180) / Math.PI;

        map.setPaintProperty('sky', 'sky-atmosphere-sun', [sunAzimuth, sunAltitude]);
    }

    pickObject(point) {
        const {map, viewMode, trafficLayer, layerZoom, pickedFeature} = this,
            modes = ['ground', 'underground'];
        let object;

        if (viewMode === 'underground') {
            modes.reverse();
        }
        for (const mode of modes) {
            object = trafficLayer.pickObject(mode, point);
            if (object) {
                return object;
            }
            if (mode === 'ground') {
                object = pickedFeature;
            } else {
                object = pickObject(map, `stations-ug-${layerZoom}`, point);
            }
            if (object) {
                return object;
            }
        }
    }

    markObject(object) {
        const me = this,
            {markedObject, map, popup} = me;

        if (markedObject && !isEqualObject(markedObject, object)) {
            if (isTrainOrFlight(markedObject)) {
                markedObject.outline = 0;
                me.trafficLayer.updateObject(markedObject);
            } else {
                me.removeStationOutline('stations-marked');
            }
            delete me.markedObject;
            if (popup && popup.isOpen()) {
                map.getCanvas().style.cursor = '';
                popup.remove();
            }
        }

        if (object && !isEqualObject(object, me.markedObject)) {
            me.markedObject = object;
            map.getCanvas().style.cursor = 'pointer';

            me.popup = new AnimatedPopup({
                className: 'popup-object',
                closeButton: false,
                closeOnClick: false,
                maxWidth: '300px',
                offset: {
                    top: [0, 10],
                    bottom: [0, -30]
                },
                openingAnimation: {
                    duration: 300,
                    easing: 'easeOutBack'
                }
            });
            me.updatePopup({setHTML: true, addToMap: true});

            if (isTrainOrFlight(object)) {
                object.outline = 1;
                me.trafficLayer.updateObject(object);
            } else {
                me.addStationOutline(object, 'stations-marked');
            }
        }
    }

    trackObject(object) {
        const me = this,
            {searchMode, searchPanel, lang, map, trackedObject, sharePanel, detailPanel} = me;

        if (searchMode !== 'none') {
            if (searchMode === 'edit' && searchPanel && isStation(object)) {
                const ids = helpersGeojson.getIds(object),
                    station = me.stationLookup[ids[0]],
                    utitle = station.utitle && station.utitle[lang],
                    title = utitle || helpers.normalize(station.title[lang] || station.title.en);

                searchPanel.fillStationName(title);
            }
            return;
        }

        if (isTrainOrFlight(trackedObject) || isStation(trackedObject) || (trackedObject && !isEqualObject(trackedObject, object))) {
            if (isTrainOrFlight(trackedObject)) {
                const prevObject = trackedObject.object;

                trackedObject.outline = 0;
                me.trafficLayer.updateObject(trackedObject);
                me.fire({type: 'deselection', deselection: prevObject.t || prevObject.id});
            } else if (isStation(trackedObject)) {
                me.removeStationOutline('stations-selected');
                me.fire({type: 'deselection'});
            } else {
                me.fire(Object.assign({type: 'deselection'}, trackedObject));
            }
            delete me.trackedObject;
            me.updateBaseZoom();
            me.stopViewAnimation();
            me.updateTrackingButton(false);
            if (sharePanel) {
                sharePanel.remove();
                delete me.sharePanel;
            }
            if (detailPanel) {
                detailPanel.remove();
                delete me.detailPanel;
            }
            me.exitPopups.forEach(popup => {
                if (popup instanceof AnimatedPopup) {
                    popup.remove();
                } else if (typeof popup === 'function') {
                    map.off('moveend', popup);
                } else {
                    clearTimeout(popup);
                }
            });
        }

        if (isTrainOrFlight(object) || isStation(object) || (object && !isEqualObject(object, me.trackedObject))) {
            me.trackedObject = object;

            if (isTrainOrFlight(object)) {
                const {type, coord, altitude, object: _object} = object;

                if (type === 'flight') {
                    me.updateBaseZoom(coord, altitude);
                }

                me.startViewAnimation();
                me.updateTrackingButton(true);
                me._setViewMode(altitude < 0 ? 'underground' : 'ground');

                if (me.clockMode === 'realtime' && navigator.share) {
                    me.sharePanel = new SharePanel({object: _object});
                    me.sharePanel.addTo(me);
                }
                if (_object.tt) {
                    me.detailPanel = new TrainPanel({object: _object});
                    me.detailPanel.addTo(me);
                }

                object.outline = 1;
                me.trafficLayer.updateObject(object);
                me.fire({type: 'selection', selection: _object.t || _object.id});
            } else if (isStation(object)) {
                const altitude = helpersGeojson.getAltitude(object),
                    ids = helpersGeojson.getIds(object),
                    stations = ids.map(id => me.stationLookup[id]),
                    exits = [].concat(...stations.map(station => station.exit || []));

                if (exits.length > 0) {
                    const coords = [];

                    me.exitPopups = exits.map((id, index) => {
                        const {coord} = me.poiLookup[id],
                            listener = () => {
                                me.exitPopups[index] = setTimeout(() => {
                                    const popup = new AnimatedPopup({
                                        className: 'popup-station',
                                        closeButton: false,
                                        closeOnClick: false
                                    });

                                    popup.setLngLat(coord)
                                        .setHTML(me.getLocalizedPOITitle(id))
                                        .addTo(map)
                                        .getElement().id = `exit-${index}`;

                                    me.exitPopups[index] = popup;
                                }, index / exits.length * 1000);
                            };

                        map.once('moveend', listener);
                        coords.push(coord);

                        return listener;
                    });

                    me._setViewMode(altitude < 0 ? 'underground' : 'ground');
                    map.fitBounds(helpersMapbox.getBounds(coords), {
                        bearing: map.getBearing(),
                        offset: [0, -map.transform.height / 12],
                        padding: {top: 20, bottom:20, left: 10, right: 50},
                        maxZoom: 18
                    });

                    me.detailPanel = new StationPanel({object: stations});
                    me.detailPanel.addTo(me);

                    me.addStationOutline(object, 'stations-selected');
                    me.fire({type: 'selection'});
                } else {
                    me.trackedObject = undefined;
                }
            } else {
                me.fire(Object.assign({type: 'selection'}, object));
            }
        }
    }

    updateBaseZoom(coord, altitude) {
        const me = this,
            {map, trafficLayer} = me;

        if (coord !== undefined && altitude !== undefined) {
            const objectZ = trafficLayer.getModelPosition(coord, altitude).z,
                cameraZ = map.getFreeCameraOptions().position.z,
                z = cameraZ - objectZ;

            me.baseDistance = z / Math.cos(map.getPitch() * DEGREE_TO_RADIAN);
            me.baseZoom = map.getZoom() + Math.log2(cameraZ / z);
        } else {
            delete me.baseDistance;
            delete me.baseZoom;
        }
    }

    updatePopup(options) {
        const me = this,
            {markedObject, trackedObject, map, popup} = me,
            {setHTML, addToMap} = options || {};

        if (isTrainOrFlight(markedObject)) {
            const {coord, altitude, object} = markedObject,
                bearing = markedObject === trackedObject ? map.getBearing() : undefined;

            popup.setLngLat(me.adjustCoord(coord, altitude, bearing));
            if (setHTML) {
                popup.setHTML(object.description);
            }
        } else {
            const object = me.featureLookup[markedObject.properties.id.replace(/\d+$/, me.layerZoom)],
                coord = helpersGeojson.getCenterCoord(object),
                altitude = helpersGeojson.getAltitude(object);

            popup.setLngLat(me.adjustCoord(coord, altitude));
            if (setHTML) {
                const ids = helpersGeojson.getIds(markedObject),
                    stations = {};

                ids.forEach(id => {
                    const title = me.getLocalizedStationTitle(id),
                        railwayID = me.stationLookup[id].railway,
                        railways = stations[title] = stations[title] || {};

                    railways[me.getLocalizedRailwayTitle(railwayID)] = me.railwayLookup[railwayID].color;
                });
                popup.setHTML([
                    '<div class="thumbnail-image-container">',
                    '<div class="ball-pulse"><div></div><div></div><div></div></div>',
                    `<div class="thumbnail-image" style="background-image: url(\'${me.stationLookup[ids[0]].thumbnail}\');"></div>`,
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

    addStationOutline(object, name) {
        const me = this,
            ids = helpersGeojson.getIds(object);

        [13, 14, 15, 16, 17, 18].forEach(zoom => {
            helpersMapbox.setLayerProps(me.map, `${name}-${zoom}`, {
                data: helpersGeojson.featureFilter(me.featureCollection, p => p.zoom === zoom && p.ids && p.ids[0] === ids[0]),
                opacity: 1,
                visible: true
            });
        });
    }

    removeStationOutline(name) {
        [13, 14, 15, 16, 17, 18].forEach(zoom => {
            helpersMapbox.setLayerProps(this.map, `${name}-${zoom}`, {
                visible: false
            });
        });
    }

    refreshStationOutline() {
        const p = performance.now() % 1500 / 1500 * 2;

        [13, 14, 15, 16, 17, 18].forEach(zoom => {
            helpersMapbox.setLayerProps(this.map, `stations-selected-${zoom}`, {
                opacity: p < 1 ? p : 2 - p,
                visible: true
            });
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
            if (finalSection === -1) {
                finalSection = stations.length - 1;
            }
        } else {
            currentSection = stations.lastIndexOf(departureStation);
            nextSection = stations.lastIndexOf(arrivalStation, currentSection);
            finalSection = stations.lastIndexOf(destination, currentSection);
            if (finalSection === -1) {
                finalSection = 0;
            }
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
                train.arrivalStation = arrivalStation === departureStation ? stations[actualSection + direction] : arrivalStation;

                return true;
            }
        }

        train.arrivalStation = train.arrivalTime = train.nextDepartureTime = undefined;
    }

}

function initContainer(container) {
    const map = helpers.createElement('div', {
        id: 'map'
    }, container);

    helpers.createElement('div', {
        id: 'loader',
        className: 'loader-inner ball-pulse',
        innerHTML: '<div></div><div></div><div></div>'
    }, container);
    helpers.createElement('div', {
        id: 'loading-error'
    }, container);
    container.classList.add('mini-tokyo-3d');
    return map;
}

function hideLoader(container) {
    const element = container.querySelector('#loader');

    element.style.opacity = 0;
    setTimeout(() => {
        element.style.display = 'none';
    }, 1000);
}

function showErrorMessage(container) {
    const loaderElement = container.querySelector('#loader'),
        errorElement = container.querySelector('#loading-error');

    loaderElement.style.display = 'none';
    errorElement.innerHTML = 'Loading failed. Please reload the page.';
    errorElement.style.display = 'block';
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

function startFlightAnimation(callback, endCallback, distance, maxSpeed, acceleration, start, clock) {
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
        start: start > 0 ? clock.getHighResTime() - start : undefined,
        clock
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

function getConnectingTrainIds(train) {
    const {nextTrains, t: id} = train,
        ids = id ? [id] : [];

    return nextTrains ? ids.concat(...nextTrains.map(getConnectingTrainIds)) : ids;
}

function isTrainOrFlight(object) {
    return object && helpers.includes(['train', 'flight'], object.type);
}

function isStation(object) {
    return helpersGeojson.isFeature(object);
}

function isEqualObject(a, b) {
    if (a === b) {
        return true;
    }
    if (a && a.properties && b && b.properties && a.properties.ids === b.properties.ids) {
        return true;
    }
    return false;
}

function setLayerOpacity(map, id, opacity) {
    const layer = map.getLayer(id).implementation,
        current = helpers.valueOrDefault(layer.props.opacity, 1);

    animation.start({
        callback: (elapsed, duration) => {
            layer.setProps({
                opacity: helpers.lerp(current, opacity, elapsed / duration)
            });
        },
        duration: configs.transitionDuration
    });
}

function getLayerOpacity(id, viewMode, searchMode) {
    const isUndergroundMode = viewMode === 'underground',
        isNotSearchResultMode = searchMode === 'none' || searchMode === 'edit';

    if (helpers.includes(id, '-ug-')) {
        if (isUndergroundMode) {
            return isNotSearchResultMode ? 1 : .005;
        } else {
            return isNotSearchResultMode ? .0625 : .005;
        }
    } else if (helpers.includes(id, '-og-')) {
        if (isUndergroundMode) {
            return isNotSearchResultMode ? .25 : .1;
        } else {
            return isNotSearchResultMode ? 1 : .1;
        }
    } else if (helpers.includes(id, '-routeug-')) {
        return isUndergroundMode ? 1 : .125;
    } else if (helpers.includes(id, '-routeog-')) {
        return isUndergroundMode ? .25 : 1;
    } else {
        if (isUndergroundMode && id !== 'building-underground') {
            return isNotSearchResultMode ? .0625 : .025;
        } else {
            return isNotSearchResultMode ? 1 : .1;
        }
    }
}
