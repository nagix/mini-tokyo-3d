# THREE

`THREE` 是包含 [three.js](https://threejs.org/docs/) 核心库及 [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) 中所有类、对象和属性的对象，用作 three.js 核心库的命名空间。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## 属性

更多信息请参阅 [three.js 文档](https://threejs.org/docs/)。

## 示例

```js
// ThreeLayerInterface 中的回调
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
