# Popup

弹出窗口组件。

扩展自 [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)。

```js
new Popup()
```

## 实例成员

### **`addTo(map)`**

将弹出窗口添加到地图。

#### 参数

**`map`** ([`Map`](./map.md)) 要添加弹出窗口的 Mini Tokyo 3D 地图。

#### 返回值

[`Popup`](./popup.md)：返回自身，以便进行方法链式调用。

---

### **`remove()`**

从弹出窗口所在的地图中将其移除。

#### 返回值

[`Popup`](./popup.md)：返回自身，以便进行方法链式调用。

---

### **`setHTML(html)`**

使用字符串形式的 HTML 设置弹出窗口内容。

此方法不会过滤或净化 HTML，只能用于可信内容。

#### 参数

**`html`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 表示弹出窗口 HTML 内容的字符串。

#### 返回值

[`Popup`](./popup.md)：返回自身，以便进行方法链式调用。

---

### **`setLngLat(lnglat)`**

设置弹出窗口锚点的地理位置，并将弹出窗口移动到该位置。

#### 参数

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) 要设置为弹出窗口锚点的地理位置。

#### 返回值

[`Popup`](./popup.md)：返回自身，以便进行方法链式调用。
