# GeoJsonLayerInterface

Interface pour les couches qui restituent les données [GeoJSON](http://geojson.org). Il s'agit d'une spécification à modéliser par les implémenteurs : il ne s'agit pas d'une méthode ou d'une classe exportée.

Les couches GeoJSON sont rendues à l'aide de [GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer) dans [deck.gl](https://deck.gl). Il permet à un développeur de superposer des polygones, des polylignes et des points (y compris des cercles, des icônes et des textes) sur une carte en spécifiant les données GeoJSON et les options de rendu. Ces couches peuvent être ajoutées à la carte en utilisant [Map#addLayer](./map.md#addlayer-layer).

Les couches GeoJSON doivent avoir un `id` unique et doivent avoir le `type` de `'geojson'`.

## Propriétés

En plus des propriétés suivantes, toutes les propriétés de [GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer) dans deck.gl sont prises en charge.

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Un identifiant de couche unique.

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

Le niveau de zoom maximum pour le calque. À des niveaux de zoom égaux ou supérieurs au zoom maximum, le calque sera masqué. La valeur peut être n'importe quel nombre compris entre `0` et `24` (inclus). Si aucun zoom maximum n'est fourni, le calque sera visible à tous les niveaux de zoom.

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

Le niveau de zoom minimum pour le calque. À des niveaux de zoom inférieurs au minzoom, le calque sera masqué. La valeur peut être n’importe quel nombre compris entre `0` et `24` (inclus). Si aucun minzoom n'est fourni, le calque sera visible à tous les niveaux de zoom.

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Le type du calque. Doit être `'geojson'`.

## Exemple

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