import {buildLookup, removePrefix} from '../helpers';
import {loadJSON, saveJSON} from './helpers';

export default async function(options) {

    const {url, key} = options.tokyochallenge;

    const [original, extra] = await Promise.all([
        `${url}odpt:Airport?acl:consumerKey=${key}`,
        'data/airports.json'
    ].map(loadJSON));

    const data = original.map(airport => ({
        id: removePrefix(airport['owl:sameAs']),
        title: airport['odpt:airportTitle']
    }));

    const lookup = buildLookup(data);

    for (const {id, title, direction} of extra) {
        const airport = lookup[id];

        Object.assign(airport.title, title);
        airport.direction = direction;
    }

    saveJSON('build/data/airports.json.gz', data);

    console.log('Airport data was loaded');

}
