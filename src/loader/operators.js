import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

export default async function(url, key) {

    const [original, extra] = await Promise.all([
        loaderHelpers.loadJSON(`${url}odpt:Operator?acl:consumerKey=${key}`),
        loaderHelpers.loadJSON('data/operators.json')
    ]);

    const data = original.map(operator => ({
        id: helpers.removePrefix(operator['owl:sameAs']),
        title: operator['odpt:operatorTitle']
    }));

    const lookup = helpers.buildLookup(data);

    extra.forEach(({id, title, color, tailcolor}) => {
        const operator = lookup[id];

        Object.assign(operator.title, title);
        operator.color = color;
        operator.tailcolor = tailcolor;
    });

    loaderHelpers.saveJSON('build/data/operators.json.gz', data);

    console.log('Operator data was loaded');

    return data;

}
