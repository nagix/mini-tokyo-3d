import fs from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import image from '@rollup/plugin-image';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import {visualizer} from "rollup-plugin-visualizer";
import cssimport from 'postcss-import';
import inlinesvg from 'postcss-inline-svg';
import strip from '@rollup/plugin-strip';
import {createFilter} from '@rollup/pluginutils';

const pkg = JSON.parse(fs.readFileSync('package.json'));
const banner = `/*!
 * Mini Tokyo 3D v${pkg.version}
 * ${pkg.homepage}
 * (c) 2019-${new Date().getFullYear()} ${pkg.author}
 * Released under the ${pkg.license} license
 */`;

const onwarn = (warning, defaultHandler) => {
	const {code, message} = warning;
	if (code == 'CIRCULAR_DEPENDENCY' && /@(deck|loaders|luma)\.gl/.test(message)) {
		return;
	}
	if ((code == 'MISSING_EXPORT' || code == 'EVAL') && message.includes('@loaders.gl')) {
		return;
	}
	if ((code == 'CIRCULAR_DEPENDENCY' || code == 'EVAL') && message.includes('protobufjs')) {
		return;
	}
	defaultHandler(warning);
}

const glsl = () => {
	const filter = createFilter('**/*.glsl');
	return {
		name: 'glsl',
		transform: (code, id) => {
			if (!filter(id)) {
				return;
			}
			code = code.trim()
				.replace(/\s*\/\/[^\n]*\n/g, '\n')
				.replace(/\n+/g, '\n')
				.replace(/\n\s+/g, '\n')
				.replace(/\s?([+-\/*=,])\s?/g, '$1')
				.replace(/([;,\{\}])\n(?=[^#])/g, '$1');

			return {
				code: `export default ${JSON.stringify(code)};`,
				map: {mappings: ''}
			};
		}
	};
};

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
		file: `dist/${pkg.name}-worker.js`,
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
				pure_getters: true
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
				inlinesvg()
			],
			extract: `${pkg.name}.css`
		}),
		commonjs(),
		replace({
			preventAssignment: true,
			'process.env.NODE_ENV': '\'development\'',
			'log.error': '(() => () => {})',
			'Math.min(1.01*s,o)}': 'Math.max(o,i+1000*t.pixelsPerMeter/Math.cos(t._pitch))}',
			'WORKER_STRING': () => fs.readFileSync(`dist/${pkg.name}-worker.js`, {encoding: 'utf8'}).replace(/(?=`|\${|\\)/g, '\\')
		}),
		replace({
			preventAssignment: true,
			include: '**/web-mercator-viewport.js',
			'farZMultiplier': 'farZMultiplier,\n        unitsPerMeter: scale * unitsPerMeter(latitude) / height'
		}),
		replace({
			preventAssignment: true,
			include: '**/web-mercator-utils.js',
			'farZMultiplier = 1': 'farZMultiplier = 1,\n    unitsPerMeter',
			'Math.min(furthestDistance * farZMultiplier, horizonDistance': 'Math.max(horizonDistance, cameraToSeaLevelDistance + 1000 * unitsPerMeter / Math.cos(pitchRadians)'
		}),
		replace({
			preventAssignment: true,
			include: '**/EXT_texture_webp.js',
			'import { isImageFormatSupported': 'import { getSupportedImageFormats',
			'import GLTFScenegraph': 'let supportedImageFormats;\ngetSupportedImageFormats().then(formats => {\n  supportedImageFormats = formats;\n});\nimport GLTFScenegraph',
			'isImageFormatSupported': '(mimeType => supportedImageFormats.has(mimeType))'
		}),
		replace({
			preventAssignment: true,
			delimiters: ['\\b', ''],
			'catch {': 'catch (e) {'
		}),
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
				inlinesvg()
			],
			extract: `${pkg.name}.min.css`,
			minimize: true
		}),
		commonjs(),
		replace({
			preventAssignment: true,
			'process.env.NODE_ENV': '\'production\'',
			'log.error': '(() => () => {})',
			'Math.min(1.01*s,o)}': 'Math.max(o,i+1000*t.pixelsPerMeter/Math.cos(t._pitch))}',
			'WORKER_STRING': () => fs.readFileSync(`dist/${pkg.name}-worker.js`, {encoding: 'utf8'}).replace(/(?=`|\${|\\)/g, '\\')
		}),
		replace({
			preventAssignment: true,
			include: '**/web-mercator-viewport.js',
			'farZMultiplier': 'farZMultiplier,\n        unitsPerMeter: scale * unitsPerMeter(latitude) / height'
		}),
		replace({
			preventAssignment: true,
			include: '**/web-mercator-utils.js',
			'farZMultiplier = 1': 'farZMultiplier = 1,\n    unitsPerMeter',
			'Math.min(furthestDistance * farZMultiplier, horizonDistance': 'Math.max(horizonDistance, cameraToSeaLevelDistance + 1000 * unitsPerMeter / Math.cos(pitchRadians)'
		}),
		replace({
			preventAssignment: true,
			include: '**/EXT_texture_webp.js',
			'import { isImageFormatSupported': 'import { getSupportedImageFormats',
			'import GLTFScenegraph': 'let supportedImageFormats;\ngetSupportedImageFormats().then(formats => {\n  supportedImageFormats = formats;\n});\nimport GLTFScenegraph',
			'isImageFormatSupported': '(mimeType => supportedImageFormats.has(mimeType))'
		}),
		replace({
			preventAssignment: true,
			delimiters: ['\\b', ''],
			'catch {': 'catch (e) {'
		}),
		image(),
		glsl(),
		terser({
			compress: {
				pure_getters: true
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
				inlinesvg()
			]
		}),
		commonjs(),
		replace({
			preventAssignment: true,
			'process.env.NODE_ENV': '\'production\'',
			'log.error': '(() => () => {})',
			'Math.min(1.01*s,o)}': 'Math.max(o,i+1000*t.pixelsPerMeter/Math.cos(t._pitch))}',
			'WORKER_STRING': () => fs.readFileSync(`dist/${pkg.name}-worker.js`, {encoding: 'utf8'}).replace(/(?=`|\${|\\)/g, '\\')
		}),
		replace({
			preventAssignment: true,
			include: '**/web-mercator-viewport.js',
			'farZMultiplier': 'farZMultiplier,\n        unitsPerMeter: scale * unitsPerMeter(latitude) / height'
		}),
		replace({
			preventAssignment: true,
			include: '**/web-mercator-utils.js',
			'farZMultiplier = 1': 'farZMultiplier = 1,\n    unitsPerMeter',
			'Math.min(furthestDistance * farZMultiplier, horizonDistance': 'Math.max(horizonDistance, cameraToSeaLevelDistance + 1000 * unitsPerMeter / Math.cos(pitchRadians)'
		}),
		replace({
			preventAssignment: true,
			include: '**/EXT_texture_webp.js',
			'import { isImageFormatSupported': 'import { getSupportedImageFormats',
			'import GLTFScenegraph': 'let supportedImageFormats;\ngetSupportedImageFormats().then(formats => {\n  supportedImageFormats = formats;\n});\nimport GLTFScenegraph',
			'isImageFormatSupported': '(mimeType => supportedImageFormats.has(mimeType))'
		}),
		replace({
			preventAssignment: true,
			delimiters: ['\\b', ''],
			'catch {': 'catch (e) {'
		}),
		image(),
		glsl()
	],
	onwarn
}];
