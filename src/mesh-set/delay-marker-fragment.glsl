uniform float base;
varying float vIntensity;

void main() {
    vec3 color = mix( vec3( base ), vec3( 1.0, 0.6, 0.0 ), vIntensity );
    gl_FragColor = vec4( color, 1.0 );
}
