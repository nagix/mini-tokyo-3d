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

构建成功后会生成 `dist` 目录，其中包含用于分发的样式表和 JavaScript 文件。同时还会生成 `build` 目录，其中包含部署到网站所需的全部文件。

## 部署到网站

要将构建文件部署到网站并运行，需要数据源访问令牌。请参阅[使用前的准备](./integration.md#使用前的准备)，获取公共交通开放数据中心、公共交通开放数据挑战赛 2026 和 Mapbox 的访问令牌。

`build` 目录中的 `index.html` 是用于 [https://minitokyo3d.com](http://minitokyo3d.com) 的网页。在 `index.html` 中，为传入 `Map` 构造函数的对象添加 `accessToken` 和 `secrets` 属性：在 `accessToken` 中指定 Mapbox 访问令牌，在 `secrets` 中指定公共交通开放数据中心和公共交通开放数据挑战赛 2026 的访问令牌。

```js
map = new mt3d.Map({
  /* ... */
  accessToken: '<Mapbox 访问令牌>',
  secrets: {
    odpt: '<公共交通开放数据中心访问令牌>',
    challenge: '<公共交通开放数据挑战赛 2026 访问令牌>'
  }
});
```

然后根据你的网站需求进行编辑，并将 `build` 目录中的所有文件放入 Web 服务器的公开目录。

::: warning 注意
由于 `index.html` 还使用 Mini Tokyo 3D [插件](../user-guide/plugins.md)，必须分别构建各插件的 JavaScript 文件，并将它们放入 `build` 目录。
:::
