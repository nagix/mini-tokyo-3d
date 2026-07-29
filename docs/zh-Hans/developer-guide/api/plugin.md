# PluginInterface

添加到地图的自定义插件接口。这是一份供实现者遵循的规范，并不是导出的方法或类。

开发者可以实现回调方法来自定义 Mini Tokyo 3D 地图。要添加插件，必须将实现此接口的对象设置到 [`Map`](./map.md) 构造函数选项 `plugins` 中。

自定义插件必须具有唯一的 `id`，以及 `name` 和 `iconStyle`。插件可以实现 `onAdd`、`onRemove`、`onEnabled`、`onDisabled` 和 `onVisibilityChanged`。

## 属性

### **`clockModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

插件只在此处指定的时钟模式下可见。支持 `'realtime'` 和 `'playback'`。省略时始终可见。

### **`enabled`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean))

为 `false` 时，插件添加到地图时处于禁用状态。省略时处于启用状态。

### **`iconStyle`** ([`Object`](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration))

显示在图层面板中的图标元素的内联样式。支持 [CSSStyleDeclaration](https://developer.mozilla.org/docs/Web/API/CSSStyleDeclaration) 中的所有样式属性。

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

唯一的插件 ID。

### **`name`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

插件名称。各属性的键表示语言代码，值表示相应语言的名称。如果浏览器使用的语言不在属性中，则回退到英语。

名称 | 说明
:-- | :--
**`name.de`** | 德语名称
**`name.en`** | 英语名称
**`name.es`** | 西班牙语名称
**`name.fr`** | 法语名称
**`name.ja`** | 日语名称
**`name.ko`** | 韩语名称
**`name.ne`** | 尼泊尔语名称
**`name.pt`** | 葡萄牙语名称
**`name.th`** | 泰语名称
**`name.zh-Hans`** | 简体中文名称
**`name.zh-Hant`** | 繁体中文名称

### **`searchModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

插件只在此处指定的搜索模式下可见。支持 `'none'`、`'edit'` 和 `'route'`。省略时，插件在搜索面板未显示时可见。

### **`viewModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

插件只在此处指定的视图模式下可见。支持 `'ground'` 和 `'underground'`。省略时始终可见。

## 实例成员

### **`onAdd(map)`**

插件添加到 Map 时调用的可选方法。插件可以借此初始化资源并注册事件监听器。

#### 参数

**`map`** ([`Map`](./map.md)) 刚刚添加此插件的 Mini Tokyo 3D Map。

---

### **`onDisabled()`**

用户禁用插件时调用的可选方法。插件可以借此清理显示元素。

---

### **`onEnabled()`**

用户启用插件时调用的可选方法。插件可以借此初始化显示元素。

---

### **`onRemove(map)`**

插件从 Map 中移除时调用的可选方法。插件可以借此清理资源和事件监听器。

#### 参数

**`map`** ([`Map`](./map.md)) 刚刚移除此插件的 Mini Tokyo 3D Map。

---

### **`onVisibilityChanged(visible)`**

插件可见性发生变化时调用的可选方法，例如地图显示模式改变时。插件可以借此改变显示元素的可见性。

#### 参数

**`visible`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) 为 `true` 表示插件处于可见状态。
