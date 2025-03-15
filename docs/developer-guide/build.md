# Building Mini Tokyo 3D

If you want to try out the latest features before they are released, modify the code yourself, or contribute to Mini Tokyo 3D development, you can build your project from source code by following the instructions in this section.

## Preparation for Build

The following software are required.

- The latest version of [Node.js](https://nodejs.org)
- The latest version of [Git](https://git-scm.com) if you're cloning the repository

## Build Instructions

### 1. Downloading Files

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

### 2. Build

Go to the top directory of Mini Tokyo 3D.

```bash
cd mini-tokyo-3d
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

## Deploying on a Web Site

You need access tokens for the data sources to deploy and use the built files on your web site. See [Preparation for Use](./integration.md#preparation-for-use) to obtain access tokens for Public Transportation Open Data Center and Mapbox.

The `index.html` in the `build` directory is for the web page on [https://minitokyo3d.com](http://minitokyo3d.com). In `index.html`, add the `accessToken` and `secrets` properties to the object passed to the `Map` constructor, and specify the Mapbox access token for the `accessToken` and the access token for Public Transportation Open Data Center for the `secrets`.

```js
map = new mt3d.Map({
  /* ... */
  accessToken: '<Mapbox access token>',
  secrets: {
    odpt: '<access token for Public Transportation Open Data Center>'
  }
});
```

Then, edit it for your web site, and place all the files in the `build` directory in the public directory of your web server.

::: warning
Since `index.html` also uses the Mini Tokyo 3D [plugins](../user-guide/plugins.md), you must separately build the JavaScript files for each plugin and place them in the `build` directory.
:::
