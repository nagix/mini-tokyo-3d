import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

const OPERATORS_FOR_STATIONS = {
    tokyochallenge: [[
        'JR-East',
        'JR-Central',
        'JR-West',
        'JR-Shikoku',
    ], [
        'TWR',
        'TokyoMetro',
        'Toei',
        'YokohamaMunicipal'
    ], [
        'Keio',
        'Keikyu',
        'Keisei',
        'Hokuso',
        'Shibayama',
        'Tobu',
        'Aizu',
        'Seibu',
        'Chichibu',
        'Odakyu',
        'HakoneTozan',
        'Tokyu',
        'Minatomirai',
        'Sotetsu',
        'SaitamaRailway',
        'ToyoRapid',
        'ShinKeisei',
        'Yurikamome',
        'Izukyu',
        'IzuHakone',
        'Fujikyu'
    ]],
    odpt: [[
        'MIR',
        'TamaMonorail'
    ]]
};

export default async function(options) {

    const urls = [];

    Object.keys(OPERATORS_FOR_STATIONS).forEach(source => {
        const {url, key} = options[source];
        OPERATORS_FOR_STATIONS[source].forEach(operatorGroup => {
            const operators = operatorGroup
                .map(operator => `odpt.Operator:${operator}`)
                .join(',');

            urls.push(`${url}odpt:Station?odpt:operator=${operators}&acl:consumerKey=${key}`);
        });
    });

    const original = await Promise.all([
        ...urls,
        'data/stations.json'
    ].map(loaderHelpers.loadJSON));

    const extra = original.pop();

    const data = [].concat(...original).map(station => {
        const lon = station['geo:long'];
        const lat = station['geo:lat'];

        return {
            coord: !isNaN(lon) && !isNaN(lat) ? [lon, lat] : undefined,
            id: helpers.removePrefix(station['owl:sameAs']),
            railway: helpers.removePrefix(station['odpt:railway']),
            title: station['odpt:stationTitle']
        };
    });

    const lookup = helpers.buildLookup(data);

    extra.forEach(({id, railway, coord, title, altitude}) => {
        let station = lookup[id];

        if (!station) {
            station = lookup[id] = {
                id,
                railway,
                title: {}
            };
            data.push(station);
        }
        if (coord) {
            station.coord = coord;
        }
        Object.assign(station.title, title);
        if (altitude !== undefined) {
            station.altitude = altitude;
        }
    });

    loaderHelpers.saveJSON('build/data/stations.json.gz', data);

    console.log('Station data was loaded');

    return lookup;

}
