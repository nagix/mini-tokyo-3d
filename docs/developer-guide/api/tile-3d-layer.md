# Tile3DLayerInterface

Interface for layers that render 3D tiles data formatted according to the [3D Tiles Specification](https://www.opengeospatial.org/standards/3DTiles). This is a specification for implementers to model: it is not an exported method or class.

3D tile layers are rendered using [Tile3DLayer](https://deck.gl/docs/api-reference/geo-layers/tile-3d-layer) in [deck.gl](https://deck.gl). It allows a developer to overlay photogrammetry, 3D buildings, BIM/CAD and point clouds on a map by specifying the 3D tiles data and rendering options. These layers can be added to the map using [Map#addLayer](./map.md#addlayer-layer).

3D tile layers must have a unique `id` and must have the `type` of `'tile-3d'`.

## Properties

In addition to the following properties, all properties of [Tile3DLayer](https://deck.gl/docs/api-reference/geo-layers/tile-3d-layer) in deck.gl are supported.

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

A unique layer id.

### **`lightColor`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)`>`)

A color of the lights. It is an array of red, green, and blue components, each with any number between `0` and `255`. If not specified, the dynamic light color based on the current date and time will be used.

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

The maximum zoom level for the layer. At zoom levels equal to or greater than the maxzoom, the layer will be hidden. The value can be any number between `0` and `24` (inclusive). If no maxzoom is provided, the layer will be visible at all zoom levels.

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

The minimum zoom level for the layer. At zoom levels less than the minzoom, the layer will be hidden. The value can be any number between `0` and `24` (inclusive). If no minzoom is provided, the layer will be visible at all zoom levels.

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

The layer's type. Must be `'tile-3d'`.

## Example

```js
map.addLayer({
	id: `tile-3d-plateau`,
	type: 'tile-3d',
	data: `https://plateau.geospatial.jp/main/data/3d-tiles/bldg/13100_tokyo/13101_chiyoda-ku/low_resolution/tileset.json`,
	opacity: 0.8
});
```
