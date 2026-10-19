vec4 diffuseColor = vec4( diffuse * vInstanceColor, opacity * vInstanceOpacity );

#ifdef CAR
// Draw chevron arrow on top face (local normal Z+), near the front (high vUv2.y)
if ( vLocalNormalZ > 0.5 ) {
    float u = vUv2.x;
    float v = vUv2.y; // 1.0 = front, 0.0 = back

    float tip = 0.92;
    float base = 0.72;
    float hw = 0.3;
    float thick = 0.1;

    if ( v > base && v < tip ) {
        float t = ( v - base ) / ( tip - base );
        float outer = hw * ( 1.0 - t );
        float inner = max( outer - thick, 0.0 );
        float du = abs( u - 0.5 );
        if ( du < outer && du > inner ) {
            diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 1.0 ), 0.5 );
        }
    }
}
#endif
