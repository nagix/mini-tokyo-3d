import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

const OPERATORS_FOR_STATIONS = [
    'JR-East',
    'JR-Central',
    'JR-West',
    'JR-Shikoku',
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
];

export default async function(url, key) {

    const original = await Promise.all(
        OPERATORS_FOR_STATIONS.map(operator =>
            loaderHelpers.loadJSON(`${url}odpt:Station?odpt:operator=odpt.Operator:${operator}&acl:consumerKey=${key}`)
        ).concat(
            loaderHelpers.loadJSON('data/stations.json')
        )
    );

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

    extra.forEach(station => {
        const {id, railway, coord, title, altitude} = station;
        let stationRef = lookup[id];

        if (!stationRef) {
            stationRef = lookup[id] = {
                id,
                railway,
                title: {}
            };
            data.push(stationRef);
        }
        if (coord) {
            stationRef.coord = coord;
        }
        Object.assign(stationRef.title, title);
        if (altitude !== undefined) {
            stationRef.altitude = altitude;
        }
    });

    loaderHelpers.saveJSON('build/data/stations.json.gz', data);

    console.log('Station data was loaded');

    return lookup;

}
