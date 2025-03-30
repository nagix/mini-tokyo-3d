import {valueOrDefault} from '../helpers/helpers';
import TrainTimetable from './train-timetable';

export default class {

    /*
        Other properties:

        timetableIndex;
        sectionIndex;
        sectionLength;
        departureStation;
        departureTime;
        arrivalStation;
        arrivalTime;
        nextDepartureTime;
        railwayFeature;
        offset;
        interval;
        _t;
        cars;
        standing;
        animationID;
    */

    constructor(params, refs) {
        const me = this,
            fromTimetable = params instanceof TrainTimetable,
            {r, y, d, os, ds, ts, fs, nm, v, ad, delay, carComposition} = params;

        /**
         * Train ID.
         * @type {string}
         */
        me.id = fromTimetable ? params.t : params.id;

        /**
         * Railway.
         * @type {Railway}
         */
        me.r = fromTimetable ? r : refs.railways.get(r);

        /**
         * Train number.
         * @type {string}
         */
        me.n = params.n;

        /**
         * Train type.
         * @type {TrainType}
         */
        me.y = fromTimetable ? y : refs.trainTypes.get(y);

        /**
         * Rail direction.
         * @type {RailDirection}
         */
        me.d = fromTimetable ? d : refs.railDirections.get(d);

        if (os) {
            /**
             * Origin stations.
             * @type {Array<Station>}
             */
            me.os = fromTimetable ? os : os.map(id => refs.stations.get(id));
        }

        if (ds) {
            /**
             * Destination stations.
             * @type {Array<Station>}
             */
            me.ds = fromTimetable ? ds : ds.map(id => refs.stations.get(id));
        }

        if (ts) {
            /**
             * To station.
             * @type {Array<Station>}
             */
            me.ts = refs.stations.get(ts);
        }

        if (fs) {
            /**
             * From station.
             * @type {Array<Station>}
             */
            me.fs = refs.stations.get(fs);
        }

        if (fromTimetable) {
            /**
             * Train timetable.
             * @type {TrainTimetable}
             */
            me.timetable = params;
        }

        if (nm) {
            /**
             * Train names.
             * @type {Array<Object>}
             */
            me.nm = nm;
        }

        if (v) {
            /**
             * Train vehicle type.
             * @type {TrainVehicleType}
             */
            me.v = fromTimetable ? v : refs.trainVehicleTypes.get(v);
        }

        if (ad) {
            /**
             * Train ad.
             * @type {Object}
             */
            me.ad = ad;
        }

        const railway = me.r;

        /**
         * Direction.
         * @type {number}
         */
        me.direction = me.d === railway.ascending ? 1 : -1;

        /**
         * Altitude.
         * @type {number}
         */
        me.altitude = railway.altitude;

        if (!isNaN(delay)) {
            /**
             * Delay.
             * @type {number}
             */
            me.delay = delay;
        }

        /**
         * Car composition.
         * @type {number}
         */
        me.carComposition = !isNaN(carComposition) ? carComposition : railway.carComposition;
    }

    update(params, refs) {
        const me = this,
            {os: _os, ds: _ds} = me,
            {y, os, ds, ts, fs, v, ad, delay, carComposition} = params,
            stations = refs.stations;

        if (y) {
            me.y = refs.trainTypes.get(y);
        }
        if (os) {
            const timetable = me.timetable;

            me.os = os.map(id => stations.get(id));

            // A potential problem of this is that connecting trains don't know if the timetable
            // reference changed.
            if (_os && os[0] !== _os[0].id && timetable) {
                const s = timetable.stations;

                for (let i = 0, ilen = s.length; i < ilen; i++) {
                    if (s[i].id === os[0]) {
                        me.timetable = timetable.clone();
                        me.timetable.stations.splice(0, i);
                        me.timetable.arrivalTimes.splice(0, i + 1, undefined);
                        me.timetable.departureTimes.splice(0, i);
                        break;
                    }
                }
            }
        }
        if (ds) {
            const timetable = me.timetable;

            me.ds = ds.map(id => stations.get(id));

            // A potential problem of this is that connecting trains don't know if the timetable
            // reference changed.
            if (_ds && ds[0] !== _ds[0].id && timetable) {
                const s = timetable.stations;

                for (let i = 0, ilen = s.length; i < ilen; i++) {
                    if (s[i].id === ds[0]) {
                        me.timetable = timetable.clone();
                        me.timetable.stations.splice(i + 1);
                        me.timetable.arrivalTimes.splice(i, Infinity, valueOrDefault(me.timetable.arrivalTimes[i], me.timetable.departureTimes[i]));
                        me.timetable.departureTimes.splice(i, Infinity, undefined);
                        break;
                    }
                }
            }
        }
        if (ts) {
            me.ts = stations.get(ts);
        }
        if (fs) {
            me.fs = stations.get(fs);
        }
        if (v) {
            me.v = refs.trainVehicleTypes.get(v);
        }
        if (ad) {
            me.ad = ad;
        }
        if (!isNaN(delay)) {
            me.delay = delay;
        }
        if (!isNaN(carComposition)) {
            me.carComposition = carComposition;
        }
    }

}
