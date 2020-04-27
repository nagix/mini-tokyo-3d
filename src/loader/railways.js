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

    extra.forEach(railway => {
        const {id, title, stations, ascending, color, altitude, carComposition} = railway;
        let railwayRef = lookup[id];

        if (!railwayRef) {
            railwayRef = lookup[id] = {
                id,
                title: {},
                stations: []
            };
            data.push(railwayRef);
        }

        Object.assign(railwayRef.title, title);
        if (stations) {
            railwayRef.stations.splice(stations.index, stations.delete, ...stations.insert || []);
        }
        if (ascending !== undefined) {
            railwayRef.ascending = ascending;
        }
        railwayRef.color = color;
        railwayRef.altitude = altitude;
        railwayRef.carComposition = carComposition;
    });

    loaderHelpers.saveJSON('build/data/railways.json.gz', data);

    console.log('Railway data was loaded');

    return lookup;

}
