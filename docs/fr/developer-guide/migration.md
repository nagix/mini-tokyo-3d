# Migration

Chaque version majeure de Mini Tokyo 3D introduit quelques changements incompatibles. Afin d’améliorer l’extensibilité et la convivialité, il est parfois nécessaire de rompre la rétrocompatibilité, mais nous avons pour objectif de le faire uniquement lorsque le bénéfice en vaut la peine.

## Migration vers la v4.0.0

### Changements incompatibles

#### Mise à niveau vers Mapbox GL JS v3

Mini Tokyo 3D dépend désormais de Mapbox GL JS v3 (auparavant v2), et le style de carte intégré a été mis à jour en conséquence. Si vous personnalisez la carte via l'espace de noms `mt3d.mapboxgl` ou interagissez avec la carte Mapbox sous-jacente, consultez le [guide de migration vers Mapbox GL JS v3](https://docs.mapbox.com/mapbox-gl-js/guides/migrate-to-v3/), car certaines API v2 et certains comportements de style ont changé.

#### `secrets.tokyochallenge` et `secrets.challenge2024` remplacés par `secrets.challenge`

La clé `secrets.tokyochallenge` (pour l'ancien Open Data Challenge for Public Transportation in Tokyo) et la clé `secrets.challenge2024` ont toutes deux été supprimées. Utilisez désormais la clé `secrets.challenge`, indépendante de l'année, pour le jeton d'accès de l'Open Data Challenge, afin qu'elle n'ait plus à changer pour le défi de chaque année.

```js
const options = {
  /* ... */
  secrets: {
    odpt: '<access token for Public Transportation Open Data Center>',
    challenge: '<access token for Open Data Challenge for Public Transportation>'
  }
};
```

Voir [Secrets](./api/secrets.md) pour plus de détails.

#### `dataSources` remplace les sources de données intégrées et requiert un `id`

Dans la v3.x, `options.dataSources` du constructeur `Map` spécifiait des sources de données GTFS supplémentaires en plus des données de trains et de vols intégrées. Dans la v4.0.0, les données ODPT et Mini Tokyo 3D intégrées sont elles-mêmes des entrées de `dataSources`, de sorte que tout `dataSources` que vous passez remplace cet ensemble par défaut. Pour conserver les données intégrées tout en ajoutant les vôtres, soit laissez `dataSources` non défini et ajoutez vos sources à l'exécution avec [`Map#addDataSource`](./api/map.md#adddatasource-source) (ce qui ne supprime pas les sources intégrées), soit incluez les sources intégrées avec les vôtres dans le tableau `dataSources`. De plus, chaque [`DataSource`](./api/data-source.md) requiert désormais un `id` unique, utilisé comme clé pour [`Map#addDataSource`](./api/map.md#adddatasource-source) et [`Map#removeDataSource`](./api/map.md#removedatasource-id) ; les sources ajoutées sans `id` ne peuvent pas être gérées individuellement.

Voir [DataSource](./api/data-source.md) pour plus de détails.

#### `getModelPosition()` et `getModelScale()` sont relatifs à `options.center`

L'origine des coordonnées Mercator relatives était auparavant fixée autour de la gare de Tokyo. Elle est désormais dérivée de `options.center` du constructeur `Map`, de sorte que [`Map#getModelPosition`](./api/map.md#getmodelposition-lnglat-altitude) et [`Map#getModelScale`](./api/map.md#getmodelscale) renvoient des valeurs relatives au centre initial de la carte (et l'échelle dépend de sa latitude). Les couches three.js personnalisées ou les plugins doivent calculer les positions à partir de ces méthodes à l'exécution plutôt que de supposer une origine fixe autour de la gare de Tokyo. Les intégrations utilisant le centre par défaut ne sont pas affectées.

#### Le style de carte et les dictionnaires de localisation déplacés vers `assets`

Le style de carte et les fichiers de dictionnaires de localisation, auparavant servis depuis `options.dataUrl` du constructeur `Map` (`osm-liberty.json` et `dictionary-<lang>.json`), sont désormais chargés depuis un dossier `assets` situé à côté du bundle (`style.json` et `dictionary-<lang>.json`). Lorsque vous utilisez le CDN jsDelivr, ils sont servis automatiquement ; lorsque vous intégrez Mini Tokyo 3D dans votre propre application, déployez le dossier `assets` fourni dans `dist` à côté de votre bundle. Les données compressées en gzip sont toujours chargées depuis `options.dataUrl`. De plus, le nouveau style n'est pas compatible avec le précédent, donc tout style personnalisé basé sur celui-ci doit être reconstruit.

Voir [Comment intégrer Mini Tokyo 3D](./integration.md) pour plus de détails.

## Migration vers la v3.0.0

### Changements incompatibles

#### Exportation de l'espace de noms `mt3d` au lieu de la classe `MiniTokyo3D`

Au lieu de la classe `MiniTokyo3D` traditionnelle, transmettez les options du constructeur à la classe `Map` pour créer un objet Carte 3D Mini Tokyo. L'espace de noms `mt3d` contient non seulement la classe `Map`, mais également plusieurs autres classes ainsi que l'intégralité des bibliothèques Mapbox GL JS et three.js, qui peuvent être utilisées pour personnaliser la carte.

```js
const options = {
  container: 'mini-tokyo-3d',
  accessToken: '<jeton d’accès Mapbox>'
};
const map = new mt3d.Map(options);
```

Voir [Comment intégrer Mini Tokyo 3D](./integration.md) pour plus de détails.

#### Le framework de plugins est repensé et tous les plugins sont fournis séparément

Dans les versions précédentes, certains plugins étaient fournis dans le cadre de la bibliothèque Mini Tokyo 3D. Dans la version 3.0.0, le framework de plugins a été repensé de fond en comble et tous les plugins sont désormais fournis sous forme de modules distincts. Par conséquent, lors de l'ajout de plugins, vous devez spécifier explicitement la liste des objets implémentant `PluginInterface` comme option de constructeur de la classe `Map`.

```js
const options = {
  /* ... */
  plugins: [mt3dPrecipitation(), mt3dFireworks()]
};
const map = new mt3d.Map(options);
```

Voir [Ajout de plugins](./integration.md#ajout-de-plugins) pour plus de détails.

#### Utilisation de `accessToken` au lieu de `secrets.mapbox` pour les options du constructeur `Map`

Un jeton d'accès Mapbox, précédemment spécifié dans l'option `secrets.mapbox` du constructeur `MiniTokyo3D`, est désormais spécifié dans `accessToken` pour créer un objet `Map`.

```js
const options = {
  /* ... */
  accessToken: '<jeton d’accès Mapbox>'
};
const map = new mt3d.Map(options);
```

Voir [Comment intégrer Mini Tokyo 3D](./integration.md) pour plus de détails.