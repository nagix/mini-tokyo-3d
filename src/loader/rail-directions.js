import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

export default async function(url, key) {

    const [original, extra] = await Promise.all([
        loaderHelpers.loadJSON(`${url}odpt:RailDirection?acl:consumerKey=${key}`),
        loaderHelpers.loadJSON('data/rail-directions.json')
    ]);

    const data = original.map(direction => ({
        id: helpers.removePrefix(direction['owl:sameAs']),
        title: direction['odpt:railDirectionTitle']
    }));

    const lookup = helpers.buildLookup(data);

    extra.forEach(direction => {
        const {id, title} = direction;

        Object.assign(lookup[id].title, title);
    });

    loaderHelpers.saveJSON('build/data/rail-directions.json.gz', data);

    console.log('Rail direction data was loaded');

}
