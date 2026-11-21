import {loadJSON, saveJSON, buildLookup, loadWikipediaThumbnails} from './helpers';

export default async function() {

    const [stationGroupData, data] = await Promise.all([
        'data/station-groups.json',
        'data/stations.json',
    ].map(loadJSON));

    const lookup = buildLookup(data);

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

    await loadWikipediaThumbnails(lookup, data.map(({id, title}) => ({
        id,
        title: title['ja-Wiki'] || `${title['ja']}駅`
    })));

    saveJSON('build/data/stations.json.gz', data);

    console.log('Station data was loaded');

    return lookup;

}
