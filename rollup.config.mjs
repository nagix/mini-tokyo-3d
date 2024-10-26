import fs from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import image from '@rollup/plugin-image';
import terser from '@rollup/plugin-terser';
import sass from 'node-sass';
import postcss from 'rollup-plugin-postcss';
import {visualizer} from "rollup-plugin-visualizer";
import cssimport from 'postcss-import';
import inlinesvg from 'postcss-inline-svg';
import strip from '@rollup/plugin-strip';

const pkg = JSON.parse(fs.readFileSync('package.json'));
const banner = `/*!
 * Mini Tokyo 3D v${pkg.version}
 * ${pkg.homepage}
 * (c) 2019-${new Date().getFullYear()} ${pkg.author}
 * Released under the ${pkg.license} license
 */`;
const sassRender = (content, id) => new Promise((resolve, reject) => {
	const result = sass.renderSync({file: id});
	resolve({code: result.css.toString()});
});

const onwarn = (warning, defaultHandler) => {
	const {code, message} = warning;
	if (code == 'CIRCULAR_DEPENDENCY' && /@(deck|loaders|luma)\.gl/.test(message)) {
		return;
	}
	if ((code == 'MISSING_EXPORT' || code == 'EVAL') && message.includes('@loaders.gl')) {
		return;
	}
	defaultHandler(warning);
}

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
			preprocessor: sassRender,
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
			'Math.min(1.01*a,i*(1/t._horizonShift))}': 'Math.max(i*(1/t._horizonShift),i+1000*t.pixelsPerMeter/Math.cos(t._pitch))}'
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
		image()
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
			preprocessor: sassRender,
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
			'Math.min(1.01*a,i*(1/t._horizonShift))}': 'Math.max(i*(1/t._horizonShift),i+1000*t.pixelsPerMeter/Math.cos(t._pitch))}'
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
			preprocessor: sassRender,
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
			'Math.min(1.01*a,i*(1/t._horizonShift))}': 'Math.max(i*(1/t._horizonShift),i+1000*t.pixelsPerMeter/Math.cos(t._pitch))}'
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
		image()
	],
	onwarn
}];
