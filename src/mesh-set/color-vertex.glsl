#include <color_vertex>

int width = textureSize( textureData0, 0 ).x;
ivec2 reference = ivec2( instanceID % width, instanceID / width );
vec4 data0 = texelFetch( textureData0, reference, 0 );
vec4 data1 = texelFetch( textureData1, reference, 0 );
vec3 translation = data0.xyz;
int colorID = int( data0.w );
float rotationX = data1.y;
float rotationZ = data1.x;
float opacity0 = data1.w;

width = textureSize( textureColor, 0 ).x;
reference = ivec2( colorID * 4 % width, colorID * 4 / width );
vec3 color0 = texelFetch( textureColor, reference, 0 ).rgb;
reference = ivec2( ( colorID * 4 + 1 ) % width, ( colorID * 4 + 1 ) / width );
vec3 color1 = texelFetch( textureColor, reference, 0 ).rgb;
reference = ivec2( ( colorID * 4 + 2 ) % width, ( colorID * 4 + 2 ) / width );
vec3 color2 = texelFetch( textureColor, reference, 0 ).rgb;
reference = ivec2( ( colorID * 4 + 3 ) % width, ( colorID * 4 + 3 ) / width );
vec3 color3 = texelFetch( textureColor, reference, 0 ).rgb;

#ifdef CAR
float mod3 = mod( groupIndex, 3.0 );
vec3 null = vec3( 0.0, 1.0, 0.0 );
vInstanceColor = groupIndex >= 3.0 && color3 != null ? color3 : mod3 == 0.0 ? color0 : mod3 == 1.0 ? color1 : color2;
#endif

#ifdef AIRCRAFT
vInstanceColor = groupIndex < 2.0 ? color0 : color1;
#endif

#ifdef BUS
vInstanceColor = color0;
#endif

vInstanceOpacity = opacity0;
