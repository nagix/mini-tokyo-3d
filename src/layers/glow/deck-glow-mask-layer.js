import {DeckRenderer, LayerManager, WebMercatorViewport} from '@deck.gl/core';
// getViewState isn't part of @deck.gl/mapbox's public exports (see index.js),
// but is a plain named export of this internal module - imported directly
// instead of hand-copied so this can't silently drift from the real
// implementation (e.g. its terrain-camera-centering branch).
import {getViewState} from '@deck.gl/mapbox/dist/esm/deck-utils.js';
import {cssToDeviceRatio, Framebuffer, instrumentGLContext, Renderbuffer, Texture2D} from '@luma.gl/core';
import {blit} from '@luma.gl/webgl';
import GlowCompositeLayer from './glow-composite-layer';
import glowVertexShader from './glow-composite-vertex.glsl';
import glowBlurFragmentShader from './glow-blur-fragment.glsl';

// Only a handful of features (marked/tracked stations, selected routes, ...)
// are ever drawn into this mask at once, so this stays cheap regardless of
// resolution scale.
const GLOW_RESOLUTION_SCALE = 0.5;
const GLOW_BLUR_RADIUS = 1.5;
const GLOW_BLUR_ITERATIONS = 2;
const GLOW_MASK_SAMPLES = 4;

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('DeckGlowMaskLayer: shader compile error', gl.getShaderInfoLog(shader));
    }
    return shader;
}

function linkProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('DeckGlowMaskLayer: program link error', gl.getProgramInfoLog(program));
    }
    return program;
}

function createTexture(gl, width, height) {
    return new Texture2D(gl, {
        width,
        height,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        mipmaps: false,
        parameters: {
            [gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
            [gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
            [gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
            [gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE
        }
    });
}

function getMaskSize(gl) {
    return {
        width: Math.max(1, Math.round(gl.drawingBufferWidth * GLOW_RESOLUTION_SCALE)),
        height: Math.max(1, Math.round(gl.drawingBufferHeight * GLOW_RESOLUTION_SCALE))
    };
}

// Mirrors deck-utils.js's getViewport() (unlike getViewState, this one isn't
// exported, so it still has to be hand-written): builds the viewport
// explicitly and drives deckRenderer.renderLayers() directly (below), the
// same way @deck.gl/mapbox's own "mapbox-repaint" pass does for every other
// deck.gl layer in this app.
//
// nearZ/farZ are pulled straight from mapbox's own transform instead of
// relying on WebMercatorViewport's own near/far formula, because this app's
// rollup.shared.mjs patches that formula (see the 'web-mercator-viewport.js'/
// 'web-mercator-utils.js' replace() calls) to derive the far plane from
// transform.height/pixelsPerMeter instead of farZMultiplier - passing
// farZMultiplier here would silently do nothing post-patch. Passing the
// literal nearZ/farZ (as @deck.gl/mapbox's own getViewport() does for the
// app's main, already-correct interleaved deck instance) sidesteps that
// formula entirely and guarantees this viewport's near/far exactly matches
// mapbox's, instead of merely approximating it.
//
// width/height/devicePixelRatio need more care than @deck.gl/mapbox's own
// version, because that one always targets the full-resolution default
// framebuffer, while this renders into maskFramebuffer, deliberately
// allocated at GLOW_RESOLUTION_SCALE of the real drawingBuffer size (see
// getMaskSize()). deck.gl's rasterization viewport (LayersPass's
// getGLViewport()) is viewport.{width,height} * devicePixelRatio, which must
// land exactly on maskFramebuffer's real size, so width/height are left as
// the real, unscaled CSS size and only devicePixelRatio is scaled down by
// GLOW_RESOLUTION_SCALE. This doesn't throw off lineWidthUnits: 'pixels'
// (used by subclasses for stroke width): deck.gl's project shader module
// computes project_uViewportSize as viewport.{width,height} *
// devicePixelRatio (see getUniformsFromViewport() in
// shaderlib/project/viewport-uniforms.js) and then divides by that same
// product when converting a pixel size to clip space, so devicePixelRatio
// cancels out of that conversion entirely and only the (here, real/unscaled)
// width/height ends up mattering for stroke width.
function buildViewport(mapboxMap, gl) {
    const transform = mapboxMap.transform,
        width = Math.max(1, gl.canvas.clientWidth),
        height = Math.max(1, gl.canvas.clientHeight),
        devicePixelRatio = cssToDeviceRatio(gl) * GLOW_RESOLUTION_SCALE;

    return {
        viewport: new WebMercatorViewport(Object.assign({
            id: 'mapbox',
            x: 0,
            y: 0,
            width,
            height,
            nearZMultiplier: 0.02,
            nearZ: transform._nearZ / transform.height,
            farZ: transform._farZ / transform.height
        }, getViewState(mapboxMap))),
        devicePixelRatio
    };
}

// Shared base for glow sources built from deck.gl layers (as opposed to
// GlowPipeline's three.js scene, used for vehicles): renders a subclass's
// deck.gl layers into an offscreen mask, blurs it, then composites through
// the inherited GlowCompositeLayer render(). A subclass only needs to supply
// layers via this.layerManager.setProps({layers}); getGlowTextures() below
// already wires the result into that composite step, so options.glowPipeline
// (GlowCompositeLayer's own constructor option) goes unused here.
//
// Drives its own private LayerManager + DeckRenderer (deck.gl's own internal
// building blocks, sharing mapbox's own gl context) rather than a full Deck
// instance: a Deck brings an EventManager and an always-running animation
// loop that calls _updateCursor() every frame regardless of _animate,
// fighting this app's own hover-driven cursor changes on the same, shared
// canvas - none of which is needed here, since rendering is driven entirely
// by this mapbox custom layer's own render() hook below. LayerManager +
// DeckRenderer alone carry none of that.
export default class DeckGlowMaskLayer extends GlowCompositeLayer {

    onAdd(map, gl) {
        const me = this;

        super.onAdd(map, gl);

        me.map = map;
        me.gl = gl;

        // cssToDeviceRatio(gl) (used by buildViewport()) reads
        // gl.luma.canvasSizeInfo, which only exists once a gl context has
        // been through this - normally done by whichever Deck instance is
        // constructed first against this shared context (map.__deck), but
        // called here too so this layer doesn't depend on that ordering.
        // Idempotent (checks gl._instrumented internally).
        instrumentGLContext(gl, {enable: true, copyState: true});

        const {width, height} = getMaskSize(gl);

        me.maskTexture = createTexture(gl, width, height);
        // No depth/stencil attachment: subclasses set depthTest/depthMask to
        // false on every layer drawn into this target, matching the vehicle
        // glow's three.js render targets (glow-pipeline.js's
        // WebGLRenderTargets, created with depthBuffer/stencilBuffer: false).
        me.maskFramebuffer = new Framebuffer(gl, {
            width,
            height,
            attachments: {
                [gl.COLOR_ATTACHMENT0]: me.maskTexture
            }
        });

        // The mask is the only one of these three targets with an actual
        // geometric edge to smooth (the blur targets below are filled by a
        // full-screen quad with no edges of their own) - drawn multisampled
        // here, then resolved (blit()) into maskFramebuffer/maskTexture right
        // after, so everything downstream (the blur passes, the composite
        // step) keeps reading the same plain texture as before.
        const samples = Math.min(GLOW_MASK_SAMPLES, gl.getParameter(gl.MAX_SAMPLES));

        me.maskMSRenderbuffer = new Renderbuffer(gl, {format: gl.RGBA8, width, height, samples});
        me.maskMSFramebuffer = new Framebuffer(gl, {
            width,
            height,
            attachments: {
                [gl.COLOR_ATTACHMENT0]: me.maskMSRenderbuffer
            }
        });

        me.blurTextureA = createTexture(gl, width, height);
        me.blurFramebufferA = new Framebuffer(gl, {
            width,
            height,
            attachments: {[gl.COLOR_ATTACHMENT0]: me.blurTextureA}
        });
        me.blurTextureB = createTexture(gl, width, height);
        me.blurFramebufferB = new Framebuffer(gl, {
            width,
            height,
            attachments: {[gl.COLOR_ATTACHMENT0]: me.blurTextureB}
        });

        // glow-blur-fragment.glsl has no precision qualifier because three.js
        // (GlowPipeline's use of it) always prepends one - required here since
        // this is a plain WebGL program, not a three.js ShaderMaterial.
        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, glowVertexShader),
            fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `precision mediump float;\n${glowBlurFragmentShader}`),
            blurProgram = me.blurProgram = linkProgram(gl, vertexShader, fragmentShader);

        me.blurPositionLocation = gl.getAttribLocation(blurProgram, 'position');
        me.blurDiffuseLocation = gl.getUniformLocation(blurProgram, 'tDiffuse');
        me.blurDirectionLocation = gl.getUniformLocation(blurProgram, 'direction');

        me.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, me.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        me.layerManager = new LayerManager(gl, {});
        me.deckRenderer = new DeckRenderer(gl);

        // Built once and reused by getGlowTextures() (called every render())
        // rather than allocated per frame - maskTexture/blurTextureB are
        // stable references (resized in place, never replaced).
        me._glowTextures = {
            renderer: {properties: {get: texture => ({__webglTexture: texture.handle})}},
            original: me.maskTexture,
            blurred: me.blurTextureB
        };

        me._onResize = me._resize.bind(me);
        map.on('resize', me._onResize);
        me._resize();
    }

    onRemove(map, gl) {
        const me = this;

        map.off('resize', me._onResize);
        me.layerManager.finalize();
        me.deckRenderer.finalize();
        me.maskFramebuffer.delete();
        me.maskTexture.delete();
        me.maskMSFramebuffer.delete();
        me.maskMSRenderbuffer.delete();
        me.blurFramebufferA.delete();
        me.blurTextureA.delete();
        me.blurFramebufferB.delete();
        me.blurTextureB.delete();
        gl.deleteProgram(me.blurProgram);
        gl.deleteBuffer(me.quadBuffer);

        super.onRemove(map, gl);
    }

    render(gl) {
        const me = this,
            {maskTexture, blurTextureA, blurFramebufferA, blurTextureB, blurFramebufferB, blurProgram} = me;

        me._resize();
        me.layerManager.updateLayers();

        // Defensive: mapbox's own canvas context may have alpha writes masked
        // off (common when a context is created to avoid alpha-compositing
        // with the DOM behind it), and whatever ran earlier this frame (the
        // main map.__deck instance, other custom layers) could have left the
        // viewport/scissor state pointed elsewhere. Reset before drawing so
        // deckRenderer's draw calls aren't silently clipped or masked.
        gl.colorMask(true, true, true, true);
        gl.disable(gl.SCISSOR_TEST);
        gl.viewport(0, 0, me.maskFramebuffer.width, me.maskFramebuffer.height);

        const {viewport, devicePixelRatio} = buildViewport(me.map, gl);

        me.deckRenderer.renderLayers({
            target: me.maskMSFramebuffer,
            layers: me.layerManager.getLayers(),
            viewports: [viewport],
            onViewportActive: me.layerManager.activateViewport,
            views: {},
            pass: 'screen',
            clearCanvas: true,
            moduleParameters: {devicePixelRatio}
        });
        blit(me.maskMSFramebuffer, me.maskFramebuffer);

        gl.useProgram(blurProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, me.quadBuffer);
        gl.enableVertexAttribArray(me.blurPositionLocation);
        gl.vertexAttribPointer(me.blurPositionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.uniform1i(me.blurDiffuseLocation, 0);
        gl.activeTexture(gl.TEXTURE0);

        let readTexture = maskTexture;

        for (let i = 0; i < GLOW_BLUR_ITERATIONS; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, blurFramebufferA.handle);
            gl.viewport(0, 0, blurFramebufferA.width, blurFramebufferA.height);
            gl.bindTexture(gl.TEXTURE_2D, readTexture.handle);
            gl.uniform2f(me.blurDirectionLocation, GLOW_BLUR_RADIUS / blurFramebufferA.width, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            gl.bindFramebuffer(gl.FRAMEBUFFER, blurFramebufferB.handle);
            gl.viewport(0, 0, blurFramebufferB.width, blurFramebufferB.height);
            gl.bindTexture(gl.TEXTURE_2D, blurTextureA.handle);
            gl.uniform2f(me.blurDirectionLocation, 0, GLOW_BLUR_RADIUS / blurFramebufferB.height);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            readTexture = blurTextureB;
        }

        gl.disableVertexAttribArray(me.blurPositionLocation);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // The blur passes above leave the viewport sized to their own
        // (GLOW_RESOLUTION_SCALE-downscaled) framebuffers - the inherited
        // composite draw targets the real default framebuffer instead, so it
        // needs the full canvas viewport restored, or it only rasterizes into
        // that smaller bottom-left region.
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        super.render(gl);
    }

    // Matches GlowPipeline's getGlowTextures() shape so the inherited
    // render() - which extracts a raw WebGLTexture via
    // renderer.properties.get(tex).__webglTexture for the three.js case -
    // can read these luma.gl textures (already plain WebGLTexture objects via
    // .handle) through the exact same code path, via this tiny shim.
    getGlowTextures() {
        return this._glowTextures;
    }

    _resize() {
        const me = this,
            {width, height} = getMaskSize(me.gl);

        if (me.maskFramebuffer.width === width && me.maskFramebuffer.height === height) {
            return;
        }
        me.maskFramebuffer.resize({width, height});
        me.maskMSFramebuffer.resize({width, height});
        me.blurFramebufferA.resize({width, height});
        me.blurFramebufferB.resize({width, height});
    }

}
