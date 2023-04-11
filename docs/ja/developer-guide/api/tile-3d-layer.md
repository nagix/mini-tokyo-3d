# Tile3DLayerInterface

[3D Tiles 仕様](https://www.ogc.org/standard/3dtiles/) に基づく形式の 3D タイルデータを描画するレイヤーのインターフェースです。これは実装者がモデル化するための仕様であり、エクスポートされたメソッドやクラスではありません。

3D タイルレイヤーは、[deck.gl](https://deck.gl) の [Tile3DLayer](https://deck.gl/docs/api-reference/geo-layers/tile-3d-layer) を使用して描画されます。開発者は、3D タイルデータと描画方法を指定することで、フォトグラメトリや 3D ビルディング、BIM/CAD、点群をマップ上に重ねて表示することができます。このレイヤーは [Map#addLayer](./map.md#addlayer-layer) を使ってマップに追加できます。

3D タイルレイヤーは、一意の `id` を持ち、`type` が `'tile-3d'` である必要があります。

## プロパティ

以下のプロパティに加えて、deck.gl の [Tile3DLayer](https://deck.gl/docs/api-reference/geo-layers/tile-3d-layer) が持つすべてのプロパティに対応します。

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

固有のレイヤー ID です。

### **`lightColor`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)`>`)

ライトの色です。赤、緑、青の各成分を表す配列で、それぞれの値は `0` から `255` の間の任意の数値です。指定しない場合は、現在の日時に基づいた動的なライトの色が使用されます。

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

レイヤーの最大ズームレベルです。maxzoom 以上のズームレベルでは、レイヤーは非表示になります。値は `0` から `24`（これを含む）までの任意の数値です。maxzoom が指定されていない場合は、レイヤーはすべてのズームレベルで表示されます。

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

レイヤーの最小のズームレベルです。minzoom 未満のズームレベルでは、レイヤーは非表示になります。値は `0` から `24`（これを含む）の間の任意の数値です。minzoom が指定されていない場合は、レイヤーはすべてのズームレベルで表示されます。

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

レイヤーのタイプです。必ず `'tile-3d'` と指定してください。

## 例

```js
map.addLayer({
	id: `tile-3d-plateau`,
	type: 'tile-3d',
	data: `https://plateau.geospatial.jp/main/data/3d-tiles/bldg/13100_tokyo/13101_chiyoda-ku/low_resolution/tileset.json`,
	opacity: 0.8
});
```
