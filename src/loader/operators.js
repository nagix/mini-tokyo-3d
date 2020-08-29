import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

export default async function(options) {

    const {url, key} = options.tokyochallenge;

    const [original, extra] = await Promise.all([
        `${url}odpt:Operator?acl:consumerKey=${key}`,
        'data/operators.json'
    ].map(loaderHelpers.loadJSON));

    const data = original.map(operator => ({
        id: helpers.removePrefix(operator['owl:sameAs']),
        title: operator['odpt:operatorTitle']
    }));

    const lookup = helpers.buildLookup(data);

    extra.forEach(({id, title, color, tailcolor}) => {
        let operator = lookup[id];

        if (!operator) {
            operator = lookup[id] = {
                id,
                title: {}
            };
            data.push(operator);
        }

        Object.assign(operator.title, title);
        operator.color = color;
        operator.tailcolor = tailcolor;
    });

    loaderHelpers.saveJSON('build/data/operators.json.gz', data);

    console.log('Operator data was loaded');

    return data;

}
