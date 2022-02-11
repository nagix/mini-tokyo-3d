import {isMainThread} from 'worker_threads';
import railways from './railways';
import stations from './stations';
import features, {featureWorker} from './features';
import trainTimetables from './train-timetables';
import railDirections from './rail-directions';
import trainTypes from './train-types';
import trainVehicles from './train-vehicles';
import operators from './operators';
import airports from './airports';
import flightStatuses from './flight-statuses';
import poi from './poi';

async function main() {

    const [railwayLookup, stationLookup] = await Promise.all([
        railways(),
        stations()
    ]);

    features(railwayLookup, stationLookup);
    trainTimetables();
    railDirections();
    trainTypes();
    trainVehicles();
    operators();
    airports();
    flightStatuses();
    poi();

}

if (isMainThread) {
    main();
} else {
    featureWorker();
}
