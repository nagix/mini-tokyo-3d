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
            {r, y, d, os, ds, ts, fs, nm, v, delay, carComposition} = params;

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
             * Train vehicle.
             * @type {TrainVehicle}
             */
            me.v = fromTimetable ? v : refs.trainVehicles.get(v);
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
            {y, os, ds, ts, fs, v, delay, carComposition} = params,
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
                for (let i = 0, ilen = timetable.tt.length; i < ilen; i++) {
                    const stop = timetable.tt[i];

                    if (stop.s.id === os[0]) {
                        me.timetable = timetable.clone();
                        me.timetable.tt = timetable.tt.slice(i);
                        me.timetable.tt[0] = {s: stop.s, d: stop.d};
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
                for (let i = 0, ilen = timetable.tt.length; i < ilen; i++) {
                    const stop = timetable.tt[i];

                    if (stop.s.id === ds[0]) {
                        me.timetable = timetable.clone();
                        me.timetable.tt = timetable.tt.slice(0, i + 1);
                        me.timetable.tt[timetable.tt.length - 1] = {s: stop.s, a: valueOrDefault(stop.a, stop.d)};
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
            me.v = refs.trainVehicles.get(v);
        }
        if (!isNaN(delay)) {
            me.delay = delay;
        }
        if (!isNaN(carComposition)) {
            me.carComposition = carComposition;
        }
    }

}
