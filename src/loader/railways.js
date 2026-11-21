import {loadJSON, saveJSON, buildLookup, loadWikipediaThumbnails} from './helpers';

export default async function() {

    const data = await loadJSON('data/railways.json'),
        lookup = buildLookup(data);

    await loadWikipediaThumbnails(lookup, data.map(({id, title}) => ({
        id,
        title: title['ja-Wiki'] || title['ja']
    })));

    saveJSON('build/data/railways.json.gz', data.filter(({del}) => !del));

    console.log('Railway data was loaded');

    return lookup;

}
