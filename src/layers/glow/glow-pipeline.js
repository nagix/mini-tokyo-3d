import {Mesh, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderTarget} from 'three';
import glowVertexShader from './glow-vertex.glsl';
import glowBlurFragmentShader from './glow-blur-fragment.glsl';

// The glow render targets are sized as a fraction of the canvas so the blur
// passes stay cheap; only marked/tracked-style instances ever render into them.
const GLOW_RESOLUTION_SCALE = 0.5;
// Texel-space blur radius applied per iteration (in the downscaled glow
// buffer), and the number of horizontal+vertical blur iterations.
const GLOW_BLUR_RADIUS = 1.5;
const GLOW_BLUR_ITERATIONS = 2;

// A generic mask-and-blur pipeline for "marked/tracked" style glow highlights.
// This isn't a mapbox/ThreeLayer layer in its own right - it has no renderer
// of its own. TrafficLayer's outline meshes sample GPU-compute render-target
// textures (vehicle positions/rotations) that only have valid data in the
// specific THREE.WebGLRenderer that computed them; a different renderer
// instance encountering the same texture object doesn't share that GPU state
// (that's also why GlowCompositeLayer has to extract raw texture handles
// rather than binding them as normal three.js uniforms). So instead of owning
// a renderer, renderMaskAndBlur() is called once per frame by whichever layer
// actually has a valid renderer each frame (TrafficLayer), using that
// renderer's own context - and remembers it so GlowCompositeLayer's raw-handle
// extraction reads from the same renderer that actually populated the
// textures. Station highlighting (or anything else with no such GPU-compute
// dependency) just registers meshes via add()/remove(); TrafficLayer doesn't
// need to know or care that they're there.
export default class GlowPipeline {

    constructor() {
        const me = this;

        me.glowScene = new Scene();

        const blurMaterial = me.blurMaterial = new ShaderMaterial({
            uniforms: {
                tDiffuse: {value: null},
                direction: {value: new Vector2()}
            },
            vertexShader: glowVertexShader,
            fragmentShader: glowBlurFragmentShader,
            depthTest: false,
            depthWrite: false
        });
        const quadMesh = me.quadMesh = new Mesh(new PlaneGeometry(2, 2), blurMaterial);

        quadMesh.frustumCulled = false;

        const quadScene = me.quadScene = new Scene();

        quadScene.add(quadMesh);

        me.glowRenderTarget = new WebGLRenderTarget(1, 1, {depthBuffer: false, stencilBuffer: false});
        me.blurRenderTargetA = new WebGLRenderTarget(1, 1, {depthBuffer: false, stencilBuffer: false});
        me.blurRenderTargetB = new WebGLRenderTarget(1, 1, {depthBuffer: false, stencilBuffer: false});
    }

    add(mesh) {
        this.glowScene.add(mesh);
    }

    remove(mesh) {
        this.glowScene.remove(mesh);
    }

    renderMaskAndBlur(renderer, camera) {
        const me = this,
            {glowScene, glowRenderTarget, blurRenderTargetA, blurRenderTargetB, quadScene, quadMesh, blurMaterial} = me;

        me.lastRenderer = renderer;
        me._resize(renderer);

        renderer.setClearColor(0x000000, 0);

        // glowRenderTarget itself is left untouched by the loop below, so
        // GlowCompositeLayer can subtract it from the blurred result to isolate
        // just the halo that spills beyond each source mesh's own silhouette.
        renderer.setRenderTarget(glowRenderTarget);
        renderer.clear(true, false, false);
        renderer.render(glowScene, camera);

        let readTarget = glowRenderTarget;

        quadMesh.material = blurMaterial;
        for (let i = 0; i < GLOW_BLUR_ITERATIONS; i++) {
            blurMaterial.uniforms.tDiffuse.value = readTarget.texture;
            blurMaterial.uniforms.direction.value.set(GLOW_BLUR_RADIUS / readTarget.width, 0);
            renderer.setRenderTarget(blurRenderTargetA);
            renderer.clear(true, false, false);
            renderer.render(quadScene, camera);

            blurMaterial.uniforms.tDiffuse.value = blurRenderTargetA.texture;
            blurMaterial.uniforms.direction.value.set(0, GLOW_BLUR_RADIUS / blurRenderTargetA.height);
            renderer.setRenderTarget(blurRenderTargetB);
            renderer.clear(true, false, false);
            renderer.render(quadScene, camera);

            readTarget = blurRenderTargetB;
        }

        renderer.setRenderTarget(null);
    }

    getGlowTextures() {
        const me = this;

        if (!me.lastRenderer) {
            return;
        }
        return {
            renderer: me.lastRenderer,
            original: me.glowRenderTarget.texture,
            blurred: me.blurRenderTargetB.texture
        };
    }

    dispose() {
        const me = this;

        me.glowRenderTarget.dispose();
        me.blurRenderTargetA.dispose();
        me.blurRenderTargetB.dispose();
        me.quadMesh.geometry.dispose();
        me.blurMaterial.dispose();
    }

    _resize(renderer) {
        const me = this,
            size = renderer.getDrawingBufferSize(new Vector2()),
            width = Math.max(1, Math.round(size.x * GLOW_RESOLUTION_SCALE)),
            height = Math.max(1, Math.round(size.y * GLOW_RESOLUTION_SCALE));

        if (me.glowRenderTarget.width === width && me.glowRenderTarget.height === height) {
            return;
        }
        me.glowRenderTarget.setSize(width, height);
        me.blurRenderTargetA.setSize(width, height);
        me.blurRenderTargetB.setSize(width, height);
    }

}
