import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('./gen-index.mjs', import.meta.url));
const source = new URL('../public/index.html', import.meta.url);

function generate(t, profile, mode, geojson) {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'mt3d-gen-index-'));
    t.after(() => fs.rmSync(cwd, {recursive: true, force: true}));
    fs.mkdirSync(path.join(cwd, 'public'));
    fs.copyFileSync(source, path.join(cwd, 'public', 'index.html'));
    if (geojson) {
        fs.mkdirSync(path.join(cwd, 'data-raw'));
        fs.writeFileSync(path.join(cwd, 'data-raw', 'map-bounds.geojson'), JSON.stringify(geojson));
    }
    const result = spawnSync(process.execPath, [script, mode], {
        cwd,
        env: Object.assign({}, process.env, {MT3D_PROFILE: profile, MAPBOX_ACCESS_TOKEN: ''}),
        encoding: 'utf8'
    });
    return {cwd, result};
}

for (const mode of ['dev', 'prod']) {
    test(`Helsinki ${mode} pages derive navigation limits from all bounds coordinates`, t => {
        const {cwd, result} = generate(t, 'helsinki', mode, {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: null,
                geometry: {
                    type: 'LineString',
                    coordinates: [[24, 60.6], [25.7, 60.5], [25.6, 59.8], [23.8, 59.9], [24, 60.6]]
                }
            }]
        });
        assert.equal(result.status, 0, result.stderr);
        const html = fs.readFileSync(path.join(cwd, mode === 'dev' ? 'dev' : 'build', 'index.html'), 'utf8');
        assert.match(html, /options\.minZoom = 10;/);
        assert.match(html, /options\.maxBounds = \[\[23\.8,59\.8\],\[25\.7,60\.6\]\];/);
        assert.match(html, /options\.renderWorldCopies = false;/);
    });
}

test('Tokyo pages do not require Helsinki bounds or restrict navigation', t => {
    const {cwd, result} = generate(t, 'tokyo', 'dev');
    assert.equal(result.status, 0, result.stderr);
    const html = fs.readFileSync(path.join(cwd, 'dev', 'index.html'), 'utf8');
    assert.doesNotMatch(html, /options\.(minZoom|maxBounds|renderWorldCopies) =/);
});

test('Helsinki generation fails explicitly when bounds are empty', t => {
    const {result} = generate(t, 'helsinki', 'dev', {type: 'FeatureCollection', features: []});
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must define a non-empty map area/);
});
