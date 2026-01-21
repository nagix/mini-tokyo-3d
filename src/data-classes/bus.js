export default class {

    /*
        Other properties:

        sectionIndex;
        sectionLength;
        stop;
        departureTime;
        nextDepartureTime;
        instanceID;
        coord;
        altitude;
        bearing;
        _t;
        standing;
        animationID;
    */

    constructor(params) {
        const me = this;

        /**
         * Object type.
         * @type {string}
         */
        me.type = 'bus';

        /**
         * Bus ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * GTFS ID.
         * @type {string}
         */
        me.gtfsId = params.gtfsId;

        /**
         * GTFS trip.
         * @type {GTFSTrip}
         */
        me.trip = params.trip;

        /**
         * Route feature.
         * @type {Object}
         */
        me.feature = params.feature;

        /**
         * Stop offsets.
         * @type {Array<number>}
         */
        me.offsets = params.offsets;

        /**
         * Bus offset.
         * @type {number}
         */
        me.offset = params.offset;
    }

}
