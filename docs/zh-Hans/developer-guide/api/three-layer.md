# ThreeLayerInterface

自定义 three.js 图层接口。这是一份供实现者遵循的规范，并不是导出的方法或类。

自定义 three.js 图层包含一个 [three.js](https://threejs.org/docs/) 场景。开发者可以使用地图相机，直接在地图的 GL 上下文中渲染 three.js 对象。可以使用 [Map#addLayer](./map.md#addlayer-layer) 将这些图层添加到地图。

自定义 three.js 图层必须具有唯一的 `id`，且 `type` 必须为 `'three'`。图层可以实现 `onAdd` 和 `onRemove`。

## 属性

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

图层的唯一 ID。

### **`lightColor`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | [`Color`](https://threejs.org/docs/#api/en/math/Color) | [`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

光源颜色。可以是十六进制颜色、three.js [Color](https://threejs.org/docs/#api/en/math/Color) 实例或 CSS 样式字符串。省略时使用根据当前日期和时间计算的动态光源颜色。

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

图层的最大缩放级别。当缩放级别大于或等于 `maxzoom` 时，图层会隐藏。取值可以是 `0` 至 `24`（含）之间的任意数字。未提供 `maxzoom` 时，图层在所有缩放级别下均可见。

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

图层的最小缩放级别。当缩放级别小于 `minzoom` 时，图层会隐藏。取值可以是 `0` 至 `24`（含）之间的任意数字。未提供 `minzoom` 时，图层在所有缩放级别下均可见。

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

图层类型。必须为 `'three'`。

## 实例成员

### **`onAdd(map, context)`**

通过 [Map#addLayer](./map.md#addlayer-layer) 将图层添加到 Map 时调用的可选方法。图层可以借此初始化 three.js 资源并注册事件监听器。

#### 参数

**`map`** ([`Map`](./map.md)) 刚刚添加此图层的 Mini Tokyo 3D Map。

**`context`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) 此图层包含的 three.js 渲染器、场景和相机。

名称 | 说明
:-- | :--
**`context.camera`**<br>[`PerspectiveCamera`](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera) | 相机对象。
**`context.renderer`**<br>[`WebGLRenderer`](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) | 渲染器对象。
**`context.scene`**<br>[`Scene`](https://threejs.org/docs/#api/en/scenes/Scene) | 场景对象。

---

### **`onRemove(map, context)`**

通过 [Map#removeLayer](./map.md#removelayer-id) 从 Map 中移除图层时调用的可选方法。图层可以借此清理 three.js 资源和事件监听器。

#### 参数

**`map`** ([`Map`](./map.md)) 刚刚移除此图层的 Mini Tokyo 3D Map。

**`context`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) 此图层包含的 three.js 渲染器、场景和相机。

名称 | 说明
:-- | :--
**`context.camera`**<br>[`PerspectiveCamera`](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera) | 相机对象。
**`context.renderer`**<br>[`WebGLRenderer`](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) | 渲染器对象。
**`context.scene`**<br>[`Scene`](https://threejs.org/docs/#api/en/scenes/Scene) | 场景对象。
