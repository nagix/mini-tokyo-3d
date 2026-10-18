/**
 * Waits until the given WebGL context is confirmed ready to actually execute
 * GPU work, via a fenceSync placed right after this is called (or after a
 * timeout, so a case this doesn't detect can't hang forever).
 *
 * On iOS Safari, a tab opened (or navigated to) via the address bar's
 * "preload top hit" feature runs the page's JS inside a hidden, speculative
 * WebView before the user has actually committed to the navigation.
 * Creating GPGPU render targets (offscreen framebuffers driving a
 * feedback/ping-pong loop) too early relative to that hidden-to-visible
 * transition has been observed to leave them permanently stuck rendering
 * their zero-initialized contents for the rest of the page's life, with no
 * JS-observable error (isContextLost() stays false throughout). Call this
 * unconditionally before creating such resources - don't skip it just
 * because no hidden period was observed, since the transition can be too
 * brief to ever see document.visibilityState as 'hidden'.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - The WebGL
 *     context to wait on
 * @returns {Promise} A promise that resolves once the context is ready (or
 *     the wait times out)
 */
/**
 * Compiles a shader, logging an error (and still returning the shader) if
 * compilation fails.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - The WebGL context
 * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} source - The shader source
 * @param {string} label - Name used to identify the caller in the error log
 * @returns {WebGLShader} The compiled shader
 */
export function compileShader(gl, type, source, label) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`${label}: shader compile error`, gl.getShaderInfoLog(shader));
    }
    return shader;
}

/**
 * Links a program from the given shaders, logging an error (and still
 * returning the program) if linking fails.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - The WebGL context
 * @param {WebGLShader} vertexShader - The vertex shader
 * @param {WebGLShader} fragmentShader - The fragment shader
 * @param {string} label - Name used to identify the caller in the error log
 * @returns {WebGLProgram} The linked program
 */
export function linkProgram(gl, vertexShader, fragmentShader, label) {
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(`${label}: program link error`, gl.getProgramInfoLog(program));
    }
    return program;
}

export function waitUntilGpuReady(gl) {
    if (!gl.fenceSync) {
        return new Promise(resolve => requestAnimationFrame(resolve));
    }

    return new Promise(resolve => {
        const deadline = performance.now() + 5000,
            sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

        gl.flush();

        function waitForFence() {
            const status = gl.clientWaitSync(sync, 0, 0);

            if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED || performance.now() > deadline) {
                gl.deleteSync(sync);
                resolve();
            } else {
                requestAnimationFrame(waitForFence);
            }
        }

        waitForFence();
    });
}
