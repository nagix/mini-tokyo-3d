import fs from 'fs';
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

const API_URL = 'https://api-tokyochallenge.odpt.org/api/v4/',
    SECRETS_FILE = 'secrets';

async function main() {

    const {odpt} = JSON.parse(fs.readFileSync(SECRETS_FILE));

    const [railwayLookup, stationLookup] = await Promise.all([
        railways(API_URL, odpt),
        stations(API_URL, odpt)
    ]);

    features(railwayLookup, stationLookup);
    trainTimetables(API_URL, odpt);
    railDirections(API_URL, odpt);
    trainTypes(API_URL, odpt);
    trainVehicles();
    operators(API_URL, odpt);
    airports(API_URL, odpt);
    flightStatuses(API_URL, odpt);

}

if (isMainThread) {
    main();
} else {
    featureWorker();
}
