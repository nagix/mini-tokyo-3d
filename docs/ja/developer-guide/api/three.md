# THREE

`THREE` は [three.js](https://threejs.org/docs/) コアライブラリに含まれる全てのクラス、オブジェクト、プロパティ、および [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) を持つオブジェクトです。three.js コアライブラリの名前空間として利用されます。

**型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## プロパティ

詳細は、[three.js docs](https://threejs.org/docs/) を参照してください。

## 例

```js
// ThreeLayerInterface の中のコールバック
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
