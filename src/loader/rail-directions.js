import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

export default async function(options) {

    const {url, key} = options.tokyochallenge;

    const [original, extra] = await Promise.all([
        `${url}odpt:RailDirection?acl:consumerKey=${key}`,
        'data/rail-directions.json'
    ].map(loaderHelpers.loadJSON));

    const data = original.map(direction => ({
        id: helpers.removePrefix(direction['owl:sameAs']),
        title: direction['odpt:railDirectionTitle']
    }));

    const lookup = helpers.buildLookup(data);

    for (const {id, title} of extra) {
        Object.assign(lookup[id].title, title);
    }

    loaderHelpers.saveJSON('build/data/rail-directions.json.gz', data);

    console.log('Rail direction data was loaded');

}
