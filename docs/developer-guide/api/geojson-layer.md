# GeoJsonLayerInterface

Interface for layers that render [GeoJSON](http://geojson.org) data. This is a specification for implementers to model: it is not an exported method or class.

GeoJSON layers are rendered using [GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer) in [deck.gl](https://deck.gl). It allows a developer to overlay polygons, polylines and points (including circles, icons and texts) on a map by specifying the GeoJSON data and rendering options. These layers can be added to the map using [Map#addLayer](./map.md#addlayer-layer).

GeoJSON layers must have a unique `id` and must have the `type` of `'geojson'`.

## Properties

In addition to the following properties, all properties of [GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer) in deck.gl are supported.

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

A unique layer id.

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

The maximum zoom level for the layer. At zoom levels equal to or greater than the maxzoom, the layer will be hidden. The value can be any number between `0` and `24` (inclusive). If no maxzoom is provided, the layer will be visible at all zoom levels.

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

The minimum zoom level for the layer. At zoom levels less than the minzoom, the layer will be hidden. The value can be any number between `0` and `24` (inclusive). If no minzoom is provided, the layer will be visible at all zoom levels.

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

The layer's type. Must be `'geojson'`.

## Example

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
