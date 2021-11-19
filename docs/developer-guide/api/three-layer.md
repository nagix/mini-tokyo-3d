# ThreeLayerInterface

Interface for custom three.js layers. This is a specification for implementers to model: it is not an exported method or class.

A custom three.js layer contains a three.js scene. It allows a developer to render three.js objects directly into the map's GL context using the map's camera. These layers can be added to the map using [Map#addLayer](./map.md#addlayer-layer).

Custom three.js layers must have a unique `id` and must have the `type` of `'three'`. They may implement `onAdd` and `onRemove`.

## Properties

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

A unique layer id.

### **`lightColor`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | [`Color`](https://threejs.org/docs/#api/en/math/Color) | [`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

A color of the lights. It can be a hexadecimal color, a three.js [Color](https://threejs.org/docs/#api/en/math/Color) instance or a CSS-style string. If not specified, the dynamic light color based on the current date and time will be used.

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

The maximum zoom level for the layer. At zoom levels equal to or greater than the maxzoom, the layer will be hidden. The value can be any number between `0` and `24` (inclusive). If no maxzoom is provided, the layer will be visible at all zoom levels.

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

The minimum zoom level for the layer. At zoom levels less than the minzoom, the layer will be hidden. The value can be any number between `0` and `24` (inclusive). If no minzoom is provided, the layer will be visible at all zoom levels.

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

The layer's type. Must be `'three'`.

## Instance Members

### **`onAdd(map, context)`**

Optional method called when the layer has been added to the Map with [Map#addLayer](./map.md#addlayer-layer). This gives the layer a chance to initialize three.js resources and register event listeners.

#### Parameters

**`map`** ([`Map`](./map.md)) The Mini Tokyo 3D Map this layer was just added to.

**`context`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) three.js renderer, scene and camera this layer contains.

Name | Description
:-- | :--
**`context.camera`**<br>[`PerspectiveCamera`](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera) | Camera object.
**`context.renderer`**<br>[`WebGLRenderer`](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) | Renderer object.
**`context.scene`**<br>[`Scene`](https://threejs.org/docs/#api/en/scenes/Scene) | Scene object.

---

### **`onRemove(map, context)`**

Optional method called when the layer has been removed from the Map with [Map#removeLayer](./map.md#removelayer-id). This gives the layer a chance to clean up three.js resources and event listeners.

#### Parameters

**`map`** ([`Map`](./map.md)) The Mini Tokyo 3D Map this layer was just removed from.

**`context`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) three.js renderer, scene and camera this layer contains.

Name | Description
:-- | :--
**`context.camera`**<br>[`PerspectiveCamera`](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera) | Camera object.
**`context.renderer`**<br>[`WebGLRenderer`](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) | Renderer object.
**`context.scene`**<br>[`Scene`](https://threejs.org/docs/#api/en/scenes/Scene) | Scene object.
