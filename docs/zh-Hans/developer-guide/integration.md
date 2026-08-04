# 如何集成 Mini Tokyo 3D

将 Mini Tokyo 3D 嵌入网页，或使用 API 对其进行自定义都非常简单。请按照本节说明开始使用。

## 使用前的准备

Mini Tokyo 3D 可在所有支持 ES2020 的主流浏览器中运行。不支持 Internet Explorer。

Mini Tokyo 3D 在运行时会使用以下数据源，并要求为每个数据源提供访问令牌。请按照下方说明获取访问令牌。

数据源 | 注册网址 | 访问令牌格式
:-- | :-- | :--
[公共交通开放数据中心](https://www.odpt.org/) | [链接](https://developer.odpt.org/signup) | 由数字和小写字母组成的字符串
公共交通开放数据中心<br>（[公共交通开放数据挑战赛 2026](https://challenge2026.odpt.org/)） | [链接](https://developer.odpt.org/signup) | 由数字和小写字母组成的字符串
[Mapbox](https://www.mapbox.com) | [链接](https://account.mapbox.com/auth/signup/) | 以 `pk.` 开头、包含句点的字母数字字符串

### 获取公共交通开放数据中心访问令牌

Mini Tokyo 3D 使用[公共交通开放数据中心](https://www.odpt.org/)提供的列车和飞机数据。你需要注册开发者账号才能获取数据，但数据可免费使用。

1. 在[开发者网站的注册页面](https://developer.odpt.org/signup)填写用户信息，注册开发者账号。注册确认邮件可能需要数日才能收到。
2. 使用开发者账号登录后，从屏幕右上角“Logged in”菜单中选择“Access Token for ODPT Center”。
3. 页面将显示 ODPT Center 访问令牌列表。账号刚创建时只会显示“DefaultApplication”令牌。单击“Add”。
4. 在“Name”字段输入应用名称，然后单击“Update”按钮。
5. 新创建的令牌会出现在访问令牌列表中。

### 获取公共交通开放数据挑战赛 2026 访问令牌

公共交通开放数据中心还为[公共交通开放数据挑战赛 2026](https://challenge2026.odpt.org/)提供额外的列车和飞机数据，需要使用专用访问令牌获取。你需要报名参加挑战赛才能获得专用访问令牌，但数据可免费使用。

1. 按照公共交通开放数据中心[开发者网站](https://developer.odpt.org)上的说明报名参加挑战赛。
2. 从屏幕右上角“Logged in”菜单中选择“Access Token for Challenge 2026”。
3. 页面将显示 Challenge 2026 访问令牌列表。刚报名时只会显示“Challenge2026DefaultApplication”令牌。单击“Add”。
4. 在“Name”字段输入应用名称，然后单击“Update”按钮。
5. 新创建的令牌会出现在访问令牌列表中。

### 获取 Mapbox 访问令牌

Mini Tokyo 3D 使用 [Mapbox](https://www.mapbox.com) 服务提供地图瓦片，因此需要 Mapbox 访问令牌。它使用 [Map Loads for Web](https://www.mapbox.com/pricing/#maploads) 会话，每月 50,000 次连接以内可免费使用。请按照以下步骤获取访问令牌。

1. 在[注册页面](https://account.mapbox.com/auth/signup/)填写用户信息，创建 Mapbox 账号。
2. 使用 Mapbox 账号登录后，单击屏幕顶部菜单中的“Tokens”，查看访问令牌列表。账号刚创建时只会显示“Default public token”。
3. 单击“Create a token”按钮，进入访问令牌创建页面。
4. 在“Token name”字段输入网站名称、应用名称或其他自定义名称。
5. “Token scopes”保持默认设置（勾选所有 public scope）。
6. 在“Token restrictions”部分的“URL”字段中输入要安装 Mini Tokyo 3D 的网站网址，然后单击“Add URL”按钮。网址格式请参阅 [URL restrictions](https://docs.mapbox.com/accounts/overview/tokens/#url-restrictions)。设置网址限制可以防止其他网站将该访问令牌用于自己的用途。
7. 最后，单击页面底部的“Create token”按钮，新创建的令牌会出现在访问令牌列表中。

## 直接嵌入网页

如果只想在网页上显示 Mini Tokyo 3D 地图，可以按以下方式编辑 HTML 文件。

首先，在 HTML 文件的 `<head>` 元素中，通过 jsDelivr CDN 链接加载 Mini Tokyo 3D 样式表和 JavaScript 代码。

```html
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.js"></script>
</head>
```

在同一 HTML 文件的 `<body>` 元素中，添加一个具有 `id` 的 HTML 元素（下例使用 `<div>` 元素），并在 `<script>` 元素中编写创建 Map 实例的 JavaScript 代码。将 HTML 元素的 `id` 指定给传入构造函数的 `options` 对象的 `container`。此外，将上一步获取的 Mapbox 访问令牌指定给 `accessToken`，将公共交通开放数据中心和公共交通开放数据挑战赛 2026 的访问令牌指定给 `secrets`。

```html
<body>
  <div id="mini-tokyo-3d" style="width: 400px; height: 400px;"></div>

  <script>
    const options = {
      container: 'mini-tokyo-3d',
      accessToken: '<Mapbox 访问令牌>',
      secrets: {
        odpt: '<公共交通开放数据中心访问令牌>',
        challenge: '<公共交通开放数据挑战赛 2026 访问令牌>'
      }
    };
    const map = new mt3d.Map(options);
  </script>
</body>
```

## 作为模块嵌入应用

要使用打包工具将 Mini Tokyo 3D 嵌入应用代码，请按照以下步骤操作。

首先，安装 Mini Tokyo 3D npm 模块，并将其登记到应用的 `package.json` 中。

```bash
npm install mini-tokyo-3d --save
```

要以 CommonJS 方式加载模块，请在代码开头加入以下内容。

```js
const {Map} = require('mini-tokyo-3d');
```

要以 ES6 方式加载模块，请在代码开头加入以下内容。

```js
import {Map} from 'mini-tokyo-3d';
```

在应用代码中，按以下方式初始化 Map 对象。`options` 对象的 `container` 表示 Mini Tokyo 3D 用于渲染地图的 HTML 元素 ID。还需要将上一步获取的 Mapbox 访问令牌指定给 `accessToken`，将公共交通开放数据中心和公共交通开放数据挑战赛 2026 的访问令牌指定给 `secrets`。

```js
const options = {
  container: '<容器元素 ID>',
  accessToken: '<Mapbox 访问令牌>',
  secrets: {
    odpt: '<公共交通开放数据中心访问令牌>',
    challenge: '<公共交通开放数据挑战赛 2026 访问令牌>'
  }
};
const map = new Map(options);
```

Mini Tokyo 3D 会从所加载脚本旁边的 `assets` 文件夹（通过 `import.meta.url` 解析）加载地图样式（`style.json`）和本地化词典（`dictionary-<lang>.json`）。按上一节所示使用 jsDelivr CDN 时，这些文件会自动由 CDN 提供。将 Mini Tokyo 3D 打包到自己的应用中时，请让 `mini-tokyo-3d/dist/assets` 中随附的 `assets` 文件夹位于输出 bundle 旁边，例如将其复制到构建输出目录中。

## 添加插件

Mini Tokyo 3D 提供多种[插件](../user-guide/plugins.md)，用于在 3D 地图上显示附加信息。插件与 Mini Tokyo 3D 分开提供，可根据需要在部署网站或构建应用时安装。以下以集成[降水插件](https://github.com/nagix/mt3d-plugin-precipitation)和[烟花插件](https://github.com/nagix/mt3d-plugin-fireworks)为例。

要将插件直接集成到网页中，请在 HTML 文件的 `<head>` 元素中加载插件，并通过指定 `plugins` 属性初始化 Map 对象，如下所示。

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

如果要将插件作为模块包含在应用中，请按照以下步骤构建应用。

要以 CommonJS 方式加载模块，请在代码开头加入以下内容。

```js
const mt3dPrecipitation = require('mt3d-plugin-precipitation');
const mt3dFireworks = require('mt3d-plugin-fireworks');
```

要以 ES6 方式加载模块，请在代码开头加入以下内容。

```js
import mt3dPrecipitation from 'mt3d-plugin-precipitation';
import mt3dFireworks from 'mt3d-plugin-fireworks';
```

在应用代码中，通过指定 `plugins` 属性初始化 Map 对象，如下所示。

```js
const options = {
  /* ... */
  plugins: [mt3dPrecipitation(), mt3dFireworks()]
};
const map = new Map(options);
```
