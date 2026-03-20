# Construire Mini Tokyo 3D

Si vous souhaitez essayer les dernières fonctionnalités avant leur publication, modifier le code vous-même ou contribuer au développement de Mini Tokyo 3D, vous pouvez créer votre projet à partir du code source en suivant les instructions de cette section.

## Préparation pour la construction

Les logiciels suivants sont requis.

- La dernière version de [Node.js](https://nodejs.org/fr/)
- La dernière version de [Git](https://git-scm.com) si vous clonez le référentiel

## Instructions de construction

### 1. Téléchargement de fichiers

Téléchargez la dernière branche `master` du [dépôt GitHub](https://github.com/nagix/mini-tokyo-3d) de Mini Tokyo 3D et extrayez le fichier zip. Un répertoire nommé `mini-tokyo-3d-master` sera créé, alors changez le nom en `mini-tokyo-3d`.

```bash
curl -LO https://github.com/nagix/mini-tokyo-3d/archive/master.zip
unzip master.zip
mv mini-tokyo-3d-master mini-tokyo-3d
```

Si vous utilisez Git, vous pouvez cloner le référentiel directement depuis GitHub au lieu des commandes ci-dessus.

```bash
git clone https://github.com/nagix/mini-tokyo-3d.git
```

### 2. Construire

Accédez au répertoire principal de Mini Tokyo 3D.

```bash
cd mini-tokyo-3d
```

Installez les modules npm dépendants.

```bash
npm install
```

Construisez le projet avec la commande suivante.

```bash
npm run build-all
```

Une fois la construction terminée avec succès, le répertoire `dist` sera créé. Il comprend une feuille de style et des fichiers JavaScript à distribuer. Le répertoire `build` sera également créé en même temps. Il contient tous les fichiers nécessaires au déploiement sur votre site web.

## Déploiement sur un site Web

Vous avez besoin de jetons d'accès pour déployer et utiliser les fichiers créés sur votre site Web. Voir [Préparation à l'utilisation](./integration.md#preparation-a-l-utilisation) pour obtenir des jetons d'accès pour Public Transportation Open Data Center et Mapbox.

Le `index.html` dans le répertoire `build` concerne la page Web sur [https://minitokyo3d.com](http://minitokyo3d.com). Dans `index.html`, ajoutez les propriétés `accessToken` et `secrets` à l'objet transmis au constructeur `Map` et spécifiez le jeton d'accès Mapbox pour le `accessToken` et le jeton d'accès pour Public Transportation Open Data Center pour le `secrets`.

```js
map = new mt3d.Map({
  /* ... */
  accessToken: '<jeton d’accès Mapbox>',
  secrets: {
    odpt: '<jeton d’accès pour Public Transportation Open Data Center>'
  }
});
```

Ensuite, modifiez-le pour votre site Web et placez tous les fichiers du répertoire `build` dans le répertoire public de votre serveur Web.

::: warning Avertissement
Étant donné que `index.html` utilise également Mini Tokyo 3D [plugins](../user-guide/plugins.md), vous devez créer séparément les fichiers JavaScript pour chaque plugin et les placer dans le répertoire `build`.
:::