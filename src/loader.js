import * as Comlink from 'comlink';
import * as geobuf from 'geobuf';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import {PbfReader} from 'pbf';
import configs from './configs';
import {isString, loadJSON, removePrefix, resolveAssetUrl} from './helpers/helpers';
import {decode} from './helpers/helpers-gtfs';

const RAILWAY_SOBURAPID = 'JR-East.SobuRapid';

const TRAINTYPE_JREAST_LIMITEDEXPRESS = 'JR-East.LimitedExpress';

function getTimetableFileName(clock) {
    const calendar = clock.getCalendar() === 'Weekday' ? 'weekday' : 'holiday';

    return `timetable-${calendar}.json.gz`;
}

function getExtraTimetableFileNames(clock) {
    const calendar = clock.getCalendar();

    if (calendar === 'Saturday') {
        return ['timetable-saturday.json.gz'];
    }
    if (calendar === 'Holiday') {
        return ['timetable-sunday-holiday.json.gz'];
    }
    return [];
}

function adjustTrainID(id, type, destination) {
    if (type === TRAINTYPE_JREAST_LIMITEDEXPRESS &&
        destination[0].match(/NaritaAirportTerminal1|Takao|Ofuna|Omiya|Ikebukuro|Shinjuku/)) {
        return id.replace(/JR-East\.(NaritaAirportBranch|Narita|Sobu)/, RAILWAY_SOBURAPID);
    }
    return id;
}

/**
 * Loads the dictionary for the given language.
 * @param {string} lang - IETF language tag for the dictionary
 * @returns {Promise} Promise that resolves to the dictionary object
 */
export function loadDictionary(lang) {
    return loadJSON(resolveAssetUrl(`assets/dictionary-${lang}.json`));
}

/**
 * Load all the static data.
 * @param {string} dataUrl - Data URL
 * @param {Clock} clock - Clock object representing the current time
 * @returns {Promise} Promise that resolves to the loaded data
 */
export function loadStaticData(dataUrl, clock) {
    return Promise.all(!dataUrl ? [...Array(11)].map(() => []) : [
        ...[
            'railways.json.gz',
            'stations.json.gz',
            'features.json.gz',
            'rail-directions.json.gz',
            'train-types.json.gz',
            'train-vehicles.json.gz',
            'operators.json.gz',
            'airports.json.gz',
            'flight-statuses.json.gz',
            'poi.json.gz'
        ].map(fileName => `${dataUrl}/${fileName}`).map(loadJSON),
        Promise.all([
            getTimetableFileName(clock),
            ...getExtraTimetableFileNames(clock)
        ].map(fileName => `${dataUrl}/${fileName}`).map(loadJSON))
    ]).then(data => ({
        railwayData: data[0],
        stationData: data[1],
        featureCollection: data[2],
        railDirectionData: data[3],
        trainTypeData: data[4],
        trainVehicleData: data[5],
        operatorData: data[6],
        airportData: data[7],
        flightStatusData: data[8],
        poiData: data[9],
        timetableData: [].concat(...data[10])
    }));
}

/**
 * Load the timetable data.
 * @param {string} dataUrl - Data URL
 * @param {Clock} clock - Clock object representing the current time
 * @returns {Promise} Promise that resolves to the loaded timetable data
 */
export function loadTimetableData(dataUrl, clock) {
    return Promise.all(!dataUrl ? [[]] : [
        getTimetableFileName(clock),
        ...getExtraTimetableFileNames(clock)
    ].map(fileName => `${dataUrl}/${fileName}`).map(loadJSON)).then(data => [].concat(...data));
}

/**
 * Returns true if the given data source has expired and should no longer be
 * loaded, based on its expiresAt (an ISO 8601 string). A data source without
 * expiresAt never expires.
 * @param {Object} source - The data source object
 * @returns {boolean} True if the data source has expired
 */
export function isExpired(source) {
    return source.expiresAt !== undefined && Date.now() >= new Date(source.expiresAt).getTime();
}

/**
 * Load the dynamic data for trains from the given data sources.
 * @param {Array<Object>} dataSources - Array of data source objects. Sources
 *     providing a trainUrl and/or trainInfoUrl are used. The parse format of
 *     each object is detected from its '@type' ('odpt:Train' /
 *     'odpt:TrainInformation' means raw ODPT format, otherwise the pre-normalized
 *     Mini Tokyo 3D format). The results are merged in array order, so later
 *     sources override earlier ones.
 * @returns {Promise} Promise that resolves to the loaded data
 */
export function loadDynamicTrainData(dataSources) {
    const trainData = new Map(),
        trainInfoData = [],
        sources = dataSources.filter(source => (source.trainUrl || source.trainInfoUrl) && !isExpired(source)),
        setTrain = train => {
            const existing = trainData.get(train.id);

            if (existing) {
                Object.assign(existing, train);
            } else {
                trainData.set(train.id, train);
            }
        };

    return Promise.all(sources.map(({trainUrl, trainInfoUrl}) => Promise.all([
        trainUrl ? loadJSON(trainUrl) : [],
        trainInfoUrl ? loadJSON(trainInfoUrl) : []
    ]).then(([trains, trainInfos]) => ({trains, trainInfos})))).then(results => {
        for (const {trains, trainInfos} of results) {
            for (const train of trains) {
                if (train['@type'] === 'odpt:Train') {
                    // Raw ODPT format
                    const trainType = removePrefix(train['odpt:trainType']),
                        destinationStation = removePrefix(train['odpt:destinationStation']),
                        id = adjustTrainID(removePrefix(train['owl:sameAs']), trainType, destinationStation);

                    setTrain({
                        id,
                        o: removePrefix(train['odpt:operator']),
                        r: removePrefix(train['odpt:railway']),
                        y: trainType,
                        n: train['odpt:trainNumber'],
                        os: removePrefix(train['odpt:originStation']),
                        d: removePrefix(train['odpt:railDirection']),
                        ds: destinationStation,
                        ts: removePrefix(train['odpt:toStation']),
                        fs: removePrefix(train['odpt:fromStation']),
                        delay: (train['odpt:delay'] || 0) * 1000,
                        carComposition: train['odpt:carComposition'],
                        date: train['dc:date'].replace(/([\d\-])T([\d:]+).*/, '$1 $2')
                    });
                } else {
                    // Pre-normalized Mini Tokyo 3D format. Drop the date so that
                    // train positions from an mt3d source are excluded from the
                    // "last dynamic update" display.
                    delete train.date;
                    setTrain(train);
                }
            }
            for (const trainInfo of trainInfos) {
                if (trainInfo['@type'] === 'odpt:TrainInformation') {
                    trainInfoData.push({
                        operator: removePrefix(trainInfo['odpt:operator']),
                        railway: removePrefix(trainInfo['odpt:railway']),
                        status: trainInfo['odpt:trainInformationStatus'],
                        text: trainInfo['odpt:trainInformationText']
                    });
                } else {
                    trainInfoData.push(trainInfo);
                }
            }
        }

        return {
            trainData: Array.from(trainData.values()),
            trainInfoData
        };
    });
}

/**
 * Load the dynamic data for flights from the given data sources.
 * @param {Array<Object>} dataSources - Array of data source objects. Sources
 *     providing a flightUrl and/or atisUrl are used. Flight data is merged in
 *     array order, so later sources override earlier ones.
 * @returns {Promise} Promise that resolves to the loaded data
 */
export function loadDynamicFlightData(dataSources) {
    const sources = dataSources.filter(source => (source.flightUrl || source.atisUrl) && !isExpired(source)),
        flightData = new Map();
    let atisData;

    return Promise.all(sources.map(({flightUrl, atisUrl}) => Promise.all([
        atisUrl ? loadJSON(atisUrl) : undefined,
        flightUrl ? loadJSON(flightUrl) : []
    ]).then(([atis, flights]) => ({atis, flights})))).then(results => {
        for (const {atis, flights} of results) {
            if (atis) {
                atisData = atis;
            }
            for (const flight of flights) {
                const existing = flightData.get(flight.id);

                if (existing) {
                    Object.assign(existing, flight);
                } else {
                    flightData.set(flight.id, flight);
                }
            }
        }

        return {
            atisData,
            flightData: Array.from(flightData.values())
        };
    });
}

export function loadBusData(source, now, lang) {
    const workerUrl = URL.createObjectURL(new Blob([`WORKER_STRING`], {type: 'text/javascript'})),
        worker = new Worker(workerUrl),
        proxy = Comlink.wrap(worker);

    // The service date is derived inside the worker from the feed's own
    // agency_timezone (see worker.js), so only the absolute time is passed here.
    return new Promise(resolve => {
        proxy.load(source, now, lang, Comlink.proxy(data => {
            proxy[Comlink.releaseProxy]();
            worker.terminate();
            resolve(Object.assign({
                featureCollection: geobuf.decode(new PbfReader(data[0]))
            }, decode(new PbfReader(data[1]))));
        }));
    });
}

export function loadDynamicBusData(url) {
    return fetch(url)
        .then(response => response.arrayBuffer())
        .then(data => GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(data)));
}

/**
 * Appends the consumer key to an ODPT-compatible API URL based on its host.
 * The host is looked up in configs.odptHosts to find the corresponding secrets
 * key. URLs on unknown hosts, non-string values and URLs that already carry a
 * consumer key are returned unchanged.
 * @param {string} url - The URL to update
 * @param {Object} secrets - Secrets object keyed by the names in configs.odptHosts
 * @returns {string} The updated URL
 */
export function updateOdptUrl(url, secrets) {
    if (!isString(url) || url.match(/acl:consumerKey/)) {
        return url;
    }

    const key = secrets && secrets[configs.odptHosts[new URL(url).host]];

    return key ? `${url}${url.match(/\?/) ? '&' : '?'}acl:consumerKey=${key}` : url;
}
