// Plugins that the dev and deployment pages can load. Each is enabled when its
// environment variable points at a built plugin file; gen-index then adds the
// matching <script> and factory call, and the file is served live (dev) or
// copied into the build directory (deployment).
export const plugins = [
    {env: 'MT3D_PLUGIN_PRECIPITATION', factory: 'mt3dPrecipitation()'},
    {env: 'MT3D_PLUGIN_FIREWORKS', factory: 'mt3dFireworks()'},
    {env: 'MT3D_PLUGIN_LIVECAM', factory: 'mt3dLivecam()'},
    {env: 'MT3D_PLUGIN_PLATEAU', factory: 'mt3dPlateau({enabled: false})'},
    {env: 'MT3D_PLUGIN_GTFS', factory: 'mt3dGtfs({enabled: false})'}
];
