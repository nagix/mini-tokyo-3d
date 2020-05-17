import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

export default async function(url, key) {

    const [original, extra] = await Promise.all([
        loaderHelpers.loadJSON(`${url}odpt:FlightStatus?acl:consumerKey=${key}`),
        loaderHelpers.loadJSON('data/flight-statuses.json')
    ]);

    const data = original.map(status => ({
        id: helpers.removePrefix(status['owl:sameAs']),
        title: status['odpt:flightStatusTitle']
    }));

    const lookup = helpers.buildLookup(data);

    extra.forEach(({id, title}) => {
        Object.assign(lookup[id].title, title);
    });

    loaderHelpers.saveJSON('build/data/flight-statuses.json.gz', data);

    console.log('Flight status data was loaded');

}
