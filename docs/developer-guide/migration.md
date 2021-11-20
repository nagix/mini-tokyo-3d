# Migration

Mini Tokyo 3D v3.0.0 introduces a few breaking changes. In order to improve extensibility and usability, it was necessary to break backwards compatibility, but we aimed to do so only when worth the benefit. 

## Migrating to v3.0.0

### Breaking Changes

#### Exporting `mt3d` namespace instead of `MiniTokyo3D` class

Instead of the traditional `MiniTokyo3D` class, pass constructor options to the `Map` class to create a Mini Tokyo 3D Map object. The `mt3d` namespace contains not only the `Map` class, but also several other classes as well as the entire Mapbox GL JS and three.js libraries, which can be used to customize the map.

```js
const options = {
  container: 'mini-tokyo-3d',
  accessToken: '<Mapbox access token>'
};
const map = new mt3d.Map(options);
```

See [How to Integrate Mini Tokyo 3D](./integration.md) for details.

#### Plugin framework are redesigned and all plugins are provided separately

In previous versions, some plugins were provided as part of the Mini Tokyo 3D library. In v3.0.0, the plugin framework has been redesigned from the ground up, and all plugins are now provided as separate modules. Therefore, when adding plugins, you need to explicitly specify the list of objects implementing `PluginInterface` as a constructor option of the `Map` class.

```js
const options = {
  /* ... */
  plugins: [mt3dPrecipitation(), mt3dFireworks()]
};
const map = new mt3d.Map(options);
```

See [Adding Plugins](./integration.md#adding-plugins) for details.

#### Using `accessToken` instead of `secrets.mapbox` for `Map` constructor options

A Mapbox access token, previously specified in the `secrets.mapbox` option of the `MiniTokyo3D` constructor, is now specified in `accessToken` to create a `Map` object.

```js
const options = {
  /* ... */
  accessToken: '<Mapbox access token>'
};
const map = new mt3d.Map(options);
```

See [How to Integrate Mini Tokyo 3D](./integration.md) for details.
