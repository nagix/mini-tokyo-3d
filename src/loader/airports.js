import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

export default async function(url, key) {

    const [original, extra] = await Promise.all([
        loaderHelpers.loadJSON(`${url}odpt:Airport?acl:consumerKey=${key}`),
        loaderHelpers.loadJSON('data/airports.json')
    ]);

    const data = original.map(airport => ({
        id: helpers.removePrefix(airport['owl:sameAs']),
        title: airport['odpt:airportTitle']
    }));

    const lookup = helpers.buildLookup(data);

    extra.forEach(airport => {
        const {id, title, direction} = airport,
            airportRef = lookup[id];

        Object.assign(airportRef.title, title);
        airportRef.direction = direction;
    });

    loaderHelpers.saveJSON('build/data/airports.json.gz', data);

    console.log('Airport data was loaded');

}
