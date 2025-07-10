# Mini Tokyo 3D のビルド

リリース前の最新版の機能を試したい、自分でコードを改造したい、Mini Tokyo 3D の開発にコントリビュートしたい、という場合には、本セクションの手順に従ってソースコードからプロジェクトをビルドすることができます。

## ビルド準備

次のソフトウェアが必要です。

- [Node.js](https://nodejs.org/ja/) 最新版
- [Git](https://git-scm.com) 最新版（リポジトリをクローンする場合）

## ビルド手順

### 1. ファイルのダウンロード

Mini Tokyo 3D の [GitHub レポジトリ](https://github.com/nagix/mini-tokyo-3d)から `master` ブランチ最新版をダウンロードして、zipファイルを展開します。`mini-tokyo-3d-master` というディレクトリができますが、`mini-tokyo-3d` という名前に変更しておきます。

```bash
curl -LO https://github.com/nagix/mini-tokyo-3d/archive/master.zip
unzip master.zip
mv mini-tokyo-3d-master mini-tokyo-3d
```

もし Git をお使いでしたら、上記のコマンドの代わりに GitHub からリポジトリを直接クローンしても構いません。

```bash
git clone https://github.com/nagix/mini-tokyo-3d.git
```

### 2. ビルド

Mini Tokyo 3D のトップディレクトリに移動します。

```bash
cd mini-tokyo-3d
```

依存 npm モジュールをインストールします。

```bash
npm install
```

次のコマンドでプロジェクトをビルドします。

```bash
npm run build-all
```

ビルドが正常に完了すると、`dist` ディレクトリが作成されます。この中には配布用のスタイルシートおよび JavaScript ファイルが含まれています。また、同時に `build` ディレクトリも作成されます。この中には Web サイトへの設置に必要なすべてのファイルが含まれています。

## Web サイトへの設置

ビルドしたファイルを Web サイトに設置して使用するには、データソースに対するアクセストークンが必要です。[使用の準備](./integration.md#%E4%BD%BF%E7%94%A8%E3%81%AE%E6%BA%96%E5%82%99)を参照して、公共交通オープンデータセンターアクセストークン、公共交通オープンデータチャレンジ2025アクセストークン、Mapbox アクセストークンを取得してください。

`build` ディレクトリに含まれる `index.html` は [https://minitokyo3d.com](http://minitokyo3d.com) 用の Web ページです。`index.html` の中で `Map` コンストラクタに渡されるオブジェクトに `accessToken` プロパティと `secrets` プロパティを追加し、`accessToken` には Mapbox アクセストークン、`secrets` には公共交通オープンデータセンターアクセストークンと公共交通オープンデータチャレンジ2025アクセストークンを指定します。

```js
map = new mt3d.Map({
  /* ... */
  accessToken: '<Mapbox アクセストークン>',
  secrets: {
    odpt: '<公共交通オープンデータセンターアクセストークン>',
    challenge2025: '<公共交通オープンデータチャレンジ2025アクセストークン>'
  }
});
```

そして設置する Web サイトに合わせて編集した上で、`build` ディレクトリのファイル全てを Web サーバの公開ディレクトリに配置してください。

::: warning 注意
`index.html` では Mini Tokyo 3D [プラグイン](../user-guide/plugins.md)も使用しているため、別途各プラグインの JavaScript ファイルをビルドした上で、`build` ディレクトリに配置する必要があります。
:::
