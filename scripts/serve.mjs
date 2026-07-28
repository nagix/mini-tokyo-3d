import dotenv from 'dotenv';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import serveStatic from 'serve-static';
import {plugins} from './plugins.mjs';

// Serves the dev build. Everything except the generated index.html and the
// rollup output is streamed live from its source location:
//   /assets/*            -> ./assets
//   /data/*              -> ./build/data (locally generated transit data)
//   /<plugin>.min.js     -> the path from the plugin's environment variable
//   /<plugin>.*.map      -> the plugin's source map, next to that file
//   everything else      -> ./dev

// Load environment variables from .env.development (higher priority) then .env.
dotenv.config({path: '.env.development'});
dotenv.config();

const port = Number(process.argv[2]) || 9966;
const serveDev = serveStatic('dev');
const serveAssets = serveStatic('assets');
const serveData = serveStatic('build/data');

const files = new Map();
for (const plugin of plugins) {
    const source = process.env[plugin.env];
    if (source) {
        const file = path.basename(source);
        files.set(`/${file}`, {path: source, type: 'text/javascript'});
        files.set(`/${file}.map`, {path: `${source}.map`, type: 'application/json'});
    }
}

http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    const done = err => {
        res.statusCode = err && err.statusCode ? err.statusCode : 404;
        res.end();
    };
    const file = files.get(url);
    if (file) {
        res.setHeader('Content-Type', file.type);
        fs.createReadStream(file.path).on('error', () => done()).pipe(res);
    } else if (url.startsWith('/assets/')) {
        req.url = url.slice('/assets'.length);
        serveAssets(req, res, done);
    } else if (url.startsWith('/data/')) {
        req.url = url.slice('/data'.length);
        serveData(req, res, done);
    } else {
        serveDev(req, res, done);
    }
}).listen(port, () => {
    console.log(`\n  Mini Tokyo 3D dev server running at http://localhost:${port}/\n`);
});
