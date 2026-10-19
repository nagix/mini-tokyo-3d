import {loadJSON, saveJSON, buildLookup} from './helpers';

const WIKIPEDIA_URL = 'https://ja.wikipedia.org/w/api.php';
const WIKIPEDIA_IMAGE_PARAMS = 'format=json&action=query&prop=pageimages&piprop=thumbnail|name&pithumbsize=250';
const WIKIPEDIA_CREDIT_PARAMS = 'format=json&action=query&prop=imageinfo&iiprop=extmetadata';

// Parses extmetadata's Artist field, which is either an HTML <a> tag linking
// to the uploader's profile, or plain text when there's no such link.
function parseArtist(html) {
    const match = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/.exec(html);

    if (!match) {
        return {name: html.replace(/<[^>]*>/g, '')};
    }

    const url = match[1];

    return {
        name: match[2].replace(/<[^>]*>/g, ''),
        url: url.startsWith('//') ? `https:${url}` : url
    };
}

export default async function() {

    const [stationGroupData, data] = await Promise.all([
        'data/station-groups.json',
        'data/stations.json',
    ].map(loadJSON));

    const lookup = buildLookup(data);

    const stationGroupIDLookup = {};

    for (const groups of stationGroupData) {
        for (const stationID of [].concat(...groups)) {
            stationGroupIDLookup[stationID] = groups[0][0];
        }
    }
    for (const station of data) {
        const {id, altitude} = station,
            stationGroupID = stationGroupIDLookup[id];

        station.group = `${stationGroupID || id}.${altitude < 0 ? 'ug' : 'og'}`;
    }

    const stationLists = [[]];
    const stationIDLookup = {};

    for (const {id, title} of data) {
        const titleJa = title['ja-Wiki'] || `${title['ja']}駅`;
        let stations = stationLists[stationLists.length - 1];

        if (stations.length >= 50) {
            stations = [];
            stationLists.push(stations);
        }
        stationIDLookup[titleJa] = stationIDLookup[titleJa] || [];
        stationIDLookup[titleJa].push(id);
        stations.push(titleJa);
    }
    // Filename (without the "File:" namespace prefix) of each station's
    // thumbnail - collected here so its credit (artist/license) can be
    // looked up afterwards in as few batched requests as the thumbnails
    // themselves, deduplicated since multiple stations can share one image.
    const idsByFileName = {};

    (await Promise.all(stationLists.map(stations =>
        loadJSON(`${WIKIPEDIA_URL}?${WIKIPEDIA_IMAGE_PARAMS}&titles=${stations.map(encodeURIComponent).join('|')}`)
    ))).forEach((result) => {
        const {pages} = result.query;

        for (const id in pages) {
            const {title, thumbnail, pageimage} = pages[id];

            if (thumbnail) {
                for (const id of stationIDLookup[title]) {
                    lookup[id].thumbnail = thumbnail.source;
                }
                idsByFileName[pageimage] = idsByFileName[pageimage] || [];
                idsByFileName[pageimage].push(...stationIDLookup[title]);
            } else if (lookup[id] && lookup[id].coord) {
                console.log(`No thumbnail: ${id}`);
            }
        }
    });

    const fileNames = Object.keys(idsByFileName);
    const fileNameLists = [[]];

    for (const fileName of fileNames) {
        let names = fileNameLists[fileNameLists.length - 1];

        if (names.length >= 50) {
            names = [];
            fileNameLists.push(names);
        }
        names.push(fileName);
    }

    (await Promise.all(fileNameLists.map(fileNames =>
        loadJSON(`${WIKIPEDIA_URL}?${WIKIPEDIA_CREDIT_PARAMS}&titles=${fileNames.map(name => encodeURIComponent(`File:${name}`)).join('|')}`)
    ))).forEach((result) => {
        const {pages, normalized} = result.query,
            originalTitleByCanonical = {};

        for (const {from, to} of normalized || []) {
            originalTitleByCanonical[to] = from;
        }

        for (const id in pages) {
            const page = pages[id],
                extmetadata = page.imageinfo && page.imageinfo[0] && page.imageinfo[0].extmetadata,
                originalTitle = originalTitleByCanonical[page.title] || page.title,
                fileName = originalTitle.replace(/^File:/, '');

            const artist = extmetadata && extmetadata.Artist && parseArtist(extmetadata.Artist.value),
                license = extmetadata && extmetadata.LicenseShortName && extmetadata.LicenseShortName.value,
                licenseUrl = extmetadata && extmetadata.LicenseUrl && extmetadata.LicenseUrl.value;

            if (!artist && !license) {
                if (idsByFileName[fileName]) {
                    console.log(`No credit info: ${fileName}`);
                }
                continue;
            }

            for (const stationID of idsByFileName[fileName] || []) {
                lookup[stationID].thumbnailCredit = {artist, license, licenseUrl};
            }
        }
    });

    saveJSON('build/data/stations.json.gz', data);

    console.log('Station data was loaded');

    return lookup;

}
