import {loadJSON, saveJSON} from './helpers';

export default async function() {

    const data = await loadJSON('data/operators.json');

    saveJSON('build/data/operators.json.gz', data);

    console.log('Operator data was loaded');

    return data;

}
