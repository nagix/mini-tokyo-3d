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
import poi from './poi';

const TOKYOCHALLENGE_URL = 'https://api-tokyochallenge.odpt.org/api/v4/',
    ODPT_URL = 'https://api.odpt.org/api/v4/',
    SECRETS_FILE = 'secrets';

async function main() {

    const secrets = JSON.parse(fs.readFileSync(SECRETS_FILE)),
        options = {
            tokyochallenge: {
                url: TOKYOCHALLENGE_URL,
                key: secrets.tokyochallenge
            },
            odpt: {
                url: ODPT_URL,
                key: secrets.odpt
            }
        };

    const [railwayLookup, stationLookup] = await Promise.all([
        railways(options),
        stations(options)
    ]);

    features(railwayLookup, stationLookup);
    trainTimetables(options);
    railDirections(options);
    trainTypes(options);
    trainVehicles();
    operators(options);
    airports(options);
    flightStatuses(options);
    poi();

}

if (isMainThread) {
    main();
} else {
    featureWorker();
}
