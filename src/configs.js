// ODPT-compatible API base URL used to build the default data sources
const ODPT_API_URL = 'https://api.odpt.org/api/v4/';
const CHALLENGE_API_URL = 'https://api-challenge.odpt.org/api/v4/';

// mini-tokyo aggregator endpoints used to build the default data sources
const TID_URL = 'https://mini-tokyo.appspot.com/tid';
const TRAIN_INFO_URL = 'https://mini-tokyo.appspot.com/traininfo';
const ATIS_URL = 'https://mini-tokyo.appspot.com/atisinfo';
const FLIGHT_URL = 'https://mini-tokyo.appspot.com/flight';

// Operators whose train positions are fetched directly from ODPT
const ODPT_OPERATORS_FOR_TRAIN = [
    'Toei'
];
const CHALLENGE_OPERATORS_FOR_TRAIN = [
    'Keikyu',
    'Tobu'
];

// Operators whose train information is fetched directly from ODPT
const ODPT_OPERATORS_FOR_TRAININFORMATION = [
    'TWR',
    'TokyoMetro',
    'Toei',
    'YokohamaMunicipal',
    'MIR',
    'TamaMonorail'
];
const CHALLENGE_OPERATORS_FOR_TRAININFORMATION = [
    'jre-is',
    'Tokyu',
    'Keikyu',
    'Tobu',
    'Seibu',
    'Keio'
];

const configs = {

    // Standing duration at origin and destination in milliseconds
    standingDuration: 60000,

    // Minimum standing duration in milliseconds
    minStandingDuration: 30000,

    // Minimum bus standing duration in milliseconds
    minBusStandingDuration: 15000,

    // Interval of refreshing object positions in milliseconds
    refreshInterval: 60000,

    // All object positions will be refreshed if the screen has been inactive for this duration
    refreshTimeout: 10000,

    // Interval of checking train and bus positions based on real-time data in milliseconds
    realtimeCheckInterval: 15000,

    // Maximum train speed in km/h
    maxSpeedKMPH: 80,

    // Train acceleration in km/h/s
    accelerationKMPHPS: 3,

    // Maximum train speed in km/ms
    get maxSpeed() {
        return configs.maxSpeedKMPH / 3600000;
    },

    // Train acceleration in km/ms^2
    get acceleration() {
        return configs.accelerationKMPHPS / 3600000000;
    },

    // Time required to reach maximum train speed in milliseconds
    get maxAccelerationTime() {
        return configs.maxSpeed / configs.acceleration;
    },

    // Distance required to reach maximum train speed in kilometers
    get maxAccDistance() {
        return configs.maxAccelerationTime * configs.maxSpeed / 2;
    },

    // Maximum flight speed in km/h
    maxFlightSpeedKMPH: 500,

    // Flight acceleration in km/h/s
    flightAccelerationKMPHPS: 12,

    // Maximum flight speed in km/ms
    get maxFlightSpeed() {
        return configs.maxFlightSpeedKMPH / 3600000;
    },

    // Flight acceleration in km/ms^2
    get flightAcceleration() {
        return configs.flightAccelerationKMPHPS / 3600000000;
    },

    // Maximum bus speed in km/h
    maxBusSpeedKMPH: 30,

    // Bus acceleration in km/h/s
    busAccelerationKMPHPS: 3,

    // Maximum bus speed in km/ms
    get maxBusSpeed() {
        return configs.maxBusSpeedKMPH / 3600000;
    },

    // Bus acceleration in km/ms^2
    get busAcceleration() {
        return configs.busAccelerationKMPHPS / 3600000000;
    },

    // Time required to reach maximum bus speed in milliseconds
    get maxBusAccelerationTime() {
        return configs.maxBusSpeed / configs.busAcceleration;
    },

    // Distance required to reach maximum bus speed in kilometers
    get maxBusAccDistance() {
        return configs.maxBusAccelerationTime * configs.maxBusSpeed / 2;
    },

    // Delay in milliseconds for minimizing precision error
    minDelay: 25000,

    // Minimum flight interval in milliseconds
    minFlightInterval: 90000,

    // Time allotted for transitions to complete
    transitionDuration: 300,

    // Fade duration when an object is added or removed
    fadeDuration: 1000,

    // Origin of coordinates (around Tokyo station)
    defaultCenter: [139.7670, 35.6814],

    // Default zoom level
    defaultZoom: 14,

    // Default bearing (rotation) of the map
    defaultBearing: 0,

    // Default pitch in degrees
    defaultPitch: 60,

    // Default frame rate for train and aircraft animations in the Eco mode
    defaultEcoFrameRate: 1,

    // Default view mode
    defaultViewMode: 'ground',

    // Default tracking mode
    defaultTrackingMode: 'position',

    // Default clock mode
    defaultClockMode: 'realtime',

    // Default time zone (IANA name) used by the clock and as the fallback for GTFS
    // feeds that don't specify a valid agency_timezone
    defaultTimezone: 'Asia/Tokyo',

    // Default eco mode
    defaultEcoMode: 'normal',

    // ODPT-compatible API hosts and the secrets key each one uses
    odptHosts: {
        'api.odpt.org': 'odpt',
        'api-challenge.odpt.org': 'challenge'
    },

    // Default data URL
    dataUrl: 'https://minitokyo3d.com/data',

    // Default data sources
    dataSources: [{
        id: 'odpt',
        trainUrl: `${ODPT_API_URL}odpt:Train?odpt:operator=${ODPT_OPERATORS_FOR_TRAIN.map(operator => `odpt.Operator:${operator}`).join(',')}`,
        trainInfoUrl: `${ODPT_API_URL}odpt:TrainInformation?odpt:operator=${ODPT_OPERATORS_FOR_TRAININFORMATION.map(operator => `odpt.Operator:${operator}`).join(',')}`
    }, {
        id: 'challenge',
        trainUrl: `${CHALLENGE_API_URL}odpt:Train?odpt:operator=${CHALLENGE_OPERATORS_FOR_TRAIN.map(operator => `odpt.Operator:${operator}`).join(',')}`,
        trainInfoUrl: `${CHALLENGE_API_URL}odpt:TrainInformation?odpt:operator=${CHALLENGE_OPERATORS_FOR_TRAININFORMATION.map(operator => `odpt.Operator:${operator}`).join(',')}`,
        expiresAt: '2027-03-13T00:00:00+09:00'
    }, {
        id: 'mt3d',
        trainUrl: TID_URL,
        trainInfoUrl: TRAIN_INFO_URL,
        flightUrl: FLIGHT_URL,
        atisUrl: ATIS_URL
    }],

    // Route search URL
    searchUrl: 'https://search.minitokyo3d.com/api/v1/routes',

    // Timestamp when the static data was last updated
    lastStaticUpdate: '2026-05-28 15:00:00',

    // String to show in an Mapbox's AttributionControl
    customAttribution: '<a href="https://github.com/nagix/mini-tokyo-3d">© Akihiko Kusanagi</a>',

    // Copyright string
    copyright: '© 2019-2026 Akihiko Kusanagi',

    // Share URL
    shareUrl: 'https://minitokyo3d.com',

    // Supported events
    events: [
        'boxzoomcancel',
        'boxzoomend',
        'boxzoomstart',
        'click',
        'contextmenu',
        'dblclick',
        'drag',
        'dragend',
        'dragstart',
        'error',
        'load',
        'mousedown',
        'mousemove',
        'mouseout',
        'mouseover',
        'mouseup',
        'move',
        'moveend',
        'movestart',
        'pitch',
        'pitchend',
        'pitchstart',
        'resize',
        'rotate',
        'rotateend',
        'rotatestart',
        'touchcancel',
        'touchend',
        'touchmove',
        'touchstart',
        'wheel',
        'zoom',
        'zoomend',
        'zoomstart'
    ],

    // Supported languages
    langs: ['de', 'en', 'es', 'fr', 'ja', 'ko', 'ne', 'pt-BR', 'th', 'zh-Hans', 'zh-Hant']

};

export default configs;
