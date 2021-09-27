import {buildLookup, removePrefix} from '../helpers';
import {loadJSON, saveJSON} from './helpers';

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
        'Yagan',
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
        'Fujikyu',
        'MIR',
        'TamaMonorail'
    ]],
    odpt: []
};

export default async function(options) {

    const urls = [];

    for (const source of Object.keys(OPERATORS_FOR_STATIONS)) {
        const {url, key} = options[source];
        for (const operatorGroup of OPERATORS_FOR_STATIONS[source]) {
            const operators = operatorGroup
                .map(operator => `odpt.Operator:${operator}`)
                .join(',');

            urls.push(`${url}odpt:Station?odpt:operator=${operators}&acl:consumerKey=${key}`);
        }
    }

    const [stationGroupData, extra, ...original] = await Promise.all([
        'data/station-groups.json',
        'data/stations.json',
        ...urls
    ].map(loadJSON));

    const data = [].concat(...original).map(station => {
        const lon = station['geo:long'];
        const lat = station['geo:lat'];

        return {
            coord: !isNaN(lon) && !isNaN(lat) ? [lon, lat] : undefined,
            id: removePrefix(station['owl:sameAs']),
            railway: removePrefix(station['odpt:railway']),
            title: station['odpt:stationTitle']
        };
    });

    const lookup = buildLookup(data);

    for (const {id, railway, coord, title, utitle, thumbnail, exit, altitude} of extra) {
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
    }

    const stationGroupIDLookup = {};

    for (const groups of stationGroupData) {
        for (const stationID of [].concat(...groups)) {
            stationGroupIDLookup[stationID] = groups[0][0];
        }
    }
    for (const station of data) {
        const {id, altitude} = station,
            stationGroupID = stationGroupIDLookup[id];

        station.group = `${stationGroupID || id}.${altitude < 0 ? 'ug' : 'og'}`;
    }

    const stationLists = [[]];
    const stationIDLookup = {};

    for (const {id, title} of data) {
        const stations = stationLists[stationLists.length - 1];
        const titleJa = title['ja-Wiki'] || `${title['ja']}駅`;

        stationIDLookup[titleJa] = stationIDLookup[titleJa] || [];
        stationIDLookup[titleJa].push(id);
        stations.push(titleJa);
        if (stations.length >= 50) {
            stationLists.push([]);
        }
    }
    (await Promise.all(stationLists.map(stations =>
        loadJSON(`${WIKIPEDIA_URL}?${WIKIPEDIA_PARAMS}&titles=${stations.join('|')}`)
    ))).forEach((result) => {
        const {pages} = result.query;

        for (const id in pages) {
            const {title, thumbnail} = pages[id];

            if (thumbnail) {
                for (const id of stationIDLookup[title]) {
                    lookup[id].thumbnail = thumbnail.source;
                }
            } else if (lookup[id] && lookup[id].coord) {
                console.log(`No thumbnail: ${id}`);
            }
        }
    });

    saveJSON('build/data/stations.json.gz', data);

    console.log('Station data was loaded');

    return lookup;

}
