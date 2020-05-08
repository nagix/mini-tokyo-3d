const configs = {

    // Standing duration at origin and destination in milliseconds
    standingDuration: 60000,

    // Minimum standing duration in milliseconds
    minStandingDuration: 30000,

    // Interval of refreshing train positions in milliseconds
    trainRefreshInterval: 60000,

    // All train positions will be refreshed if the screen has been inactive for this duration
    refreshTimeout: 10000,

    // Interval of refreshing weather information in milliseconds
    weatherRefreshInterval: 60000,

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

    // Origin of coordinates (around Tokyo station)
    originCoord: [139.7670, 35.6814],

    // Default zoom level
    defaultZoom: 14,

    // Default pitch in degrees
    defaultPitch: 60,

    // API URL
    apiURL: 'https://api-tokyochallenge.odpt.org/api/v4/',

    // ATIS URL
    atisURL: 'https://mini-tokyo.appspot.com/atisinfo',

    // Nowcasts URL
    nowcastsURL: 'https://mini-tokyo.appspot.com/nowcast',

    // Secrets URL
    secretsURL: 'secrets',

    // Timestamp when the static data was last updated
    lastStaticUpdate: '2020-05-07 09:00:00'

};

export default configs;
