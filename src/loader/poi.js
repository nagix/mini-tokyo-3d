import * as loaderHelpers from './helpers';

export default async function() {

    const data = await loaderHelpers.loadJSON('data/poi.json');

    loaderHelpers.saveJSON('build/data/poi.json.gz', data);

    console.log('POI data was loaded');

}
