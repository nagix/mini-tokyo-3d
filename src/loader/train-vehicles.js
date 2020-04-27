import * as loaderHelpers from './helpers';

export default async function() {

    const data = await loaderHelpers.loadJSON('data/train-vehicles.json');

    loaderHelpers.saveJSON('build/data/train-vehicles.json.gz', data);

    console.log('Train vehicle data was loaded');

}
