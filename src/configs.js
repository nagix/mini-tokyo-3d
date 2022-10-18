const configs = {

    // Standing duration at origin and destination in milliseconds
    standingDuration: 60000,

    // Minimum standing duration in milliseconds
    minStandingDuration: 30000,

    // Interval of refreshing train positions in milliseconds
    trainRefreshInterval: 60000,

    // All train positions will be refreshed if the screen has been inactive for this duration
    refreshTimeout: 10000,

    // Interval of checking train positions based on real-time data in milliseconds
    realtimeTrainCheckInterval: 15000,

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

    // Default clock mode
    defaultEcoMode: 'normal',

    // API URL
    apiUrl: {

        // Tokyo Challenge URL
        tokyochallenge: 'https://api-tokyochallenge.odpt.org/api/v4/',

        // ODPT URL
        odpt: 'https://api.odpt.org/api/v4/'

    },

    // TID URL
    tidUrl: 'https://mini-tokyo.appspot.com/tid',

    // ATIS URL
    atisUrl: 'https://mini-tokyo.appspot.com/atisinfo',

    // Default data URL
    dataUrl: 'https://minitokyo3d.com/data',

    // Route search URL
    searchUrl: 'https://search.minitokyo3d.com/api/v1/routes',

    // Timestamp when the static data was last updated
    lastStaticUpdate: '2022-10-01 03:00:00',

    // String to show in an Mapbox's AttributionControl
    customAttribution: '<a href="https://github.com/nagix/mini-tokyo-3d">© Akihiko Kusanagi</a>',

    // Copyright string
    copyright: '© 2019-2022 Akihiko Kusanagi',

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
    ]

};

export default configs;
