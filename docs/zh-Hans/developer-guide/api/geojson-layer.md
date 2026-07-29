# GeoJsonLayerInterface

用于渲染 [GeoJSON](http://geojson.org) 数据的图层接口。这是一份供实现者遵循的规范，并不是导出的方法或类。

GeoJSON 图层使用 [deck.gl](https://deck.gl) 中的 [GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer) 渲染。开发者可以通过指定 GeoJSON 数据和渲染选项，在地图上叠加多边形、折线和点（包括圆形、图标和文本）。可以使用 [Map#addLayer](./map.md#addlayer-layer) 将这些图层添加到地图。

GeoJSON 图层必须具有唯一的 `id`，且 `type` 必须为 `'geojson'`。

## 属性

除以下属性外，还支持 deck.gl [GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer) 的所有属性。

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

图层的唯一 ID。

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

图层的最大缩放级别。当缩放级别大于或等于 `maxzoom` 时，图层会隐藏。取值可以是 `0` 至 `24`（含）之间的任意数字。未提供 `maxzoom` 时，图层在所有缩放级别下均可见。

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

图层的最小缩放级别。当缩放级别小于 `minzoom` 时，图层会隐藏。取值可以是 `0` 至 `24`（含）之间的任意数字。未提供 `minzoom` 时，图层在所有缩放级别下均可见。

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

图层类型。必须为 `'geojson'`。

## 示例

```js
const geojson = {
	'type': 'FeatureCollection',
	'features': [{
		'type': 'Feature',
		'geometry': {
			'type': 'LineString',
			'properties': {
				'type': 0
			},
			'coordinates': [
				[-77.0366048, 38.8987317],
				[-77.0336437, 38.8987651],
				[-77.0336437, 38.8954919]
			]
		}
	}, {
		'type': 'Feature',
		'geometry': {
			'type': 'LineString',
			'properties': {
				'type': 1
			},
			'coordinates': [
				[-77.0083236, 38.8914336],
				[-77.0081841, 38.8908240],
				[-77.0081520, 38.8898971]
			]
		}
	}]
};
const colors = [[255, 0, 0], [0, 0, 255]];

map.addLayer({
	id: 'geojson-lines',
	type: 'geojson',
	data: geojson,
	filled: false,
	getLineWidth: 4,
	getLineColor: d => colors[d.properties.type],
	opacity: 0.7,
	minzoom: 10,
	maxzoom: 22
});
```
