# Tile3DLayerInterface

用于渲染符合 [3D Tiles 规范](https://www.opengeospatial.org/standards/3DTiles)的数据的图层接口。这是一份供实现者遵循的规范，并不是导出的方法或类。

3D 瓦片图层使用 [deck.gl](https://deck.gl) 中的 [Tile3DLayer](https://deck.gl/docs/api-reference/geo-layers/tile-3d-layer) 渲染。开发者可以通过指定 3D Tiles 数据和渲染选项，在地图上叠加摄影测量模型、3D 建筑、BIM/CAD 和点云。可以使用 [Map#addLayer](./map.md#addlayer-layer) 将这些图层添加到地图。

3D 瓦片图层必须具有唯一的 `id`，且 `type` 必须为 `'tile-3d'`。

## 属性

除以下属性外，还支持 deck.gl [Tile3DLayer](https://deck.gl/docs/api-reference/geo-layers/tile-3d-layer) 的所有属性。

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

图层的唯一 ID。

### **`lightColor`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)`>`)

光源颜色。它是由红、绿、蓝分量组成的数组，每个分量可以是 `0` 至 `255` 之间的任意数字。省略时使用根据当前日期和时间计算的动态光源颜色。可以通过 [`light`](./map.md#light) 事件或 [`Map#getLight`](./map.md#getlight) 获取当前的动态光源。

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

图层的最大缩放级别。当缩放级别大于或等于 `maxzoom` 时，图层会隐藏。取值可以是 `0` 至 `24`（含）之间的任意数字。未提供 `maxzoom` 时，图层在所有缩放级别下均可见。

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

图层的最小缩放级别。当缩放级别小于 `minzoom` 时，图层会隐藏。取值可以是 `0` 至 `24`（含）之间的任意数字。未提供 `minzoom` 时，图层在所有缩放级别下均可见。

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

图层类型。必须为 `'tile-3d'`。

## 示例

```js
map.addLayer({
	id: `tile-3d-plateau`,
	type: 'tile-3d',
	data: `https://plateau.geospatial.jp/main/data/3d-tiles/bldg/13100_tokyo/13101_chiyoda-ku/low_resolution/tileset.json`,
	opacity: 0.8
});
```
