# Migration

Each major release of Mini Tokyo 3D introduces a few breaking changes. In order to improve extensibility and usability, it is sometimes necessary to break backwards compatibility, but we aim to do so only when worth the benefit.

## Migrating to v4.0.0

### Breaking Changes

#### Upgraded to Mapbox GL JS v3

Mini Tokyo 3D now depends on Mapbox GL JS v3 (previously v2), and the built-in map style has been updated accordingly. If you customize the map through the `mt3d.mapboxgl` namespace or interact with the underlying Mapbox map, review the [Mapbox GL JS v3 migration guide](https://docs.mapbox.com/mapbox-gl-js/guides/migrate-to-v3/), as some v2 APIs and style behaviors have changed.

#### `secrets.tokyochallenge` and `secrets.challenge2024` replaced by `secrets.challenge`

The `secrets.tokyochallenge` key (for the former Open Data Challenge for Public Transportation in Tokyo) and the `secrets.challenge2024` key have both been removed. Use the year-agnostic `secrets.challenge` key for the Open Data Challenge access token from now on, so it no longer needs to change for each year's challenge.

```js
const options = {
  /* ... */
  secrets: {
    odpt: '<access token for Public Transportation Open Data Center>',
    challenge: '<access token for Open Data Challenge for Public Transportation>'
  }
};
```

See [Secrets](./api/secrets.md) for details.

#### `dataSources` replaces the built-in data sources and requires an `id`

In v3.x, the `Map` constructor's `options.dataSources` specified additional GTFS data sources on top of the built-in train and flight data. In v4.0.0, the built-in ODPT and Mini Tokyo 3D data are themselves entries in `dataSources`, so any `dataSources` you pass replaces that default set. To keep the built-in data while adding your own, either leave `dataSources` unset and add your sources at runtime with [`Map#addDataSource`](./api/map.md#adddatasource-source) (which does not remove the built-in sources), or include the built-in sources together with your own in the `dataSources` array. In addition, each [`DataSource`](./api/data-source.md) now requires a unique `id`, used as the key for [`Map#addDataSource`](./api/map.md#adddatasource-source) and [`Map#removeDataSource`](./api/map.md#removedatasource-id); sources added without an `id` cannot be managed individually.

See [DataSource](./api/data-source.md) for details.

#### `getModelPosition()` and `getModelScale()` are relative to `options.center`

The origin for the relative Mercator coordinates was previously fixed around Tokyo Station. It is now derived from the `Map` constructor's `options.center`, so [`Map#getModelPosition`](./api/map.md#getmodelposition-lnglat-altitude) and [`Map#getModelScale`](./api/map.md#getmodelscale) return values relative to the map's initial center (and the scale depends on its latitude). Custom three.js layers or plugins should compute positions from these methods at runtime rather than assuming a fixed origin around Tokyo Station. Integrations using the default center are unaffected.

#### Map style and localization dictionaries moved to `assets`

The map style and localization dictionary files, previously served from the `Map` constructor's `options.dataUrl` (`osm-liberty.json` and `dictionary-<lang>.json`), are now loaded from an `assets` folder located next to the bundle (`style.json` and `dictionary-<lang>.json`). When you use the jsDelivr CDN they are served automatically; when you bundle Mini Tokyo 3D into your own application, deploy the `assets` folder shipped in `dist` alongside your bundle. The gzipped data still loads from `options.dataUrl`. In addition, the new style is not compatible with the previous one, so any custom style based on it must be rebuilt.

See [How to Integrate Mini Tokyo 3D](./integration.md) for details.

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
