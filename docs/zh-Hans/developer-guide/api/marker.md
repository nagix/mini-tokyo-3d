# Marker

创建标记组件。

扩展自 [Evented](https://docs.mapbox.com/mapbox-gl-js/api/events/#evented)。

```js
new Marker(options: Object)
```

## 参数

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

名称 | 说明
:-- | :--
**`options.element`**<br>[`HTMLElement`](https://developer.mozilla.org/docs/Web/HTML/Element) | 用作标记的 DOM 元素。默认为浅蓝色水滴形 SVG 标记。
**`options.minZoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | 标记的最小缩放级别。缩放级别小于 `minZoom` 时，标记会隐藏。取值可以是 `0` 至 `24`（含）之间的任意数字。未提供 `minZoom` 时，标记在所有缩放级别下均可见。

## 实例成员

### **`addTo(map)`**

将 `Marker` 附加到 `Map` 对象。

#### 参数

**`map`** ([`Map`](./map.md)) 要添加标记的 Mini Tokyo 3D 地图。

#### 返回值

[`Marker`](./marker.md)：返回自身，以便进行方法链式调用。

---

### **`remove()`**

从地图中移除标记。

#### 返回值

[`Marker`](./marker.md)：返回自身，以便进行方法链式调用。

---

### **`setActivity(active)`**

设置标记的活动状态。活动状态指标记被选中并突出显示的状态。

#### 参数

**`active`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) 为 `true` 时，标记处于活动状态。

#### 返回值

[`Marker`](./marker.md)：返回自身，以便进行方法链式调用。

---

### **`setLngLat(lnglat)`**

设置标记的地理位置并将其移动到该位置。

#### 参数

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) 描述标记所在位置的 [LngLatLike](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)。

#### 返回值

[`Marker`](./marker.md)：返回自身，以便进行方法链式调用。

---

### **`setVisibility(visible)`**

设置标记的可见状态。

#### 参数

**`visible`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) 为 `true` 时，标记可见。

#### 返回值

[`Marker`](./marker.md)：返回自身，以便进行方法链式调用。

## 事件

### **`click`**

当指针设备（通常是鼠标）在标记上按下并释放时触发。

---

### **`mouseenter`**

当指针设备（通常是鼠标）进入标记时触发。

---

### **`mouseleave`**

当指针设备（通常是鼠标）离开标记时触发。
