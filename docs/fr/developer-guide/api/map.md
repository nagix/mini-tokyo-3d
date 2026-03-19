# Map

L'objet `Map` représente la carte 3D Mini Tokyo sur votre page. Vous créez un `Map` en spécifiant un `container` et d'autres options. Ensuite, Mini Tokyo 3D initialise la carte sur la page et renvoie votre objet `Map`.

Hérite de [Evented](https://docs.mapbox.com/mapbox-gl-js/api/events/#evented).

```js
new Map(options: Object)
```

## Paramètres

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Nom | Description
:-- | :--
**`options.accessToken`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | Jeton d'accès pour [Mapbox](https://www.mapbox.com). Si vous ne spécifiez pas ce jeton, une erreur se produira lors du chargement de la carte, alors assurez-vous d'obtenir un jeton d'accès spécifique à votre site Web.
**`options.bearing`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>par défaut : `0` | Le relèvement initial (rotation) de la carte, mesuré en degrés dans le sens inverse des aiguilles d'une montre à partir du nord. S’il n’est pas spécifié, il sera par défaut `0`.
**`options.center`**<br>[`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)<br>par défaut : `[139.7670, 35.6814]` | Le point central géographique initial de la carte. S'il n'est pas spécifié, il sera par défaut autour de la gare de Tokyo (`[139.7670, 35.6814]`). Remarque : Mini Tokyo 3D utilise l'ordre des coordonnées de longitude et de latitude pour correspondre à GeoJSON.
**`options.clockControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>par défaut : `true` | Si `true`, l'affichage de la date et de l'heure sera ajouté à la carte.
**`options.configControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>par défaut : `true` | Si `true`, les boutons de configuration seront ajoutés à la carte.
**`options.container`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | Le `id` de l'élément HTML dans lequel Mini Tokyo 3D restituera la carte. L'élément spécifié ne doit avoir aucun enfant.
**`options.dataSources`**<br>[`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`DataSource`](./data-source.md)`>`<br>par défaut : `[]` | Un tableau de sources de données supplémentaires pour Mini Tokyo 3D. Notez qu'il s'agit d'une fonctionnalité expérimentale en cours de développement et susceptible de changer.
**`options.dataUrl`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | URL des données 3D de Mini Tokyo. S’il n’est pas spécifié, `'https://minitokyo3d.com/data'` sera utilisé.
**`options.ecoFrameRate`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>par défaut : `1` | Fréquence d'images pour les animations de train et d'avion (images par seconde) lorsque le mode Eco est activé. Spécifiez sur une échelle de 1 à 60. Des valeurs inférieures entraînent des animations moins fluides et une utilisation moindre des ressources du processeur, réduisant ainsi la consommation de la batterie sur les appareils mobiles. S’il n’est pas spécifié, il sera par défaut `1`.
**`options.ecoMode`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)<br>par défaut : `'normal'` | Le mode éco initial. `'normal'` et `'eco'` sont pris en charge.
**`options.fullscreenControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>par défaut : `true` | Si `true`, le bouton plein écran sera ajouté à la carte.
**`options.lang`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [IETF language tag](https://en.wikipedia.org/wiki/IETF_language_tag) pour la langue. Si elle n'est pas spécifiée, la langue par défaut du navigateur est utilisée. Actuellement `'ja'`, `'en'`, `'ko'`, `'zh-Hans'`, `'zh-Hant'`, `'th'`, `'ne'`, `'pt-BR'`, `'fr'`, `'es'` et `'de'` sont pris en charge. Si une langue non prise en charge est spécifiée, alors `'en'` est utilisé.
**`options.modeControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>par défaut : `true` | Si `true`, les boutons de changement de mode seront ajoutés à la carte.
**`options.navigationControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>par défaut : `true` | Si `true`, les boutons de navigation seront ajoutés à la carte.
**`options.pitch`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>par défaut : `60` | L'inclinaison initiale de la carte, mesurée en degrés par rapport au plan de l'écran (0-85). S’il n’est pas spécifié, il sera par défaut `60`.
**`options.plugins`**<br>[`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`PluginInterface`](./plugin.md)`>` | Une liste de plugins à ajouter. Chaque plugin doit implémenter [PluginInterface](./plugin.md).
**`options.searchControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>par défaut : `true` | Si `true`, le bouton de recherche sera ajouté à la carte.
**`options.secrets`**<br>[`Secrets`](./secrets.md) | Un objet pour stocker les jetons d'accès utilisés pour récupérer des données.
**`options.selection`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | ID du train ou du vol à suivre, ou de la gare à sélectionner. L'ID du train est une chaîne au format `'odpt.Train:<operator ID>.<railway ID>.<train number>'`. L'ID de vol est une chaîne au format `'odpt.FlightInformationArrival:<operator ID>.<airport ID>.<flight number>'` ou `'odpt.FlightInformationDeparture:<operator ID>.<airport ID>.<flight number>'`. L'ID de la station est une chaîne au format `'odpt.Station:<operator ID>.<railway ID>.<station ID>'`. La partie `'odpt.*:'` peut être omise. Pour plus de détails, consultez le [Public Transportation Open Data Center: API Specification](https://developer.odpt.org/en/documents).
**`options.trackingMode`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)<br>par défaut : `'position'` | Le mode de suivi initial. `'position'`, `'back'`, `'topback'`, `'front'`, `'topfront'`, `'helicopter'`, `'drone'` et `'bird'` sont pris en charge.
**`options.zoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>par défaut : `14` | Le niveau de zoom initial de la carte. S’il n’est pas spécifié, il sera par défaut `14`.

## Membres de l'instance

### **`addLayer(layer)`**

Ajoute une couche à la carte.

#### Paramètres

**`layer`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) | [`CustomLayerInterface`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#customlayerinterface) | [`GeoJsonLayerInterface`](./geojson-layer.md) | [`ThreeLayerInterface`](./three-layer.md) | [`Tile3DLayerInterface`](./tile-3d-layer.md)) La couche à ajouter, conformément à la spécification de style Mapbox [layer definition](https://docs.mapbox.com/style-spec/reference/layers/), à la spécification [CustomLayerInterface](https://docs.mapbox.com/mapbox-gl-js/api/properties/#customlayerinterface), la spécification [GeoJsonLayerInterface](./geojson-layer.md), la spécification [ThreeLayerInterface](./three-layer.md) ou la spécification [Tile3DLayerInterface](./tile-3d-layer.md).

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`easeTo(options)`**

Modifie toute combinaison de `center`, `zoom`, `bearing`, `pitch` et `padding` avec une transition animée entre les anciennes et les nouvelles valeurs. La carte conservera ses valeurs actuelles pour tous les détails non spécifiés dans `options`.

Remarque : La transition se produira instantanément si l'utilisateur a activé la fonctionnalité d'accessibilité `reduced motion` dans son système d'exploitation, à moins que `options` n'inclue `essential: true`.

#### Paramètres

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) Options décrivant la destination et l'animation de la transition. Accepte [CameraOptions](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions) et [AnimationOptions](https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions).

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`flyTo(options)`**

Modifie toute combinaison de `center`, `zoom`, `bearing` et `pitch`, animant la transition le long d'une courbe qui évoque le vol. L'animation intègre de manière transparente le zoom et le panoramique pour aider l'utilisateur à conserver ses repères même après avoir parcouru une grande distance.

Si un utilisateur a activé la fonctionnalité d'accessibilité `reduced motion` dans son système d'exploitation, l'animation sera ignorée et se comportera de manière équivalente à `jumpTo`, à moins que `options` n'inclue `essential: true`.

#### Paramètres

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) Options décrivant la destination et l'animation de la transition. Accepte [CameraOptions](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions), [AnimationOptions](https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions) et les options supplémentaires suivantes.

Nom | Description
:-- | :--
**`options.curve`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>par défaut : `1.42` | La « courbe » de zoom qui se produira le long de la trajectoire de vol. Une valeur élevée maximise le zoom pour une animation exagérée, tandis qu'une valeur faible minimise le zoom pour un effet plus proche de [Map#easeTo](./map.md#easeto-options). 1,42 est la valeur moyenne sélectionnée par les participants à l'étude des utilisateurs discutée dans [van Wijk (2003)](https://www.win.tue.nl/~vanwijk/zoompan.pdf). Une valeur de `Math.pow(6, 0.25)` serait équivalente à la vitesse quadratique moyenne. Une valeur de 1 produirait un mouvement circulaire. Si `options.minZoom` est spécifié, cette option sera ignorée.
**`options.maxDuration`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | Durée maximale de l'animation, mesurée en millisecondes. Si la durée dépasse la durée maximale, elle est réinitialisée à 0.
**`options.minZoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | Le niveau de zoom de base zéro au sommet de la trajectoire de vol. Si cette option est spécifiée, `options.curve` sera ignoré.
**`options.screenSpeed`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | Vitesse moyenne de l'animation mesurée en écrans par seconde, en supposant une courbe de synchronisation linéaire. Si `options.speed` est spécifié, cette option est ignorée.
**`options.speed`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>par défaut : `1.2` | La vitesse moyenne de l'animation définie par rapport à `options.curve`. Une vitesse de 1,2 signifie que la carte semble se déplacer le long de la trajectoire de vol de 1,2 fois `options.curve` écrans chaque seconde. Un *écran* correspond à la fenêtre d'affichage visible de la carte. Elle ne correspond pas à une distance physique fixe, mais varie selon le niveau de zoom.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`getBearing()`**

Renvoie le relèvement actuel de la carte. Le relèvement est la direction de la boussole qui est « vers le haut » ; par exemple, un relèvement de 90° oriente la carte de manière à ce que l'est soit vers le haut.

#### Retours

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) : Le relèvement actuel de la carte.

---

### **`getCenter()`**

Renvoie le point central géographique de la carte.

#### Retours

[`LngLat`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglat) : Le point central géographique de la carte.

---

### **`getClockMode()`**

Renvoie le mode d'horloge actuel.

#### Retours

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) : chaîne représentant le mode d'horloge actuel. Soit `'realtime'` ou `'playback'`.

---

### **`getEcoMode()`**

Renvoie le mode éco actuel.

#### Retours

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) : chaîne représentant le mode éco actuel. Soit `'normal'` ou `'eco'`.

---

### **`getMapboxMap()`**

Renvoie l'objet [`Map`](https://docs.mapbox.com/mapbox-gl-js/api/map/) de Mapbox utilisé dans la carte.

#### Retours

[`Map`](https://docs.mapbox.com/mapbox-gl-js/api/map/) : La carte de Mapbox.

---

### **`getModelPosition(lnglat, altitude)`**

Projette un `LngLat` sur un `MercatorCoordinate` et renvoie les coordonnées Mercator traduites avec la gare de Tokyo comme origine.

#### Paramètres

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) L'emplacement à projeter.

**`altitude`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) L'altitude en mètres de la position.

#### Retours

{x : [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), y : [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), z : [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)} : Coordonnées Mercator traduites avec la gare de Tokyo comme origine.

---

### **`getModelScale()`**

Renvoie l'échelle à transformer en `MercatorCoordinate` à partir de coordonnées en unités du monde réel à l'aide de mètres. Cela fournit la distance de 1 mètre en unités `MercatorCoordinate` à la gare de Tokyo.

#### Retours

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) : L'échelle à transformer en `MercatorCoordinate` à partir de coordonnées en unités du monde réel à l'aide de mètres.

---

### **`getPitch()`**

Renvoie l'inclinaison actuelle de la carte.

#### Retours

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) : inclinaison actuelle de la carte, mesurée en degrés par rapport au plan de l'écran.

---

### **`getSelection()`**

Renvoie l'ID du train ou du vol suivi, ou le tableau des ID des gares sélectionnées.

#### Retours

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>` : l'identifiant du train ou du vol suivi, ou le tableau des identifiants des gares sélectionnées. L'ID du train est une chaîne au format `'<operator ID>.<line ID>.<train number>'`. L'ID de vol est une chaîne au format `'<operator ID>.<airport ID>.<flight number>'`. L'ID de la station est une chaîne au format `'<operator ID>.<line ID>.<station ID>'`.

---

### **`getTrackingMode()`**

Renvoie le mode de suivi actuel. Voir [ici](../../user-guide/configuration.md#parametres-du-mode-de-suivi) pour plus de détails sur les modes de suivi.

#### Retours

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) : chaîne représentant le mode de suivi actuel. Soit `'position'`, `'back'`, `'topback'`, `'front'`, `'topfront'`, `'helicopter'`, `'drone'` ou `'bird'`.

::: warning
Le mode de suivi `'heading'` est obsolète et revient à `'topback'`.
:::

---

### **`getViewMode()`**

Renvoie le mode d'affichage actuel.

#### Retours

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) : chaîne représentant le mode d'affichage actuel. Soit `'ground'` ou `'underground'`.

---

### **`getZoom()`**

Renvoie le niveau de zoom actuel de la carte.

#### Retours

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) : niveau de zoom actuel de la carte.

---

### **`hasDarkBackground()`**

Vérifie si la couleur d'arrière-plan de la carte est sombre.

#### Retours

[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean) : `true` si la couleur de fond de la carte est sombre, `false` sinon.

---

### **`jumpTo(options)`**

Modifie toute combinaison de `center`, `zoom`, `bearing` et `pitch`, sans transition animée. La carte conservera ses valeurs actuelles pour tous les détails non spécifiés dans `options`.

#### Paramètres

**`options`** ([`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions)) Objet Options.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`off(type, listener)`**

Supprime un écouteur d'événement précédemment ajouté avec [`Map#on`](./map.md#on-type-listener).

#### Paramètres

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Type d'événement précédemment utilisé pour installer l'écouteur.

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) La fonction précédemment installée en tant qu'écouteur.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`on(type, listener)`**

Ajoute un écouteur pour les événements d'un type spécifié.

#### Paramètres

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Type d'événement à écouter.

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) Fonction à appeler lorsque l'événement est déclenché.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`once(type, listener)`**

Ajoute un écouteur qui ne sera appelé qu'une seule fois à un type d'événement spécifié.

#### Paramètres

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Type d'événement pour lequel ajouter un écouteur.

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) Fonction à appeler lorsque l'événement est déclenché.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`removeLayer(id)`**

Supprime la couche avec l'ID donné de la carte.

Si aucune couche de ce type n’existe, un événement `error` est déclenché.

#### Paramètres

**`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) ID de la couche à supprimer.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setBearing(bearing)`**

Définit le relèvement (rotation) de la carte. Le relèvement est la direction de la boussole qui est « vers le haut » ; par exemple, un relèvement de 90° oriente la carte de manière à ce que l'est soit vers le haut.

Équivalent à `jumpTo({bearing: bearing})`.

#### Paramètres

**`bearing`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) Le relèvement souhaité.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

### **`setCenter(center)`**

Définit le point central géographique de la carte. Équivalent à `jumpTo({center: center})`.

#### Paramètres

**`center`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) Le point central à définir.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setClockMode(mode)`**

Règle le mode horloge. En mode horloge en temps réel (`'realtime'`), les trains et les avions sont affichés sur la carte selon l'exploitation réelle du réseau. En mode horloge de lecture (`'playback'`), vous pouvez spécifier l'heure et la vitesse du temps qui passe.

#### Paramètres

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Une chaîne représentant le mode d'horloge. Soit `'realtime'` ou `'playback'`.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setEcoMode(mode)`**

Règle le mode éco. En mode normal (`'normal'`), la fréquence d'images pour les animations de train et d'avion sera définie sur 60. En mode éco (`'eco'`), la fréquence d'images sera définie sur l'option du constructeur [`Map`](./map.md) `ecoFrameRate`.

#### Paramètres

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Une chaîne représentant le mode éco. Soit `'normal'` ou `'eco'`.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setLayerVisibility(layerId, visibility)`**

Définit la visibilité de la couche. Spécifiez `'visible'` pour le rendre visible ou `'none'` pour le rendre invisible.

#### Paramètres

**`layerId`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) ID de la couche dont la visibilité est à définir.

**`visibility`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Indique si cette couche est affichée. Soit `'visible'` ou `'none'`.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setPitch(pitch)`**

Définit l'inclinaison de la carte. Équivalent à `jumpTo({pitch: pitch})`.

#### Paramètres

**`pitch`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) L'inclinaison à définir, mesuré en degrés par rapport au plan de l'écran (0-85).

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setSelection(id)`**

Définit l'ID du train ou du vol que vous souhaitez suivre, ou de la gare à sélectionner. L'ID du train est une chaîne au format `'odpt.Train:<operator ID>.<railway ID>.<train number>'`. L'ID de vol est une chaîne au format `'odpt.FlightInformationArrival:<operator ID>.<airport ID>.<flight number>'` ou `'odpt.FlightInformationDeparture:<operator ID>.<airport ID>.<flight number>'`. L'ID de la station est une chaîne au format `'odpt.Station:<operator ID>.<railway ID>.<station ID>'`. La partie `'odpt.*:'` peut être omise. Pour plus de détails, consultez le [Public Transportation Open Data Center: API Specification](https://developer.odpt.org/en/documents).

#### Paramètres

**`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) ID du train ou du vol à suivre, ou de la gare à sélectionner.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setTrackingMode(mode)`**

Définit le mode de suivi. Voir [ici](../../user-guide/configuration.md#parametres-du-mode-de-suivi) pour plus de détails sur les modes de suivi.

#### Paramètres

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Une chaîne représentant le mode de suivi. Soit `'position'`, `'back'`, `'topback'`, `'front'`, `'topfront'`, `'helicopter'`, `'drone'` ou `'bird'`.

::: warning
Le mode de suivi `'heading'` est obsolète et revient à `'topback'`.
:::

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setViewMode(mode)`**

Définit le mode d'affichage. En mode vue au sol (`'ground'`), les voies ferrées, les gares, les trains et les avions au sol seront affichés de manière lumineuse, et les voies ferrées, gares et trains souterrains seront translucides. En mode d'affichage souterrain (`'underground'`), la carte deviendra sombre et les voies ferrées, gares, trains et avions au sol seront translucides, tandis que les voies ferrées, gares et trains souterrains apparaîtront plus clairs.

#### Paramètres

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) Une chaîne représentant le mode d'affichage. Soit `'ground'` ou `'underground'`.

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

---

### **`setZoom(zoom)`**

Définit le niveau de zoom de la carte. Équivalent à `jumpTo({zoom: zoom})`.

#### Paramètres

**`zoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) Le niveau de zoom à définir (0-22).

#### Retours

[`Map`](./map.md) : se renvoie lui-même pour permettre le chaînage de méthodes.

## Événements

### **`boxzoomcancel`**

Déclenché lorsque l'utilisateur annule une interaction de « zoom sur la boîte » ou lorsque le cadre de délimitation n'atteint pas le seuil de taille minimale. Voir [BoxZoomHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler).

**Type** [`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent)

---

### **`boxzoomend`**

Déclenché lorsqu'une interaction « zoom sur la boîte » se termine. Voir [BoxZoomHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler).

**Type** [`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent)

---

### **`boxzoomstart`**

Déclenché lorsqu'une interaction « zoom sur la boîte » démarre. Voir [BoxZoomHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler).

**Type** [`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent)

---

### **`click`**

Déclenché lorsqu'un dispositif de pointage (généralement une souris) est enfoncé et relâché au même point de la carte.

**Type** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`clockmode`**

Déclenché lorsque le mode de l'horloge est modifié.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Propriétés

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : chaîne représentant le mode d'horloge. Soit `'realtime'` ou `'playback'`.

---

### **`contextmenu`**

Déclenché lorsque le bouton droit de la souris est cliqué ou que la touche du menu contextuel est enfoncée dans la carte.

**Type** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`dblclick`**

Déclenché lorsqu'un dispositif de pointage (généralement une souris) est enfoncé et relâché deux fois rapidement au même point de la carte.

**Type** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`deselection`**

Déclenché lorsqu'un suivi de train ou d'avion est annulé ou que des gares sont désélectionnées.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Propriétés

**`deselection`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`) : L'ID du train ou du vol dont le suivi est annulé, ou le tableau des ID des gares désélectionnées. L'ID du train est une chaîne au format `'<operator ID>.<line ID>.<train number>'`. L'ID de vol est une chaîne au format `'<operator ID>.<airport ID>.<flight number>'`. L'ID de la station est une chaîne au format `'<operator ID>.<line ID>.<station ID>'`.

---

### **`drag`**

Déclenché à plusieurs reprises lors d'une interaction « glisser pour déplacer ». Voir [DragPanHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`dragend`**

Déclenché à la fin d'une interaction « glisser pour déplacer ». Voir [DragPanHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`dragstart`**

Déclenché lorsqu'une interaction « glisser pour déplacer » démarre. Voir [DragPanHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`ecomode`**

Déclenché lorsque le mode éco est modifié.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Propriétés

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : chaîne représentant le mode éco. Soit `'normal'` ou `'eco'`.

---

### **`error`**

Déclenché lorsqu'une erreur se produit. Il s'agit du principal mécanisme de rapport d'erreurs de Mini Tokyo 3D. Nous utilisons un événement au lieu de `throw` pour mieux prendre en charge les opérations asynchrones. Si aucun écouteur n'est lié à l'événement `error`, l'erreur sera imprimée sur la console.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Propriétés

**`message`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : message d'erreur.

---

### **`load`**

Déclenché immédiatement après que toutes les ressources nécessaires ont été téléchargées et que le premier rendu visuellement complet de la carte a eu lieu.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

---

### **`mousedown`**

Déclenché lorsqu'un dispositif de pointage (généralement une souris) est enfoncé dans la carte.

**Type** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`mousemove`**

Déclenché lorsqu'un dispositif de pointage (généralement une souris) est déplacé alors que le curseur se trouve à l'intérieur de la carte. Lorsque vous déplacez le curseur sur la carte, l'événement se déclenche chaque fois que le curseur change de position sur la carte.

**Type** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`mouseover`**

Déclenché lorsqu'un dispositif de pointage (généralement une souris) est déplacé sur la carte. Lorsque vous déplacez le curseur sur une page Web contenant une carte, l'événement se déclenche à chaque fois qu'il entre dans la carte ou dans tout élément enfant.

**Type** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`mouseup`**

Déclenché lorsqu'un dispositif de pointage (généralement une souris) est relâché sur la carte.

**Type** [`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent)

---

### **`move`**

Déclenché à plusieurs reprises lors d'une transition animée d'une vue à une autre, à la suite d'une interaction de l'utilisateur ou de méthodes telles que [Map#flyTo](./map.md#flyto-options).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`moveend`**

Déclenché juste après que la carte ait terminé une transition d'une vue à une autre, à la suite d'une interaction de l'utilisateur ou de méthodes telles que [Map#jumpTo](./map.md#jumpto-options).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`movestart`**

Déclenché juste avant que la carte ne commence une transition d'une vue à une autre, à la suite d'une interaction de l'utilisateur ou de méthodes telles que [Map#jumpTo](./map.md#jumpto-options).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`pitch`**

Déclenché à plusieurs reprises pendant l'animation d'inclinaison de la carte entre un état et un autre à la suite d'une interaction de l'utilisateur ou de méthodes telles que [Map#flyTo](./map.md#flyto-options).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`pitchend`**

Déclenché immédiatement après que l'inclinaison de la carte ait fini de changer à la suite d'une interaction de l'utilisateur ou de méthodes telles que [Map#flyTo](./map.md#flyto-options).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`pitchstart`**

Déclenché chaque fois que l'inclinaison de la carte commence un changement à la suite d'une interaction de l'utilisateur ou de méthodes telles que [Map#flyTo](./map.md#flyto-options).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`resize`**

Déclenché immédiatement après le redimensionnement de la carte.

---

### **`rotate`**

Déclenché à plusieurs reprises lors d'une interaction « glisser pour faire pivoter ». Voir [DragRotateHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`rotateend`**

Déclenché lorsqu'une interaction « glisser pour faire pivoter » se termine. Voir [DragRotateHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`rotatestart`**

Déclenché lorsqu'une interaction « glisser pour faire pivoter » démarre. Voir [DragRotateHandler](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`selection`**

Déclenché lorsqu'un suivi de train ou d'avion est initié ou que des gares sont sélectionnées.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Propriétés

**`selection`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`) : L'ID du train ou du vol dont le suivi est initié, ou le tableau des ID des gares sélectionnées. L'ID du train est une chaîne au format `'<operator ID>.<line ID>.<train number>'`. L'ID de vol est une chaîne au format `'<operator ID>.<airport ID>.<flight number>'`. L'ID de la station est une chaîne au format `'<operator ID>.<line ID>.<station ID>'`.

---

### **`touchcancel`**

Déclenché lorsqu'un événement [`touchcancel`](https://developer.mozilla.org/docs/Web/Events/touchcancel) se produit dans la carte.

**Type** [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent)

---

### **`touchend`**

Déclenché lorsqu'un événement [`touchend`](https://developer.mozilla.org/docs/Web/Events/touchend) se produit dans la carte.

**Type** [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent)

---

### **`touchmove`**

Déclenché lorsqu'un événement [`touchmove`](https://developer.mozilla.org/docs/Web/Events/touchmove) se produit dans la carte.

**Type** [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent)

---

### **`touchstart`**

Déclenché lorsqu'un événement [`touchstart`](https://developer.mozilla.org/docs/Web/Events/touchstart) se produit dans la carte.

**Type** [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent)

---

### **`trackingmode`**

Déclenché lorsque le mode de suivi est modifié.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Propriétés

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : chaîne représentant le mode de suivi. Soit `'position'`, `'back'`, `'topback'`, `'front'`, `'topfront'`, `'helicopter'`, `'drone'` ou `'bird'`.

::: warning
Le mode de suivi `'heading'` est obsolète et revient à `'topback'`.
:::

---

### **`viewmode`**

Déclenché lorsque le mode d'affichage est modifié.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Propriétés

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : chaîne représentant le mode d'affichage. Soit `'ground'` ou `'underground'`.

---

### **`wheel`**

Déclenché lorsqu'un événement [`wheel`](https://developer.mozilla.org/docs/Web/Events/wheel) se produit dans la carte.

**Type** [`MapWheelEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapwheelevent)

---

### **`zoom`**

Déclenché à plusieurs reprises lors d'une transition animée d'un niveau de zoom à un autre, à la suite d'une interaction de l'utilisateur ou de méthodes telles que [Map#flyTo](./map.md#flyto-options).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`zoomend`**

Déclenché juste après que la carte ait effectué une transition d'un niveau de zoom à un autre, à la suite d'une interaction de l'utilisateur ou de méthodes telles que [Map#flyTo](./map.md#flyto-options).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

### **`zoomstart`**

Déclenché juste avant que la carte ne commence une transition d'un niveau de zoom à un autre, à la suite d'une interaction de l'utilisateur ou de méthodes telles que [Map#flyTo](./map.md#flyto-options).

**Type** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent) | [`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))