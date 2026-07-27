// Plugins that the dev page can load. Each is enabled when its environment
// variable points at a built plugin file; the dev server then streams that file
// at /<file> and gen-index includes the matching <script> and factory call.
export const plugins = [
    {env: 'MT3D_PLUGIN_PRECIPITATION', file: 'mt3d-plugin-precipitation.min.js', factory: 'mt3dPrecipitation()'},
    {env: 'MT3D_PLUGIN_FIREWORKS', file: 'mt3d-plugin-fireworks.min.js', factory: 'mt3dFireworks()'},
    {env: 'MT3D_PLUGIN_LIVECAM', file: 'mt3d-plugin-livecam.min.js', factory: 'mt3dLivecam()'},
    {env: 'MT3D_PLUGIN_PLATEAU', file: 'mt3d-plugin-plateau.min.js', factory: 'mt3dPlateau({enabled: false})'},
    {env: 'MT3D_PLUGIN_GTFS', file: 'mt3d-plugin-gtfs.min.js', factory: 'mt3dGtfs({enabled: false})'}
];
