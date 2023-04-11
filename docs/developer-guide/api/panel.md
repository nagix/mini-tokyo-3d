# Panel

Creates a panel component.

Extends [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object).

```js
new Panel(options: Object)
```

## Parameters

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Name | Description
:-- | :--
**`options.modal`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean) | If `true`, the panel will be modal and will close if the user clicks outside.

## Instance Members

### **`addTo(map)`**

Adds the panel to a map.

#### Parameters

**`map`** ([`Map`](./map.md)) The Mini Tokyo 3D map to add the panel to.

#### Returns

[`Panel`](./panel.md): Returns itself to allow for method chaining.

---

### **`isOpen()`**

Checks if a panel is open.

#### Returns

[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean): `true` if the panel is open, `false` if it is closed.

---

### **`remove()`**

Removes the panel from a map.

#### Returns

[`Panel`](./panel.md): Returns itself to allow for method chaining.

---

### **`setButtons(buttons)`**

Sets buttons on the panel's title.

#### Parameters

**`buttons`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`HTMLElement`](https://developer.mozilla.org/docs/Web/HTML/Element)`>`) An array of DOM elements to use as buttons on the title of the panel.

#### Returns

[`Panel`](./panel.md): Returns itself to allow for method chaining.

---

### **`setHTML(html)`**

Sets the panel's content to the HTML provided as a string.

This method does not perform HTML filtering or sanitization, and must be used only with trusted content.

#### Parameters

**`html`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) A string representing HTML content for the panel.

#### Returns

[`Panel`](./panel.md): Returns itself to allow for method chaining.

---

### **`setTitle(title)`**

Sets the panel's title to a string of text.

#### Parameters

**`title`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) The title of the panel.

#### Returns

[`Panel`](./panel.md): Returns itself to allow for method chaining.
