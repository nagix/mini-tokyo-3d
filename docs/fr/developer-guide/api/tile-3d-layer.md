# Tile3DLayerInterface

Interface pour les couches qui restituent les données de tuiles 3D formatées selon le [3D Tiles Specification](https://www.opengeospatial.org/standards/3DTiles). Il s'agit d'une spécification à modéliser par les implémenteurs : il ne s'agit pas d'une méthode ou d'une classe exportée.

Les couches de tuiles 3D sont rendues à l'aide de [Tile3DLayer](https://deck.gl/docs/api-reference/geo-layers/tile-3d-layer) dans [deck.gl](https://deck.gl). Il permet à un développeur de superposer la photogrammétrie, les bâtiments 3D, le BIM/CAD et les nuages ​​de points sur une carte en spécifiant les données des tuiles 3D et les options de rendu. Ces couches peuvent être ajoutées à la carte en utilisant [Map#addLayer](./map.md#addlayer-layer).

Les couches de tuiles 3D doivent avoir un `id` unique et doivent avoir le `type` de `'tile-3d'`.

## Propriétés

En plus des propriétés suivantes, toutes les propriétés de [Tile3DLayer](https://deck.gl/docs/api-reference/geo-layers/tile-3d-layer) dans deck.gl sont prises en charge.

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Un identifiant de couche unique.

### **`lightColor`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)`>`)

Une couleur de lumières. Il s'agit d'un tableau de composants rouges, verts et bleus, chacun portant un nombre compris entre `0` et `255`. Si elle n’est pas spécifiée, la couleur de lumière dynamique basée sur la date et l’heure actuelles sera utilisée.

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

Le niveau de zoom maximum pour la couche. À des niveaux de zoom égaux ou supérieurs au zoom maximum, la couche sera masqué. La valeur peut être n’importe quel nombre compris entre `0` et `24` (inclus). Si aucun zoom maximum n'est fourni, la couche sera visible à tous les niveaux de zoom.

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

Le niveau de zoom minimum pour la couche. À des niveaux de zoom inférieurs au minzoom, la couche sera masqué. La valeur peut être n'importe quel nombre compris entre `0` et `24` (inclus). Si aucun minzoom n'est fourni, la couche sera visible à tous les niveaux de zoom.

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Le type de la couche. Doit être `'tile-3d'`.

## Exemple

```js
map.addLayer({
	id: `tile-3d-plateau`,
	type: 'tile-3d',
	data: `https://plateau.geospatial.jp/main/data/3d-tiles/bldg/13100_tokyo/13101_chiyoda-ku/low_resolution/tileset.json`,
	opacity: 0.8
});
```