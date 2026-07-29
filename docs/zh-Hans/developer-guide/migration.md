# 迁移

Mini Tokyo 3D v3.0.0 引入了一些破坏性变更。为了提高扩展性和易用性，必须打破向后兼容性，但我们尽量只在收益足够明显时才这样做。

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
