export default class {

    constructor(params) {
        const me = this;

        /**
         * Trip ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * Route ID.
         * @type {string}
         */
        me.route = params.route;

        /**
         * Shape ID.
         * @type {string}
         */
        me.shape = params.shape;

        /**
         * Departure time offset at each stop
         * @type {Array<number>}
         */
        me.departureTimes = params.departureTimes;

        /**
         * Stops.
         * @type {Array<string>}
         */
        me.stops = params.stops;

        /**
         * Stop sequences.
         * @type {Array<number>}
         */
        me.stopSequences = params.stopSequences;

        /**
         * Headsigns.
         * @type {Array<string>}
         */
        me.headsigns = params.headsigns;
    }

}
