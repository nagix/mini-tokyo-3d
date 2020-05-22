import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

const OPERATORS_FOR_TRAINTYPES = {
    tokyochallenge: [
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
    ],
    odpt: [
        'MIR',
        'TamaMonorail'
    ]
};

export default async function(options) {

    const urls = [];

    Object.keys(OPERATORS_FOR_TRAINTYPES).forEach(source => {
        const {url, key} = options[source],
            operators = OPERATORS_FOR_TRAINTYPES[source]
                .map(operator => `odpt.Operator:${operator}`)
                .join(',');

        urls.push(`${url}odpt:TrainType?odpt:operator=${operators}&acl:consumerKey=${key}`);
    });

    const original = await Promise.all([
        ...urls,
        'data/train-types.json'
    ].map(loaderHelpers.loadJSON));

    const extra = original.pop();

    const data = [].concat(...original).map(type => ({
        id: helpers.removePrefix(type['owl:sameAs']),
        title: type['odpt:trainTypeTitle']
    }));

    const lookup = helpers.buildLookup(data);

    extra.forEach(({id, title}) => {
        let trainType = lookup[id];

        if (!trainType) {
            trainType = lookup[id] = {
                id,
                title: {}
            };
            data.push(trainType);
        }
        Object.assign(trainType.title, title);
    });

    loaderHelpers.saveJSON('build/data/train-types.json.gz', data);

    console.log('Train type data was loaded');

}
