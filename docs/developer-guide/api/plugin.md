# PluginInterface

Interface for custom plugins added to the map. This is a specification for implementers to model: it is not an exported method or class.

Developers can implement callback methods to customize the Mini Tokyo 3D map. In order to add plugins, the objects that implement this interface have to be set to the [`Map`](./map.md) constructor option `plugins`.

Custom plugins must have a unique `id`, and must have the `name` and `iconStyle`. They may implement `onAdd`, `onRemove`, `onEnabled`, `onDisabled` and `onVisibilityChanged`.

## Properties

### **`clockModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

The plugin will be visible only in the clock modes specified here. `'realtime'` and `'playback'` are supported. If not specified, it will be always visible.

### **`enabled`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean))

If `false`, the plugin will be disabled when it is added to the map. If not specified, it will be enabled.

### **`iconStyle`** ([`Object`](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration))

The inline style of the icon element that appears in the layer panel. All the style properties contained in the [CSSStyleDeclaration](https://developer.mozilla.org/docs/Web/API/CSSStyleDeclaration) are supported.

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

A unique plugin id.

### **`name`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

The name of the plugin. The key of each property indicates the language code and its value indicates the name in that language. If the language used in a browser is not included in the properties, it falls back to English.

Name | Description
:-- | :--
**`name.en`** | Name in English
**`name.ja`** | Name in Japanese
**`name.ko`** | Name in Korean
**`name.ne`** | Name in Nepali
**`name.th`** | Name in Thai
**`name.zh-Hans`** | Name in Simplified Chinese
**`name.zh-Hant`** | Name in Traditional Chinese

### **`searchModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

The plugin will be visible only in the search modes specified here. `'none'`, `'edit'` and `'route'` are supported. If not specified, it will be visible when the search panel is not displayed.

### **`viewModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

The plugin will be visible only in the view modes specified here. `'ground'` and `'underground'` are supported. If not specified, it will be always visible.

## Instance Members

### **`onAdd(map)`**

Optional method called when the plugin has been added to the Map. This gives the plugin a chance to initialize resources and register event listeners.

#### Parameters

**`map`** ([`Map`](./map.md)) The Mini Tokyo 3D Map this plugin was just added to.

---

### **`onRemove(map)`**

Optional method called when the plugin has been removed from the Map. This gives the plugin a chance to clean up resources and event listeners.

#### Parameters

**`map`** ([`Map`](./map.md)) The Mini Tokyo 3D Map this plugin was just removed from.

---

### **`onEnabled()`**

Optional method called when the plugin has been enabled by users. This gives the plugin a chance to initialize the display elements.

---

### **`onDisabled()`**

Optional method called when the plugin has been disabled by users. This gives the plugin a chance to clean up the display elements.

---

### **`onVisibilityChanged(visible)`**

Optional method called when the visibility of the plugin has been changed, such as when the display mode of the map is changed. This gives the plugin a chance to change the visibility of the display elements.

#### Parameters

**`visible`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) `true` indicates that the plugin is in the visible state.
