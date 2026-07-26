# THREE

`THREE` est l'objet avec toutes les classes, objets et propriétés inclus dans la bibliothèque principale [three.js](https://threejs.org/docs/) et [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader). Il est utilisé comme espace de noms pour la bibliothèque principale three.js.

::: warning Avertissement
La version de three.js incluse peut changer d'une version de Mini Tokyo 3D à l'autre. Les couches three.js personnalisées et les plugins doivent utiliser `mt3d.THREE` au lieu d'inclure leur propre copie, et vérifier la compatibilité avec la version incluse lors d'une mise à niveau.
:::

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Propriétés

Pour plus d’informations, consultez [three.js docs](https://threejs.org/docs/).

## Exemple

```js
// Un callback dans ThreeLayerInterface
onAdd(map, context) {
	const {x, y, z} = map.getModelPosition([139.7143859, 35.6778094]);
	const scale = map.getModelScale();
	const geometry = new mt3d.THREE.BoxGeometry(10, 10, 10);
	const material = new mt3d.THREE.MeshBasicMaterial({color: 0xffff00});
	const mesh = new mt3d.THREE.Mesh(geometry, material);
	mesh.position.set(x, y, z);
	mesh.scale.setScalar(scale);
	context.scene.add(mesh);
}
```