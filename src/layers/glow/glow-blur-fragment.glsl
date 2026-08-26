uniform sampler2D tDiffuse;
uniform vec2 direction;

varying vec2 vUv;

void main() {
    vec4 color = texture2D( tDiffuse, vUv ) * 0.227027;
    vec2 off1 = direction * 1.384615;
    vec2 off2 = direction * 3.230769;

    color += texture2D( tDiffuse, vUv + off1 ) * 0.316216;
    color += texture2D( tDiffuse, vUv - off1 ) * 0.316216;
    color += texture2D( tDiffuse, vUv + off2 ) * 0.070270;
    color += texture2D( tDiffuse, vUv - off2 ) * 0.070270;

    gl_FragColor = color;
}
