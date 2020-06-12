# Mini Tokyo 3D Developer Guide

日本語版は[こちら](DEVELOPER_GUIDE-ja.md)でご覧いただけます。

This document describes how developers can embed Mini Tokyo 3D into their web page and integrate it into their applications. If you want to know how to use Mini Tokyo 3D itself, see the [Mini Tokyo 3D User Guide](USER_GUIDE-en.md).

## How to Integrate Mini Tokyo 3D

Embedding Mini Tokyo 3D into a web page, or using the APIs to customize it, is very simple. Please follow the instructions in this section to get started.

### Preparation for Use

Mini Tokyo 3D works on all major browsers that support ES6. Internet Explorer is not supported.

#### Getting a Mapbox Access Token

Mini Tokyo 3D uses the [Mapbox](https://www.mapbox.com) service for its map tiles, so you will need a Mapbox access token to use it. It uses [Map Loads for Web](https://www.mapbox.com/pricing/#maploads) sessions, which are free for up to 50,000 connections per month. Follow the steps below to get an access token.

1. Create a Mapbox account by entering your user information on the [sign-up page](https://account.mapbox.com/auth/signup/).
2. After logging in with your Mapbox account, click on "Tokens" in the menu at the top of the screen to view the list of access tokens. Only the "Default public token" will be displayed right after creating the account.
3. Click on the "Create a token" button in the upper right corner of the screen to go to the page for creating an access token.
4. In the "Token name" field, enter your web site name, app name, or any other name you want.
5. The "Token scopes" should be the default setting (all public scopes should be checked).
6. Enter the URL of the site where you want to install Mini Tokyo 3D in the "URL" field in the "Token restrictions" section, and then click the "Add URL" button. For the URL format, please refer to the [URL restrictions](https://docs.mapbox.com/accounts/overview/tokens/#url-restrictions). By setting this URL restriction, you can prevent other sites from using this access token for their own purposes.
7. Finally, click the "Create token" button at the bottom of the screen and the newly created token will appear in the list of access tokens.

### Embedding Directly Into a Web Page

If you simply want to display a Mini Tokyo 3D map on your web page, you can edit the HTML file as follows.

First, use the jsDelivr CDN link to load the Mini Tokyo 3D style sheet and JavaScript code within the `<head>` element of the HTML file.

```html
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.js"></script>
</head>
```

Within the `<body>` element of the same HTML file, add an HTML element with an `id` (a `<div>` element in the example below), and write JavaScript code to create a Mini Tokyo 3D instance in the `<script>` element. Specify the `id` of the HTML element to `container` of the `options` object passed to the constructor. In addition, specify the Mapbox access token obtained in the above step to `secrets.mapbox`.

```html
<body>
  <div id="mini-tokyo-3d" style="width: 400px; height: 400px;"></div>

  <script>
    const options = {
      container: 'mini-tokyo-3d',
      secrets: {
        mapbox: '<Mapbox access token>'
      }
    };
    const mt3d = new MiniTokyo3D(options);
  </script>
</body>
```

### Embedding Into an App as a Module

To embed Mini Tokyo 3D into your application code using a bundler, follow the steps below.

First, install the npm module of Mini Tokyo 3D and register it to your application's `package.json`.

```bash
npm install mini-tokyo-3d --save
```

If you want to load the module in the CommomJS style, you need to include the following at the beginning of your code.

```js
const MiniTokyo3D = require('mini-tokyo-3d');
```

To load the module in the ES6 style, you need to include the following at the beginning of your code.

```js
import MiniTokyo3D from 'mini-tokyo-3d';
```

In your application code, you need to initialize the MiniTokyo3D object as follows. `container` of the `options` object represents the ID of the HTML element in which Mini Tokyo 3D will render the map. You also need to specify the Mapbox access token obtained in the above step to `secrets.mapbox`.

```js
const options = {
  container: '<container element ID>',
  secrets: {
    mapbox: '<Mapbox access token>'
  }
};
const mt3d = new MiniTokyo3D(options);
```

## Mini Tokyo 3D API

Using Mini Tokyo 3D API in JavaScript, you can customize Mini Tokyo 3D in a variety of ways. As of the version 2.1, only the constructor options of the `MiniTokyo3D` object are supported.

**Note**: The Mini Tokyo 3D API is currently in beta. Due to the possibility of API changes, compatibility between versions is not guaranteed.

### MiniTokyo3D

The `MiniTokyo3D` object represents the Mini Tokyo 3D map on your page. You create a `MiniTokyo3D` by specifying a `container` and other `options`. Then Mini Tokyo 3D initializes the map on the page and returns your `MiniTokyo3D` object.

```js
new MiniTokyo3D(options: Object)
```

#### Parameters

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Name | Description
--- | ---
**`options.container`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | The `id` of the HTML element in which Mini Tokyo 3D will render the map
**`options.secrets`**<br>[`Secrets`](#secrets) | An object to store the access tokens used to retrieve data
**`options.lang`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [IETF language tag](https://en.wikipedia.org/wiki/IETF_language_tag) for the language. If not specified, the browser's default language is used. Currently `'ja'`, `'en'`, `'ko'`, `'zh-Hans'`, `'zh-Hant'`, `'th'` and `'ne'` are supported. If an unsupported language is specified, then 'en' is used.
**`options.dataUrl`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | Mini Tokyo 3D data URL. If not specified, `'https://minitokyo3d.com/data'` will be used.
**`options.clockControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the date and time display will be added to the map
**`options.searchControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the search button will be added to the map
**`options.navigationControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the navigation buttons will be added to the map
**`options.fullscreenControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the fullscreen button will be added to the map
**`options.modeControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the mode switch buttons will be added to the map
**`options.infoControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the app info button will be added to the map
**`options.trackingMode`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)<br>default: `'helicopter'` | The initial tracking mode. `'helicopter'` and `'train'` are supported.
**`options.center`**<br>[`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/#lnglatlike)<br>default: `[139.7670, 35.6814]` | The initial geographical center point of the map. If not specified, it will default to around Tokyo station (`[139.7670, 35.6814]`). Note: Mini Tokyo 3D uses longitude, latitude coordinate order to match GeoJSON.
**`options.zoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>default: `14` | The initial zoom level of the map. If not specified, it will default to `14`.
**`options.bearing`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>default: `0` | The initial bearing (rotation) of the map, measured in degrees counter-clockwise from north. If not specified, it will default to the true north (`0`).
**`options.pitch`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>default: `60` | The initial pitch (tilt) of the map, measured in degrees away from the plane of the screen (0-60). If not specified, it will default to `60`.
**`options.frameRate`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>default: `60` | Frame rate for train and airplane animations (frames per second). Specify on a scale of 1 to 60. Lower values result in less smoother animations and lower CPU resource usage, thus reducing battery consumption on mobile devices. If not specified, it will default to `60`.

### Secrets

The `Secrets` object is an object that stores the access tokens used to retrieve data and is set to the `MiniTokyo3D` constructor option `secrets`.

#### Properties

**`tokyochallenge`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : Access token for the [Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/). If not specified, the default token will be used.

**`odpt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) : Access token for the [Public Transportation Open Data Center](https://www.odpt.org). If not specified, the default token will be used.

**`mapbox`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : Access token for [Mapbox](https://www.mapbox.com). If you don't specify this token, an error will occur when loading the map, so make sure to get an access token specific to your web site.

## Building Mini Tokyo 3D

If you want to try out the latest features before they are released, modify the code yourself, or contribute to Mini Tokyo 3D development, you can build your project from source code by following the instructions in this section.

### Preparation for Build

The following software are required.

- The latest version of [Node.js](https://nodejs.org)
- The latest version of [Git](https://git-scm.com) if you're cloning the repository

Mini Tokyo 3D uses the following data sources and requires an access token for each of them at build time. Follow the instructions below to obtain access tokens.

Data Source | Sign-Up URL | Access Token Format
--- | --- | ---
[Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/) | [Link](https://developer-tokyochallenge.odpt.org/en/users/sign_up) | A string of numbers and lowercase letters
[Public Transportation Open Data Center](https://www.odpt.org) | [Link](https://developer.odpt.org/en/users/sign_up) | A string of numbers and lowercase letters
[Mapbox](https://www.mapbox.com) | [Link](https://account.mapbox.com/auth/signup/) | Alphanumeric string containing a period beginning with `pk.`

#### Getting an Access Token for Open Data Challenge for Public Transportation in Tokyo

Mini Tokyo 3D is using train and airplane data from the [Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/). You need to register as a developer to get the data, but it is available for free.

1. Register as a developer by entering your user information on the [developer site's registration page](https://developer-tokyochallenge.odpt.org/en/users/sign_up). It may take a few days to receive your registration confirmation email.
2. After logging in with your developer account, click on "Account" in the menu at the top of the screen and select "Manage Access Token".
3. A list of access tokens will be displayed. Only the "DefaultApplication" token will be displayed right after creating the account. Click on "Issuing an access token".
4. Enter an application name in the "Name" field and click the "Submit" button.
5. The newly created token will appear in the list of access tokens

#### Getting an Access Token for Public Transportation Open Data Center

Mini Tokyo 3D is also using data from the [Public Transportation Open Data Center](https://www.odpt.org). Again, you need to register as a developer to get the data, but it is available for free.

1. Register as a developer by entering your user information on the [developer site's registration page](https://developer.odpt.org/en/users/sign_up). It may take a few days to receive your registration confirmation email.
2. After logging in with your developer account, click on "Account" in the menu at the top of the screen and select "Manage Access Token".
3. A list of access tokens will be displayed. Only the "DefaultApplication" token will be displayed right after creating the account. Click on "Issuing an access token".
4. Enter an application name in the "Name" field and click the "Submit" button.
5. The newly created token will appear in the list of access tokens

#### Getting an Access Token for Mapbox

See [Getting a Mapbox Access Token](#getting-a-mapbox-access-token).

### Build Instructions

#### 1. Downloading Files

Download the latest `master` branch from Mini Tokyo 3D's [GitHub repository](https://github.com/nagix/mini-tokyo-3d) and extract the zip file. A directory named `mini-tokyo-3d-master` will be created, so change the name to `mini-tokyo-3d`.

```bash
curl -LO https://github.com/nagix/mini-tokyo-3d/archive/master.zip
unzip master.zip
mv mini-tokyo-3d-master mini-tokyo-3d
```

If you are using Git, you can clone the repository directly from GitHub instead of the above commands.

```bash
git clone https://github.com/nagix/mini-tokyo-3d.git
```

#### 2. Build

Go to the top directory of Mini Tokyo 3D.

```bash
cd mini-tokyo-3d
```

Create a JSON file containing the access tokens obtained in the build preparation step and save it in this directory with the file name `secrets`.

```json
{
    "tokyochallenge": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "odpt": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "mapbox": "pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxx"
}
```

Install the dependent npm modules.

```bash
npm install
```

Build the project with the following command.

```bash
npm run build-all
```

When the build completes successfully, the `dist` directory will be created. It includes style sheet and JavaScript files for distribution. The `build` directory will also be created at the same time. It contains all the files needed for deployment on your web site.

#### 3. Deploying on a Web Site

The `index.html` in the `build` directory is for the web page on [https://minitokyo3d.com](http://minitokyo3d.com). Edit it for your web site, and place all the files in the `build` directory in the public directory of your web server.

