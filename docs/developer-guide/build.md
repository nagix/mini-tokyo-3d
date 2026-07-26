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

When the build completes successfully, the `dist` directory will be created. It includes the style sheet, JavaScript files, and the `assets` directory (containing the map style and localization dictionaries) for distribution. The `build` directory will also be created at the same time. It contains all the files needed for deployment on your web site.

## Development Server

While working on the source code, you can run a development server that builds an unminified bundle with source maps, serves it locally, and rebuilds it whenever a file changes. This is more convenient than running `npm run build-all` after every edit.

Because the default Mapbox access token is restricted to specific domains and does not work on `localhost`, you need to supply your own token through the `MAPBOX_ACCESS_TOKEN` environment variable.

```bash
MAPBOX_ACCESS_TOKEN=<Mapbox access token> npm run dev
```

Open `http://localhost:9966/` in your browser. When you edit the source code, the bundle is rebuilt automatically; reload the page to see the changes.

The following optional environment variables are also available.

- `MT3D_PLUGIN_<NAME>`: The path to a built [plugin](../user-guide/plugins.md) file to load on the page. `<NAME>` is one of `PRECIPITATION`, `FIREWORKS`, `LIVECAM`, `PLATEAU` or `GTFS`. Build each plugin in its own repository and point the variable at the resulting file.
- `MT3D_DATA_URL`: The URL the map loads its data from. If it is not set, the map loads the remote data; to test data generated locally instead, run `npm run build-data` first, then set `MT3D_DATA_URL` to `data`. The dev server serves the generated `build/data` directory at the `data` path, and the page loads it from there.

```bash
MAPBOX_ACCESS_TOKEN=<Mapbox access token> \
MT3D_PLUGIN_PRECIPITATION=../mt3d-plugin-precipitation/dist/mt3d-plugin-precipitation.js \
MT3D_DATA_URL=data \
npm run dev
```

Rather than passing these variables on the command line each time, put them in a git-ignored `.env` file (shared) or in `.env.development` / `.env.production` for values specific to development or deployment; see `.env.example` for details. These files are loaded automatically for both `npm run dev` and the deployment build.

## Deploying on a Web Site

You need access tokens for the data sources to deploy and use the built files on your web site. See [Preparation for Use](./integration.md#preparation-for-use) to obtain access tokens for Public Transportation Open Data Center, Open Data Challenge for Public Transportation 2026, and Mapbox.

The `index.html` in the `build` directory is generated from `public/index.html`. Provide the access tokens (and, optionally, a Google Analytics measurement id) through environment variables when building; they are injected into the generated `index.html`.

```bash
MAPBOX_ACCESS_TOKEN=<Mapbox access token> \
MT3D_SECRET_ODPT=<access token for Public Transportation Open Data Center> \
MT3D_SECRET_CHALLENGE=<access token for Open Data Challenge for Public Transportation 2026> \
MT3D_GA_ID=<Google Analytics measurement id> \
npm run build-all
```

As with the [Development Server](#development-server), you can put these variables in a `.env` file instead of passing them on the command line.

Finally, place all the files in the `build` directory in the public directory of your web server.

::: warning
The `index.html` loads the Mini Tokyo 3D [plugins](../user-guide/plugins.md). Build each plugin separately and set the corresponding `MT3D_PLUGIN_<NAME>` environment variable (`<NAME>` is one of `PRECIPITATION`, `FIREWORKS`, `LIVECAM`, `PLATEAU` or `GTFS`) to the path of its built file before running `npm run build-all`. The referenced files are copied into the `build` directory automatically, and plugins whose variable is unset are omitted.
:::
