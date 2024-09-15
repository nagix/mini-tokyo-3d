import {featureEach} from '@turf/meta';
import {Evented, FullscreenControl, LngLat, Map, MercatorCoordinate, NavigationControl} from 'mapbox-gl';
import AnimatedPopup from 'mapbox-gl-animated-popup';
import animation from './animation';
import Clock from './clock';
import configs from './configs';
import {ClockControl, MapboxGLButtonControl, SearchControl} from './controls';
import extend from './extend';
import * as helpers from './helpers/helpers';
import {pickObject} from './helpers/helpers-deck';
import * as helpersGeojson from './helpers/helpers-geojson';
import * as helpersMapbox from './helpers/helpers-mapbox';
import {GeoJsonLayer, ThreeLayer, Tile3DLayer, TrafficLayer} from './layers';
import {loadDynamicFlightData, loadDynamicTrainData, loadStaticData, loadTimetableData} from './loader';
import {AboutPanel, LayerPanel, SharePanel, StationPanel, TrackingModePanel, TrainPanel} from './panels';
import Plugin from './plugin';

const RAILWAY_NAMBOKU = 'TokyoMetro.Namboku',
    RAILWAY_MITA = 'Toei.Mita',
    RAILWAY_ARAKAWA = 'Toei.Arakawa';

const AIRLINES_FOR_ANA_CODE_SHARE = ['ADO', 'SFJ', 'SNJ'];

const DEGREE_TO_RADIAN = Math.PI / 180;

// Replace NavigationControl._updateZoomButtons to support disabling the control
const _updateZoomButtons = NavigationControl.prototype._updateZoomButtons;
NavigationControl.prototype._updateZoomButtons = function() {
    const me = this,
        {_disabled, _zoomInButton, _zoomOutButton, _compass} = me;

    _updateZoomButtons.apply(me);

    if (_disabled) {
        _zoomInButton.disabled = _zoomOutButton.disabled = true;
        _zoomInButton.setAttribute('aria-disabled', 'true');
        _zoomOutButton.setAttribute('aria-disabled', 'true');
    }
    _compass.disabled = !!_disabled;
    _compass.setAttribute('aria-disabled', (!!_disabled).toString());
};

NavigationControl.prototype.enable = function() {
    const me = this;

    delete me._disabled;
    me._updateZoomButtons();
};

NavigationControl.prototype.disable = function() {
    const me = this;

    me._disabled = true;
    me._updateZoomButtons();
};

const modelOrigin = MercatorCoordinate.fromLngLat(configs.defaultCenter);
const modelScale = modelOrigin.meterInMercatorCoordinateUnits();

export default class extends Evented {

    constructor(options) {
        super();

        const me = this;

        options = extend({
            hash: false,
            useWebGL2: true,
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
        me.plugins = (options.plugins || []).map(plugin => new Plugin(plugin));

        me.searchMode = 'none';
        me.viewMode = configs.defaultViewMode;
        me.trackingMode = options.trackingMode;
        me.trackingParams = {
            zoom: {},
            bearing: {},
            pitch: {}
        };
        me.lastCameraParams = {};
        me.initialSelection = options.selection;
        me.clockMode = configs.defaultClockMode;
        me.isEditingTime = false;
        me.ecoMode = options.ecoMode;
        me.ecoFrameRate = options.ecoFrameRate;

        me.lastDynamicUpdate = {};
        me.lastRepaint = 0;
        me.frameRateFactor = 1;

        // The inner map container overrides the option
        options.container = initContainer(me.container);

        // This style overrides the option
        options.style = `${options.dataUrl}/osm-liberty.json`;

        // The custom attribution will be appended only if ConfigControl is visible
        if (!options.configControl) {
            options.customAttribution = helpers.flat([options.customAttribution, configs.customAttribution]);
        }

        me.map = new Map(options);

        for (const event of configs.events) {
            me.map.on(event, me.fire.bind(me));
        }

        me.map.once('idle', () => {
            helpers.measureFrameRate().then(frameRate => {
                me.frameRateFactor = Math.min(60 / frameRate, 2);
            });
        });

        Promise.all([
            loadStaticData(me.dataUrl, me.lang, me.clock)
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
     * Returns the Mapbox's Map object used in the map.
     * @returns {mapboxgl.Map} The Mapbox's Map
     */
    getMapboxMap() {
        return this.map;
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
     * @returns {Map} Returns itself to allow for method chaining
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
     * @returns {Map} Returns itself to allow for method chaining
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
     * @returns {Map} Returns itself to allow for method chaining
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
     * @returns {Map} Returns itself to allow for method chaining
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
     * @param {Object} options - Options describing the destination and animation of
     *     the transition. Accepts CameraOptions and AnimationOptions
     * @returns {Map} Returns itself to allow for method chaining
     */
    easeTo(options) {
        const me = this;

        if (options.center !== undefined || options.bearing !== undefined) {
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
     * @param {Object} options - Options describing the destination and animation of
     *     the transition. Accepts CameraOptions, AnimationOptions, and a few additional
     *     options
     * @returns {Map} Returns itself to allow for method chaining
     */
    flyTo(options) {
        const me = this;

        if (options.center !== undefined || options.bearing !== undefined) {
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
     * @returns {Map} Returns itself to allow for method chaining
     */
    jumpTo(options) {
        const me = this;

        if (options.center !== undefined || options.bearing !== undefined) {
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
     * @returns {Map} Returns itself to allow for method chaining
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
     * @returns {string} Current tracking mode: 'position', 'back', 'topback', 'front',
     *     'topfront', 'helicopter', 'drone', 'bird' or 'heading'
     */
    getTrackingMode() {
        return this.trackingMode;
    }

    /**
     * Sets the tracking mode.
     * @param {string} mode - Tracking mode: 'position', 'back', 'topback', 'front',
     *     'topfront', 'helicopter', 'drone', 'bird' or 'heading'
     * @returns {Map} Returns itself to allow for method chaining
     */
    setTrackingMode(mode) {
        const me = this;

        me._setTrackingMode(mode);
        return me;
    }

    /**
     * Returns the ID of the train or flight being tracked.
     * @returns {string} The ID of the train or flight being tracked
     */
    getSelection() {
        const me = this;

        if (isTrainOrFlight(me.trackedObject)) {
            const object = me.trackedObject.object;

            return object.t || object.id;
        }
    }

    /**
     * Sets the ID of the train or flight you want to track.
     * @param {string} id - ID of the train or flight to be tracked
     * @returns {Map} Returns itself to allow for method chaining
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
     * @returns {Map} Returns itself to allow for method chaining
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
     * @returns {Map} Returns itself to allow for method chaining
     */
    setEcoMode(mode) {
        const me = this;

        me._setEcoMode(mode);
        return me;
    }

    /**
     * Adds a layer to the map.
     * @param {Object | CustomLayerInterface | GeoJsonLayerInterface | ThreeLayerInterface | Tile3DLayerInterface} layer
     *     - The layer to add, conforming to either the Mapbox Style Specification's
     *     layer definition, the CustomLayerInterface specification, the
     *     GeoJsonLayerInterface specification, the ThreeLayerInterface specification
     *     or the Tile3DLayerInterface specification
     * @param {string} beforeId - The ID of an existing layer to insert the new
     *     layer before
     * @returns {Map} Returns itself to allow for method chaining
     */
    addLayer(layer, beforeId) {
        const me = this;

        if (layer.type === 'three') {
            new ThreeLayer(layer).onAdd(me, beforeId);
        } else if (layer.type === 'geojson') {
            new GeoJsonLayer(layer).onAdd(me, beforeId);
        } else if (layer.type === 'tile-3d') {
            new Tile3DLayer(layer).onAdd(me, beforeId);
        } else {
            me.map.addLayer(layer, beforeId || 'poi');
        }
        return me;
    }

    /**
     * Removes the layer with the given ID from the map.
     * @param {string} id - ID of the layer to remove
     * @returns {Map} Returns itself to allow for method chaining
     */
    removeLayer(id) {
        const me = this;

        me.map.removeLayer(id);
        return me;
    }

    /**
     * Sets the visibility of the layer.
     * @param {string} layerId - The ID of the layer to set the visibility in.
     * @param {string} visibility - Whether this layer is displayed.
     *     'visible' and 'none' are supported.
     * @returns {Map} Returns itself to allow for method chaining
     */
    setLayerVisibility(layerId, visibility) {
        const me = this;

        me.map.setLayoutProperty(layerId, 'visibility', visibility);
        return me;
    }

    /**
     * Returns a MercatorCoordinate object that represents the position of Tokyo
     * Station as the origin of the mercator coordinates.
     * @returns {MercatorCoordinate} The origin of the mercator coordinates
     */
    getModelOrigin() {
        return modelOrigin;
    }

    /**
     * Returns the scale to transform into MercatorCoordinate from coordinates in
     * real world units using meters. This provides the distance of 1 meter in
     * MercatorCoordinate units at Tokyo Station.
     * @returns {number} The scale to transform into MercatorCoordinate from
     *     coordinates in real world units using meters
     */
    getModelScale() {
        return modelScale;
    }

    /**
     * Projects a LngLat to a MercatorCoordinate, and returns the translated
     * mercator coordinates with Tokyo Station as the origin.
     * @param {LngLatLike} lnglat - The location to project
     * @param {number} altitude - The altitude in meters of the position
     * @returns {Object} The translated mercator coordinates with Tokyo Station as
     *     the origin
     */
    getModelPosition(lnglat, altitude) {
        const coord = MercatorCoordinate.fromLngLat(lnglat, altitude);

        return {
            x: coord.x - modelOrigin.x,
            y: -(coord.y - modelOrigin.y),
            z: coord.z - modelOrigin.z
        };
    }

    /**
     * Checks if the background color of the map is dark.
     * @returns {boolean} True if the background color of the map is dark
     */
    hasDarkBackground() {
        return helpersMapbox.hasDarkBackground(this.map);
    }

    initData(data) {
        const me = this,
            featureLookup = me.featureLookup = {},
            stationGroupLookup = me.stationGroupLookup = {};

        Object.assign(me, data);

        me.railwayLookup = helpers.buildLookup(me.railwayData);
        me.stationLookup = helpers.buildLookup(me.stationData);

        // Build feature lookup dictionary and update feature properties
        featureEach(me.featureCollection, feature => {
            const properties = feature.properties;

            if (properties.type === 1) {
                // stations
                featureLookup[`${properties.group}.${properties.zoom}`] = feature;
                if (!stationGroupLookup[properties.group]) {
                    stationGroupLookup[properties.group] = {
                        id: properties.group,
                        type: 'station',
                        stations: properties.ids,
                        layer: properties.altitude === 0 ? 'ground' : 'underground'
                    };
                }
            } else if (!(properties.altitude <= 0)) {
                // airways and railways (no railway sections)
                featureLookup[properties.id] = feature;
                helpersGeojson.updateDistances(feature);
            }
        });

        for (const {id, group, alternate} of me.stationData) {
            if (alternate) {
                for (const layer of ['og', 'ug']) {
                    const key = group.replace(/.g$/, layer),
                        stationGroup = stationGroupLookup[key];

                    if (stationGroup) {
                        if (!stationGroup.hidden) {
                            stationGroup.hidden = [];
                        }
                        stationGroup.hidden.push(id);
                    }
                }
            }
        }

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
            {lang, dict, clock, map, container, featureCollection} = me,
            initialZoom = map.getZoom(),
            layerZoom = me.layerZoom = getLayerZoom(initialZoom);

        if (map.loaded()) {
            hideLoader(container);
        } else {
            map.once('load', () => {
                hideLoader(container);
            });
        }

        // Deprecated
        // me.objectUnit = Math.max(getObjectScale(initialZoom) * .19, .02);

        me.trafficLayer = new TrafficLayer({id: 'traffic'});

        // To move to the style file in v4.0
        map.setLight({
            intensity: 0.35,
            anchor: 'map'
        });

        // To move to the style file in v4.0
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
        }, 'background');

        // To move to the style file in v4.0
        map.addLayer({
            id: 'background-underground',
            type: 'background',
            paint: {
                'background-color': 'rgba(16,16,16,1)',
                'background-opacity': 0
            },
            metadata: {
                'mt3d:opacity-effect': true,
                'mt3d:opacity': 0,
                'mt3d:opacity-underground': 1
            }
        }, 'natural_earth');

        // To move to the style file in v4.0
        map.addLayer({
            id: 'building-underground-underground',
            type: 'fill',
            source: 'mapbox',
            'source-layer': 'building',
            minzoom: 14.5,
            filter: [
                'all',
                [
                    'match',
                    ['get', 'type'],
                    ['underground_mall', 'subway'],
                    true,
                    false
                ],
                ['==', ['get', 'underground'], 'true'],
                ['==', ['geometry-type'], 'Polygon']
            ],
            layout: {},
            paint: {
                'fill-outline-color': 'hsl(35, 8%, 80%)',
                'fill-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    14.5,
                    0,
                    15,
                    0
                ],
                'fill-color': 'hsla(268, 67%, 67%, 0.5)'
            },
            metadata: {
                'mt3d:opacity-effect': true,
                'mt3d:opacity': 0,
                'mt3d:opacity-underground': 1,
                'mt3d:opacity-underground-route': 0.1
            }
        }, 'building');

        map.setLayoutProperty('poi', 'text-field', [
            'coalesce',
            ['get', `name_${lang}`],
            ['get', 'name_en'],
            ['get', 'name']
        ]);

        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            const commonProps = {
                type: 'geojson',
                lineWidthUnits: 'pixels',
                lineWidthScale:
                    zoom === 13 ? helpers.clamp(Math.pow(2, initialZoom - 12), .125, 1) :
                    zoom === 18 ? helpers.clamp(Math.pow(2, initialZoom - 19), 1, 8) : 1,
                parameters: {depthTest: false},
                minzoom: zoom <= 13 ? 0 : zoom,
                maxzoom: zoom >= 18 ? 24 : zoom + 1
            };

            for (const key of ['marked', 'selected']) {
                me.addLayer(Object.assign({}, commonProps, {
                    id: `stations-${key}-${zoom}`,
                    getLineWidth: 12,
                    getLineColor: [255, 255, 255],
                    getFillColor: [255, 255, 255],
                    visible: false
                }), 'building-3d');
            }

            for (const key2 of ['ug', 'routeug', 'routeog']) {
                for (const key1 of ['railways', 'stations']) {
                    const type = key1 === 'railways' ? 0 : 1,
                        filter = p => p.zoom === zoom && p.type === type && p.altitude < 0;

                    me.addLayer(Object.assign({}, commonProps, {
                        id: `${key1}-${key2}-${zoom}`,
                        data: key2 === 'ug' ?
                            helpersGeojson.featureFilter(featureCollection, filter) :
                            helpersGeojson.emptyFeatureCollection(),
                        transitions: {opacity: configs.transitionDuration}
                    }, {
                        'railways': {
                            filled: false,
                            getLineWidth: d => d.properties.width,
                            getLineColor: d => helpers.colorToRGBArray(d.properties.color)
                        },
                        'stations': {
                            getLineWidth: 4,
                            getFillColor: [255, 255, 255, 179]
                        }
                    }[key1], {
                        'ug': {
                            opacity: .0625,
                            pickable: key1 === 'stations',
                            metadata: {
                                'mt3d:opacity-effect': true,
                                'mt3d:opacity': 0.0625,
                                'mt3d:opacity-route': 0.005,
                                'mt3d:opacity-underground': 1,
                                'mt3d:opacity-underground-route': 0.005
                            }
                        },
                        'routeug': {
                            opacity: .0625,
                            metadata: {
                                'mt3d:opacity-effect': true,
                                'mt3d:opacity': 0.125,
                                'mt3d:opacity-underground': 1
                            }
                        },
                        'routeog': {
                            metadata: {
                                'mt3d:opacity-effect': true,
                                'mt3d:opacity': 1,
                                'mt3d:opacity-underground': 0.25
                            }
                        }
                    }[key2]), 'building-3d');
                }
            }
        }

        // Workaround for deck.gl #3522
        map.__deck.props.getCursor = () => map.getCanvas().style.cursor;

        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            const interpolate = ['interpolate', ['exponential', 2], ['zoom']],
                width = ['get', 'width'],
                color = ['get', 'color'],
                lineWidth =
                    zoom === 13 ? [...interpolate, 9, ['/', width, 8], 12, width] :
                    zoom === 18 ? [...interpolate, 19, width, 22, ['*', width, 8]] :
                    width,
                [railwayData, stationData] = [0, 1].map(type => helpersGeojson.featureFilter(
                    featureCollection,
                    p => p.zoom === zoom && p.type === type && p.altitude === 0
                ));

            for (const key of ['railways', 'stations', 'stations-outline']) {
                map.addLayer({
                    id: `${key}-og-${zoom}`,
                    type: key === 'stations' ? 'fill' : 'line',
                    source: {
                        type: 'geojson',
                        data: key === 'railways' ? railwayData : stationData,
                    },
                    layout: {
                        visibility: zoom === layerZoom ? 'visible' : 'none'
                    },
                    paint: {
                        'railways': {
                            'line-color': color,
                            'line-width': lineWidth
                        },
                        'stations': {
                            'fill-color': color,
                            'fill-opacity': .7
                        },
                        'stations-outline': {
                            'line-color': ['get', 'outlineColor'],
                            'line-width': lineWidth
                        }
                    }[key],
                    metadata: {
                        'mt3d:opacity-effect': true,
                        'mt3d:opacity': 1,
                        'mt3d:opacity-route': 0.1,
                        'mt3d:opacity-underground': 0.25,
                        'mt3d:opacity-underground-route': 0.1
                    }
                }, 'building-3d');
            }
        }

        me.addLayer(me.trafficLayer, 'building-3d');

        /* For development
        me.addLayer({
            id: `airway-og-`,
            type: 'geojson',
            data: helpersGeojson.featureFilter(featureCollection, p =>
                p.type === 0 && p.altitude > 0
            ),
            filled: false,
            getLineWidth: d => d.properties.width,
            getLineColor: d => helpers.colorToRGBArray(d.properties.color),
            lineWidthUnits: 'pixels',
            lineWidthScale: 1,
            opacity: .0625,
            transitions: {opacity: configs.transitionDuration},
            parameters: {depthTest: false}
        });
        */

        me.styleColors = helpersMapbox.getStyleColors(map, 'mt3d:color-effect');
        me.styleOpacities = helpersMapbox.getStyleOpacities(map, 'mt3d:opacity-effect');

        const datalist = helpers.createElement('datalist', {id: 'stations'}, document.body);
        me.stationTitleLookup = {};
        for (const l of [lang, 'en']) {
            for (const railway of me.railwayData) {
                for (const id of railway.stations) {
                    const station = me.stationLookup[id],
                        utitle = station.utitle && station.utitle[l],
                        title = utitle || helpers.normalize(station.title[l] || station.title.en),
                        key = title.toUpperCase();

                    if (!me.stationTitleLookup[key]) {
                        helpers.createElement('option', {value: title}, datalist);
                        me.stationTitleLookup[key] = station;
                    }
                }
            }
        }

        if (me.searchControl) {
            const control = new SearchControl({
                title: me.dict['search'],
                placeholder: me.dict['station-name'],
                list: 'stations',
                eventHandler: ({value}) => {
                    const station = me.stationTitleLookup[value.toUpperCase()];

                    if (station && station.coord) {
                        me.markObject();
                        me.trackObject(me.stationGroupLookup[station.group]);
                        return true;
                    }
                }
            });

            map.addControl(control);
        }

        if (me.navigationControl) {
            const control = me.navControl = new NavigationControl();

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
            const control = new FullscreenControl({container});

            control._updateTitle = function() {
                const button = this._fullscreenButton,
                    title = dict[this._isFullscreen() ? 'exit-fullscreen' : 'enter-fullscreen'];

                button.title = title;
                button.setAttribute('aria-label', title);
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
        me.trackingModePanel = new TrackingModePanel();
        me.aboutPanel = new AboutPanel();

        if (me.configControl) {
            map.addControl(new MapboxGLButtonControl([{
                className: 'mapboxgl-ctrl-layers',
                title: dict['select-layers'],
                eventHandler() {
                    me.layerPanel.addTo(me);
                }
            }, {
                className: 'mapboxgl-ctrl-tracking-mode',
                title: dict['select-tracking-mode'],
                eventHandler() {
                    me.trackingModePanel.addTo(me);
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
            const control = me.clockCtrl = new ClockControl({lang, dict, clock});

            control.on('change', me.onClockChange.bind(me));
            map.addControl(control);
        }

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
                me.updateBaseZoom();
            }

            const zoom = map.getZoom(),
                prevLayerZoom = me.layerZoom,
                layerZoom = me.layerZoom = getLayerZoom(zoom);

            if (zoom < 13) {
                const lineWidthScale = helpers.clamp(Math.pow(2, zoom - 12), .125, 1);

                for (const id of ['stations-marked-13', 'stations-selected-13', 'railways-ug-13', 'stations-ug-13', 'railways-routeug-13', 'stations-routeug-13', 'railways-routeog-13', 'stations-routeog-13']) {
                    helpersMapbox.setLayerProps(map, id, {lineWidthScale});
                }
            } else if (zoom > 19) {
                const lineWidthScale = helpers.clamp(Math.pow(2, zoom - 19), 1, 8);

                for (const id of ['stations-marked-18', 'stations-selected-18', 'railways-ug-18', 'stations-ug-18', 'railways-routeug-18', 'stations-routeug-18', 'railways-routeog-18', 'stations-routeog-18']) {
                    helpersMapbox.setLayerProps(map, id, {lineWidthScale});
                }
            }

            // Deprecated
            // me.objectUnit = Math.max(getObjectScale(zoom) * .19, .02);

            if (prevLayerZoom !== layerZoom) {
                const {activeTrainLookup, activeFlightLookup} = me;

                for (const key of ['railways', 'stations', 'stations-outline']) {
                    me.setLayerVisibility(`${key}-og-${prevLayerZoom}`, 'none');
                    me.setLayerVisibility(`${key}-og-${layerZoom}`, 'visible');
                }

                if (e.tracking) {
                    me.prevLayerZoom = prevLayerZoom;
                } else {
                    delete me.prevLayerZoom;
                }

                // If the layer is switched, all object positions need to be recalculated
                for (const key of Object.keys(activeTrainLookup)) {
                    const train = activeTrainLookup[key];

                    me.updateTrainProps(train);
                    me.updateTrainShape(train);
                }
                for (const key of Object.keys(activeFlightLookup)) {
                    me.updateFlightShape(activeFlightLookup[key]);
                }
            }
        });

        map.on('render', () => {
            const markedObject = me.markedObject;

            if (markedObject) {
                // Popup for a 3D object needs to be updated every time
                // because the adjustment for altitude is required
                if (isTrainOrFlight(markedObject)) {
                    me.updatePopup({setHTML: true});
                } else {
                    me.updatePopup();
                }
            }
        });

        for (const plugin of me.plugins.slice().reverse()) {
            plugin.addTo(me);
        }

        animation.init();

        animation.start({
            callback: () => {
                const clock = me.clock,
                    now = clock.getTime(),
                    {minDelay, trainRefreshInterval} = configs;

                if (now - me.lastTimetableRefresh >= 86400000) {
                    me.loadTimetableData();
                    me.lastTimetableRefresh = clock.getTime('03:00');
                }

                // Remove all trains if the page has been invisible for certain amount of time
                if (Date.now() - me.lastFrameRefresh >= configs.refreshTimeout) {
                    me.stopAll();
                }
                me.lastFrameRefresh = Date.now();

                me.updateVisibleArea();

                if (Math.floor((now - minDelay) / trainRefreshInterval) !== Math.floor(me.lastTrainRefresh / trainRefreshInterval)) {
                    helpersMapbox.setStyleColors(map, me.styleColors, me.getLightColor());
                    helpersMapbox.setSunlight(map, now);
                    if (me.searchMode === 'none') {
                        if (me.clockMode === 'realtime') {
                            me.loadRealtimeTrainData();
                            me.loadRealtimeFlightData();
                        } else {
                            me.refreshTrains();
                            me.refreshFlights();
                        }
                        if (isStation(me.trackedObject)) {
                            me.detailPanel.updateContent();
                        }
                    }
                    me.lastTrainRefresh = now - minDelay;
                }

                if (!isTrainOrFlight(me.trackedObject) && ((me.ecoMode === 'normal' && map._loaded) || Date.now() - me.lastRepaint >= 1000 / me.ecoFrameRate)) {
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
            {map, trackingMode, trackingParams, frameRateFactor} = me,
            now = performance.now(),
            currentZoom = map.getZoom(),
            currentBearing = map.getBearing(),
            currentPitch = map.getPitch(),
            scrollZooming = map.scrollZoom._active;
        let zoom, pitch,
            {center, altitude, bearing, easeOutFactor, easeInFactor, bearingFactor} = options;

        if (trackingMode === 'position') {
            zoom = me.baseZoom;
            bearing = currentBearing;
            pitch = currentPitch;
        } else if (trackingMode === 'helicopter') {
            zoom = 15;
            bearing = trackingParams.bearing.fn(now);
            pitch = 60;
        } else if (trackingMode === 'drone') {
            zoom = 17;
            bearing = trackingParams.bearing.fn(now);
            pitch = 75;
        } else if (trackingMode === 'bird') {
            me.updateTrackingParams();
            zoom = trackingParams.zoom.fn(now);
            bearing = trackingParams.bearing.fn(now);
            pitch = trackingParams.pitch.fn(now);
        } else {
            if (trackingMode === 'front' || trackingMode === 'topfront') {
                bearing = (bearing + 360) % 360 - 180;
            }
            if (bearingFactor >= 0) {
                bearing = currentBearing + ((bearing - currentBearing + 540) % 360 - 180) * bearingFactor * frameRateFactor;
            }
            if (trackingMode === 'back' || trackingMode === 'front') {
                zoom = 18.5;
                pitch = 85;
            } else {
                zoom = 15;
                pitch = 60;
            }
        }

        const cameraToGround = map.getFreeCameraOptions().position.z / Math.cos(currentPitch * DEGREE_TO_RADIAN),
            cameraToObject = cameraToGround * Math.pow(2, currentZoom - zoom),
            objectToGround = me.getModelPosition(center, altitude).z / Math.cos(pitch * DEGREE_TO_RADIAN);

        // Adjust zoom according to the altitude of the object
        zoom = Math.min(zoom - Math.log2(Math.max(cameraToObject + objectToGround, 0) / cameraToObject), 22);

        center = me.adjustCoord(center, altitude, bearing);
        if (easeOutFactor >= 0) {
            const currentCenter = map.getCenter();

            center = new LngLat(
                helpers.lerp(currentCenter.lng, center.lng, easeOutFactor * frameRateFactor),
                helpers.lerp(currentCenter.lat, center.lat, easeOutFactor * frameRateFactor)
            );
        }
        if (easeInFactor >= 0) {
            zoom = helpers.lerp(currentZoom, zoom, easeInFactor * frameRateFactor);
            pitch = helpers.lerp(currentPitch, pitch, easeInFactor * frameRateFactor);
        }

        // Prevent layer switch due to calculation error
        if (Math.floor(zoom + 1) - zoom < 1e-6) {
            zoom = Math.floor(zoom + 1);
        }

        // Prevent layer switch back and forth
        if (me.prevLayerZoom === getLayerZoom(zoom)) {
            zoom = currentZoom;
        } else {
            delete me.prevLayerZoom;
        }

        map.jumpTo({center, zoom, bearing, pitch}, {tracking: true});

        // Workaround for the issue of the scroll zoom during tracking
        if (scrollZooming) {
            map.scrollZoom._active = true;
        }
    }

    updateVisibleArea() {
        const me = this,
            map = me.map,
            {width, height} = map.transform,
            topLeft = me.getModelPosition(map.unproject([0, 0])),
            topRight = me.getModelPosition(map.unproject([width, 0])),
            bottomLeft = me.getModelPosition(map.unproject([0, height])),
            bottomRight = me.getModelPosition(map.unproject([width, height]));

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
            sectionIndex = train.sectionIndex,
            offset = train.offset = stationOffsets[sectionIndex];

        train.interval = stationOffsets[sectionIndex + train.sectionLength] - offset;
    }

    updateTrainShape(train, t) {
        const me = this,
            {map, trafficLayer} = me,

            // Deprecated
            // objectUnit = me.objectUnit,
            objectUnit = 0,
            carComposition = 1,

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
                vehicle = train.v,
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

        const pArr = helpersGeojson.getCoordAndBearing(feature, offset + train._t * interval, carComposition, objectUnit);
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

            if (me.trackedObject === car && !me.viewAnimationID && !map._zooming && !map._rotating && !map._pitching) {
                me._jumpTo({
                    center: car.coord,
                    altitude: car.altitude,
                    bearing: car.bearing,
                    bearingFactor: .02
                });
            }

            // Reduce the frame rate of invisible objects for performance optimization
            if (animation.isActive(train.animationID)) {
                const {x, y} = me.getModelPosition(car.coord),
                    frameRate = helpers.pointInTrapezoid([x, y], me.visibleArea) ? me.ecoMode === 'normal' && map._loaded ? 0 : me.ecoFrameRate : 1;

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
        let aircraft = flight.aircraft,
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

        if (me.trackedObject === aircraft && !me.viewAnimationID && !map._zooming && !map._rotating && !map._pitching) {
            me._jumpTo({
                center: aircraft.coord,
                altitude: aircraft.altitude,
                bearing: aircraft.bearing,
                bearingFactor: .02
            });
        }

        // Reduce the frame rate of invisible objects for performance optimization
        if (animation.isActive(flight.animationID)) {
            const {x, y} = me.getModelPosition(aircraft.coord),
                frameRate = helpers.pointInTrapezoid([x, y], me.visibleArea) || me.trackedObject === aircraft ? me.ecoMode === 'normal' && map._loaded ? 0 : me.ecoFrameRate : 1;

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
            initialSelection = me.initialSelection,
            now = me.clock.getTime();

        for (const train of me.timetableData) {
            const delay = train.delay || 0,
                railway = me.railwayLookup[train.r];

            if (train.start + delay <= now && now <= train.end + delay &&
                !me.checkActiveTrains(train, true) &&
                !(railway.dynamic && railway.status && !me.realtimeTrainLookup[train.t]) &&
                !railway.suspended) {
                me.trainStart(train);
            }
        }

        me.trafficLayer.refreshDelayMarkers();

        me.trainLoaded = true;
        if (initialSelection) {
            me.setSelection(initialSelection);
        }
    }

    trainStart(train, index) {
        const me = this,
            clock = me.clock,
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
            clock = me.clock,
            departureTime = clock.getTime(train.departureTime) + (train.delay || 0),
            minStandingDuration = configs.minStandingDuration;

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
                    Math.max(departureTime - clock.getTime(), clock.speed === 1 ? minStandingDuration : 0) :
                    final ? minStandingDuration : configs.realtimeTrainCheckInterval,
                clock
            });
        }
    }

    trainRepeat(train, elapsed) {
        const me = this,
            clock = me.clock,
            now = clock.getTime(),
            delay = train.delay || 0,
            minDelay = configs.minDelay,
            {arrivalTime, nextDepartureTime} = train;
        let minDuration, maxDuration;

        if (nextDepartureTime) {
            maxDuration = clock.getTime(nextDepartureTime) + delay - now + (elapsed || 0) - minDelay + 60000 - configs.minStandingDuration;
        }
        if (arrivalTime) {
            minDuration = clock.getTime(arrivalTime) + delay - now + (elapsed || 0) - minDelay;
            if (!(maxDuration < minDuration + 60000)) {
                maxDuration = minDuration + 60000;
            }
        }
        me.setTrainStandingStatus(train, false);
        train.animationID = startTrainAnimation(t => {
            // Guard for an unexpected error
            // Probably a bug due to duplicate train IDs in timetable lookup
            if (!train.cars || isNaN(t)) {
                console.log('Invalid train', Object.assign({}, train));
                me.stopTrain(train);
                return;
            }

            me.updateTrainShape(train, t);
        }, () => {
            // Guard for an unexpected error
            // Probably a bug due to duplicate train IDs in timetable lookup
            if (!train.cars || (train.tt && train.timetableIndex + 1 >= train.tt.length)) {
                me.stopTrain(train);
                return;
            }

            if (!me.setSectionData(train, train.timetableIndex + 1)) {
                const nextTrains = train.nextTrains;

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
            {clock, flightLookup, initialSelection} = me,
            now = clock.getTime();

        for (const key of Object.keys(flightLookup)) {
            const flight = flightLookup[key],
                {id, start} = flight,
                activeFlightLookup = me.activeFlightLookup;

            if (flight.standing <= now && now <= flight.end && !activeFlightLookup[id]) {
                activeFlightLookup[id] = flight;
                if (now >= start) {
                    me.flightRepeat(flight, now - start);
                } else {
                    me.updateFlightShape(flight, 0);
                    me.setFlightStandingStatus(flight, true);
                    flight.animationID = animation.start({
                        callback: () => {
                            const trackedObject = me.trackedObject;
                            if (trackedObject && trackedObject.object === flight) {
                                me.updateFlightShape(flight);
                            }
                        },
                        complete: () => {
                            me.flightRepeat(flight);
                        },
                        duration: start - now,
                        clock
                    });
                }
            }
        }

        me.flightLoaded = true;
        if (initialSelection) {
            me.setSelection(initialSelection);
        }
    }

    flightRepeat(flight, elapsed) {
        const me = this,
            clock = me.clock;

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

    updateTrackingParams(reset) {
        const me = this,
            {map, trackingMode, trackingParams} = me,
            now = performance.now();

        if (trackingMode === 'bird') {
            const {zoom, bearing, pitch} = trackingParams;

            if (!zoom.time || reset) {
                const time = zoom.time = [0, now, 0, 0],
                    value = zoom.value = [0, me.baseZoom, 0, 0];
                for (const [i, j] of [[0, 1], [2, 1], [3, 2]]) {
                    time[i] = time[j] + Math.sign(i - j) * (Math.random() * 10000 + 30000);
                    value[i] = Math.random() * 5 + 15;
                }
                zoom.fn = createInterpolant(time, value);
            } else if (now >= zoom.time[2]) {
                zoom.time = zoom.time.slice(1).concat(zoom.time[3] + Math.random() * 10000 + 30000);
                zoom.value = zoom.value.slice(1).concat(Math.random() * 5 + 15);
                zoom.fn = createInterpolant(zoom.time, zoom.value);
            }
            if (!bearing.time || reset) {
                const time = bearing.time = [0, now, 0, 0],
                    value = bearing.value = [0, map.getBearing(), 0, 0];
                for (const [i, j] of [[0, 1], [2, 1], [3, 2]]) {
                    time[i] = time[j] + Math.sign(i - j) * (Math.random() * 10000 + 40000);
                    value[i] = Math.random() * 360 - 180;
                }
                bearing.fn = createInterpolant(time, value);
            } else if (now >= bearing.time[2]) {
                bearing.time = bearing.time.slice(1).concat(bearing.time[3] + Math.random() * 10000 + 40000);
                bearing.value = bearing.value.slice(1).concat(Math.random() * 360 - 180);
                bearing.fn = createInterpolant(bearing.time, bearing.value);
            }
            if (!pitch.time || reset) {
                const time = pitch.time = [0, now, 0, 0],
                    value = pitch.value = [0, map.getPitch(), 0, 0];
                for (const [i, j] of [[0, 1], [2, 1], [3, 2]]) {
                    time[i] = time[j] + Math.sign(i - j) * (Math.random() * 10000 + 20000);
                    value[i] = Math.random() * 30 + 45;
                }
                pitch.fn = createInterpolant(time, value);
            } else if (now >= pitch.time[2]) {
                pitch.time = pitch.time.slice(1).concat(pitch.time[3] + Math.random() * 10000 + 20000);
                pitch.value = pitch.value.slice(1).concat(Math.random() * 30 + 45);
                pitch.fn = createInterpolant(pitch.time, pitch.value);
            }
        } else {
            delete trackingParams.zoom.time;
            delete trackingParams.bearing.time;
            delete trackingParams.pitch.time;
            if (trackingMode === 'drone') {
                const bearing = map.getBearing();
                trackingParams.bearing.fn = t => (bearing - (t - now) / 200) % 360;
            } else if (trackingMode === 'helicopter') {
                const bearing = map.getBearing();
                trackingParams.bearing.fn = t => (bearing + (t - now) / 400) % 360;
            }
        }
    }

    updateHandlersAndControls() {
        const me = this,
            {map, trackedObject, trackingMode} = me,
            handlers = ['scrollZoom', 'boxZoom', 'dragRotate', 'dragPan', 'keyboard', 'doubleClickZoom', 'touchZoomRotate', 'touchPitch'];

        if (isTrainOrFlight(trackedObject) && trackingMode !== 'position') {
            for (const handler of handlers) {
                map[handler].disable();
            }
            me.navControl.disable();
        } else {
            for (const handler of handlers) {
                map[handler].enable();
            }
            if (isTrainOrFlight(trackedObject) && trackingMode === 'position') {
                map.dragPan.disable();
            }
            me.navControl.enable();
        }
    }

    startViewAnimation() {
        const me = this;
        let t2 = 0,
            t4 = 0;

        me.viewAnimationID = animation.start({
            callback: (elapsed, duration) => {
                const trackedObject = me.trackedObject,
                    t1 = easeOutQuart(elapsed / duration),
                    easeOutFactor = 1 - (1 - t1) / (1 - t2),
                    t3 = easeInQuad(elapsed / duration),
                    easeInFactor = 1 - (1 - t3) / (1 - t4);

                me._jumpTo({
                    center: trackedObject.coord,
                    altitude: trackedObject.altitude,
                    bearing: trackedObject.bearing,
                    easeOutFactor,
                    easeInFactor,
                    bearingFactor: easeOutFactor
                });
                t2 = t1;
                t4 = t3;
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
        }
        return map.unproject(trafficLayer.project(coord, altitude));
    }

    getLocalizedRailwayTitle(railway) {
        const me = this,
            title = (me.railwayLookup[railway] || {}).title || {};

        return title[me.lang] || title.en;
    }

    getLocalizedTrainNameOrRailwayTitle(names, railway) {
        const me = this;

        return names ?
            names.map(name => name[me.lang] || name.en).join(me.dict['and']) :
            me.getLocalizedRailwayTitle(railway);
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

    getLocalizedRailDirectionTitle(direction) {
        const me = this,
            title = (me.railDirectionLookup[direction] || {}).title || {};

        return title[me.lang] || title.en;
    }

    getLocalizedDestinationTitle(destination, direction) {
        const me = this;

        return destination ?
            me.dict['for'].replace('$1', me.getLocalizedStationTitle(destination)) :
            me.getLocalizedRailDirectionTitle(direction);
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
            {r: railwayID, v: vehicle, departureTime, arrivalStation} = train,
            railway = me.railwayLookup[railwayID],
            color = vehicle ? me.trainVehicleLookup[vehicle].color : railway.color,
            delay = train.delay || 0,
            arrivalTime = train.arrivalTime || train.nextDepartureTime,
            status = railway.status;

        train.standing = standing;
        train.description = [
            '<div class="desc-header">',
            Array.isArray(color) ? [
                '<div>',
                ...color.slice(0, 3).map(c => `<div class="line-strip" style="background-color: ${c};"></div>`),
                '</div>'
            ].join('') : `<div style="background-color: ${color};"></div>`,
            '<div><strong>',
            me.getLocalizedTrainNameOrRailwayTitle(train.nm, railwayID),
            '</strong>',
            `<br> <span class="train-type-label">${me.getLocalizedTrainTypeTitle(train.y)}</span> `,
            me.getLocalizedDestinationTitle(train.ds, train.d),
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
            status && lang === 'ja' ? `<br><span class="desc-caution"><strong>${status}:</strong> ${railway.text}</span>` : ''
        ].join('');
    }

    setFlightStandingStatus(flight) {
        const me = this,
            dict = me.dict,
            {a: airlineID, n: flightNumber, ds: destination} = flight,
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
            dict[destination ? 'to' : 'from'].replace('$1', me.getLocalizedAirportTitle(destination || flight.or)),
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
     * @param {Object} train - train to check
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
            cars = train.cars;

        animation.stop(train.animationID);
        if (cars) {
            for (const car of cars) {
                me.trafficLayer.removeObject(car);
                if (car === me.markedObject && !keep) {
                    me.markObject();
                }
                if (car === me.trackedObject && !keep) {
                    me.trackObject();
                }
            }
        }
        delete train.cars;
        delete me.activeTrainLookup[train.t];
        if (!keep) {
            delete train.delay;
        }
        if (!train.tt) {
            delete me.timetableData.splice(me.timetableData.indexOf(train), 1);
        }
    }

    stopFlight(flight) {
        const me = this,
            aircraft = flight.aircraft;

        animation.stop(flight.animationID);
        me.trafficLayer.removeObject(aircraft);
        if (aircraft === me.markedObject) {
            me.markObject();
        }
        if (aircraft === me.trackedObject) {
            me.trackObject();
        }
        delete flight.aircraft;
        delete me.activeFlightLookup[flight.id];
    }

    stopAll() {
        const me = this,
            {activeTrainLookup, activeFlightLookup} = me;

        for (const key of Object.keys(activeTrainLookup)) {
            me.stopTrain(activeTrainLookup[key]);
        }
        for (const key of Object.keys(activeFlightLookup)) {
            me.stopFlight(activeFlightLookup[key]);
        }
        me.realtimeTrainLookup = {};
        delete me.lastTrainRefresh;
    }

    resetRailwayStatus() {
        for (const railway of this.railwayData) {
            delete railway.status;
            delete railway.text;
            delete railway.suspended;
        }
    }

    loadTimetableData() {
        const me = this;

        loadTimetableData(me.dataUrl, me.clock).then(data => {
            me.timetableData = data;
            me.updateTimetableData(data);
            me.trainLookup = helpers.buildLookup(data, 't');
            delete me.lastTrainRefresh;
        });
    }

    loadRealtimeTrainData() {
        const me = this;

        loadDynamicTrainData(me.secrets).then(({trainData, trainInfoData}) => {
            const {trainLookup, activeTrainLookup, railwayLookup} = me,
                realtimeTrainLookup = me.realtimeTrainLookup = {};

            for (const trainRef of trainData) {
                const {id, r, y, os, d, ds, ts, fs, v, delay, carComposition} = trainRef;

                // Retry lookup replacing Marunouchi line with MarunouchiBranch line
                let train = trainLookup[id] || trainLookup[id.replace('.Marunouchi.', '.MarunouchiBranch.')];
                let changed = false;

                if (train) {
                    realtimeTrainLookup[id] = train;
                    if (!isNaN(delay) && train.delay !== delay) {
                        train.delay = delay;
                        changed = true;
                    }
                    if (carComposition && train.carComposition !== carComposition) {
                        train.carComposition = carComposition;
                        changed = true;
                    }
                    if (y && train.y !== y) {
                        train.y = y;
                        changed = true;
                    }
                    if (truncateTrainTimetable(train, os, ds)) {
                        changed = true;
                    }
                    if (!train.tt) {
                        train.ts = ts;
                        train.fs = fs;
                    }
                    if (v) {
                        train.v = v;
                    }
                    if (changed && activeTrainLookup[id]) {
                        me.stopTrain(train, true);
                    }
                } else if (r) {
                    // Exclude Namboku line trains that connect to/from Mita line
                    if (r === RAILWAY_NAMBOKU && (os[0].startsWith(RAILWAY_MITA) || ds[0].startsWith(RAILWAY_MITA))) {
                        continue;
                    }

                    // Exclude Arakawa line trains
                    if (r === RAILWAY_ARAKAWA) {
                        continue;
                    }

                    const railwayRef = railwayLookup[r];

                    if (railwayRef) {
                        train = {
                            t: id,
                            id: `${id}.Today`,
                            r,
                            y,
                            n: trainRef.n,
                            os,
                            d,
                            ds,
                            ts,
                            fs,
                            start: Date.now(),
                            end: Date.now() + 86400000,
                            delay,
                            direction: d === railwayRef.ascending ? 1 : -1,
                            altitude: railwayRef.altitude,
                            carComposition: carComposition || railwayRef.carComposition
                        };
                        me.timetableData.push(train);
                        realtimeTrainLookup[id] = trainLookup[id] = train;
                    }
                }
                me.lastDynamicUpdate[trainRef.o] = trainRef.date;
            }

            me.resetRailwayStatus();

            for (const trainInfoRef of trainInfoData) {
                const railway = railwayLookup[trainInfoRef.railway],
                    status = trainInfoRef.status;

                // Train information text is provided in Japanese only
                if (railway && status && status.ja) {
                    railway.status = status.ja;
                    railway.text = trainInfoRef.text.ja;
                    if (railway.dynamic) {
                        for (const key of Object.keys(activeTrainLookup)) {
                            const train = activeTrainLookup[key];
                            if (train.r === railway.id && !realtimeTrainLookup[train.t]) {
                                me.stopTrain(train);
                            }
                        }
                    }
                }

                if (trainInfoRef.suspended) {
                    railway.suspended = true;
                    for (const key of Object.keys(activeTrainLookup)) {
                        const train = activeTrainLookup[key];
                        if (train.r === railway.id) {
                            me.stopTrain(train);
                        }
                    }
                }
            }

            me.refreshTrains();
            me.aboutPanel.updateContent();
        }).catch(error => {
            me.refreshTrains();
            console.log(error);
        });
    }

    loadRealtimeFlightData() {
        const me = this;

        loadDynamicFlightData(me.secrets).then(({atisData, flightData}) => {
            const {flightLookup, activeFlightLookup} = me,
                {landing, departure} = atisData,
                pattern = [landing.join('/'), departure.join('/')].join(' '),
                codeShareFlights = {},
                flightQueue = {};
            let arrRoutes = {},
                depRoutes = {},
                north = true;

            if (me.flightPattern !== pattern) {
                me.flightPattern = pattern;
                me.lastFlightPatternChanged = Date.now();
                for (const key of Object.keys(activeFlightLookup)) {
                    me.stopFlight(activeFlightLookup[key]);
                }
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
                } else if (helpers.includes(landing, 'L22')) { // Special
                    arrRoutes = {S: 'L22', N: 'L22'};
                    north = false;
                } else {
                    console.log(`Unexpected LDG RWY: ${landing[0]}`);
                }
                if (helpers.includes(departure, '16L')) {
                    depRoutes = {S: 'N16L', N: 'N16L'};
                } else if (helpers.includes(departure, '05')) {
                    depRoutes = {S: 'N05', N: 'N05'};
                } else if (helpers.includes(departure, '16R')) { // Special
                    depRoutes = {S: '16R', N: '16R'};
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
                const {id, n, dp, ds, sdt, or, ar, sat} = flightRef;
                let flight = flightLookup[id],
                    status = flightRef.s,
                    {maxFlightSpeed: maxSpeed, flightAcceleration: acceleration} = configs;

                // Check code share flight
                if (id.match(/NH\d{4}$/)) {
                    const key = `${dp || or}.${ds || ar}.${sdt || sat}`,
                        codeShareFlight = codeShareFlights[key];

                    if (codeShareFlight) {
                        codeShareFlight.n.push(...n);
                        continue;
                    }
                }

                if (!flight) {
                    if (helpers.includes(['Cancelled', 'PostponedTomorrow'], status)) {
                        continue;
                    }
                    const airport = me.airportLookup[ds || or],
                        direction = airport ? airport.direction : 'S',
                        route = dp === 'NRT' ? `NRT.${north ? '34L' : '16R'}.Dep` :
                        ar === 'NRT' ? `NRT.${north ? '34R' : '16L'}.Arr` :
                        dp === 'HND' ? `HND.${depRoutes[direction]}.Dep` :
                        ar === 'HND' ? `HND.${arrRoutes[direction]}.Arr` : undefined,
                        feature = me.featureLookup[route];

                    if (feature) {
                        flight = flightLookup[id] = {
                            id,
                            n,
                            a: flightRef.a,
                            dp,
                            ar,
                            ds,
                            or,
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
                    sdt,
                    eat: flightRef.eat,
                    aat: flightRef.aat,
                    sat
                });

                const departureTime = flight.edt || flight.adt || flight.sdt,
                    arrivalTime = flight.eat || flight.aat || flight.sat;

                if (arrivalTime && !status) {
                    if (arrivalTime < flight.sat) {
                        status = 'NewTime';
                    } else if (arrivalTime > flight.sat) {
                        status = 'Delayed';
                    } else if (arrivalTime === flight.sat) {
                        status = 'OnTime';
                    }
                } else if (departureTime && (!status || status === 'CheckIn' || status === 'NowBoarding' || status === 'FinalCall' || status === 'BoardingComplete' || status === 'Departed')) {
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
                    const base = flight.base,
                        delay = Math.max(base, latest + configs.minFlightInterval) - base;

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
            me.aboutPanel.updateContent();
        }).catch(error => {
            me.refreshFlights();
            console.log(error);
        });
    }

    updateSearchButton(mode) {
        const {container, dict} = this,
            button = container.querySelector('.mapboxgl-ctrl-search');

        if (button) {
            const classList = button.classList;

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
            const classList = button.classList;

            if (mode === 'underground') {
                button.title = dict['exit-underground'];
                classList.add('mapboxgl-ctrl-underground-visible');
            } else {
                button.title = dict['enter-underground'];
                classList.remove('mapboxgl-ctrl-underground-visible');
            }
        }
    }

    updatePlaybackButton(mode) {
        const {container, dict} = this,
            button = container.querySelector('.mapboxgl-ctrl-playback');

        if (button) {
            const classList = button.classList;

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
            const classList = button.classList;

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
            {viewMode, searchMode} = me,
            isUndergroundMode = viewMode === 'underground',
            isNotSearchResultMode = searchMode === 'none' || searchMode === 'edit',
            factorKey = `mt3d:opacity${isUndergroundMode ? '-underground' : ''}`;

        helpersMapbox.setStyleOpacities(me.map, me.styleOpacities, isNotSearchResultMode ? factorKey : [`${factorKey}-route`, factorKey]);
        me.trafficLayer.setMode(viewMode, searchMode);
    }

    _setSearchMode(mode) {
        const me = this;

        if (me.searchMode !== mode) {
            me.searchMode = mode;
            me.stopAll();
            for (const plugin of me.plugins) {
                plugin.setVisibility(mode === 'none');
            }
            me.refreshMap();
        }
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

        me.trackingMode = mode;
        if (isTrainOrFlight(me.trackedObject)) {
            me.updateBaseZoom();
            me.updateTrackingParams(true);
            me.updateHandlersAndControls();
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
     * Returns the light color based on the current date and time.
     * In the playback mode, the time in the simulation clock is used.
     * @returns {Object} Color object
     */
    getLightColor() {
        return helpersMapbox.getSunlightColor(this.map, this.clock.getTime());
    }

    pickObject(point) {
        const me = this,
            {map, layerZoom} = me,
            modes = ['ground', 'underground'];
        let object;

        if (me.viewMode === 'underground') {
            modes.reverse();
        }
        for (const mode of modes) {
            object = me.trafficLayer.pickObject(mode, point);
            if (object) {
                return object;
            }
            if (mode === 'ground') {
                object = map.queryRenderedFeatures(point, {layers: [`stations-og-${layerZoom}`]})[0];
            } else {
                object = pickObject(map, `stations-ug-${layerZoom}`, point);
            }
            if (object) {
                return me.stationGroupLookup[object.properties.group];
            }
        }
    }

    markObject(object) {
        const me = this,
            {markedObject, trafficLayer, map, popup} = me;

        if (markedObject && !isEqualObject(markedObject, object)) {
            if (isTrainOrFlight(markedObject)) {
                markedObject.outline = 0;
                trafficLayer.updateObject(markedObject);
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
                trafficLayer.updateObject(object);
            } else {
                me.addStationOutline(object, 'stations-marked');
            }
        }
    }

    trackObject(object) {
        const me = this,
            {searchMode, lang, map, trackedObject, lastCameraParams, sharePanel, detailPanel} = me;

        if (searchMode === 'edit' && detailPanel && isStation(object)) {
            const station = me.stationLookup[object.stations[0]],
                utitle = station.utitle && station.utitle[lang],
                title = utitle || helpers.normalize(station.title[lang] || station.title.en);

            detailPanel.fillStationName(title);
            return;
        }

        // Remember the camera params to restore them after the object is deselected
        if (!trackedObject && object) {
            lastCameraParams.viewMode = me.getViewMode();
            delete lastCameraParams.center;
            lastCameraParams.zoom = map.getZoom();
            lastCameraParams.bearing = map.getBearing();
            lastCameraParams.pitch = map.getPitch();
        } else if (trackedObject && !object) {
            me._setViewMode(lastCameraParams.viewMode);
            map.flyTo({
                center: lastCameraParams.center || map.getCenter(),
                zoom: lastCameraParams.zoom,
                bearing: lastCameraParams.bearing,
                pitch: lastCameraParams.pitch
            });
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
                me._setSearchMode('none');
                me.hideStationExits();
            } else {
                me.fire(Object.assign({type: 'deselection'}, trackedObject));
            }
            delete me.trackedObject;
            me.updateHandlersAndControls();
            me.stopViewAnimation();
            if (sharePanel) {
                sharePanel.remove();
                delete me.sharePanel;
            }
            if (detailPanel) {
                detailPanel.remove();
                delete me.detailPanel;
            }
        }

        if (isTrainOrFlight(object) || isStation(object) || (object && !isEqualObject(object, me.trackedObject))) {
            me.trackedObject = object;

            if (isTrainOrFlight(object)) {
                const _object = object.object;

                me.updateBaseZoom();
                me.updateTrackingParams(true);
                me.updateHandlersAndControls();
                me.startViewAnimation();
                me._setViewMode(object.altitude < 0 ? 'underground' : 'ground');

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
                const stations = object.stations.concat(object.hidden || []).map(id => me.stationLookup[id]),
                    coords = stations.map(station => station.coord),
                    center = lastCameraParams.center = helpersMapbox.getBounds(coords).getCenter();

                if (object.layer === 'ground') {
                    me._setViewMode('ground');
                } else if (!map.getCenter().distanceTo(center)) {
                    me._setViewMode('underground');
                } else {
                    let prevZoom = map.getZoom();
                    const initialZoom = prevZoom,
                        onZoom = () => {
                            const zoom = map.getZoom();

                            if (zoom < prevZoom && zoom < initialZoom - 0.5) {
                                me._setViewMode('ground');
                            } else if (zoom > prevZoom && zoom > 15) {
                                me._setViewMode('underground');
                            }
                            prevZoom = zoom;
                        };

                    map.on('zoom', onZoom);
                    map.once('zoomend', () => {
                        me._setViewMode('underground');
                        map.off('zoom', onZoom);
                    });
                }
                map.flyTo({center, zoom: 15.5});

                me.detailPanel = new StationPanel({object: stations});
                me.detailPanel.addTo(me);

                me.addStationOutline(object, 'stations-selected');
                me.fire({type: 'selection'});
            } else {
                me.fire(Object.assign({type: 'selection'}, object));
            }
        }
    }

    showStationExits(stations) {
        const me = this,
            map = me.map,
            exits = [].concat(...stations.map(station => station.exit || []));

        if (exits.length > 0) {
            const coords = [];

            me.exitPopups = exits.map((id, index) => {
                const {coord, facilities} = me.poiLookup[id],
                    icons = (facilities || []).map(facility => `<span class="exit-${facility}-small-icon"></span>`).join(''),
                    listener = () => {
                        me.exitPopups[index] = setTimeout(() => {
                            const popup = new AnimatedPopup({
                                className: 'popup-station',
                                closeButton: false,
                                closeOnClick: false
                            });

                            popup.setLngLat(coord)
                                .setHTML(icons + me.getLocalizedPOITitle(id))
                                .addTo(map)
                                .getElement().id = `exit-${index}`;

                            me.exitPopups[index] = popup;
                        }, index / exits.length * 1000);
                    };

                map.once('moveend', listener);
                coords.push(coord);

                return listener;
            });

            map.fitBounds(helpersMapbox.getBounds(coords), {
                bearing: map.getBearing(),
                pitch: map.getPitch(),
                offset: [0, -map.transform.height / 12],
                padding: {top: 20, bottom: 20, left: 10, right: 50},
                maxZoom: 18
            });
        }
    }

    hideStationExits() {
        const me = this;

        for (const popup of me.exitPopups) {
            if (popup instanceof AnimatedPopup) {
                popup.remove();
            } else if (typeof popup === 'function') {
                me.map.off('moveend', popup);
            } else {
                clearTimeout(popup);
            }
        }
        me.exitPopups = [];
    }

    updateBaseZoom() {
        const me = this,
            {map, trackedObject: object} = me;

        if (isTrainOrFlight(object)) {
            const objectZ = me.getModelPosition(object.coord, object.altitude).z,
                cameraZ = map.getFreeCameraOptions().position.z;

            me.baseZoom = map.getZoom() + Math.log2(cameraZ / Math.abs(cameraZ - objectZ));
        }
    }

    updatePopup(options) {
        const me = this,
            {markedObject, map, stationLookup, popup} = me,
            {setHTML, addToMap} = options || {};

        if (isTrainOrFlight(markedObject)) {
            const bearing = markedObject === me.trackedObject ? map.getBearing() : undefined;

            popup.setLngLat(me.adjustCoord(markedObject.coord, markedObject.altitude, bearing));
            if (setHTML) {
                popup.setHTML(markedObject.object.description);
            }
        } else {
            const object = me.featureLookup[`${markedObject.id}.${me.layerZoom}`],
                coord = helpersGeojson.getCenterCoord(object),
                altitude = helpersGeojson.getAltitude(object);

            popup.setLngLat(me.adjustCoord(coord, altitude));
            if (setHTML) {
                const ids = markedObject.stations,
                    railwayColors = {};

                for (const id of ids) {
                    const title = me.getLocalizedStationTitle(id),
                        railwayID = stationLookup[id].railway,
                        colors = railwayColors[title] = railwayColors[title] || {};

                    colors[me.getLocalizedRailwayTitle(railwayID)] = me.railwayLookup[railwayID].color;
                }
                popup.setHTML([
                    '<div class="thumbnail-image-container">',
                    '<div class="ball-pulse"><div></div><div></div><div></div></div>',
                    `<div class="thumbnail-image" style="background-image: url(\'${stationLookup[ids[0]].thumbnail}\');"></div>`,
                    '</div>',
                    '<div class="railway-list">',
                    Object.keys(railwayColors).map(station => {
                        const railways = Object.keys(railwayColors[station])
                            .map(railway => `<div class="line-strip" style="background-color: ${railwayColors[station][railway]};"></div><span>${railway}</span>`)
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
            clock = me.clock,
            lookup = helpers.buildLookup(data);

        for (const train of data) {
            const railway = me.railwayLookup[train.r],
                direction = train.d === railway.ascending ? 1 : -1,
                {tt: table, pt: previousTableIDs, nt: nextTableIDs} = train,
                length = table.length;
            let start = Infinity,
                previousTrains, nextTrains;

            if (previousTableIDs) {
                for (const id of previousTableIDs) {
                    const previousTrain = lookup[id];

                    if (previousTrain) {
                        const tt = previousTrain.tt;

                        start = Math.min(start,
                            clock.getTime(tt[tt.length - 1].a || tt[tt.length - 1].d || table[0].d) - configs.standingDuration);
                        previousTrains = previousTrains || [];
                        previousTrains.push(previousTrain);
                    }
                }
            }
            if (nextTableIDs) {
                for (const id of nextTableIDs) {
                    const nextTrain = lookup[id];

                    if (nextTrain) {
                        nextTrains = nextTrains || [];
                        nextTrains.push(nextTrain);
                    }
                }
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
        }
    }

    addStationOutline(object, name) {
        const me = this,
            id = object.stations[0];

        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            helpersMapbox.setLayerProps(me.map, `${name}-${zoom}`, {
                data: helpersGeojson.featureFilter(me.featureCollection, p => p.zoom === zoom && p.ids && p.ids[0] === id),
                opacity: 1,
                visible: true
            });
        }
    }

    removeStationOutline(name) {
        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            helpersMapbox.setLayerProps(this.map, `${name}-${zoom}`, {
                visible: false
            });
        }
    }

    refreshStationOutline() {
        const p = performance.now() % 1500 / 1500 * 2;

        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            helpersMapbox.setLayerProps(this.map, `stations-selected-${zoom}`, {
                opacity: p < 1 ? p : 2 - p,
                visible: true
            });
        }
    }

    setSectionData(train, index, final) {
        const me = this,
            clock = me.clock,
            stations = me.railwayLookup[train.r].stations,
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

function easeInQuad(t) {
    return t * t;
}

function easeOutQuart(t) {
    return -((t -= 1) * t * t * t - 1);
}

function createInterpolant(xs, ys) {
    const length = xs.length;

    // Get consecutive differences and slopes
    const dys = [], dxs = [], ms = [];
    for (let i = 0; i < length - 1; i++) {
        const dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i];
        dxs.push(dx); dys.push(dy); ms.push(dy / dx);
    }

    // Get degree-1 coefficients
    const c1s = [ms[0]];
    for (let i = 0; i < dxs.length - 1; i++) {
        const m = ms[i], mNext = ms[i + 1];
        if (m * mNext <= 0) {
            c1s.push(0);
        } else {
            const dx_ = dxs[i], dxNext = dxs[i + 1], common = dx_ + dxNext;
            c1s.push(3 * common / ((common + dxNext) / m + (common + dx_) / mNext));
        }
    }
    c1s.push(ms[ms.length - 1]);

    // Get degree-2 and degree-3 coefficients
    const c2s = [], c3s = [];
    for (let i = 0; i < c1s.length - 1; i++) {
        const c1 = c1s[i], m_ = ms[i], invDx = 1 / dxs[i], common_ = c1 + c1s[i + 1] - m_ - m_;
        c2s.push((m_ - c1 - common_) * invDx); c3s.push(common_ * invDx * invDx);
    }

    // Return interpolant function
    return x => {
        // The rightmost point in the dataset should give an exact result
        let i = xs.length - 1;
        if (x === xs[i]) {
            return ys[i];
        }

        // Search for the interval x is in, returning the corresponding y if x is one of the original xs
        let low = 0, mid, high = c3s.length - 1;
        while (low <= high) {
            mid = Math.floor(0.5 * (low + high));
            const xHere = xs[mid];
            if (xHere < x) {
                low = mid + 1;
            } else if (xHere > x) {
                high = mid - 1;
            } else {
                return ys[mid];
            }
        }
        i = Math.max(0, high);

        // Interpolate
        const diff = x - xs[i], diffSq = diff * diff;
        return ys[i] + c1s[i] * diff + c2s[i] * diffSq + c3s[i] * diff * diffSq;
    };
}

function getLayerZoom(zoom) {
    return helpers.clamp(Math.floor(zoom), 13, 18);
}

// Deprecated
// function getObjectScale(zoom) {
//     return Math.pow(2, 14 - helpers.clamp(zoom, 13, 19));
// }

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
    return object && object.type === 'station';
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
