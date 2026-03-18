# Panneau

Crée un composant de panneau.

Prolonge [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object).

```js
new Panel(options: Object)
```

## Paramètres

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Nom | Descriptif
:-- | :--
**`options.modal`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean) | Si `true`, le panneau sera modal et se fermera si l'utilisateur clique à l'extérieur.

## Membres de l'instance

### **`addTo(map)`**

Ajoute le panneau à une carte.

#### Paramètres

**`map`** ([`Map`](./map.md)) La carte Mini Tokyo 3D à laquelle ajouter le panneau.

#### Retours

[`Panel`](./panel.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`isOpen()`**

Vérifie si un panneau est ouvert.

#### Retours

[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean) : `true` si le panneau est ouvert, `false` s'il est fermé.

---

### **`remove()`**

Supprime le panneau d'une carte.

#### Retours

[`Panel`](./panel.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setButtons(buttons)`**

Définit les boutons sur le titre du panneau.

#### Paramètres

**`buttons`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`HTMLElement`](https://developer.mozilla.org/docs/Web/HTML/Element)`>`) Un tableau d'éléments DOM à utiliser comme boutons sur le titre du panneau.

#### Retours

[`Panel`](./panel.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setHTML(html)`**

Définit le contenu du panneau sur le code HTML fourni sous forme de chaîne.

Cette méthode n'effectue pas de filtrage ou de nettoyage HTML et doit être utilisée uniquement avec du contenu fiable.

#### Paramètres

**`html`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Une chaîne représentant le contenu HTML du panneau.

#### Retours

[`Panel`](./panel.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setTitle(title)`**

Définit le titre du panneau sur une chaîne de texte.

#### Paramètres

**`title`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Le titre du panneau.

#### Retours

[`Panel`](./panel.md) : se renvoie lui-même pour permettre le chaînage de méthodes.