import fs from 'fs';
import https from 'https';
import zlib from 'zlib';

export function loadJSON(url) {
    return new Promise((resolve, reject) => {
        if (url.startsWith('https')) {
            https.get(url, {
                headers: {
                    'User-Agent': 'MiniTokyo3DLoader/0.0 (https://minitokyo3d.com) loader/0.0'
                }
            }, res => {
                let body = '';

                res.setEncoding('utf8');
                res.on('data', chunk => {
                    body += chunk;
                });
                res.on('end', () => resolve(JSON.parse(body)));
            }).on('error', error => reject(error));
        } else {
            fs.promises.readFile(url).then(
                data => resolve(JSON.parse(data))
            ).catch(
                error => reject(error)
            );
        }
    });
}

export function saveJSON(path, data) {
    zlib.gzip(JSON.stringify(data), {level: 9}, (error, data) => {
        if (!error) {
            fs.promises.writeFile(path, data);
        }
    });
}

export function readdir(path) {
    return fs.promises.readdir(path);
}

export function buildLookup(array) {
    const lookup = {};

    for (const element of array) {
        lookup[element.id] = element;
    }
    return lookup;
}

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

/**
 * Fetches each item's Wikipedia (ja) page thumbnail and its credit (artist/
 * license), setting the "thumbnail"/"thumbnailCredit" properties of the
 * corresponding object in lookup. Shared by the stations and railways
 * loaders, which only differ in how they derive each item's Wikipedia page
 * title.
 * @param {Object} lookup - Map of id to the object to annotate
 * @param {Array<{id: string, title: string}>} items - Each item's id (a key
 *     of lookup) and the Wikipedia page title to look its thumbnail up by
 */
export async function loadWikipediaThumbnails(lookup, items) {
    const titleLists = [[]];
    const idsByTitle = {};

    for (const {id, title} of items) {
        let titles = titleLists[titleLists.length - 1];

        if (titles.length >= 50) {
            titles = [];
            titleLists.push(titles);
        }
        idsByTitle[title] = idsByTitle[title] || [];
        idsByTitle[title].push(id);
        titles.push(title);
    }

    // Filename (without the "File:" namespace prefix) of each item's
    // thumbnail - collected here so its credit (artist/license) can be
    // looked up afterwards in as few batched requests as the thumbnails
    // themselves, deduplicated since multiple items can share one image.
    const idsByFileName = {};

    (await Promise.all(titleLists.map(titles =>
        loadJSON(`${WIKIPEDIA_URL}?${WIKIPEDIA_IMAGE_PARAMS}&titles=${titles.map(encodeURIComponent).join('|')}`)
    ))).forEach(result => {
        const {pages} = result.query;

        for (const id in pages) {
            const {title, thumbnail, pageimage} = pages[id];

            if (thumbnail) {
                for (const id of idsByTitle[title]) {
                    lookup[id].thumbnail = thumbnail.source;
                }
                idsByFileName[pageimage] = idsByFileName[pageimage] || [];
                idsByFileName[pageimage].push(...idsByTitle[title]);
            } else if (lookup[id]) {
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
    ))).forEach(result => {
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

            for (const id of idsByFileName[fileName] || []) {
                lookup[id].thumbnailCredit = {artist, license, licenseUrl};
            }
        }
    });
}
