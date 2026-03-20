# PluginInterface

Interface pour les plugins personnalisés ajoutés à la carte. Il s'agit d'une spécification à modéliser par les implémenteurs : il ne s'agit pas d'une méthode ou d'une classe exportée.

Les développeurs peuvent implémenter des méthodes de rappel pour personnaliser la carte Mini Tokyo 3D. Afin d'ajouter des plugins, les objets qui implémentent cette interface doivent être définis sur l'option du constructeur [`Map`](./map.md) `plugins`.

Les plugins personnalisés doivent avoir un `id` unique et doivent avoir le `name` et `iconStyle`. Ils peuvent implémenter `onAdd`, `onRemove`, `onEnabled`, `onDisabled` et `onVisibilityChanged`.

## Propriétés

### **`clockModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

Le plugin ne sera visible que dans les modes d'horloge spécifiés ici. `'realtime'` et `'playback'` sont pris en charge. S'il n'est pas spécifié, il sera toujours visible.

### **`enabled`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean))

Si `false`, le plugin sera désactivé lors de son ajout à la carte. S’il n’est pas spécifié, il sera activé.

### **`iconStyle`** ([`Object`](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration))

Le style en ligne de l’élément icône qui apparaît dans le panneau des couches. Toutes les propriétés de style contenues dans [CSSStyleDeclaration](https://developer.mozilla.org/docs/Web/API/CSSStyleDeclaration) sont prises en charge.

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Un identifiant de plugin unique.

### **`name`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Le nom du plugin. La clé de chaque propriété indique le code de la langue et sa valeur indique le nom dans cette langue. Si la langue utilisée dans un navigateur n'est pas incluse dans les propriétés, elle revient à l'anglais.

Nom | Description
:-- | :--
**`name.de`** | Nom en allemand
**`name.en`** | Nom en anglais
**`name.es`** | Nom en espagnol
**`name.fr`** | Nom en français
**`name.ja`** | Nom en japonais
**`name.ko`** | Nom en coréen
**`name.ne`** | Nom en népalais
**`name.pt`** | Nom en portugais
**`name.th`** | Nom en thaï
**`name.zh-Hans`** | Nom en chinois simplifié
**`name.zh-Hant`** | Nom en chinois traditionnel

### **`searchModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

Le plugin sera visible uniquement dans les modes de recherche spécifiés ici. `'none'`, `'edit'` et `'route'` sont pris en charge. S’il n’est pas spécifié, il sera visible lorsque le panneau de recherche n’est pas affiché.

### **`viewModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

Le plugin sera visible uniquement dans les modes d'affichage spécifiés ici. `'ground'` et `'underground'` sont pris en charge. S'il n'est pas spécifié, il sera toujours visible.

## Membres de l'instance

### **`onAdd(map)`**

Méthode facultative appelée lorsque le plugin a été ajouté à la Map. Cela donne au plugin la possibilité d'initialiser les ressources et d'enregistrer les écouteurs d'événements.

#### Paramètres

**`map`** ([`Map`](./map.md)) La carte Mini Tokyo 3D à laquelle ce plugin vient d'être ajouté.

---

### **`onDisabled()`**

Méthode facultative appelée lorsque le plugin a été désactivé par les utilisateurs. Cela donne au plugin une chance de nettoyer les éléments d'affichage.

---

### **`onEnabled()`**

Méthode facultative appelée lorsque le plugin a été activé par les utilisateurs. Cela donne au plugin la possibilité d'initialiser les éléments d'affichage.

---

### **`onRemove(map)`**

Méthode facultative appelée lorsque le plugin a été supprimé de la Map. Cela donne au plugin une chance de nettoyer les ressources et les écouteurs d'événements.

#### Paramètres

**`map`** ([`Map`](./map.md)) La carte Mini Tokyo 3D dont ce plugin vient d'être supprimé.

---

### **`onVisibilityChanged(visible)`**

Méthode facultative appelée lorsque la visibilité du plugin a été modifiée, par exemple lorsque le mode d'affichage de la carte est modifié. Cela donne au plugin la possibilité de modifier la visibilité des éléments d'affichage.

#### Paramètres

**`visible`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) `true` indique que le plugin est à l'état visible.