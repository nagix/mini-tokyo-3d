import glowCompositeVertexShader from './glow-composite-vertex.glsl';
import glowCompositeFragmentShader from './glow-composite-fragment.glsl';

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

// GlowPipeline renders into its glow textures from within the 3D layer stack,
// underneath the building layers, so it can't composite them onto the map
// itself without being covered by buildings drawn afterward. This is a plain
// (non-three.js) custom layer that only draws those already-blurred textures,
// so it can be placed after the building layers - it must be the last layer
// in the style for the glow to stay visible in front of everything.
export default class GlowCompositeLayer {

    constructor(id, options = {}) {
        const me = this;

        me.id = id;
        me.type = 'custom';
        me.renderingMode = '2d';
        me.glowPipeline = options.glowPipeline;
        me.glowColor = options.glowColor || [1, 1, 1];
        me.glowStrength = options.glowStrength !== undefined ? options.glowStrength : 1;
    }

    onAdd(map, gl) {
        const me = this,
            program = me.program = gl.createProgram();

        gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, glowCompositeVertexShader));
        gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, glowCompositeFragmentShader));
        gl.linkProgram(program);

        me.positionLocation = gl.getAttribLocation(program, 'position');
        me.originalLocation = gl.getUniformLocation(program, 'tOriginal');
        me.blurredLocation = gl.getUniformLocation(program, 'tBlurred');
        me.colorLocation = gl.getUniformLocation(program, 'glowColor');
        me.strengthLocation = gl.getUniformLocation(program, 'glowStrength');

        me.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, me.buffer);
        // A single oversized triangle that covers the full [-1, 1] clip-space
        // square, avoiding a seam down the middle of a two-triangle quad.
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    }

    render(gl) {
        const me = this,
            textures = me.getGlowTextures();

        if (!textures) {
            return;
        }

        const {renderer, original, blurred} = textures,
            originalHandle = renderer.properties.get(original).__webglTexture,
            blurredHandle = renderer.properties.get(blurred).__webglTexture;

        if (!originalHandle || !blurredHandle) {
            return;
        }

        gl.useProgram(me.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, originalHandle);
        gl.uniform1i(me.originalLocation, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, blurredHandle);
        gl.uniform1i(me.blurredLocation, 1);

        gl.uniform3fv(me.colorLocation, me.glowColor);
        gl.uniform1f(me.strengthLocation, me.glowStrength);

        gl.bindBuffer(gl.ARRAY_BUFFER, me.buffer);
        gl.enableVertexAttribArray(me.positionLocation);
        gl.vertexAttribPointer(me.positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.disableVertexAttribArray(me.positionLocation);
    }

    onRemove(map, gl) {
        const me = this;

        gl.deleteProgram(me.program);
        gl.deleteBuffer(me.buffer);
    }

    // Overridable: a subclass producing its own textures (see
    // DeckGlowMaskLayer) doesn't need an external glowPipeline object.
    getGlowTextures() {
        return this.glowPipeline.getGlowTextures();
    }

}
