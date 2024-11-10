import configs from '../configs';
import {getTimeOffset} from '../helpers/helpers';

export default class TrainTimetable {

    constructor(params, refs) {
        const me = this,
            {os, ds, tt, nm, v} = params,
            stations = refs.stations;
        let start = 86400000,
            end = 0;

        /**
         * Train timetable ID
         * @type {string}
         */
        me.id = params.id;

        /**
         * Train ID
         * @type {string}
         */
        me.t = params.t;

        /**
         * Railway
         * @type {Object}
         */
        me.r = refs.railways.get(params.r);

        /**
         * Train number
         * @type {string}
         */
        me.n = params.n;

        /**
         * Train type
         * @type {Object}
         */
        me.y = refs.trainTypes.get(params.y);

        /**
         * Rail direction
         * @type {Object}
         */
        me.d = refs.railDirections.get(params.d);

        if (os) {
            /**
             * Origin stations
             * @type {Array<Object>}
             */
            me.os = os.map(id => stations.get(id));
        }

        if (ds) {
            /**
             * Destination stations
             * @type {Array<Object>}
             */
            me.ds = ds.map(id => stations.get(id));
        }

        /**
         * Timetable object
         * @type {Array<Object>}
         */
        me.tt = tt.map(({s, a, d}) => {
            const stop = {s: stations.get(s)};

            if (a) {
                stop.a = getTimeOffset(a);
                start = Math.min(start, stop.a);
                end = Math.max(end, stop.a);
            }
            if (d) {
                stop.d = getTimeOffset(d);
                start = Math.min(start, stop.d);
                end = Math.max(end, stop.d);
            }
            return stop;
        });

        if (nm) {
            /**
             * Train names
             * @type {Array<Object>}
             */
            me.nm = nm;
        }

        if (v) {
            /**
             * Train vehicle
             * @type {Object}
             */
            me.v = refs.trainVehicles.get(v);
        }

        /**
         * Start timestamp
         * @type {number}
         */
        me.start = start - configs.standingDuration;

        /**
         * End timestamp
         * @type {number}
         */
        me.end = end;
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
                    const tt = prevTimetable.tt,
                        {a, d} = tt[tt.length - 1];

                    /**
                     * Previous train tametables
                     * @type {Array<TrainTimetable>}
                     */
                    me.pt = me.pt || [];
                    me.pt.push(prevTimetable);

                    if (a) {
                        me.start = Math.min(me.start, a - standingDuration);
                    } else if (d) {
                        me.start = Math.min(me.start, d - standingDuration);
                    }
                }
            }
        }
        if (nt) {
            for (const id of nt) {
                const nextTimetable = timetables.get(id);

                if (nextTimetable) {
                    /**
                     * Next train tametables
                     * @type {Array<TrainTimetable>}
                     */
                    me.nt = me.nt || [];
                    me.nt.push(nextTimetable);
                }
            }
            if (me.nt) {
                me.tt[me.tt.length - 1].d = me.nt[0].tt[0].d;
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
            tt: me.tt,
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
