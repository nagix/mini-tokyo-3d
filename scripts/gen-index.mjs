import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import {plugins} from './plugins.mjs';

// Generates the entry HTML from the production page (public/index.html).
//
//   node scripts/gen-index.mjs        -> dev/index.html   (development)
//   node scripts/gen-index.mjs prod   -> build/index.html (deployment)
//
// Site-specific and secret values are supplied through environment variables
// and applied only when set:
//   MAPBOX_ACCESS_TOKEN                 -> options.accessToken
//   MT3D_SECRET_ODPT / MT3D_SECRET_CHALLENGE -> options.secrets
//   MT3D_DATA_URL                       -> options.dataUrl
//   MT3D_GA_ID                          -> Google Analytics measurement id
//   MT3D_PLUGIN_<NAME>                  -> a plugin <script> and factory call
// A plugin is included when its variable points at an existing file, whose
// name the script references; in development the files are served live by
// scripts/serve.mjs, and for deployment they are copied into the build
// directory. In development the bundle is also switched to the unminified
// build with runtime CSS injection.

const dev = process.argv[2] !== 'prod';
const source = 'public/index.html';
const destDir = dev ? 'dev' : 'build';
const dest = `${destDir}/index.html`;

// Load environment variables from .env.<mode> (higher priority) then .env.
dotenv.config({path: `.env.${dev ? 'development' : 'production'}`});
dotenv.config();

const replaceOnce = (str, pattern, replacement, label) => {
    if (!pattern.test(str)) {
        throw new Error(`gen-index: could not find the ${label} in ${source}`);
    }
    return str.replace(pattern, replacement);
};

const isFile = p => {
    const stat = p ? fs.statSync(p, {throwIfNoEntry: false}) : undefined;
    return Boolean(stat) && stat.isFile();
};

const token = process.env.MAPBOX_ACCESS_TOKEN;
const dataUrl = process.env.MT3D_DATA_URL;
if (dev && !token) {
    console.warn('MAPBOX_ACCESS_TOKEN is not set; the base map will not be displayed.');
}
if (dev && dataUrl && !/^https?:/i.test(dataUrl) && !fs.existsSync('build/data')) {
    console.warn(`MT3D_DATA_URL=${dataUrl} refers to local data, but build/data does not exist; run 'npm run build' then 'npm run build-data' to generate it.`);
}

fs.mkdirSync(destDir, {recursive: true});

let html = fs.readFileSync(source, 'utf8');

// Google Analytics: fill in the measurement id, or strip the tag when unset.
if (process.env.MT3D_GA_ID) {
    html = html.replace(/G-XXXXXXXXXX/g, process.env.MT3D_GA_ID);
} else {
    html = html.replace(/[ \t]*<script async src="https:\/\/www\.googletagmanager\.com[^]*?<\/script>\r?\n/, '');
    html = html.replace(/[ \t]*<script>\r?\n[^]*?gtag\('config'[^]*?<\/script>\r?\n/, '');
}

if (dev) {
    // Use the unminified bundle; the dev build injects its CSS at runtime.
    html = replaceOnce(html, /mini-tokyo-3d\.min\.js/, 'mini-tokyo-3d.js', 'core bundle reference');
    html = replaceOnce(html, /[ \t]*<link[^>]*mini-tokyo-3d\.min\.css[^>]*>\r?\n/, '', 'stylesheet link');
}

// Plugins: replace the marker with <script> tags and fill the plugins list.
const included = [];
for (const plugin of plugins) {
    const src = process.env[plugin.env];
    if (isFile(src)) {
        const file = path.basename(src);
        included.push({file, factory: plugin.factory});
        if (!dev) {
            fs.copyFileSync(src, path.join(destDir, file));
        }
    }
}
html = replaceOnce(html, /([ \t]*)<!-- plugins -->\r?\n/, (_match, indent) =>
    included.map(plugin => `${indent}<script src="${plugin.file}"></script>\n`).join(''), 'plugins marker');
html = replaceOnce(html, /plugins: \[[^\]]*\]/, `plugins: [${included.map(plugin => plugin.factory).join(', ')}]`, 'plugins list');

// Inject build-time overrides at the marker, which sits after the options object
// but before the URL query parameters are applied, so a runtime override (e.g.
// gtfsurl clearing dataUrl) takes precedence over the build-time value.
const overrides = [];
if (token) {
    overrides.push(`options.accessToken = ${JSON.stringify(token)};`);
}
const secrets = [];
if (process.env.MT3D_SECRET_ODPT) {
    secrets.push(`odpt: ${JSON.stringify(process.env.MT3D_SECRET_ODPT)}`);
}
if (process.env.MT3D_SECRET_CHALLENGE) {
    secrets.push(`challenge: ${JSON.stringify(process.env.MT3D_SECRET_CHALLENGE)}`);
}
if (secrets.length) {
    overrides.push(`options.secrets = {${secrets.join(', ')}};`);
}
if (dataUrl) {
    overrides.push(`options.dataUrl = ${JSON.stringify(dataUrl)};`);
}
html = replaceOnce(html, /([ \t]*)\/\/ overrides\r?\n/, (_match, indent) =>
    overrides.map(line => `${indent}${line}\n`).join(''), 'overrides marker');

fs.writeFileSync(dest, html);
console.log(`Generated ${dest} (plugins: ${included.map(plugin => plugin.file).join(', ') || 'none'})`);
