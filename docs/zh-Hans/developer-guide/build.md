# 构建 Mini Tokyo 3D

如果想在功能发布前体验最新版、自行修改代码或参与 Mini Tokyo 3D 开发，可以按照本节说明从源代码构建项目。

## 构建准备

需要安装以下软件。

- 最新版本的 [Node.js](https://nodejs.org)
- 如果要克隆仓库，还需要最新版本的 [Git](https://git-scm.com)

## 构建步骤

### 1. 下载文件

从 Mini Tokyo 3D 的 [GitHub 仓库](https://github.com/nagix/mini-tokyo-3d)下载最新的 `master` 分支并解压 ZIP 文件。解压后会生成名为 `mini-tokyo-3d-master` 的目录，请将其重命名为 `mini-tokyo-3d`。

```bash
curl -LO https://github.com/nagix/mini-tokyo-3d/archive/master.zip
unzip master.zip
mv mini-tokyo-3d-master mini-tokyo-3d
```

如果使用 Git，可以直接从 GitHub 克隆仓库，无需执行上述命令。

```bash
git clone https://github.com/nagix/mini-tokyo-3d.git
```

### 2. 构建

进入 Mini Tokyo 3D 的顶层目录。

```bash
cd mini-tokyo-3d
```

安装项目依赖的 npm 模块。

```bash
npm install
```

使用以下命令构建项目。

```bash
npm run build-all
```

构建成功后会生成 `dist` 目录，其中包含用于分发的样式表、JavaScript 文件和 `assets` 目录（其中包含地图样式和本地化词典）。同时还会生成 `build` 目录，其中包含部署到网站所需的全部文件。

## 开发服务器

处理源代码时，可以运行开发服务器。它会构建带有 source map 的未压缩 bundle，在本地提供服务，并在文件发生变化时重新构建。与每次编辑后都运行 `npm run build-all` 相比，这种方式更方便。

默认的 Mapbox 访问令牌仅限特定域名使用，无法在 `localhost` 上工作，因此需要通过 `MAPBOX_ACCESS_TOKEN` 环境变量提供自己的令牌。

```bash
MAPBOX_ACCESS_TOKEN=<Mapbox 访问令牌> npm run dev
```

在浏览器中打开 `http://localhost:9966/`。编辑源代码后，bundle 会自动重新构建；刷新页面即可查看更改。

还可以使用以下可选环境变量。

- `MT3D_PLUGIN_<NAME>`：要在页面上加载的已构建[插件](../user-guide/plugins.md)文件路径。`<NAME>` 可以是 `PRECIPITATION`、`FIREWORKS`、`LIVECAM`、`PLATEAU` 或 `GTFS`。请在各插件自己的仓库中构建插件，并将变量指向生成的文件。
- `MT3D_DATA_URL`：地图加载数据的网址。省略时，地图会加载远程数据；如需测试本地生成的数据，请先运行 `npm run build-data`，再将 `MT3D_DATA_URL` 设为 `data`。开发服务器会在 `data` 路径提供生成的 `build/data` 目录，页面将从该位置加载数据。

```bash
MAPBOX_ACCESS_TOKEN=<Mapbox 访问令牌> \
MT3D_PLUGIN_PRECIPITATION=../mt3d-plugin-precipitation/dist/mt3d-plugin-precipitation.js \
MT3D_DATA_URL=data \
npm run dev
```

如果不想每次都在命令行传入这些变量，可以将其放入 Git 忽略的 `.env` 文件（共享配置），或放入 `.env.development` / `.env.production`，分别保存开发或部署专用的值。详情请参阅 `.env.example`。`npm run dev` 和部署构建都会自动加载这些文件。

## 部署到网站

要将构建文件部署到网站并运行，需要数据源访问令牌。请参阅[使用前的准备](./integration.md#使用前的准备)，获取公共交通开放数据中心、公共交通开放数据挑战赛 2026 和 Mapbox 的访问令牌。

`build` 目录中的 `index.html` 由 `public/index.html` 生成。构建时通过环境变量提供访问令牌（以及可选的 Google Analytics 衡量 ID），这些值会注入生成的 `index.html`。

```bash
MAPBOX_ACCESS_TOKEN=<Mapbox 访问令牌> \
MT3D_SECRET_ODPT=<公共交通开放数据中心访问令牌> \
MT3D_SECRET_CHALLENGE=<公共交通开放数据挑战赛 2026 访问令牌> \
MT3D_GA_ID=<Google Analytics 衡量 ID> \
npm run build-all
```

与[开发服务器](#开发服务器)相同，也可以将这些变量放入 `.env` 文件，而不必在命令行中传入。

最后，将 `build` 目录中的所有文件放入 Web 服务器的公开目录。

::: warning 注意
`index.html` 会加载 Mini Tokyo 3D [插件](../user-guide/plugins.md)。请分别构建各插件，并在运行 `npm run build-all` 前，将相应的 `MT3D_PLUGIN_<NAME>` 环境变量（`<NAME>` 可以是 `PRECIPITATION`、`FIREWORKS`、`LIVECAM`、`PLATEAU` 或 `GTFS`）设为已构建文件的路径。引用的文件会自动复制到 `build` 目录，未设置变量的插件则会被省略。
:::
