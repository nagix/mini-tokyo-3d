# Marker

Crée un composant marqueur.

Hérite de [Evented](https://docs.mapbox.com/mapbox-gl-js/api/events/#evented).

```js
new Marker(options: Object)
```

## Paramètres

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Nom | Description
:-- | :--
**`options.element`**<br>[`HTMLElement`](https://developer.mozilla.org/docs/Web/HTML/Element) | Élément DOM à utiliser comme marqueur. La valeur par défaut est un marqueur SVG bleu clair en forme de gouttelette.
**`options.minZoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | Le niveau de zoom minimum pour le marqueur. À des niveaux de zoom inférieurs au minZoom, le marqueur sera masqué. La valeur peut être n’importe quel nombre compris entre `0` et `24` (inclus). Si aucun minZoom n'est fourni, le marqueur sera visible à tous les niveaux de zoom.

## Membres de l'instance

### **`addTo(map)`**

Attache le `Marker` à un objet `Map`.

#### Paramètres

**`map`** ([`Map`](./map.md)) La carte Mini Tokyo 3D à laquelle ajouter le marqueur.

#### Retours

[`Marker`](./marker.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`remove()`**

Supprime le marqueur d'une carte.

#### Retours

[`Marker`](./marker.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setActivity(active)`**

Définit l'état d'activité du marqueur. L'état actif fait référence à l'état dans lequel le marqueur est sélectionné et mis en surbrillance.

#### Paramètres

**`active`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) Si `true`, le marqueur est actif.

#### Retours

[`Marker`](./marker.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setLngLat(lnglat)`**

Définit la position géographique du marqueur et le déplace.

#### Paramètres

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) Un [LngLatLike](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike) décrivant l'emplacement du marqueur.

#### Retours

[`Marker`](./marker.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setVisibility(visible)`**

Définit l'état de visibilité du marqueur.

#### Paramètres

**`visible`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) Si `true`, le marqueur est visible.

#### Retours

[`Marker`](./marker.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

## Événements

### **`click`**

Déclenché lorsqu'un dispositif de pointage (généralement une souris) est enfoncé et relâché sur le marqueur.

---

### **`mouseenter`**

Lancé lorsqu'un dispositif de pointage (généralement une souris) entre dans le marqueur.

---

### **`mouseleave`**

Lancé lorsqu'un dispositif de pointage (généralement une souris) quitte le marqueur.