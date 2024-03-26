# How to Integrate Mini Tokyo 3D

Embedding Mini Tokyo 3D into a web page, or using the APIs to customize it, is very simple. Please follow the instructions in this section to get started.

## Preparation for Use

Mini Tokyo 3D works on all major browsers that support ES2018. Internet Explorer is not supported.

### Getting a Mapbox Access Token

Mini Tokyo 3D uses the [Mapbox](https://www.mapbox.com) service for its map tiles, so you will need a Mapbox access token to use it. It uses [Map Loads for Web](https://www.mapbox.com/pricing/#maploads) sessions, which are free for up to 50,000 connections per month. Follow the steps below to get an access token.

1. Create a Mapbox account by entering your user information on the [sign-up page](https://account.mapbox.com/auth/signup/).
2. After logging in with your Mapbox account, click on "Tokens" in the menu at the top of the screen to view the list of access tokens. Only the "Default public token" will be displayed right after creating the account.
3. Click on the "Create a token" button in the upper right corner of the screen to go to the page for creating an access token.
4. In the "Token name" field, enter your web site name, app name, or any other name you want.
5. The "Token scopes" should be the default setting (all public scopes should be checked).
6. Enter the URL of the site where you want to install Mini Tokyo 3D in the "URL" field in the "Token restrictions" section, and then click the "Add URL" button. For the URL format, please refer to the [URL restrictions](https://docs.mapbox.com/accounts/overview/tokens/#url-restrictions). By setting this URL restriction, you can prevent other sites from using this access token for their own purposes.
7. Finally, click the "Create token" button at the bottom of the screen and the newly created token will appear in the list of access tokens.

## Embedding Directly Into a Web Page

If you simply want to display a Mini Tokyo 3D map on your web page, you can edit the HTML file as follows.

First, use the jsDelivr CDN link to load the Mini Tokyo 3D style sheet and JavaScript code within the `<head>` element of the HTML file.

```html
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.js"></script>
</head>
```

Within the `<body>` element of the same HTML file, add an HTML element with an `id` (a `<div>` element in the example below), and write JavaScript code to create a Map instance in the `<script>` element. Specify the `id` of the HTML element to `container` of the `options` object passed to the constructor. In addition, specify the Mapbox access token obtained in the above step to `accessToken`.

```html
<body>
  <div id="mini-tokyo-3d" style="width: 400px; height: 400px;"></div>

  <script>
    const options = {
      container: 'mini-tokyo-3d',
      accessToken: '<Mapbox access token>'
    };
    const map = new mt3d.Map(options);
  </script>
</body>
```

## Embedding Into an App as a Module

To embed Mini Tokyo 3D into your application code using a bundler, follow the steps below.

First, install the npm module of Mini Tokyo 3D and register it to your application's `package.json`.

```bash
npm install mini-tokyo-3d --save
```

If you want to load the module in the CommonJS style, you need to include the following at the beginning of your code.

```js
const {Map} = require('mini-tokyo-3d');
```

To load the module in the ES6 style, you need to include the following at the beginning of your code.

```js
import {Map} from 'mini-tokyo-3d';
```

In your application code, you need to initialize the Map object as follows. `container` of the `options` object represents the ID of the HTML element in which Mini Tokyo 3D will render the map. You also need to specify the Mapbox access token obtained in the above step to `accessToken`.

```js
const options = {
  container: '<container element ID>',
  accessToken: '<Mapbox access token>'
};
const map = new Map(options);
```

## Adding Plugins

A variety of [plugins](../user-guide/plugins.md) are available to display additional information on the 3D map. Plugins are provided separately from Mini Tokyo 3D, and can be installed at the time of site installation or application build, depending on your preference. As an example, the following shows how to incorporate the [Precipitation Plugin](https://github.com/nagix/mt3d-plugin-precipitation) and [Fireworks Plugin](https://github.com/nagix/mt3d-plugin-fireworks).

To integrate them directly into a web page, load the plugins in the `<head>` element of the HTML file and initialize the Map object by specifying the `plugins` property as follows.

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

If you want to include them in your application as modules, please follow the steps below to build your application.

If you want to load the modules in the CommonJS style, you need to include the following at the beginning of your code.

```js
const mt3dPrecipitation = require('mt3d-plugin-precipitation');
const mt3dFireworks = require('mt3d-plugin-fireworks');
```

To load the modules in the ES6 style, you need to include the following at the beginning of your code.

```js
import mt3dPrecipitation from 'mt3d-plugin-precipitation';
import mt3dFireworks  from 'mt3d-plugin-fireworks';
```

In your application code, initialize the Map object by specifying the `plugins` property as follows.

```js
const options = {
  /* ... */
  plugins: [mt3dPrecipitation(), mt3dFireworks()]
};
const map = new Map(options);
```
