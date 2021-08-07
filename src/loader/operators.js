import {buildLookup, removePrefix} from '../helpers';
import {loadJSON, saveJSON} from './helpers';

export default async function(options) {

    const {url, key} = options.tokyochallenge;

    const [original, extra] = await Promise.all([
        `${url}odpt:Operator?acl:consumerKey=${key}`,
        'data/operators.json'
    ].map(loadJSON));

    const data = original.map(operator => ({
        id: removePrefix(operator['owl:sameAs']),
        title: operator['odpt:operatorTitle']
    }));

    const lookup = buildLookup(data);

    for (const {id, title, color, tailcolor} of extra) {
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
    }

    saveJSON('build/data/operators.json.gz', data);

    console.log('Operator data was loaded');

    return data;

}
