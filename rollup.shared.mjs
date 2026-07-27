import fs from 'node:fs';
import replace from '@rollup/plugin-replace';
import {createFilter} from '@rollup/pluginutils';

export const onwarn = (warning, defaultHandler) => {
    const {code, message} = warning;
    if (code === 'CIRCULAR_DEPENDENCY' && /@(deck|loaders|luma)\.gl|protobufjs/.test(message)) {
        return;
    }
    defaultHandler(warning);
};

export const glsl = () => {
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

// Source-level patches applied to the bundled dependencies and the entry.
// `nodeEnv` selects the build mode and `workerFile` points at the pre-built
// worker bundle that gets inlined via the WORKER_STRING placeholder.
export const patches = ({nodeEnv, workerFile}) => [
    replace({
        preventAssignment: true,
        'process.env.NODE_ENV': `'${nodeEnv}'`,
        'log.error': '(() => () => {})',
        'Math.min(1.01*o,l)': 'Math.max(l,(e._camera.position[2]*e.worldSize+1000*e.pixelsPerMeter)/Math.cos(e._pitch))',
        'WORKER_STRING': () => fs.readFileSync(workerFile, {encoding: 'utf8'}).replace(/(?=`|\${|\\)/g, '\\')
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
        'Math.min(furthestDistance * farZMultiplier, horizonDistance)': 'Math.max(horizonDistance, cameraToSeaLevelDistance + 1000 * unitsPerMeter / Math.cos(pitchRadians))'
    }),
    replace({
        preventAssignment: true,
        include: '**/EXT_texture_webp.js',
        'import { isImageFormatSupported }': 'import { getSupportedImageFormats }',
        'import GLTFScenegraph': 'let supportedImageFormats;\ngetSupportedImageFormats().then(formats => {\n  supportedImageFormats = formats;\n});\nimport GLTFScenegraph',
        'isImageFormatSupported': '(mimeType => supportedImageFormats.has(mimeType))'
    })
];
