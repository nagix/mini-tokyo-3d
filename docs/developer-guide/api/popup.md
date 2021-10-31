# Popup

A popup component.

Extends [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object).

```js
new Popup()
```

## Instance Members

### **`addTo(map)`**

Adds the popup to a map.

#### Parameters

**`map`** ([`Map`](./map.md)) The Mini Tokyo 3D map to add the popup to.

#### Returns

[`Popup`](./popup.md): Returns itself to allow for method chaining.

---

### **`remove()`**

Removes the popup from the map it has been added to.

#### Returns

[`Popup`](./popup.md): Returns itself to allow for method chaining.

---

### **`setLngLat(lnglat)`**

Sets the geographical location of the popup's anchor, and moves the popup to it.

#### Parameters

**`lnglat`** ([`LngLat`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglat)) The geographical location to set as the popup's anchor.

#### Returns

[`Popup`](./popup.md): Returns itself to allow for method chaining.

---

### **`setHTML(html)`**

Sets the popup's content to the HTML provided as a string.

This method does not perform HTML filtering or sanitization, and must be used only with trusted content.

#### Parameters

**`html`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) A string representing HTML content for the popup.

#### Returns

[`Popup`](./popup.md): Returns itself to allow for method chaining.
