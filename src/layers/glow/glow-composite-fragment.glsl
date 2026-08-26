precision mediump float;

uniform sampler2D tOriginal;
uniform sampler2D tBlurred;
uniform vec3 glowColor;
uniform float glowStrength;

varying vec2 vUv;

// raw peaks right at the mask's own edge and decays outward, but never
// reaches 1: blur-kernel dilution caps its achievable peak below that,
// especially for thin outline-mesh geometry (vehicles) as opposed to a
// station's large filled polygon. PLATEAU is tuned so both still hit full
// glowStrength before decaying.
const float PLATEAU = 0.15;

void main() {
    // Subtracting the unblurred mask from the blurred one cancels out the
    // marked/tracked object's own silhouette, leaving only the soft halo that
    // spilled beyond it - so the object's own colors are never washed out by
    // the glow sitting on top of them.
    float original = texture2D( tOriginal, vUv ).a;
    float blurred = texture2D( tBlurred, vUv ).a;
    float raw = max( blurred - original, 0.0 );
    float intensity = min( raw / PLATEAU, 1.0 ) * glowStrength;

    gl_FragColor = vec4( glowColor * intensity, intensity );
}
