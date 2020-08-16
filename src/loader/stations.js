import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

const WIKIPEDIA_URL = 'https://ja.wikipedia.org/w/api.php';
const WIKIPEDIA_PARAMS = 'format=json&action=query&prop=pageimages&pithumbsize=128';

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

    extra.forEach(({id, railway, coord, title, utitle, thumbnail, exit, altitude}) => {
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
        if (utitle) {
            station.utitle = utitle;
        }
        station.thumbnail = thumbnail;
        station.exit = exit;
        if (altitude !== undefined) {
            station.altitude = altitude;
        }
    });

    const stationLists = [[]];
    const stationIDLookup = {};

    data.forEach(({id, title}) => {
        const stations = stationLists[stationLists.length - 1];
        const titleJa = title['ja-Wiki'] || `${title['ja']}駅`;

        stationIDLookup[titleJa] = stationIDLookup[titleJa] || [];
        stationIDLookup[titleJa].push(id);
        stations.push(titleJa);
        if (stations.length >= 50) {
            stationLists.push([]);
        }
    });
    (await Promise.all(stationLists.map(stations =>
        loaderHelpers.loadJSON(`${WIKIPEDIA_URL}?${WIKIPEDIA_PARAMS}&titles=${stations.join('|')}`)
    ))).forEach((result) => {
        const {pages} = result.query;

        for (const id in pages) {
            const {title, thumbnail} = pages[id];

            if (thumbnail) {
                stationIDLookup[title].forEach(id => {
                    lookup[id].thumbnail = thumbnail.source;
                });
            } else if (lookup[id] && lookup[id].coord) {
                console.log(`No thumbnail: ${id}`);
            }
        }
    });

    loaderHelpers.saveJSON('build/data/stations.json.gz', data);

    console.log('Station data was loaded');

    return lookup;

}
