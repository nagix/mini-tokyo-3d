import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

export default async function(options) {

    const {url, key} = options.tokyochallenge;

    const [original, extra] = await Promise.all([
        `${url}odpt:Airport?acl:consumerKey=${key}`,
        'data/airports.json'
    ].map(loaderHelpers.loadJSON));

    const data = original.map(airport => ({
        id: helpers.removePrefix(airport['owl:sameAs']),
        title: airport['odpt:airportTitle']
    }));

    const lookup = helpers.buildLookup(data);

    extra.forEach(({id, title, direction}) => {
        const airport = lookup[id];
if (!airport) {console.log(id);}
        Object.assign(airport.title, title);
        airport.direction = direction;
    });

    loaderHelpers.saveJSON('build/data/airports.json.gz', data);

    console.log('Airport data was loaded');

}
