const input = 'plugins/mt3d-plugin-helsinki-precipitation/src/index.js';
const output = 'plugins/mt3d-plugin-helsinki-precipitation/dist/mt3d-plugin-helsinki-precipitation';

export default [{
    input,
    external: ['mini-tokyo-3d'],
    output: {
        name: 'mt3dPrecipitation',
        file: `${output}.js`,
        format: 'umd',
        indent: false,
        globals: {'mini-tokyo-3d': 'mt3d'},
        sourcemap: true
    }
}, {
    input,
    external: ['mini-tokyo-3d'],
    output: {
        file: `${output}.esm.js`,
        format: 'esm',
        indent: false,
        sourcemap: true
    }
}, {
    input,
    external: ['mini-tokyo-3d'],
    output: {
        file: `${output}.cjs`,
        format: 'cjs',
        indent: false,
        sourcemap: true
    }
}];
