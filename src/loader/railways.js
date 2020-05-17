import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

const OPERATORS_FOR_RAILWAYS = [
    'JR-East',
    'TWR',
    'TokyoMetro',
    'Toei',
    'YokohamaMunicipal',
    'Keio',
    'Keikyu',
    'Keisei',
    'Hokuso',
    'Shibayama',
    'Tobu',
    'Seibu',
    'Odakyu',
    'Tokyu',
    'Minatomirai',
    'Sotetsu',
    'SaitamaRailway',
    'ToyoRapid',
    'ShinKeisei',
    'Yurikamome',
    'TokyoMonorail'
];

export default async function(url, key) {

    const operators = OPERATORS_FOR_RAILWAYS
        .map(operator => `odpt.Operator:${operator}`);

    const [original, extra] = await Promise.all([
        loaderHelpers.loadJSON(`${url}odpt:Railway?odpt:operator=${operators.join(',')}&acl:consumerKey=${key}`),
        loaderHelpers.loadJSON('data/railways.json')
    ]);

    const data = original.map(railway => ({
        id: helpers.removePrefix(railway['owl:sameAs']),
        title: railway['odpt:railwayTitle'],
        stations: railway['odpt:stationOrder'].map(obj =>
            helpers.removePrefix(obj['odpt:station'])
        ),
        ascending: helpers.removePrefix(railway['odpt:ascendingRailDirection'])
    }));

    const lookup = helpers.buildLookup(data);

    extra.forEach(({id, title, stations, ascending, color, altitude, carComposition}) => {
        let railway = lookup[id];

        if (!railway) {
            railway = lookup[id] = {
                id,
                title: {},
                stations: []
            };
            data.push(railway);
        }

        Object.assign(railway.title, title);
        if (stations) {
            railway.stations.splice(stations.index, stations.delete, ...stations.insert || []);
        }
        if (ascending !== undefined) {
            railway.ascending = ascending;
        }
        railway.color = color;
        railway.altitude = altitude;
        railway.carComposition = carComposition;
    });

    loaderHelpers.saveJSON('build/data/railways.json.gz', data);

    console.log('Railway data was loaded');

    return lookup;

}
