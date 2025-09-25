import fs from 'fs';
import https from 'https';
import zlib from 'zlib';

export function loadJSON(url) {
    return new Promise((resolve, reject) => {
        if (url.startsWith('https')) {
            https.get(url, {
                headers: {
                    'User-Agent': 'MiniTokyo3DLoader/0.0'
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
