# Migration

Mini Tokyo 3D v3.0.0 introduit quelques changements majeurs. Afin d’améliorer l’extensibilité et la convivialité, il était nécessaire de rompre la rétrocompatibilité, mais nous avions pour objectif de le faire uniquement lorsque le bénéfice en valait la peine.

## Migration vers la v3.0.0

### Changements majeurs

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