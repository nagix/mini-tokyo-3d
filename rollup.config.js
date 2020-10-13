import fs from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import image from '@rollup/plugin-image';
import {terser} from 'rollup-plugin-terser';
import sass from 'node-sass';
import postcss from 'rollup-plugin-postcss';
import cssimport from 'postcss-import';
import inlinesvg from 'postcss-inline-svg';
import strip from '@rollup/plugin-strip';

const pkg = JSON.parse(fs.readFileSync('package.json'));
const banner = `/*!
 * Mini Tokyo 3D v${pkg.version}
 * ${pkg.homepage}
 * (c) ${new Date().getFullYear()} ${pkg.author}
 * Released under the ${pkg.license} license
 */`;
const extraReplacement = process.env.SECRETS ? {
	secrets: process.env.SECRETS,
	include: 'src/configs.js'
} : {};
const sassRender = (content, id) => new Promise((resolve, reject) => {
	const result = sass.renderSync({file: id});
	resolve({code: result.css.toString()});
});

export default [{
	input: 'src/loader/index.js',
	output: {
		name: 'MiniTokyo3DLoader',
		file: 'dist/loader.js',
		format: 'cjs',
		indent: false,
		sourcemap: true
	},
	external: ['fs', 'worker_threads', 'https'],
	plugins: [
		resolve(),
		commonjs()
	]
}, {
	input: 'src/index.js',
	output: {
		name: 'MiniTokyo3D',
		file: 'dist/mini-tokyo-3d.js',
		format: 'umd',
		indent: false,
		sourcemap: true,
		banner
	},
	external: ['fs', 'util', 'module', 'path', 'child_process'],
	plugins: [
		resolve(),
		postcss({
			preprocessor: sassRender,
			plugins: [
				cssimport(),
				inlinesvg()
			],
			extract: 'mini-tokyo-3d.css'
		}),
		commonjs(),
		replace({
			'process.env.NODE_ENV': '\'development\'',
			'log.error': '//log.error'
		}),
		replace(extraReplacement),
		image()
	]
}, {
	input: 'src/index.js',
	output: {
		name: 'MiniTokyo3D',
		file: 'dist/mini-tokyo-3d.min.js',
		format: 'umd',
		indent: false,
		sourcemap: true,
		banner
	},
	external: ['fs', 'util', 'module', 'path', 'child_process'],
	plugins: [
		resolve(),
		postcss({
			preprocessor: sassRender,
			plugins: [
				cssimport(),
				inlinesvg()
			],
			extract: 'mini-tokyo-3d.min.css',
			minimize: true
		}),
		commonjs(),
		replace({
			'process.env.NODE_ENV': '\'production\'',
			'log.error': '//log.error'
		}),
		replace(extraReplacement),
		image(),
		terser({
			compress: {
				pure_getters: true,
				passes: 3
			}
		}),
		strip({
			sourceMap: true
		})
	]
}];
