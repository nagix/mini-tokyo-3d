import {LayerExtension} from '@deck.gl/core';

// A deck.gl layer extension that adds linear distance fog. The per-fragment depth
// is 1.0 / gl_FragCoord.w (the perspective-correct clip-space w, i.e. the linear
// eye-space depth), which needs no vertex hook. fog_near / fog_far are supplied
// in those same units (derived from the camera-to-screen-center distance, see
// tile-3d-layer.js) so the fog starts around the screen center and deepens
// beyond, tracking zoom and pitch.
//
// The color is delivered through the module's getUniforms via moduleParameters,
// because ScenegraphLayer.draw ignores the opts.uniforms that other layers use and
// only forwards moduleParameters to its models. The value is read from the mutable
// object passed as the extension's constructor opts (this.opts, kept by reference
// even when deck.gl clones the extension for its sublayers), and the `fog` key is
// added to moduleParameters in place so the scenegraph's inherited module settings
// (projection, lighting) are preserved.
const fogModule = {
    name: 'fog',
    fs: `
uniform vec4 fog_color;
uniform float fog_near;
uniform float fog_far;
`,
    getUniforms: opts => {
        // Snake case to match the GLSL uniform names.
        return opts && opts.fog ? {'fog_color': opts.fog.color, 'fog_near': opts.fog.near, 'fog_far': opts.fog.far} : {};
    }
};

const inject = {
    'fs:DECKGL_FILTER_COLOR': `
    float fog_depth = 1.0 / gl_FragCoord.w;
    float fog_factor = clamp((fog_far - fog_depth) / (fog_far - fog_near), 0.0, 1.0);
    // fog_factor is 1 near / 0 far; apply the fog color scaled by its alpha so the
    // original texture still shows through by (1 - alpha) even at full fog.
    color.rgb = mix(color.rgb, fog_color.rgb, (1.0 - fog_factor) * fog_color.a);
`
};

export default class FogExtension extends LayerExtension {

    getShaders() {
        return {modules: [fogModule], inject};
    }

    draw(opts, extension) {
        if (opts.moduleParameters && extension.opts) {
            opts.moduleParameters.fog = extension.opts.fog;
        }
    }

}

FogExtension.extensionName = 'FogExtension';
