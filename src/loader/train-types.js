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
        'Yurikamome',
        'MIR',
        'TamaMonorail'
    ],
    odpt: []
};

export default async function(options) {

    const urls = [];

    for (const source of Object.keys(OPERATORS_FOR_TRAINTYPES)) {
        const {url, key} = options[source],
            operators = OPERATORS_FOR_TRAINTYPES[source]
                .map(operator => `odpt.Operator:${operator}`)
                .join(',');

        urls.push(`${url}odpt:TrainType?odpt:operator=${operators}&acl:consumerKey=${key}`);
    }

    const [extra, ...original] = await Promise.all([
        'data/train-types.json',
        ...urls
    ].map(loaderHelpers.loadJSON));

    const data = [].concat(...original).map(type => ({
        id: helpers.removePrefix(type['owl:sameAs']),
        title: type['odpt:trainTypeTitle']
    }));

    const lookup = helpers.buildLookup(data);

    for (const {id, title} of extra) {
        let trainType = lookup[id];

        if (!trainType) {
            trainType = lookup[id] = {
                id,
                title: {}
            };
            data.push(trainType);
        }
        Object.assign(trainType.title, title);
    }

    loaderHelpers.saveJSON('build/data/train-types.json.gz', data);

    console.log('Train type data was loaded');

}
