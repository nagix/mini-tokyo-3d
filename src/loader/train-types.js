import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

const OPERATORS_FOR_TRAINTYPES = [
    'JR-East',
    'TWR',
    'TokyoMetro',
    'Toei',
    'YokohamaMunicipal',
    'Keio',
    'Keikyu',
    'Keisei',
    'Seibu',
    'Tokyu',
    'Yurikamome'
];

export default async function(url, key) {

    const operators = OPERATORS_FOR_TRAINTYPES
        .map(operator => `odpt.Operator:${operator}`);

    const [original, extra] = await Promise.all([
        loaderHelpers.loadJSON(`${url}odpt:TrainType?odpt:operator=${operators.join(',')}&acl:consumerKey=${key}`),
        loaderHelpers.loadJSON('data/train-types.json')
    ]);

    const data = original.map(type => ({
        id: helpers.removePrefix(type['owl:sameAs']),
        title: type['odpt:trainTypeTitle']
    }));

    const lookup = helpers.buildLookup(data);

    extra.forEach(type => {
        const {id, title} = type;
        let trainTypeRef = lookup[id];

        if (!trainTypeRef) {
            trainTypeRef = lookup[id] = {
                id,
                title: {}
            };
            data.push(trainTypeRef);
        }
        Object.assign(trainTypeRef.title, title);
    });

    loaderHelpers.saveJSON('build/data/train-types.json.gz', data);

    console.log('Train type data was loaded');

}
