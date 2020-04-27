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

    extra.forEach(operator => {
        const {id, title, color, tailcolor} = operator,
            operatorRef = lookup[id];

        Object.assign(operatorRef.title, title);
        operatorRef.color = color;
        operatorRef.tailcolor = tailcolor;
    });

    loaderHelpers.saveJSON('build/data/operators.json.gz', data);

    console.log('Operator data was loaded');

    return data;

}
