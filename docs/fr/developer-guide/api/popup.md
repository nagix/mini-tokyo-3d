# Popup

Un composant contextuel.

Hérite de [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object).

```js
new Popup()
```

## Membres de l'instance

### **`addTo(map)`**

Ajoute la fenêtre contextuelle à une carte.

#### Paramètres

**`map`** ([`Map`](./map.md)) La carte Mini Tokyo 3D à laquelle ajouter la fenêtre contextuelle.

#### Retours

[`Popup`](./popup.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`remove()`**

Supprime la fenêtre contextuelle de la carte à laquelle elle a été ajoutée.

#### Retours

[`Popup`](./popup.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setHTML(html)`**

Définit le contenu de la fenêtre contextuelle sur le code HTML fourni sous forme de chaîne.

Cette méthode n'effectue pas de filtrage ou de nettoyage HTML et doit être utilisée uniquement avec du contenu fiable.

#### Paramètres

**`html`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Une chaîne représentant le contenu HTML de la fenêtre contextuelle.

#### Retours

[`Popup`](./popup.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setLngLat(lnglat)`**

Définit l'emplacement géographique de l'ancre de la popup et y déplace la popup.

#### Paramètres

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) L'emplacement géographique à définir comme ancre de la popup.

#### Retours

[`Popup`](./popup.md) : se renvoie lui-même pour permettre le chaînage de méthodes.