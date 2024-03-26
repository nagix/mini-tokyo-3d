# Mini Tokyo 3D の使用

Mini Tokyo 3D を Web ページに埋め込んで利用する、もしくは API を使って操作する方法は非常にシンプルです。まずは、このセクションの説明に従って設定してください。

## 使用の準備

Mini Tokyo 3D は ES2018 に対応した主要ブラウザで動作します。Internet Explorer には非対応です。

### Mapbox アクセストークンの入手

Mini Tokyo 3D は地図タイルに [Mapbox](https://www.mapbox.com) のサービスを利用しているため、利用には Mapbox のアクセストークンが必要です。[Map Loads for Web](https://www.mapbox.com/pricing/#maploads) セッションを利用しており、月間 50,000 接続までは無料です。下記の手順に従って、アクセストークンを入手してください。

1. [サインアップ](https://account.mapbox.com/auth/signup/)ページでユーザー情報を入力して、Mapbox アカウントを作成します。
2. Mapbox アカウントログイン後、画面上部のメニューから「Tokens」をクリックしてアクセストークン一覧を表示します。アカウント作成直後はデフォルトの「Default public token」のみが表示されます。
3. 画面右上の「Create a token」ボタンをクリックして、アクセストークン作成ページに進みます。
4. 「Token name」にはあなたの Web サイト名やアプリ名など、任意の名前を入力します。
5. 「Token scopes」はデフォルト設定（Public scopes にすべてチェックが入った状態）のままにします。
6. 「Token restrictions」の「URL」欄には、Mini Tokyo 3D を設置するサイトの URL を入力して「Add URL」ボタンをクリックします。URL の形式は、[URL restrictions](https://docs.mapbox.com/accounts/overview/tokens/#url-restrictions) を参考にしてください。この URL 制限を設定しておくことで、他のサイトからこのアクセストークンを利用されることを防ぎます。
7. 最後に画面下部の「Create token」ボタンをクリックすると、アクセストークン一覧に新たに作成されたトークンが表示されます。

## 直接 Web ページに組み込む

単純に Web ページに Mini Tokyo 3D のマップを表示するだけであれば、次のように HTML ファイルを編集するだけです。

まず、jsDelivr CDN のリンクを使用して、Mini Tokyo 3D のスタイルシートと JavaScript コードを HTML ファイルの `<head>` エレメント内で読み込みます。

```html
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.js"></script>
</head>
```

同じ HTML ファイルの `<body>` エレメント内で、`id` のついた HTML エレメント（下の例では `<div>` エレメント）を追加し、`<script>` エレメントで Mini Tokyo 3D インスタンスを作成する JavaScript コードを記述します。コンストラクタに渡す `options` オブジェクトの `container` には HTML エレメントの `id` を指定します。また、`accessToken` には、上のステップで入手した Mapbox アクセストークンを指定します。

```html
<body>
  <div id="mini-tokyo-3d" style="width: 400px; height: 400px;"></div>

  <script>
    const options = {
      container: 'mini-tokyo-3d',
      accessToken: '<Mapbox アクセストークン>'
    };
    const map = new mt3d.Map(options);
  </script>
</body>
```

## モジュールとしてアプリに組み込む

バンドラーを使って Mini Tokyo 3D を自分のアプリケーションのコードに組み込む場合には、次の手順に従ってください。

まず、Mini Tokyo 3D の npm モジュールをインストールし、あなたのアプリケーションの `package.json` に登録します。

```bash
npm install mini-tokyo-3d --save
```

CommonJS 形式でモジュールを読み込む場合は、コードの先頭で次のように記載します。

```js
const {Map} = require('mini-tokyo-3d');
```

ES6 形式でモジュールを読み込む場合は、コードの先頭で次のように記載します。

```js
import {Map} from 'mini-tokyo-3d';
```

アプリケーションのコード内で、次のようにして Map オブジェクトを初期化します。`options` オブジェクトの `container` には Mini Tokyo 3D がマップを表示する HTML エレメントの ID を指定します。また、`accessToken` には、上のステップで入手した Mapbox アクセストークンを指定します。

```js
const options = {
  container: '<コンテナエレメントの ID>',
  accessToken: '<Mapbox アクセストークン>'
};
const map = new Map(options);
```

## プラグインの追加

3Dマップ上に付加的な情報を表示する、様々な[プラグイン](../user-guide/plugins.md)が利用可能です。プラグインは Mini Tokyo 3D 本体とは別に提供されており、サイト設置時もしくはアプリケーションビルド時に好みに応じて組み込むことができます。下記では例として、[降水プラグイン](https://github.com/nagix/mt3d-plugin-precipitation)と[花火プラグイン](https://github.com/nagix/mt3d-plugin-fireworks)を組み込む手順を示します。

直接 Web ページに組み込む場合は、次のように HTML ファイルの `<head>` エレメント内でプラグインを読み込み、`plugins` プロパティを指定して Map オブジェクトを初期化します。

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

モジュールとしてアプリに組み込む場合は、次の手順に従ってアプリケーションをビルドしてください。

CommonJS 形式でモジュールを読み込む場合は、コードの先頭で次のように記載します。

```js
const mt3dPrecipitation = require('mt3d-plugin-precipitation');
const mt3dFireworks = require('mt3d-plugin-fireworks');
```

ES6 形式でモジュールを読み込む場合は、コードの先頭で次のように記載します。

```js
import mt3dPrecipitation from 'mt3d-plugin-precipitation';
import mt3dFireworks  from 'mt3d-plugin-fireworks';
```

アプリケーションのコード内で、次のように `plugins` プロパティを指定して Map オブジェクトを初期化します。

```js
const options = {
  /* ... */
  plugins: [mt3dPrecipitation(), mt3dFireworks()]
};
const map = new Map(options);
```
