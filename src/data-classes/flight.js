import {getTimeOffset} from '../helpers/helpers';

export default class {

    /*
        Other properties:

        runway;
        feature;
        base;
        entry;
        start;
        end;
        maxSpeed;
        acceleration;
        instanceID;
        coord;
        altitude;
        bearing;
        _t;
        standing;
        animationID;
    */

    constructor(params, refs) {
        const me = this,
            {s, dp, ds, adt, edt, sdt, ar, or, aat, eat, sat} = params;

        /**
         * Object type
         * $type {string}
         */
        me.type = 'flight';

        /**
         * Flight ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * Flight numbers.
         * @type {Array<string>}
         */
        me.n = params.n;

        /**
         * Airline.
         * @type {Operator}
         */
        me.a = refs.operators.get(params.a);

        if (s) {
            /**
             * Flight status.
             * @type {FlightStatus}
             */
            me.s = refs.flightStatuses.get(s);
        }

        if (dp) {
            /**
             * Departure airport.
             * @type {Airport}
             */
            me.dp = refs.airports.get(dp);
        }

        if (ds) {
            /**
             * Destination airport.
             * @type {Airport}
             */
            me.ds = refs.airports.get(ds);
        }

        if (adt) {
            /**
             * Actucal departure time offset.
             * @type {number}
             */
            me.adt = getTimeOffset(adt);
        }

        if (edt) {
            /**
             * Estimated departure time offset.
             * @type {number}
             */
            me.edt = getTimeOffset(edt);
        }

        if (sdt) {
            /**
             * Scheduled departure time offset.
             * @type {number}
             */
            me.sdt = getTimeOffset(sdt);
        }

        if (ar) {
            /**
             * Arrival airport.
             * @type {Airport}
             */
            me.ar = refs.airports.get(ar);
        }

        if (or) {
            /**
             * Origin airport.
             * @type {Airport}
             */
            me.or = refs.airports.get(or);
        }

        if (aat) {
            /**
             * Actucal arrival time offset.
             * @type {number}
             */
            me.aat = getTimeOffset(aat);
        }

        if (eat) {
            /**
             * Estimated arrival time offset.
             * @type {number}
             */
            me.eat = getTimeOffset(eat);
        }

        if (sat) {
            /**
             * Scheduled arrival time offset.
             * @type {number}
             */
            me.sat = getTimeOffset(sat);
        }
    }

    update(params, refs) {
        const me = this,
            {s, adt, edt, sdt, aat, eat, sat} = params;

        if (s) {
            me.s = refs.flightStatuses.get(s);
        }
        if (adt) {
            me.adt = getTimeOffset(adt);
        }
        if (edt) {
            me.edt = getTimeOffset(edt);
        }
        if (sdt) {
            me.sdt = getTimeOffset(sdt);
        }
        if (aat) {
            me.aat = getTimeOffset(aat);
        }
        if (eat) {
            me.eat = getTimeOffset(eat);
        }
        if (sat) {
            me.sat = getTimeOffset(sat);
        }
    }

}
