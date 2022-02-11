import {loadJSON, saveJSON} from './helpers';

export default async function() {

    const data = await loadJSON('data/rail-directions.json');

    saveJSON('build/data/rail-directions.json.gz', data);

    console.log('Rail direction data was loaded');

}
