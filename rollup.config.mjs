import fs from 'node:fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import {visualizer} from 'rollup-plugin-visualizer';
import cssimport from 'postcss-import';
import inlinesvg from 'postcss-inline-svg';
import strip from '@rollup/plugin-strip';
import {onwarn, glsl, patches} from './rollup.shared.mjs';

const pkg = JSON.parse(fs.readFileSync('package.json'));
const workerFile = `dist/${pkg.name}-worker.js`;
const banner = `/*!
 * Mini Tokyo 3D v${pkg.version}
 * ${pkg.homepage}
 * (c) 2019-${new Date().getFullYear()} ${pkg.author}
 * Released under the ${pkg.license} license
 */`;

export default [{
    input: 'src/loader/index.js',
    output: {
        name: 'MiniTokyo3DLoader',
        file: 'dist/loader.js',
        format: 'cjs',
        indent: false,
        sourcemap: true
    },
    plugins: [
        resolve(),
        commonjs()
    ]
}, {
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
        commonjs(),
        terser({
            compress: {
                pure_getters: true // eslint-disable-line camelcase
            }
        }),
        strip()
    ]
}, {
    input: 'src/index.js',
    output: {
        name: 'mt3d',
        file: `dist/${pkg.name}.js`,
        format: 'umd',
        indent: false,
        sourcemap: true,
        banner
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
            ],
            extract: `${pkg.name}.css`
        }),
        commonjs(),
        ...patches({nodeEnv: 'development', workerFile}),
        image(),
        glsl()
    ],
    onwarn
}, {
    input: 'src/index.js',
    output: {
        name: 'mt3d',
        file: `dist/${pkg.name}.min.js`,
        format: 'umd',
        indent: false,
        sourcemap: true,
        banner
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
            ],
            extract: `${pkg.name}.min.css`,
            minimize: true
        }),
        commonjs(),
        ...patches({nodeEnv: 'production', workerFile}),
        image(),
        glsl(),
        terser({
            compress: {
                pure_getters: true // eslint-disable-line camelcase
            }
        }),
        strip({
            sourceMap: true
        }),
        visualizer()
    ],
    onwarn
}, {
    input: 'src/index.esm.js',
    output: {
        file: pkg.module,
        format: 'esm',
        indent: false,
        banner
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
        ...patches({nodeEnv: 'production', workerFile}),
        image(),
        glsl()
    ],
    onwarn
}];
