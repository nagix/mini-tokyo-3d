import configs from '../configs';
import {getTimeOffset} from '../helpers/helpers';

export default class TrainTimetable {

    constructor(params, refs) {
        const me = this,
            {os, ds, tt, nm, v} = params,
            stations = refs.stations;

        /**
         * Train timetable ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * Train ID.
         * @type {string}
         */
        me.t = params.t;

        /**
         * Railway.
         * @type {Railway}
         */
        me.r = refs.railways.get(params.r);

        /**
         * Train number.
         * @type {string}
         */
        me.n = params.n;

        /**
         * Train type.
         * @type {TrainType}
         */
        me.y = refs.trainTypes.get(params.y);

        /**
         * Rail direction.
         * @type {RailDirection}
         */
        me.d = refs.railDirections.get(params.d);

        if (os) {
            /**
             * Origin stations.
             * @type {Array<Station>}
             */
            me.os = os.map(id => stations.get(id));
        }

        if (ds) {
            /**
             * Destination stations.
             * @type {Array<Station>}
             */
            me.ds = ds.map(id => stations.get(id));
        }

        /**
         * Stations where the train stops.
         * @type {Array<Station>}
         */
        me.stations = tt.map(({s}) => stations.get(s));

        /**
         * Arrival time offset at each stop
         * @type {Array<number>}
         */
        me.arrivalTimes = tt.map(({a}) => a ? getTimeOffset(a) : undefined);

        /**
         * Departure time offset at each stop
         * @type {Array<number>}
         */
        me.departureTimes = tt.map(({d}) => d ? getTimeOffset(d) : undefined);

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
            me.v = refs.trainVehicleTypes.get(v);
        }

        const timeOffsets = me.arrivalTimes.concat(me.departureTimes).filter(t => !isNaN(t));

        /**
         * Start timestamp offset.
         * @type {number}
         */
        me.start = Math.min(...timeOffsets) - configs.standingDuration;

        /**
         * End timestamp offset.
         * @type {number}
         */
        me.end = Math.max(...timeOffsets);
    }

    update(params, refs) {
        const me = this,
            {pt, nt} = params,
            timetables = refs.timetables,
            standingDuration = configs.standingDuration;

        if (pt) {
            for (const id of pt) {
                const prevTimetable = timetables.get(id);

                if (prevTimetable) {
                    const lastIndex = me.stations.length - 1,
                        arrivalTime = me.arrivalTimes[lastIndex],
                        departureTime = me.departureTimes[lastIndex];

                    /**
                     * Previous train tametables.
                     * @type {Array<TrainTimetable>}
                     */
                    me.pt = me.pt || [];
                    me.pt.push(prevTimetable);

                    if (arrivalTime !== undefined) {
                        me.start = Math.min(me.start, arrivalTime - standingDuration);
                    } else if (departureTime !== undefined) {
                        me.start = Math.min(me.start, departureTime - standingDuration);
                    }
                }
            }
        }
        if (nt) {
            for (const id of nt) {
                const nextTimetable = timetables.get(id);

                if (nextTimetable) {
                    /**
                     * Next train tametables.
                     * @type {Array<TrainTimetable>}
                     */
                    me.nt = me.nt || [];
                    me.nt.push(nextTimetable);
                }
            }
            if (me.nt) {
                me.departureTimes[me.stations.length - 1] = me.nt[0].departureTimes[0];
            }
        }
    }

    clone() {
        const me = this;

        return new TrainTimetable({
            id: me.id,
            t: me.t,
            r: me.r,
            n: me.n,
            y: me.y,
            d: me.d,
            os: me.os,
            ds: me.ds,
            pt: me.pt,
            nt: me.nt,
            stations: me.stations.slice(),
            arrivalTimes: me.arrivalTimes.slice(),
            departureTimes: me.departureTimes.slice(),
            nm: me.nm,
            v: me.v,
            start: me.start,
            end: me.end
        });
    }

    getConnectingTrainIds() {
        const {nt, t} = this;

        return nt ? [t].concat(...nt.map(timetable => timetable.getConnectingTrainIds())) : [t];
    }

}
