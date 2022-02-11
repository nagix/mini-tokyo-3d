import {loadJSON, saveJSON} from './helpers';

export default async function() {

    const data = await loadJSON('data/airports.json');

    saveJSON('build/data/airports.json.gz', data);

    console.log('Airport data was loaded');

}
