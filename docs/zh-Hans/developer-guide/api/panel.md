# Panel

创建面板组件。

扩展自 [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)。

```js
new Panel(options: Object)
```

## 参数

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

名称 | 说明
:-- | :--
**`options.modal`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean) | 为 `true` 时，面板采用模态方式，并会在用户单击面板外区域时关闭。

## 实例成员

### **`addTo(map)`**

将面板添加到地图。

#### 参数

**`map`** ([`Map`](./map.md)) 要添加面板的 Mini Tokyo 3D 地图。

#### 返回值

[`Panel`](./panel.md)：返回自身，以便进行方法链式调用。

---

### **`isOpen()`**

检查面板是否处于打开状态。

#### 返回值

[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)：面板打开时为 `true`，关闭时为 `false`。

---

### **`remove()`**

从地图中移除面板。

#### 返回值

[`Panel`](./panel.md)：返回自身，以便进行方法链式调用。

---

### **`setButtons(buttons)`**

设置面板标题栏上的按钮。

#### 参数

**`buttons`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`HTMLElement`](https://developer.mozilla.org/docs/Web/HTML/Element)`>`) 用作面板标题栏按钮的 DOM 元素数组。

#### 返回值

[`Panel`](./panel.md)：返回自身，以便进行方法链式调用。

---

### **`setHTML(html)`**

使用字符串形式的 HTML 设置面板内容。

此方法不会过滤或净化 HTML，只能用于可信内容。

#### 参数

**`html`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 表示面板 HTML 内容的字符串。

#### 返回值

[`Panel`](./panel.md)：返回自身，以便进行方法链式调用。

---

### **`setTitle(title)`**

使用文本字符串设置面板标题。

#### 参数

**`title`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 面板标题。

#### 返回值

[`Panel`](./panel.md)：返回自身，以便进行方法链式调用。
