import fs from 'node:fs';
import {plugins} from './plugins.mjs';

// Generates dev/index.html from the production page (public/index.html),
// applying development-specific changes:
//   - use the unminified bundle and rely on runtime CSS injection
//   - inject the local Mapbox access token (MAPBOX_ACCESS_TOKEN) and, when set,
//     a local data URL (MT3D_DATA_URL)
//   - include only the plugins whose environment variable is set; the dev
//     server streams each from its configured path (no copying)
//   - strip production-only analytics
// The generated file lives under the git-ignored dev/ folder.

const source = 'public/index.html';
const dest = 'dev/index.html';

const replaceOnce = (str, pattern, replacement, label) => {
    if (!pattern.test(str)) {
        throw new Error(`gen-index: could not find the ${label} in ${source}`);
    }
    return str.replace(pattern, replacement);
};

const token = process.env.MAPBOX_ACCESS_TOKEN;
if (!token) {
    console.warn('MAPBOX_ACCESS_TOKEN is not set; the base map will not be displayed.');
}

fs.mkdirSync('dev', {recursive: true});

let html = fs.readFileSync(source, 'utf8');

// Use the unminified bundle; the dev build injects its CSS at runtime.
html = replaceOnce(html, /mini-tokyo-3d\.min\.js/, 'mini-tokyo-3d.js', 'core bundle reference');
html = replaceOnce(html, /[ \t]*<link[^>]*mini-tokyo-3d\.min\.css[^>]*>\r?\n/, '', 'stylesheet link');

// Strip Google Analytics (production only).
html = html.replace(/[ \t]*<script async src="https:\/\/www\.googletagmanager\.com[^]*?<\/script>\r?\n/, '');
html = html.replace(/[ \t]*<script>\r?\n[^]*?gtag\('config'[^]*?<\/script>\r?\n/, '');

// Include only the plugins whose environment variable is defined.
const enabled = plugins.filter(plugin => process.env[plugin.env]);
for (const plugin of plugins) {
    if (!process.env[plugin.env]) {
        const file = plugin.file.replace(/\./g, '\\.');
        html = html.replace(new RegExp(`[ \\t]*<script src="${file}"></script>\\r?\\n`), '');
    }
}
html = replaceOnce(html, /plugins: \[[^\]]*\]/, `plugins: [${enabled.map(plugin => plugin.factory).join(', ')}]`, 'plugins array');

// Inject dev overrides right before the map is created.
const overrides = [];
if (token) {
    overrides.push(`options.accessToken = ${JSON.stringify(token)};`);
}
if (process.env.MT3D_DATA_URL) {
    overrides.push(`options.dataUrl = ${JSON.stringify(process.env.MT3D_DATA_URL)};`);
}
html = replaceOnce(html, /([ \t]*)(const map = new mt3d\.Map\(options\);)/, (_match, indent, statement) =>
    `${overrides.map(line => `${indent}${line}\n`).join('')}${indent}${statement}`, 'map initialization');

fs.writeFileSync(dest, html);
console.log(`Generated ${dest} (plugins: ${enabled.map(plugin => plugin.file).join(', ') || 'none'})`);
