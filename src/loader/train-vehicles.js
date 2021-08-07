import {loadJSON, saveJSON} from './helpers';

export default async function() {

    const data = await loadJSON('data/train-vehicles.json');

    saveJSON('build/data/train-vehicles.json.gz', data);

    console.log('Train vehicle data was loaded');

}
