# Helsinki precipitation plugin

This optional plugin renders deterministic rain or snow particles in map world
space. Camera bearing and pitch change the visible volume, but gravity always
follows the world's vertical axis. It does not call a weather API, add map
tiles, or create a precipitation overlay.

Particles stay at their world coordinates while the camera moves. A bounded
volume follows the current frustum: camera changes replenish newly exposed
regions across the viewport, while falling particles wrap to the volume's
upstream boundary along their world-space velocity. They do not respawn only
at the screen's top edge. Looking straight down produces perspective/radial
motion rather than camera-relative sideways gravity.

## Build

From the repository root:

```bash
npm run build-helsinki-precipitation
```

Run camera-movement, density, animation, and lifecycle regressions with
`npm run test-helsinki-precipitation`.

Enable the UMD build for the Mini Helsinki 3D page:

```bash
MT3D_PLUGIN_PRECIPITATION=plugins/mt3d-plugin-helsinki-precipitation/dist/mt3d-plugin-helsinki-precipitation.js \
npm run dev
```

Build and serve the plugin separately from the core application's watcher when
changing plugin source.

## Demo controls

The default is light rain. Development-only URL parameters select the other
presets:

- `?precipitation=rain&precipitation-preset=light`
- `?precipitation=rain&precipitation-preset=heavy`
- `?precipitation=snow&precipitation-preset=light`
- `?precipitation=snow&precipitation-preset=heavy`

Applications importing the ESM build can pass the same values to the factory:

```js
plugins: [mt3dPrecipitation({type: 'snow', preset: 'heavy'})]
```

The plugin uses the Three.js instance exported by Mini Tokyo 3D, so it must not
bundle its own Three.js copy.
