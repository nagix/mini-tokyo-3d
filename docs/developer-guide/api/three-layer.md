# ThreeLayer

A custom style layer that contains a three.js scene. This allows a user to render three.js objects directly into the map's GL context using the map's camera. This layer can be added to the map using [Map#addLayer](./map.md#addlayer-layer).

## Parameters

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Name | Description
:-- | :--
**`options.id`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | A unique layer id.
**`options.manzoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | The maximum zoom level for the layer. At zoom levels equal to or greater than the maxzoom, the layer will be hidden. The value can be any number between `0` and `24` (inclusive). If no maxzoom is provided, the layer will be visible at all zoom levels.
**`options.minzoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | The minimum zoom level for the layer. At zoom levels less than the minzoom, the layer will be hidden. The value can be any number between `0` and `24` (inclusive). If no minzoom is provided, the layer will be visible at all zoom levels.

## Instance Members

### **`onAdd(map)`**

Optional method called when the layer has been added to the Map with [Map#addLayer](./map.md#addlayer-layer). This gives the layer a chance to initialize three.js resources and register event listeners.

#### Parameters

**`map`** ([`Map`](./map.md)) The Mini Tokyo 3D Map this layer was just added to.

### **`onRemove(map)`**

Optional method called when the layer has been removed from the Map with [Map#removeLayer](./map.md#removelayer-id). This gives the layer a chance to clean up three.js resources and event listeners.

#### Parameters

**`map`** ([`Map`](./map.md)) The Mini Tokyo 3D Map this layer was just removed from.

---

### **`add(object)`**

Adds three.js object to the scene. The position and scale of the object are expressed in spherical mercator coordinates with Tokyo Station as the origin.

#### Parameters

**`object`** ([`Object3D`](https://threejs.org/docs/#api/en/core/Object3D)) three.js object to add.

#### Returns

[`ThreeLayer`](./three-layer.md): Returns itself to allow for method chaining.

---

### **`remove(object)`**

Removes three.js object from the scene. 

#### Parameters

**`object`** ([`Object3D`](https://threejs.org/docs/#api/en/core/Object3D)) three.js object to remove.

#### Returns

[`ThreeLayer`](./three-layer.md): Returns itself to allow for method chaining.

---

### **`getModelOrigin()`**

Returns a `MercatorCoordinate` object that represents the position of Tokyo Station as the origin of the mercator coordinates.

#### Returns

[`MercatorCoordinate`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#mercatorcoordinate): The origin of the mercator coordinates.

---

### **`getModelScale()`**

Returns the scale to transform into `MercatorCoordinate` from coordinates in real world units using meters. This provides the distance of 1 meter in `MercatorCoordinate` units at Tokyo Station.

#### Returns

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): The scale to transform into `MercatorCoordinate` from coordinates in real world units using meters.

---

### **`getModelPosition(lnglat, altitude)`**

Projects a `LngLat` to a `MercatorCoordinate`, and returns the translated mercator coordinates with Tokyo Station as the origin.

#### Parameters

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) The location to project.

**`altitude`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) The altitude in meters of the position.

#### Returns

{x: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), y: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), z: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)}: The translated mercator coordinates with Tokyo Station as the origin.

---

### **`project(lnglat, altitude)`**

Returns a [Point](https://docs.mapbox.com/mapbox-gl-js/api/geography/#point) representing pixel coordinates, relative to the map's `container`, that correspond to the specified geographical location.

#### Parameters

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) The geographical location to project.

**`altitude`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) The altitude in meters of the position.

#### Returns

[`Point`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#point): The [Point](https://docs.mapbox.com/mapbox-gl-js/api/geography/#point) corresponding to `lnglat` and `altitude`, relative to the map's `container`.
