import TrainTimetable from './train-timetable';

export default class {

    constructor(data, refs) {
        const me = this,
            lookup = new Map();

        me.array = [];
        me.trainLookup = new Map();
        me.railwayDirectionLookup = new Map();

        for (const item of data) {
            const timetable = new TrainTimetable(item, refs);

            me.add(timetable);
            lookup.set(timetable.id, timetable);
        }

        for (const item of data) {
            if (item.pt || item.nt) {
                const timetable = lookup.get(item.id);

                timetable.update(item, {...refs, timetables: lookup});
            }
        }
    }

    add(timetable) {
        const {array, trainLookup, railwayDirectionLookup} = this,
            trainId = timetable.t,
            timetablesByTrain = trainLookup.get(trainId),
            railwayDirectionId = `${timetable.r.id}:${timetable.d.id}`,
            timetablesByDirection = railwayDirectionLookup.get(railwayDirectionId);

        array.push(timetable);

        if (Array.isArray(timetablesByTrain)) {
            timetablesByTrain.push(timetable);
        } else {
            trainLookup.set(trainId, timetablesByTrain ? [timetablesByTrain, timetable] : timetable);
        }

        if (timetablesByDirection) {
            timetablesByDirection.push(timetable);
        } else {
            railwayDirectionLookup.set(railwayDirectionId, [timetable]);
        }
    }

    getByTrainId(trainId) {
        const timetables = this.trainLookup.get(trainId);

        return Array.isArray(timetables) ? timetables : timetables ? [timetables] : [];
    }

    getByDirectionId(railwayId, DirectionId) {
        return this.railwayDirectionLookup.get(`${railwayId}:${DirectionId}`) || [];
    }

    getAll() {
        return this.array;
    }

    getConnectingTrainIds(trainId) {
        const ids = new Set();

        for (const timetable of this.getByTrainId(trainId)) {
            for (const id of timetable.getConnectingTrainIds()) {
                ids.add(id);
            }
        }
        return Array.from(ids);
    }

}
