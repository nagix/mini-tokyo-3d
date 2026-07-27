import fs from 'node:fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import postcss from 'rollup-plugin-postcss';
import cssimport from 'postcss-import';
import inlinesvg from 'postcss-inline-svg';
import {onwarn, glsl, patches} from './rollup.shared.mjs';

const pkg = JSON.parse(fs.readFileSync('package.json'));
const workerFile = `dev/${pkg.name}-worker.js`;

// Unminified development build with source maps and NODE_ENV=development,
// emitted to the git-ignored dev/ folder. The CSS is injected at runtime (no
// separate stylesheet); assets, data and plugins are served live from their
// sources by scripts/serve.mjs.
export default [{
    input: 'src/worker.js',
    output: {
        file: workerFile,
        format: 'umd',
        indent: false
    },
    plugins: [
        resolve({
            browser: true,
            preferBuiltins: false
        }),
        commonjs()
    ]
}, {
    input: 'src/index.js',
    output: {
        name: 'mt3d',
        file: `dev/${pkg.name}.js`,
        format: 'umd',
        indent: false,
        sourcemap: true
    },
    plugins: [
        resolve({
            browser: true,
            preferBuiltins: false
        }),
        postcss({
            plugins: [
                cssimport(),
                inlinesvg({
                    removeFill: true
                })
            ]
        }),
        commonjs(),
        ...patches({nodeEnv: 'development', workerFile}),
        image(),
        glsl()
    ],
    onwarn
}];
