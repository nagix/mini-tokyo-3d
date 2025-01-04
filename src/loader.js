import * as Comlink from 'comlink';
import geobuf from 'geobuf';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import Pbf from 'pbf';
import configs from './configs';
import {loadJSON, removePrefix} from './helpers/helpers';
import {decode} from './helpers/helpers-gtfs';

const RAILWAYS_FOR_TRAINS = {
    odpt: [
        'Toei.Asakusa',
        'Toei.Mita',
        'Toei.Shinjuku',
        'Toei.Oedo',
        'Toei.Arakawa'
    ],
    challenge2024: [
        'JR-East.Yamanote',
        'Keikyu.Main',
        'Keikyu.Airport',
        'Keikyu.Daishi',
        'Keikyu.Zushi',
        'Keikyu.Kurihama',
        'Tobu.TobuSkytree',
        'Tobu.TobuSkytreeBranch',
        'Tobu.Isesaki',
        'Tobu.Nikko',
        'Tobu.TobuUrbanPark',
        'Tobu.Kameido',
        'Tobu.Daishi',
        'Tobu.Tojo',
        'Tobu.Ogose'
    ]
};

const OPERATORS_FOR_TRAININFORMATION = {
    odpt: [
        'TWR',
        'TokyoMetro',
        'Toei',
        'YokohamaMunicipal',
        'MIR',
        'TamaMonorail'
    ],
    challenge2024: [
        'jre-is',
        'Tokyu',
        'Keikyu',
        'Tobu',
        'Seibu',
        'Keio'
    ]
};

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
 * Load all the static data.
 * @param {string} dataUrl - Data URL
 * @param {string} lang - IETF language tag for dictionary
 * @param {Clock} clock - Clock object representing the current time
 * @returns {Object} Loaded data
 */
export function loadStaticData(dataUrl, lang, clock) {
    const extra = getExtraTimetableFileNames(clock);

    return Promise.all([
        `${dataUrl}/dictionary-${lang}.json`,
        `${dataUrl}/railways.json.gz`,
        `${dataUrl}/stations.json.gz`,
        `${dataUrl}/features.json.gz`,
        `${dataUrl}/${getTimetableFileName(clock)}`,
        `${dataUrl}/rail-directions.json.gz`,
        `${dataUrl}/train-types.json.gz`,
        `${dataUrl}/train-vehicles.json.gz`,
        `${dataUrl}/operators.json.gz`,
        `${dataUrl}/airports.json.gz`,
        `${dataUrl}/flight-statuses.json.gz`,
        `${dataUrl}/poi.json.gz`,
        ...extra.map(name => `${dataUrl}/${name}`)
    ].map(loadJSON)).then(data => ({
        dict: data[0],
        railwayData: data[1],
        stationData: data[2],
        featureCollection: data[3],
        timetableData: data[4].concat(...data.slice(12)),
        railDirectionData: data[5],
        trainTypeData: data[6],
        trainVehicleData: data[7],
        operatorData: data[8],
        airportData: data[9],
        flightStatusData: data[10],
        poiData: data[11]
    }));
}

/**
 * Load the timetable data.
 * @param {string} dataUrl - Data URL
 * @param {Clock} clock - Clock object representing the current time
 * @returns {Object} Loaded timetable data
 */
export function loadTimetableData(dataUrl, clock) {
    const extra = getExtraTimetableFileNames(clock);

    return Promise.all([
        `${dataUrl}/${getTimetableFileName(clock)}`,
        ...extra.map(name => `${dataUrl}/${name}`)
    ].map(loadJSON)).then(data => data[0].concat(...data.slice(1)));
}

/**
 * Load the dynamic data for trains.
 * @param {Object} secrets - Secrets object
 * @returns {Object} Loaded data
 */
export function loadDynamicTrainData(secrets) {
    const trainData = [],
        trainInfoData = [],
        urls = [];

    for (const source of Object.keys(RAILWAYS_FOR_TRAINS)) {
        const url = configs.apiUrl[source],
            key = secrets[source];

        if (source === 'odpt' || source === 'challenge2024') {
            const railways = RAILWAYS_FOR_TRAINS[source]
                .map((railway) => `odpt.Railway:${railway}`)
                .join(',');

            urls.push(`${url}odpt:Train?odpt:railway=${railways}&acl:consumerKey=${key}`);
        }
    }

    urls.push(configs.tidUrl);

    for (const source of Object.keys(OPERATORS_FOR_TRAININFORMATION)) {
        const url = configs.apiUrl[source],
            key = secrets[source];

        if (source === 'odpt' || source === 'challenge2024') {
            const operators = OPERATORS_FOR_TRAININFORMATION[source]
                .map(operator => `odpt.Operator:${operator}`)
                .join(',');

            urls.push(`${url}odpt:TrainInformation?odpt:operator=${operators}&acl:consumerKey=${key}`);
        }
    }

    urls.push(configs.trainInfoUrl);

    return Promise.all(urls.map(loadJSON)).then(data => {
        // Train data from ODPT and Challenge 2024
        for (const train of [...data.shift(), ...data.shift()]) {
            const trainType = removePrefix(train['odpt:trainType']),
                destinationStation = removePrefix(train['odpt:destinationStation']);

            trainData.push({
                id: adjustTrainID(removePrefix(train['owl:sameAs']), trainType, destinationStation),
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
        }

        // Train data from others
        for (const train of data.shift()) {
            trainData.push(train);
        }

        // Train information data from ODPT and Challenge 2024
        for (const trainInfo of [...data.shift(), ...data.shift()]) {
            trainInfoData.push({
                operator: removePrefix(trainInfo['odpt:operator']),
                railway: removePrefix(trainInfo['odpt:railway']),
                status: trainInfo['odpt:trainInformationStatus'],
                text: trainInfo['odpt:trainInformationText']
            });
        }

        // Train information data from others
        for (const trainInfo of data.shift()) {
            trainInfoData.push(trainInfo);
        }

        return {trainData, trainInfoData};
    });
}

/**
 * Load the dynamic data for flights.
 * @returns {Object} Loaded data
 */
export function loadDynamicFlightData() {
    return Promise.all([
        configs.atisUrl,
        configs.flightUrl
    ].map(loadJSON)).then(data => ({
        atisData: data[0],
        flightData: data[1]
    }));
}

export function loadBusData(sources, lang) {
    const workerUrl = URL.createObjectURL(new Blob([`WORKER_STRING`], {type: 'text/javascript'})),
        worker = new Worker(workerUrl),
        proxy = Comlink.wrap(worker);

    return new Promise(resolve => proxy.load(sources, lang, Comlink.proxy(data => {
        const gtfsData = data.map((items, i) => ({
            featureCollection: geobuf.decode(new Pbf(items[0])),
            ...decode(new Pbf(items[1])),
            vehiclePositionUrl: sources[i].vehiclePositionUrl,
            color: sources[i].color
        }));

        proxy[Comlink.releaseProxy]();
        worker.terminate();
        resolve(gtfsData);
    })));
}

export function loadDynamicBusData(gtfsArray) {
    return Promise.all(gtfsArray.map(gtfs => fetch(gtfs.vehiclePositionUrl)
        .then(response => response.arrayBuffer())
        .then(data => ({
            gtfs,
            vehiclePosition: GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(data))
        }))
    ));
}

export function updateOdptUrl(url, secrets) {
    if (url.startsWith('https://api.odpt.org/') && !url.match(/acl:consumerKey/)) {
        return `${url}${url.match(/\?/) ? '&' : '?'}acl:consumerKey=${secrets.odpt}`;
    } else if (url.startsWith('https://api-challenge2024.odpt.org/') && !url.match(/acl:consumerKey/)) {
        return `${url}${url.match(/\?/) ? '&' : '?'}acl:consumerKey=${secrets.challenge2024}`;
    }
    return url;
}
