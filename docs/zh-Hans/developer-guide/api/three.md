# THREE

`THREE` 是包含 [three.js](https://threejs.org/docs/) 核心库及 [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) 中所有类、对象和属性的对象，用作 three.js 核心库的命名空间。

::: warning 注意
Mini Tokyo 3D 各版本捆绑的 three.js 版本可能会发生变化。自定义 three.js 图层和插件应使用 `mt3d.THREE`，而不是自行捆绑另一份 three.js；升级时还应确认其与捆绑版本的兼容性。
:::

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
	mesh.position.set(x, y, z);
	mesh.scale.setScalar(scale);
	context.scene.add(mesh);
}
```
