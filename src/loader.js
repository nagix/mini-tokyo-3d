import configs from './configs';
import * as helpers from './helpers';

const OPERATORS_FOR_TRAINS = [
    'JR-East',
    'TokyoMetro',
    'Toei'
];

const OPERATORS_FOR_TRAININFORMATION = {
    tokyochallenge: [
        'JR-East',
        'TWR',
        'TokyoMetro',
        'Toei',
        'YokohamaMunicipal',
        'Keio',
        'Keikyu',
        'Keisei',
        'Tobu',
        'Seibu',
        'Tokyu',
        'MIR',
        'TamaMonorail'
    ],
    odpt: []
};

const OPERATORS_FOR_FLIGHTINFORMATION = [
    'HND-JAT',
    'HND-TIAT',
    'NAA'
];

const RAILWAY_SOBURAPID = 'JR-East.SobuRapid';

const TRAINTYPE_JREAST_LIMITEDEXPRESS = 'JR-East.LimitedExpress';

function getTimetableFileName(clock) {
    const calendar = clock.getCalendar() === 'Weekday' ? 'weekday' : 'holiday';

    return `timetable-${calendar}.json.gz`;
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
 * @returns {object} Loaded data
 */
export function loadStaticData(dataUrl, lang, clock) {
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
        configs.secretsUrl
    ].map(helpers.loadJSON)).then(data => ({
        dict: data[0],
        railwayData: data[1],
        stationData: data[2],
        featureCollection: data[3],
        timetableData: data[4],
        railDirectionData: data[5],
        trainTypeData: data[6],
        trainVehicleData: data[7],
        operatorData: data[8],
        airportData: data[9],
        flightStatusData: data[10],
        poiData: data[11],
        secrets: data[12]
    }));
}

/**
 * Load the timetable data.
 * @param {string} dataUrl - Data URL
 * @param {Clock} clock - Clock object representing the current time
 * @returns {object} Loaded timetable data
 */
export function loadTimetableData(dataUrl, clock) {
    return helpers.loadJSON(`${dataUrl}/${getTimetableFileName(clock)}`);
}

/**
 * Load the dynamic data for trains.
 * @param {object} secrets - Secrets object
 * @returns {object} Loaded data
 */
export function loadDynamicTrainData(secrets) {
    const trainData = [],
        trainInfoData = [],
        url = configs.apiUrl.tokyochallenge,
        key = secrets.tokyochallenge,
        operators = OPERATORS_FOR_TRAINS
            .map(operator => `odpt.Operator:${operator}`)
            .join(',');

    const urls = [
        `${url}odpt:Train?odpt:operator=${operators}&acl:consumerKey=${key}`,
        configs.tidUrl
    ];

    Object.keys(OPERATORS_FOR_TRAININFORMATION).forEach(source => {
        const url = configs.apiUrl[source],
            key = secrets[source],
            operators = OPERATORS_FOR_TRAININFORMATION[source]
                .map(operator => `odpt.Operator:${operator}`)
                .join(',');

        urls.push(`${url}odpt:TrainInformation?odpt:operator=${operators}&acl:consumerKey=${key}`);
    });

    return Promise.all(urls.map(helpers.loadJSON)).then(data => {
        // Train data for JR-East, Tokyo Metro and Toei
        data.shift().forEach(train => {
            const trainType = helpers.removePrefix(train['odpt:trainType']),
                destinationStation = helpers.removePrefix(train['odpt:destinationStation']);

            trainData.push({
                id: adjustTrainID(helpers.removePrefix(train['owl:sameAs']), trainType, destinationStation),
                o: helpers.removePrefix(train['odpt:operator']),
                r: helpers.removePrefix(train['odpt:railway']),
                y: trainType,
                n: train['odpt:trainNumber'],
                os: helpers.removePrefix(train['odpt:originStation']),
                d: helpers.removePrefix(train['odpt:railDirection']),
                ds: destinationStation,
                ts: helpers.removePrefix(train['odpt:toStation']),
                fs: helpers.removePrefix(train['odpt:fromStation']),
                delay: (train['odpt:delay'] || 0) * 1000,
                carComposition: train['odpt:carComposition'],
                date: train['dc:date'].replace(/([\d\-])T([\d:]+).*/, '$1 $2')
            });
        });

        // Train data for others
        data.shift().forEach(train => {
            trainData.push(train);
        });

        // Train information data
        [].concat(...data).forEach(trainInfo => {
            trainInfoData.push({
                operator: helpers.removePrefix(trainInfo['odpt:operator']),
                railway: helpers.removePrefix(trainInfo['odpt:railway']),
                status: trainInfo['odpt:trainInformationStatus'],
                text: trainInfo['odpt:trainInformationText']
            });
        });

        return {trainData, trainInfoData};
    });
}

/**
 * Load the dynamic data for flights.
 * @param {object} secrets - Secrets object
 * @returns {object} Loaded data
 */
export function loadDynamicFlightData(secrets) {
    const url = configs.apiUrl.tokyochallenge,
        key = secrets.tokyochallenge,
        operators = OPERATORS_FOR_FLIGHTINFORMATION
            .map(operator => `odpt.Operator:${operator}`)
            .join(',');

    const urls = [configs.atisUrl, ...['Arrival', 'Departure'].map(type =>
        `${url}odpt:FlightInformation${type}?odpt:operator=${operators}&acl:consumerKey=${key}`
    )];

    return Promise.all(urls.map(helpers.loadJSON)).then(data => {
        const atisData = data.shift(),
            flightData = [].concat(...data).map(flight => ({
                id: helpers.removePrefix(flight['owl:sameAs']),
                o: helpers.removePrefix(flight['odpt:operator']),
                n: flight['odpt:flightNumber'],
                a: helpers.removePrefix(flight['odpt:airline']),
                s: helpers.removePrefix(flight['odpt:flightStatus']),
                dp: helpers.removePrefix(flight['odpt:departureAirport']),
                ar: helpers.removePrefix(flight['odpt:arrivalAirport']),
                ds: helpers.removePrefix(flight['odpt:destinationAirport']),
                or: helpers.removePrefix(flight['odpt:originAirport']),
                edt: flight['odpt:estimatedDepartureTime'],
                adt: flight['odpt:actualDepartureTime'],
                sdt: flight['odpt:scheduledDepartureTime'],
                eat: flight['odpt:estimatedArrivalTime'],
                aat: flight['odpt:actualArrivalTime'],
                sat: flight['odpt:scheduledArrivalTime'],
                date: flight['dc:date'].replace(/([\d\-])T([\d:]+).*/, '$1 $2')
            }));

        return {atisData, flightData};
    });
}
