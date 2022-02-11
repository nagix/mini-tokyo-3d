import fs from 'fs';
import https from 'https';
import pako from 'pako';

export function loadJSON(url) {
    return new Promise((resolve, reject) => {
        if (url.startsWith('https')) {
            https.get(url, res => {
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
    fs.promises.writeFile(path, pako.gzip(JSON.stringify(data), {level: 9}));
}

export function readdir(path) {
    return fs.promises.readdir(path);
}
