# THREE

`THREE` est l'objet avec toutes les classes, objets et propriétés inclus dans la bibliothèque principale [three.js](https://threejs.org/docs/) et [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader). Il est utilisé comme espace de noms pour la bibliothèque principale three.js.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Propriétés

Pour plus d’informations, consultez [three.js docs](https://threejs.org/docs/).

## Exemple

```js
// A callback in ThreeLayerInterface
onAdd(map, context) {
	const {x, y, z} = map.getModelPosition([139.7143859, 35.6778094]);
	const scale = map.getModelScale();
	const geometry = new mt3d.THREE.BoxGeometry(10, 10, 10);
	const material = new mt3d.THREE.MeshBasicMaterial({color: 0xffff00});
	const mesh = new mt3d.THREE.Mesh(geometry, material);
	mesh.position = new mt3d.THREE.Vector3(x, y, z);
	mesh.scale = new mt3d.THREE.Vector3().setScalar(scale);
	context.scene.add(mesh);
}
```