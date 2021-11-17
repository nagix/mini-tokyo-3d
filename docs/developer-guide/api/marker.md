# Marker

Creates a marker component.

Extends [Evented](https://docs.mapbox.com/mapbox-gl-js/api/events/#evented).

```js
new Marker(options: Object)
```

## Parameters

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Name | Description
:-- | :--
**`options.element`**<br>[`HTMLElement`](https://developer.mozilla.org/docs/Web/HTML/Element) | DOM element to use as a marker. The default is a light blue, droplet-shaped SVG marker.

## Instance Members

### **`addTo(map)`**

Attaches the `Marker` to a `Map` object.

#### Parameters

**`map`** ([`Map`](./map.md)) The Mini Tokyo 3D map to add the marker to.

#### Returns

[`Marker`](./marker.md): Returns itself to allow for method chaining.

---

### **`remove()`**

Removes the marker from a map.

#### Returns

[`Marker`](./marker.md): Returns itself to allow for method chaining.

---

### **`setLngLat(lnglat)`**

Sets the marker's geographical position and move the marker to it.

#### Parameters

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) A [LngLatLike](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike) describing where the marker should be located.

#### Returns

[`Marker`](./marker.md): Returns itself to allow for method chaining.

---

### **`setActivity(active)`**

Sets the marker's activity state. Active status refers to the state where the marker is selected and highlighted.

#### Parameters

**`active`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) If `true`, the marker is active.

#### Returns

[`Marker`](./marker.md): Returns itself to allow for method chaining.

---

### **`setVisibility(visible)`**

Sets the marker's visibility state.

#### Parameters

**`visible`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) If `true`, the marker is visible.

#### Returns

[`Marker`](./marker.md): Returns itself to allow for method chaining.

## Events

### **`click`**

Fired when a pointing device (usually a mouse) is pressed and released on the marker.

---

### **`mouseenter`**

Fired when a pointing device (usually a mouse) enters the marker.

---

### **`mouseleave`**

Fired when a pointing device (usually a mouse) leaves the marker.
