# GeoJsonLayerInterface

[GeoJSON](http://geojson.org) データを描画するレイヤーのインターフェースです。これは実装者がモデル化するための仕様であり、エクスポートされたメソッドやクラスではありません。

GeoJSON レイヤーは、[deck.gl](https://deck.gl) の [GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer) を使用して描画されます。開発者は、GeoJSON データと描画方法を指定することで、ポリゴンや折れ線、点（円やアイコン、テキストを含む）をマップ上に重ねて表示することができます。このレイヤーは [Map#addLayer](./map.md#addlayer-layer) を使ってマップに追加できます。

GeoJSON レイヤーは、一意の `id` を持ち、`type` が `'geojson'` である必要があります。

## プロパティ

以下のプロパティに加えて、deck.gl の [GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer) が持つすべてのプロパティに対応します。

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

固有のレイヤー ID です。

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

レイヤーの最大ズームレベルです。maxzoom 以上のズームレベルでは、レイヤーは非表示になります。値は `0` から `24`（これを含む）までの任意の数値です。maxzoom が指定されていない場合は、レイヤーはすべてのズームレベルで表示されます。

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

レイヤーの最小のズームレベルです。minzoom 未満のズームレベルでは、レイヤーは非表示になります。値は `0` から `24`（これを含む）の間の任意の数値です。minzoom が指定されていない場合は、レイヤーはすべてのズームレベルで表示されます。

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

レイヤーのタイプです。必ず `'geojson'` と指定してください。

## 例

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
