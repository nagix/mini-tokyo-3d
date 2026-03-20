# Comment intégrer Mini Tokyo 3D

Intégrer Mini Tokyo 3D dans une page Web ou utiliser les API pour la personnaliser est très simple. Veuillez suivre les instructions de cette section pour commencer.

## Préparation à l'utilisation

Mini Tokyo 3D fonctionne sur tous les principaux navigateurs prenant en charge ES2018. Internet Explorer n'est pas pris en charge.

Mini Tokyo 3D utilise les sources de données suivantes et nécessite un jeton d'accès pour chacune d'elles au moment de l'exécution. Suivez les instructions ci-dessous pour obtenir des jetons d'accès.

Source de données | URL d'inscription | Format du jeton d'accès
:-- | :-- | :--
[Public Transportation Open Data Center](https://www.odpt.org/en/) | [Lien](https://developer.odpt.org/signup) | Une chaîne de chiffres et de lettres minuscules
[Mapbox](https://www.mapbox.com) | [Lien](https://account.mapbox.com/auth/signup/) | Chaîne alphanumérique contenant un point commençant par `pk.`

### Obtenir un jeton d'accès pour Public Transportation Open Data Center

Mini Tokyo 3D utilise les données des trains et des avions du [Public Transportation Open Data Center](https://www.odpt.org/en/). Vous devez vous inscrire en tant que développeur pour obtenir les données, mais elles sont disponibles gratuitement.

1. Inscrivez-vous en tant que développeur en saisissant vos informations d'utilisateur sur la [page d’inscription du site développeur](https://developer.odpt.org/signup). La réception de votre e-mail de confirmation d'inscription peut prendre quelques jours.
2. Après vous être connecté avec votre compte de développeur, sélectionnez « Jeton d'accès pour le centre ODPT » dans le menu « Connecté » dans le coin supérieur droit de l'écran.
3. Une liste des jetons d'accès pour ODPT Center s'affichera. Seul le token « DefaultApplication » sera affiché juste après la création du compte. Cliquez sur « Ajouter ».
4. Saisissez un nom d'application dans le champ « Nom » et cliquez sur le bouton « Mettre à jour ».
5. Le jeton nouvellement créé apparaîtra dans la liste des jetons d'accès.

### Obtenir un jeton d'accès Mapbox

Mini Tokyo 3D utilise le service [Mapbox](https://www.mapbox.com) pour ses tuiles de carte, vous aurez donc besoin d'un jeton d'accès Mapbox pour l'utiliser. Il utilise des sessions [Map Loads for Web](https://www.mapbox.com/pricing/#maploads), gratuites jusqu'à 50 000 connexions par mois. Suivez les étapes ci-dessous pour obtenir un jeton d'accès.

1. Créez un compte Mapbox en saisissant vos informations utilisateur sur la [page d’inscription](https://account.mapbox.com/auth/signup/).
2. Après vous être connecté avec votre compte Mapbox, cliquez sur « Jetons » dans le menu en haut de l'écran pour afficher la liste des jetons d'accès. Seul le « Jeton public par défaut » sera affiché juste après la création du compte.
3. Cliquez sur le bouton « Créer un token » pour accéder à la page de création d'un token d'accès.
4. Dans le champ « Nom du jeton », saisissez le nom de votre site Web, le nom de votre application ou tout autre nom de votre choix.
5. Les « Portées des jetons » doivent être le paramètre par défaut (toutes les portées publiques doivent être cochées).
6. Saisissez l'URL du site sur lequel vous souhaitez installer Mini Tokyo 3D dans le champ « URL » de la section « Restrictions de jetons », puis cliquez sur le bouton « Ajouter une URL ». Pour le format de l'URL, veuillez vous référer aux [restrictions d'URL](https://docs.mapbox.com/accounts/overview/tokens/#url-restrictions). En définissant cette restriction d'URL, vous pouvez empêcher d'autres sites d'utiliser ce jeton d'accès à leurs propres fins.
7. Enfin, cliquez sur le bouton « Créer un jeton » en bas de l'écran et le jeton nouvellement créé apparaîtra dans la liste des jetons d'accès.

## Intégration directement dans une page Web

Si vous souhaitez simplement afficher une carte Mini Tokyo 3D sur votre page Web, vous pouvez éditer le fichier HTML comme suit.

Tout d'abord, utilisez le lien jsDelivr CDN pour charger la feuille de style Mini Tokyo 3D et le code JavaScript dans l'élément `<head>` du fichier HTML.

```html
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.js"></script>
</head>
```

Dans l'élément `<body>` du même fichier HTML, ajoutez un élément HTML avec un `id` (un élément `<div>` dans l'exemple ci-dessous) et écrivez du code JavaScript pour créer une instance Map dans l'élément `<script>`. Spécifiez le `id` de l'élément HTML à `container` de l'objet `options` transmis au constructeur. De plus, spécifiez le jeton d'accès Mapbox obtenu à l'étape ci-dessus à `accessToken` et le jeton d'accès pour Public Transportation Open Data Center à `secrets`.

```html
<body>
  <div id="mini-tokyo-3d" style="width: 400px; height: 400px;"></div>

  <script>
    const options = {
      container: 'mini-tokyo-3d',
      accessToken: '<jeton d’accès Mapbox>',
      secrets: {
        odpt: '<jeton d’accès pour Public Transportation Open Data Center>'
      }
    };
    const map = new mt3d.Map(options);
  </script>
</body>
```

## Intégration dans une application en tant que module

Pour intégrer Mini Tokyo 3D dans le code de votre application à l'aide d'un bundler, suivez les étapes ci-dessous.

Tout d’abord, installez le module npm de Mini Tokyo 3D et enregistrez-le dans le `package.json` de votre application.

```bash
npm install mini-tokyo-3d --save
```

Si vous souhaitez charger le module dans le style CommonJS, vous devez inclure ce qui suit au début de votre code.

```js
const {Map} = require('mini-tokyo-3d');
```

Pour charger le module dans le style ES6, vous devez inclure ce qui suit au début de votre code.

```js
import {Map} from 'mini-tokyo-3d';
```

Dans le code de votre application, vous devez initialiser l'objet Map comme suit. `container` de l'objet `options` représente l'ID de l'élément HTML dans lequel Mini Tokyo 3D restituera la carte. Vous devez également spécifier le jeton d'accès Mapbox obtenu à l'étape ci-dessus à `accessToken`, et le jeton d'accès pour Public Transportation Open Data Center à `secrets`.

```js
const options = {
  container: '<ID de l’élément conteneur>',
  accessToken: '<jeton d’accès Mapbox>',
  secrets: {
    odpt: '<jeton d’accès pour Public Transportation Open Data Center>'
  }
};
const map = new Map(options);
```

## Ajout de plugins

Une variété de [plugins](../user-guide/plugins.md) sont disponibles pour afficher des informations supplémentaires sur la carte 3D. Les plugins sont fournis séparément de Mini Tokyo 3D et peuvent être installés au moment de l'installation du site ou de la création de l'application, selon vos préférences. À titre d'exemple, ce qui suit montre comment incorporer [plugin de précipitations](https://github.com/nagix/mt3d-plugin-precipitation) et [plugin de feux d'artifice](https://github.com/nagix/mt3d-plugin-fireworks).

Pour les intégrer directement dans une page web, chargez les plugins dans l'élément `<head>` du fichier HTML et initialisez l'objet Map en précisant la propriété `plugins` comme suit.

```html
  <script src="https://cdn.jsdelivr.net/npm/mt3d-plugin-precipitation@latest/dist/mt3d-plugin-precipitation.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mt3d-plugin-fireworks@latest/dist/mt3d-plugin-fireworks.min.js"></script>
```

```html
  <script>
    const options = {
      /* ... */
      plugins: [mt3dPrecipitation(), mt3dFireworks()]
    };
    const map = new mt3d.Map(options);
  </script>
```

Si vous souhaitez les inclure dans votre application sous forme de modules, veuillez suivre les étapes ci-dessous pour créer votre application.

Si vous souhaitez charger les modules dans le style CommonJS, vous devez inclure ce qui suit au début de votre code.

```js
const mt3dPrecipitation = require('mt3d-plugin-precipitation');
const mt3dFireworks = require('mt3d-plugin-fireworks');
```

Pour charger les modules dans le style ES6, vous devez inclure ce qui suit au début de votre code.

```js
import mt3dPrecipitation from 'mt3d-plugin-precipitation';
import mt3dFireworks from 'mt3d-plugin-fireworks';
```

Dans votre code d'application, initialisez l'objet Map en spécifiant la propriété `plugins` comme suit.

```js
const options = {
  /* ... */
  plugins: [mt3dPrecipitation(), mt3dFireworks()]
};
const map = new Map(options);
```