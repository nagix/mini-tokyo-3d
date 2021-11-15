# THREE

`THREE` is the object with all classes, objects, properties included in the [three.js](https://threejs.org/docs/) core library, and [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader). It is used as the namespace for the three.js core library.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Properties

For more information, see [three.js docs](https://threejs.org/docs/).

## Example

```js
// A callback in ThreeLayerInterface
onAdd(map, context) {
	const {x, y, z} = map.getModelPosition([139.7143859, 35.6778094]);
	const scale = map.getModelScale();
	const geometry = new mt3d.THREE.BoxGeometry(10, 10, 10);
	const material = new mt3d.THREE.MeshBasicMaterial({color: 0xffff00});
	const mesh = new mt3d.THREE.Mesh(geometry, material);
	mesh.position = new mt3d.THREE.Vector3(x, y, z);
	mesh.scale = new mt3d.THREE.Vector3(scale, scale, scale);
	context.scene.add(mesh);
}
```
