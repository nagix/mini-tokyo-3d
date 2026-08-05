# 迁移

Mini Tokyo 3D 的每个主要版本都会引入一些破坏性变更。为了提高扩展性和易用性，有时必须打破向后兼容性，但我们尽量只在收益足够明显时才这样做。

## 迁移到 v4.0.0

### 破坏性变更

#### 升级到 Mapbox GL JS v3

Mini Tokyo 3D 现在依赖 Mapbox GL JS v3（此前为 v2），内置地图样式也已相应更新。如果通过 `mt3d.mapboxgl` 命名空间自定义地图，或与底层 Mapbox 地图交互，请查看 [Mapbox GL JS v3 迁移指南](https://docs.mapbox.com/mapbox-gl-js/guides/migrate-to-v3/)，因为部分 v2 API 和样式行为已经发生变化。

#### 使用 `secrets.challenge` 替代 `secrets.tokyochallenge` 和 `secrets.challenge2024`

`secrets.tokyochallenge` 键（用于以前的东京公共交通开放数据挑战赛）和 `secrets.challenge2024` 键均已移除。今后请使用不含年份的 `secrets.challenge` 键指定公共交通开放数据挑战赛访问令牌，这样就不必每年更改键名。

```js
const options = {
  /* ... */
  secrets: {
    odpt: '<公共交通开放数据中心访问令牌>',
    challenge: '<公共交通开放数据挑战赛访问令牌>'
  }
};
```

详细信息请参阅 [Secrets](./api/secrets.md)。

#### `dataSources` 会替换内置数据源，并且必须提供 `id`

在 v3.x 中，`Map` 构造函数的 `options.dataSources` 会在内置列车和航班数据之外指定额外的 GTFS 数据源。在 v4.0.0 中，内置的 ODPT 和 Mini Tokyo 3D 数据本身也是 `dataSources` 中的条目，因此传入任何 `dataSources` 都会替换默认的数据源集合。如需在保留内置数据的同时添加自己的数据源，可以不设置 `dataSources`，并在运行时通过 [`Map#addDataSource`](./api/map.md#adddatasource-source) 添加数据源（这不会移除内置数据源）；也可以在 `dataSources` 数组中同时包含内置数据源和自己的数据源。此外，每个 [`DataSource`](./api/data-source.md) 现在都必须具有唯一的 `id`，它将作为 [`Map#addDataSource`](./api/map.md#adddatasource-source) 和 [`Map#removeDataSource`](./api/map.md#removedatasource-id) 使用的键；没有 `id` 的数据源无法单独管理。

详细信息请参阅 [DataSource](./api/data-source.md)。

#### `getModelPosition()` 和 `getModelScale()` 以 `options.center` 为基准

相对墨卡托坐标的原点此前固定在东京站附近，现在则由 `Map` 构造函数的 `options.center` 决定。因此，[`Map#getModelPosition`](./api/map.md#getmodelposition-lnglat-altitude) 和 [`Map#getModelScale`](./api/map.md#getmodelscale) 会返回相对于地图初始中心的值（比例还取决于该位置的纬度）。自定义 three.js 图层或插件应在运行时通过这些方法计算位置，而不要假定原点固定在东京站附近。使用默认中心点的集成不受影响。

#### 地图样式和本地化词典移至 `assets`

地图样式和本地化词典文件此前由 `Map` 构造函数的 `options.dataUrl` 提供（`osm-liberty.json` 和 `dictionary-<lang>.json`），现在则从 bundle 旁边的 `assets` 文件夹加载（`style.json` 和 `dictionary-<lang>.json`）。使用 jsDelivr CDN 时，这些文件会自动提供；将 Mini Tokyo 3D 打包到自己的应用中时，请将 `dist` 中随附的 `assets` 文件夹部署在 bundle 旁边。gzip 压缩的数据仍从 `options.dataUrl` 加载。此外，新样式与以前的样式不兼容，因此基于旧样式的任何自定义样式都必须重新构建。

详细信息请参阅[如何集成 Mini Tokyo 3D](./integration.md)。

## 迁移到 v3.0.0

### 破坏性变更

#### 导出 `mt3d` 命名空间，不再导出 `MiniTokyo3D` 类

不再使用原来的 `MiniTokyo3D` 类，而是将构造函数选项传给 `Map` 类，创建 Mini Tokyo 3D Map 对象。`mt3d` 命名空间不仅包含 `Map` 类，还包含多个其他类，以及完整的 Mapbox GL JS 和 three.js 库，可用于自定义地图。

```js
const options = {
  container: 'mini-tokyo-3d',
  accessToken: '<Mapbox 访问令牌>'
};
const map = new mt3d.Map(options);
```

详细信息请参阅[如何集成 Mini Tokyo 3D](./integration.md)。

#### 重新设计插件框架，并单独提供所有插件

在以前的版本中，部分插件是 Mini Tokyo 3D 库的一部分。在 v3.0.0 中，插件框架经过彻底重新设计，所有插件现在均作为独立模块提供。因此，添加插件时，需要在 `Map` 类的构造函数选项中明确指定实现 `PluginInterface` 的对象列表。

```js
const options = {
  /* ... */
  plugins: [mt3dPrecipitation(), mt3dFireworks()]
};
const map = new mt3d.Map(options);
```

详细信息请参阅[添加插件](./integration.md#添加插件)。

#### `Map` 构造函数选项使用 `accessToken`，不再使用 `secrets.mapbox`

以前在 `MiniTokyo3D` 构造函数的 `secrets.mapbox` 选项中指定 Mapbox 访问令牌；现在创建 `Map` 对象时，应在 `accessToken` 中指定。

```js
const options = {
  /* ... */
  accessToken: '<Mapbox 访问令牌>'
};
const map = new mt3d.Map(options);
```

详细信息请参阅[如何集成 Mini Tokyo 3D](./integration.md)。
