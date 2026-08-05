# Map

`Map` 对象表示页面上的 Mini Tokyo 3D 地图。通过指定 `container` 和其他选项创建 `Map` 后，Mini Tokyo 3D 会在页面中初始化地图并返回 `Map` 对象。

扩展自 [Evented](https://docs.mapbox.com/mapbox-gl-js/api/events/#evented)。

```js
new Map(options: Object)
```

## 参数

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

名称 | 说明
:-- | :--
**`options.accessToken`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Mapbox](https://www.mapbox.com) 访问令牌。如果未指定，加载地图时会出错，因此请务必获取你的网站专用的访问令牌。
**`options.bearing`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>默认值： `0` | 地图的初始方位角（旋转角度），从正北方向逆时针计算，单位为度。省略时默认为 `0`。
**`options.center`**<br>[`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)<br>默认值： `[139.7670, 35.6814]` | 地图的初始地理中心点。省略时默认为东京站附近（`[139.7670, 35.6814]`）。注意：为与 GeoJSON 一致，Mini Tokyo 3D 使用经度、纬度的坐标顺序。
**`options.clockControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>默认值： `true` | 为 `true` 时，在地图上添加日期和时间显示。
**`options.configControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>默认值： `true` | 为 `true` 时，在地图上添加设置按钮。
**`options.container`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | Mini Tokyo 3D 用于渲染地图的 HTML 元素 `id`。指定的元素不能包含子元素。
**`options.dataSources`**<br>[`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`DataSource`](./data-source.md)`>` | Mini Tokyo 3D 的列车、航班和巴士数据源数组。省略时使用内置的 ODPT 与 Mini Tokyo 3D 列车和航班数据源。提供此选项会替换内置数据源；如需保留它们，请明确将其包含在内，或在运行时通过 [`Map#addDataSource`](./map.md#adddatasource-source) 添加自己的数据源。每个数据源都必须具有唯一的 [`id`](./data-source.md#id-string)。
**`options.dataUrl`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | Mini Tokyo 3D 数据网址。省略时使用 `'https://minitokyo3d.com/data'`。
**`options.ecoFrameRate`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>默认值： `1` | 省电模式开启时列车和飞机动画的帧率（帧/秒）。可指定 1 至 60。值越低，动画越不流畅，但 CPU 资源占用也越低，从而减少移动设备耗电。省略时默认为 `1`。
**`options.ecoMode`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)<br>默认值： `'normal'` | 初始省电模式。支持 `'normal'` 和 `'eco'`。
**`options.fullscreenControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>默认值： `true` | 为 `true` 时，在地图上添加全屏按钮。
**`options.lang`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | 表示语言的 [IETF 语言标签](https://zh.wikipedia.org/wiki/IETF%E8%AF%AD%E8%A8%80%E6%A0%87%E7%AD%BE)。省略时使用浏览器默认语言。目前支持 `'ja'`、`'en'`、`'ko'`、`'zh-Hans'`、`'zh-Hant'`、`'th'`、`'ne'`、`'pt-BR'`、`'fr'`、`'es'` 和 `'de'`。指定不支持的语言时使用 `'en'`。
**`options.modeControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>默认值： `true` | 为 `true` 时，在地图上添加模式切换按钮。
**`options.navigationControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>默认值： `true` | 为 `true` 时，在地图上添加导航按钮。
**`options.pitch`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>默认值： `60` | 地图的初始倾斜角，相对于屏幕平面计算，单位为度（0–85）。省略时默认为 `60`。
**`options.plugins`**<br>[`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`PluginInterface`](./plugin.md)`>` | 要添加的插件数组。每个插件都必须实现 [PluginInterface](./plugin.md)。
**`options.searchControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>默认值： `true` | 为 `true` 时，在地图上添加搜索按钮。
**`options.secrets`**<br>[`Secrets`](./secrets.md) | 用于存储获取数据时所用访问令牌的对象。
**`options.selection`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | 要跟踪的列车或航班 ID，或者要选择的车站 ID。列车 ID 格式为 `'odpt.Train:<运营商 ID>.<线路 ID>.<列车编号>'`；航班 ID 格式为 `'odpt.FlightInformationArrival:<运营商 ID>.<机场 ID>.<航班号>'` 或 `'odpt.FlightInformationDeparture:<运营商 ID>.<机场 ID>.<航班号>'`；车站 ID 格式为 `'odpt.Station:<运营商 ID>.<线路 ID>.<车站 ID>'`。可以省略 `'odpt.*:'` 部分。详细信息请参阅[公共交通开放数据中心 API 规范](https://developer.odpt.org)。
**`options.trackingMode`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)<br>默认值： `'position'` | 初始跟踪模式。支持 `'position'`、`'back'`、`'topback'`、`'front'`、`'topfront'`、`'helicopter'`、`'drone'` 和 `'bird'`。
**`options.zoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>默认值： `14` | 地图的初始缩放级别。省略时默认为 `14`。

## 实例成员

### **`addDataSource(source)`**

向地图添加数据源。如果已存在相同 ID 的数据源，则将其替换。

#### 参数

**`source`** ([`DataSource`](./data-source.md)) 要添加的数据源。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`addLayer(layer)`**

向地图添加图层。

#### 参数

**`layer`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) | [`CustomLayerInterface`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#customlayerinterface) | [`GeoJsonLayerInterface`](./geojson-layer.md) | [`ThreeLayerInterface`](./three-layer.md) | [`Tile3DLayerInterface`](./tile-3d-layer.md)) 要添加的图层，须符合 Mapbox 样式规范的[图层定义](https://docs.mapbox.com/style-spec/reference/layers/)、[CustomLayerInterface](https://docs.mapbox.com/mapbox-gl-js/api/properties/#customlayerinterface)、[GeoJsonLayerInterface](./geojson-layer.md)、[ThreeLayerInterface](./three-layer.md) 或 [Tile3DLayerInterface](./tile-3d-layer.md) 规范。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`easeTo(options)`**

通过动画过渡更改 `center`、`zoom`、`bearing`、`pitch` 和 `padding` 的任意组合。`options` 中未指定的设置会保留当前值。

注意：如果用户在操作系统中启用了“减少动态效果”辅助功能，过渡会立即完成，除非 `options` 包含 `essential: true`。

#### 参数

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) 描述过渡目标和动画的选项。接受 [CameraOptions](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions) 和 [AnimationOptions](https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions)。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`flyTo(options)`**

更改 `center`、`zoom`、`bearing` 和 `pitch` 的任意组合，并沿模拟飞行的曲线执行动画过渡。动画会流畅地结合缩放和平移，即使跨越很远距离，也能帮助用户保持方向感。

如果用户在操作系统中启用了“减少动态效果”辅助功能，动画会被跳过，效果等同于 `jumpTo`，除非 `options` 包含 `essential: true`。

#### 参数

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) 描述过渡目标和动画的选项。接受 [CameraOptions](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions)、[AnimationOptions](https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions) 及以下附加选项。

名称 | 说明
:-- | :--
**`options.curve`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>默认值： `1.42` | 沿飞行路径采用的缩放“曲线”。值越大，缩放越明显、动画越夸张；值越小，缩放越少、效果越接近 [Map#easeTo](./map.md#easeto-options)。1.42 是 [van Wijk（2003）](https://www.win.tue.nl/~vanwijk/zoompan.pdf)所述用户研究参与者选择的平均值。`Math.pow(6, 0.25)` 等同于均方根平均速度，值为 1 时会产生圆周运动。指定 `options.minZoom` 后忽略此选项。
**`options.maxDuration`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | 动画的最长持续时间，单位为毫秒。如果持续时间超过最大值，则重置为 0。
**`options.minZoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | 飞行路径最高点处从 0 开始计算的缩放级别。指定此选项后忽略 `options.curve`。
**`options.screenSpeed`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | 假设采用线性时间曲线，以每秒移动多少个屏幕跨度表示的动画平均速度。指定 `options.speed` 后忽略此选项。
**`options.speed`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>默认值： `1.2` | 相对于 `options.curve` 定义的动画平均速度。速度 1.2 表示地图每秒沿飞行路径移动 `options.curve` 的 1.2 倍屏幕跨度。一个屏幕跨度指地图的可见范围，不对应固定物理距离，会随缩放级别而变化。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`getBearing()`**

返回地图当前的方位角。方位角表示地图朝上的指南针方向；例如，方位角为 90° 时，地图东方朝上。

#### 返回值

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): 地图当前的方位角。

---

### **`getCenter()`**

返回地图的地理中心点。

#### 返回值

[`LngLat`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglat): 地图的地理中心点。

---

### **`getClockMode()`**

返回当前时钟模式。

#### 返回值

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 表示当前时钟模式的字符串，为 `'realtime'` 或 `'playback'`。

---

### **`getEcoMode()`**

返回当前省电模式。

#### 返回值

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 表示当前省电模式的字符串，为 `'normal'` 或 `'eco'`。

---

### **`getLight()`**

返回地图当前设置的光源。返回对象的结构与 [`light`](#light) 事件的载荷相同。

#### 返回值

[`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object): 当前光源。对象属性请参阅 [`light`](#light) 事件。

---

### **`getMapboxMap()`**

返回地图中使用的 Mapbox [`Map`](https://docs.mapbox.com/mapbox-gl-js/api/map/) 对象。

#### 返回值

[`Map`](https://docs.mapbox.com/mapbox-gl-js/api/map/): Mapbox Map。

---

### **`getModelPosition(lnglat, altitude)`**

将 `LngLat` 投影为 `MercatorCoordinate`，并返回以地图初始中心（`options.center`）为原点平移后的墨卡托坐标。

#### 参数

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) 要投影的位置。

**`altitude`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 位置的海拔高度，单位为米。

#### 返回值

{x: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), y: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), z: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)}: 以地图初始中心（`options.center`）为原点平移后的墨卡托坐标。

---

### **`getModelScale()`**

返回从以米为单位的现实世界坐标转换到 `MercatorCoordinate` 的比例。该值表示地图初始中心（`options.center`）位置的 1 米对应多少 `MercatorCoordinate` 单位。

#### 返回值

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): 从以米为单位的现实世界坐标转换到 `MercatorCoordinate` 的比例。

---

### **`getPitch()`**

返回地图当前的倾斜角。

#### 返回值

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): 地图当前的倾斜角，相对于屏幕平面计算，单位为度。

---

### **`getSelection()`**

返回正在跟踪的列车或航班 ID，或者已选车站的 ID 数组。

#### 返回值

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`: 正在跟踪的列车或航班 ID，或者已选车站的 ID 数组。列车 ID 格式为 `'<运营商 ID>.<线路 ID>.<列车编号>'`；航班 ID 格式为 `'<运营商 ID>.<机场 ID>.<航班号>'`；车站 ID 格式为 `'<运营商 ID>.<线路 ID>.<车站 ID>'`。

---

### **`getTrackingMode()`**

返回当前跟踪模式。各跟踪模式的详细信息请参阅[跟踪模式设置](../../user-guide/configuration.md#跟踪模式设置)。

#### 返回值

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 表示当前跟踪模式的字符串，为 `'position'`、`'back'`、`'topback'`、`'front'`、`'topfront'`、`'helicopter'`、`'drone'` 或 `'bird'`。

::: warning 注意
跟踪模式 `'heading'` 已弃用，并会回退到 `'topback'`。
:::

---

### **`getViewMode()`**

返回当前视图模式。

#### 返回值

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 表示当前视图模式的字符串，为 `'ground'` 或 `'underground'`。

---

### **`getZoom()`**

返回地图当前的缩放级别。

#### 返回值

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): 地图当前的缩放级别。

---

### **`hasDarkBackground()`**

检查地图背景颜色是否为深色。

#### 返回值

[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean): 地图背景颜色为深色时是 `true`，否则是 `false`。

---

### **`jumpTo(options)`**

不使用动画过渡，更改 `center`、`zoom`、`bearing` 和 `pitch` 的任意组合。`options` 中未指定的设置会保留当前值。

#### 参数

**`options`** ([`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions)) 选项对象。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`off(type, listener)`**

移除此前通过 [`Map#on`](./map.md#on-type-listener) 添加的事件监听器。

#### 参数

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 此前安装监听器时使用的事件类型。

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) 此前作为监听器安装的函数。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`on(type, listener)`**

添加指定类型事件的监听器。

#### 参数

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 要监听的事件类型。

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) 事件触发时调用的函数。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`once(type, listener)`**

为指定事件类型添加只调用一次的监听器。

#### 参数

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 要添加监听器的事件类型。

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) 事件触发时调用的函数。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`removeDataSource(id)`**

从地图中移除具有指定 ID 的数据源。

#### 参数

**`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 要移除的数据源 ID。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`removeLayer(id)`**

从地图中移除具有指定 ID 的图层。

如果不存在该图层，则触发 `error` 事件。

#### 参数

**`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 要移除的图层 ID。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`setBearing(bearing)`**

设置地图的方位角（旋转角度）。方位角表示地图朝上的指南针方向；例如，方位角为 90° 时，地图东方朝上。

等同于 `jumpTo({bearing: bearing})`。

#### 参数

**`bearing`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 要设置的方位角。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`setCenter(center)`**

设置地图的地理中心点。等同于 `jumpTo({center: center})`。

#### 参数

**`center`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) 要设置的中心点。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`setClockMode(mode)`**

设置时钟模式。实时模式（`'realtime'`）下，地图按照当前实际运行情况显示列车和飞机；播放模式（`'playback'`）下，可以指定时间和时间流逝速度。

#### 参数

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 表示时钟模式的字符串，为 `'realtime'` 或 `'playback'`。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`setEcoMode(mode)`**

设置省电模式。普通模式（`'normal'`）下，列车和飞机动画帧率设为 60；省电模式（`'eco'`）下，帧率设为 [`Map`](./map.md) 构造函数选项 `ecoFrameRate`。

#### 参数

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 表示省电模式的字符串，为 `'normal'` 或 `'eco'`。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`setLayerVisibility(layerId, visibility)`**

设置图层可见性。指定 `'visible'` 使图层可见，指定 `'none'` 使图层不可见。

#### 参数

**`layerId`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 要设置可见性的图层 ID。

**`visibility`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 图层是否显示，为 `'visible'` 或 `'none'`。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`setPitch(pitch)`**

设置地图的倾斜角。等同于 `jumpTo({pitch: pitch})`。

#### 参数

**`pitch`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 要设置的倾斜角，相对于屏幕平面计算，单位为度（0–85）。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`setSelection(id)`**

设置要跟踪的列车或航班 ID，或者要选择的车站 ID。列车 ID 格式为 `'odpt.Train:<运营商 ID>.<线路 ID>.<列车编号>'`；航班 ID 格式为 `'odpt.FlightInformationArrival:<运营商 ID>.<机场 ID>.<航班号>'` 或 `'odpt.FlightInformationDeparture:<运营商 ID>.<机场 ID>.<航班号>'`；车站 ID 格式为 `'odpt.Station:<运营商 ID>.<线路 ID>.<车站 ID>'`。可以省略 `'odpt.*:'` 部分。详细信息请参阅[公共交通开放数据中心 API 规范](https://developer.odpt.org)。

#### 参数

**`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 要跟踪的列车或航班 ID，或者要选择的车站 ID。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`setTrackingMode(mode)`**

设置跟踪模式。各跟踪模式的详细信息请参阅[跟踪模式设置](../../user-guide/configuration.md#跟踪模式设置)。

#### 参数

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 表示跟踪模式的字符串，为 `'position'`、`'back'`、`'topback'`、`'front'`、`'topfront'`、`'helicopter'`、`'drone'` 或 `'bird'`。

::: warning 注意
跟踪模式 `'heading'` 已弃用，并会回退到 `'topback'`。
:::

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`setViewMode(mode)`**

设置视图模式。地面模式（`'ground'`）下，地面线路、车站、列车和飞机明亮显示，地下线路、车站和列车半透明显示；地下模式（`'underground'`）下，地图变暗，地面线路、车站、列车和飞机半透明显示，地下线路、车站和列车明亮显示。

#### 参数

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 表示视图模式的字符串，为 `'ground'` 或 `'underground'`。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

---

### **`setZoom(zoom)`**

设置地图的缩放级别。等同于 `jumpTo({zoom: zoom})`。

#### 参数

**`zoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 要设置的缩放级别（0–22）。

#### 返回值

[`Map`](./map.md)：返回自身，以便进行方法链式调用。

## 事件

### **`boxzoomcancel`**

当用户取消“框选缩放”交互，或边界框未达到最小尺寸阈值时触发。参阅 [BoxZoomHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler)。

**类型** [`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent)

---

### **`boxzoomend`**

当“框选缩放”交互结束时触发。参阅 [BoxZoomHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler)。

**类型** [`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent)

---

### **`boxzoomstart`**

当“框选缩放”交互开始时触发。参阅 [BoxZoomHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler)。

**类型** [`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent)

---

### **`click`**

当指针设备（通常是鼠标）在地图同一点按下并释放时触发。

**类型** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`clockmode`**

当时钟模式改变时触发。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### 属性

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)): 表示时钟模式的字符串，为 `'realtime'` 或 `'playback'`。

---

### **`contextmenu`**

当在地图内单击鼠标右键或按下上下文菜单键时触发。

**类型** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`dblclick`**

当指针设备（通常是鼠标）在地图同一点快速按下并释放两次时触发。

**类型** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`deselection`**

当取消跟踪列车或飞机，或取消选择车站时触发。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### 属性

**`deselection`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`): 取消跟踪的列车或航班 ID，或者取消选择的车站 ID 数组。列车 ID 格式为 `'<运营商 ID>.<线路 ID>.<列车编号>'`；航班 ID 格式为 `'<运营商 ID>.<机场 ID>.<航班号>'`；车站 ID 格式为 `'<运营商 ID>.<线路 ID>.<车站 ID>'`。

---

### **`drag`**

在“拖动平移”交互期间反复触发。参阅 [DragPanHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler)。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`dragend`**

当“拖动平移”交互结束时触发。参阅 [DragPanHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler)。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`dragstart`**

当“拖动平移”交互开始时触发。参阅 [DragPanHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler)。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`ecomode`**

当省电模式改变时触发。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### 属性

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)): 表示省电模式的字符串，为 `'normal'` 或 `'eco'`。

---

### **`error`**

发生错误时触发。这是 Mini Tokyo 3D 的主要错误报告机制。为更好地支持异步操作，这里使用事件而不是 `throw`。如果 `error` 事件未绑定监听器，错误会输出到控制台。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### 属性

**`message`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)): 错误消息。

---

### **`light`**

地图上设置的光源发生变化时触发，例如一天中的时间或视图模式改变时。该事件可用于使自定义图层或插件与地图光照保持同步。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### 属性

**`directional`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)): 平行光。

名称 | 说明
:-- | :--
**`directional.color`**<br>[`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)`>` | RGB 颜色，格式为 `[r, g, b]`，每个值的范围为 0–255。
**`directional.intensity`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | 颜色的相对亮度（0–1）。
**`directional.direction`**<br>[`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)`>` | 方向，以度为单位，格式为 `[方位角, 极角]`。方位角范围为 0–360，从正北方向顺时针测量（0 = 北，90 = 东）；极角范围为 0–90，从天顶开始测量（0 = 正上方，90 = 地平线）。

**`ambient`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)): 环境光。

名称 | 说明
:-- | :--
**`ambient.color`**<br>[`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)`>` | RGB 颜色，格式为 `[r, g, b]`，每个值的范围为 0–255。
**`ambient.intensity`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | 颜色的相对亮度（0–1）。

**`brightness`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)): 光源的感知亮度（0–1）。

---

### **`load`**

下载完所有必要资源并首次完成地图视觉渲染后立即触发。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

---

### **`mousedown`**

当指针设备（通常是鼠标）在地图内按下时触发。

**类型** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`mousemove`**

当光标位于地图内且指针设备（通常是鼠标）移动时触发。光标在地图上移动时，每次位置改变都会触发该事件。

**类型** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`mouseout`**

当指针设备（通常是鼠标）离开地图画布时触发。

**类型** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`mouseover`**

当指针设备（通常是鼠标）移动到地图内时触发。在包含地图的网页上移动光标时，每次进入地图或其子元素都会触发该事件。

**类型** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`mouseup`**

当指针设备（通常是鼠标）在地图内释放时触发。

**类型** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`move`**

因用户交互或 [Map#flyTo](./map.md#flyto-options) 等方法从一个视图动画过渡到另一个视图期间反复触发。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`moveend`**

因用户交互或 [Map#jumpTo](./map.md#jumpto-options) 等方法完成从一个视图到另一个视图的过渡后立即触发。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`movestart`**

因用户交互或 [Map#jumpTo](./map.md#jumpto-options) 等方法即将开始从一个视图到另一个视图的过渡时触发。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`pitch`**

因用户交互或 [Map#flyTo](./map.md#flyto-options) 等方法执行地图倾斜动画期间反复触发。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`pitchend`**

因用户交互或 [Map#flyTo](./map.md#flyto-options) 等方法完成地图倾斜角变化后立即触发。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`pitchstart`**

因用户交互或 [Map#flyTo](./map.md#flyto-options) 等方法开始改变地图倾斜角时触发。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`resize`**

地图尺寸调整完成后立即触发。

---

### **`rotate`**

在“拖动旋转”交互期间反复触发。参阅 [DragRotateHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler)。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`rotateend`**

当“拖动旋转”交互结束时触发。参阅 [DragRotateHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler)。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`rotatestart`**

当“拖动旋转”交互开始时触发。参阅 [DragRotateHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler)。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`selection`**

当开始跟踪列车或飞机，或选择车站时触发。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### 属性

**`selection`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`): 开始跟踪的列车或航班 ID，或者已选车站的 ID 数组。列车 ID 格式为 `'<运营商 ID>.<线路 ID>.<列车编号>'`；航班 ID 格式为 `'<运营商 ID>.<机场 ID>.<航班号>'`；车站 ID 格式为 `'<运营商 ID>.<线路 ID>.<车站 ID>'`。

---

### **`touchcancel`**

当地图内发生 [`touchcancel`](https://developer.mozilla.org/docs/Web/Events/touchcancel) 事件时触发。

**类型** [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent)

---

### **`touchend`**

当地图内发生 [`touchend`](https://developer.mozilla.org/docs/Web/Events/touchend) 事件时触发。

**类型** [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent)

---

### **`touchmove`**

当地图内发生 [`touchmove`](https://developer.mozilla.org/docs/Web/Events/touchmove) 事件时触发。

**类型** [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent)

---

### **`touchstart`**

当地图内发生 [`touchstart`](https://developer.mozilla.org/docs/Web/Events/touchstart) 事件时触发。

**类型** [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent)

---

### **`trackingmode`**

当跟踪模式改变时触发。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### 属性

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)): 表示跟踪模式的字符串，为 `'position'`、`'back'`、`'topback'`、`'front'`、`'topfront'`、`'helicopter'`、`'drone'` 或 `'bird'`。

::: warning 注意
跟踪模式 `'heading'` 已弃用，并会回退到 `'topback'`。
:::

---

### **`viewmode`**

当视图模式改变时触发。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### 属性

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)): 表示视图模式的字符串，为 `'ground'` 或 `'underground'`。

---

### **`wheel`**

当地图内发生 [`wheel`](https://developer.mozilla.org/docs/Web/Events/wheel) 事件时触发。

**类型** [`MapWheelEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapwheelevent)

---

### **`zoom`**

因用户交互或 [Map#flyTo](./map.md#flyto-options) 等方法从一个缩放级别动画过渡到另一个缩放级别期间反复触发。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`zoomend`**

因用户交互或 [Map#flyTo](./map.md#flyto-options) 等方法完成从一个缩放级别到另一个缩放级别的过渡后立即触发。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`zoomstart`**

因用户交互或 [Map#flyTo](./map.md#flyto-options) 等方法即将开始从一个缩放级别到另一个缩放级别的过渡时触发。

**类型** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))
