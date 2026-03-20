# ThreeLayerInterface

Interface pour les couches three.js personnalisées. Il s'agit d'une spécification à modéliser par les implémenteurs : il ne s'agit pas d'une méthode ou d'une classe exportée.

Une couche three.js personnalisée contient une scène [three.js](https://threejs.org/docs/). Il permet à un développeur de restituer les objets three.js directement dans le contexte GL de la carte à l'aide de la caméra de la carte. Ces couches peuvent être ajoutées à la carte en utilisant [Map#addLayer](./map.md#addlayer-layer).

Les couches three.js personnalisées doivent avoir un `id` unique et doivent avoir le `type` de `'three'`. Elles peuvent implémenter `onAdd` et `onRemove`.

## Propriétés

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Un identifiant de couche unique.

### **`lightColor`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | [`Color`](https://threejs.org/docs/#api/en/math/Color) | [`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Une couleur de lumières. Il peut s'agir d'une couleur hexadécimale, d'une instance three.js [Color](https://threejs.org/docs/#api/en/math/Color) ou d'une chaîne de style CSS. Si elle n’est pas spécifiée, la couleur de lumière dynamique basée sur la date et l’heure actuelles sera utilisée.

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

Le niveau de zoom maximum pour la couche. À des niveaux de zoom égaux ou supérieurs au zoom maximum, la couche sera masqué. La valeur peut être n’importe quel nombre compris entre `0` et `24` (inclus). Si aucun zoom maximum n'est fourni, la couche sera visible à tous les niveaux de zoom.

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

Le niveau de zoom minimum pour la couche. À des niveaux de zoom inférieurs au minzoom, la couche sera masqué. La valeur peut être n’importe quel nombre compris entre `0` et `24` (inclus). Si aucun minzoom n'est fourni, la couche sera visible à tous les niveaux de zoom.

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Le type de la couche. Doit être `'three'`.

## Membres de l'instance

### **`onAdd(map, context)`**

Méthode facultative appelée lorsque la couche a été ajoutée à la carte avec [Map#addLayer](./map.md#addlayer-layer). Cela donne à la couche la possibilité d'initialiser les ressources three.js et d'enregistrer les écouteurs d'événements.

#### Paramètres

**`map`** ([`Map`](./map.md)) La carte 3D Mini Tokyo à laquelle cette couche vient d'être ajoutée.

**`context`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) L'objet contenant le moteur de rendu three.js, la scène et la caméra.

Nom | Description
:-- | :--
**`context.camera`**<br>[`PerspectiveCamera`](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera) | Objet caméra.
**`context.renderer`**<br>[`WebGLRenderer`](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) | Objet de rendu.
**`context.scene`**<br>[`Scene`](https://threejs.org/docs/#api/en/scenes/Scene) | Objet de scène.

---

### **`onRemove(map, context)`**

Méthode facultative appelée lorsque la couche a été supprimée de la carte avec [Map#removeLayer](./map.md#removelayer-id). Cela donne à la couche la possibilité de nettoyer les ressources three.js et les écouteurs d'événements.

#### Paramètres

**`map`** ([`Map`](./map.md)) La carte 3D Mini Tokyo de laquelle cette couche vient d'être supprimée.

**`context`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) L'objet contenant le moteur de rendu three.js, la scène et la caméra.

Nom | Description
:-- | :--
**`context.camera`**<br>[`PerspectiveCamera`](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera) | Objet caméra.
**`context.renderer`**<br>[`WebGLRenderer`](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) | Objet de rendu.
**`context.scene`**<br>[`Scene`](https://threejs.org/docs/#api/en/scenes/Scene) | Objet de scène.