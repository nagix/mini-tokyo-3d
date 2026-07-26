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

Une fois la construction terminée avec succès, le répertoire `dist` sera créé. Il comprend la feuille de style, les fichiers JavaScript et le répertoire `assets` (contenant le style de la carte et les dictionnaires de localisation) à distribuer. Le répertoire `build` sera également créé en même temps. Il contient tous les fichiers nécessaires au déploiement sur votre site web.

## Serveur de développement

Pendant que vous travaillez sur le code source, vous pouvez exécuter un serveur de développement qui construit un bundle non minifié avec des source maps, le sert localement et le reconstruit à chaque modification d'un fichier. C'est plus pratique que d'exécuter `npm run build-all` après chaque modification.

Étant donné que le jeton d'accès Mapbox par défaut est limité à des domaines spécifiques et ne fonctionne pas sur `localhost`, vous devez fournir votre propre jeton via la variable d'environnement `MAPBOX_ACCESS_TOKEN`.

```bash
MAPBOX_ACCESS_TOKEN=<jeton d’accès Mapbox> npm run dev
```

Ouvrez `http://localhost:9966/` dans votre navigateur. Lorsque vous modifiez le code source, le bundle est reconstruit automatiquement ; rechargez la page pour voir les modifications.

Les variables d'environnement facultatives suivantes sont également disponibles.

- `MT3D_PLUGIN_<NAME>` : Le chemin vers un fichier de [plugin](../user-guide/plugins.md) construit à charger sur la page. `<NAME>` est l'un de `PRECIPITATION`, `FIREWORKS`, `LIVECAM`, `PLATEAU` ou `GTFS`. Construisez chaque plugin dans son propre dépôt et faites pointer la variable vers le fichier résultant.
- `MT3D_DATA_URL` : L'URL à partir de laquelle la carte charge ses données. Si elle n'est pas définie, la carte charge les données distantes ; pour tester à la place des données générées localement, exécutez d'abord `npm run build-data`, puis définissez `MT3D_DATA_URL` sur `data`. Le serveur de développement sert le répertoire `build/data` généré au chemin `data`, et la page le charge depuis cet emplacement.

```bash
MAPBOX_ACCESS_TOKEN=<jeton d’accès Mapbox> \
MT3D_PLUGIN_PRECIPITATION=../mt3d-plugin-precipitation/dist/mt3d-plugin-precipitation.js \
MT3D_DATA_URL=data \
npm run dev
```

Plutôt que de passer ces variables sur la ligne de commande à chaque fois, placez-les dans un fichier `.env` (partagé) ignoré par Git, ou dans `.env.development` / `.env.production` pour les valeurs spécifiques au développement ou au déploiement ; voir `.env.example` pour plus de détails. Ces fichiers sont chargés automatiquement à la fois pour `npm run dev` et pour la construction de déploiement.

## Déploiement sur un site Web

Vous avez besoin de jetons d'accès pour déployer et utiliser les fichiers créés sur votre site Web. Voir [Préparation à l'utilisation](./integration.md#preparation-a-l-utilisation) pour obtenir des jetons d'accès pour Public Transportation Open Data Center, Open Data Challenge for Public Transportation 2026 et Mapbox.

Le `index.html` dans le répertoire `build` est généré à partir de `public/index.html`. Fournissez les jetons d'accès (et, éventuellement, un identifiant de mesure Google Analytics) via des variables d'environnement lors de la construction ; ils sont injectés dans le `index.html` généré.

```bash
MAPBOX_ACCESS_TOKEN=<jeton d’accès Mapbox> \
MT3D_SECRET_ODPT=<jeton d’accès pour Public Transportation Open Data Center> \
MT3D_SECRET_CHALLENGE=<jeton d’accès pour Open Data Challenge for Public Transportation 2026> \
MT3D_GA_ID=<identifiant de mesure Google Analytics> \
npm run build-all
```

Comme pour le [Serveur de développement](#serveur-de-developpement), vous pouvez placer ces variables dans un fichier `.env` au lieu de les passer sur la ligne de commande.

Enfin, placez tous les fichiers du répertoire `build` dans le répertoire public de votre serveur Web.

::: warning Avertissement
Le `index.html` charge les [plugins](../user-guide/plugins.md) de Mini Tokyo 3D. Construisez chaque plugin séparément et définissez la variable d'environnement `MT3D_PLUGIN_<NAME>` correspondante (`<NAME>` est l'un de `PRECIPITATION`, `FIREWORKS`, `LIVECAM`, `PLATEAU` ou `GTFS`) sur le chemin de son fichier construit avant d'exécuter `npm run build-all`. Les fichiers référencés sont copiés automatiquement dans le répertoire `build`, et les plugins dont la variable n'est pas définie sont omis.
:::