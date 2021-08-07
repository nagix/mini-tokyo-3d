import {buildLookup, removePrefix} from '../helpers';
import {loadJSON, saveJSON} from './helpers';

export default async function(options) {

    const {url, key} = options.tokyochallenge;

    const [original, extra] = await Promise.all([
        `${url}odpt:FlightStatus?acl:consumerKey=${key}`,
        'data/flight-statuses.json'
    ].map(loadJSON));

    const data = original.map(status => ({
        id: removePrefix(status['owl:sameAs']),
        title: status['odpt:flightStatusTitle']
    }));

    const lookup = buildLookup(data);

    for (const {id, title} of extra) {
        Object.assign(lookup[id].title, title);
    }

    saveJSON('build/data/flight-statuses.json.gz', data);

    console.log('Flight status data was loaded');

}
