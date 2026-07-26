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

ビルドが正常に完了すると、`dist` ディレクトリが作成されます。この中には配布用のスタイルシート、JavaScript ファイル、および `assets` ディレクトリ（マップスタイルとローカライズ辞書を含む）が含まれています。また、同時に `build` ディレクトリも作成されます。この中には Web サイトへの設置に必要なすべてのファイルが含まれています。

## 開発サーバー

ソースコードを編集しながら作業する場合、ソースマップ付きの非圧縮バンドルをビルドしてローカルで配信し、ファイルが変更されるたびに再ビルドする開発サーバーを実行できます。編集のたびに `npm run build-all` を実行するよりも便利です。

デフォルトの Mapbox アクセストークンは特定のドメインに制限されており `localhost` では動作しないため、`MAPBOX_ACCESS_TOKEN` 環境変数で自分のトークンを指定する必要があります。

```bash
MAPBOX_ACCESS_TOKEN=<Mapbox アクセストークン> npm run dev
```

ブラウザで `http://localhost:9966/` を開きます。ソースコードを編集するとバンドルが自動的に再ビルドされるので、ページを再読み込みすると変更が反映されます。

次のオプションの環境変数も利用できます。

- `MT3D_PLUGIN_<NAME>`: ページに読み込むビルド済み[プラグイン](../user-guide/plugins.md)ファイルへのパス。`<NAME>` は `PRECIPITATION`、`FIREWORKS`、`LIVECAM`、`PLATEAU`、`GTFS` のいずれかです。各プラグインはそれぞれのリポジトリでビルドし、生成されたファイルを指すように設定します。
- `MT3D_DATA_URL`: マップがデータを読み込む URL。指定しない場合はリモートのデータを読み込みます。ローカルで生成したデータをテストしたい場合は、まず `npm run build-data` を実行し、`MT3D_DATA_URL` を `data` に設定します。開発サーバーは生成された `build/data` ディレクトリを `data` パスで配信し、それがページで読み込まれます。

```bash
MAPBOX_ACCESS_TOKEN=<Mapbox アクセストークン> \
MT3D_PLUGIN_PRECIPITATION=../mt3d-plugin-precipitation/dist/mt3d-plugin-precipitation.js \
MT3D_DATA_URL=data \
npm run dev
```

これらの変数を毎回コマンドラインで渡す代わりに、Git 管理外の `.env` ファイル（共通）や、開発・デプロイに固有の値については `.env.development` / `.env.production` に記述することもできます。詳細は `.env.example` を参照してください。これらのファイルは `npm run dev` とデプロイ用ビルドの両方で自動的に読み込まれます。

## Web サイトへの設置

ビルドしたファイルを Web サイトに設置して使用するには、データソースに対するアクセストークンが必要です。[使用の準備](./integration.md#%E4%BD%BF%E7%94%A8%E3%81%AE%E6%BA%96%E5%82%99)を参照して、公共交通オープンデータセンターアクセストークン、公共交通オープンデータチャレンジ2026アクセストークン、Mapbox アクセストークンを取得してください。

`build` ディレクトリの `index.html` は `public/index.html` から生成されます。ビルド時に環境変数でアクセストークン（および任意で Google Analytics 測定 ID）を指定すると、生成される `index.html` に埋め込まれます。

```bash
MAPBOX_ACCESS_TOKEN=<Mapbox アクセストークン> \
MT3D_SECRET_ODPT=<公共交通オープンデータセンターアクセストークン> \
MT3D_SECRET_CHALLENGE=<公共交通オープンデータチャレンジ2026アクセストークン> \
MT3D_GA_ID=<Google Analytics 測定 ID> \
npm run build-all
```

[開発サーバー](#%E9%96%8B%E7%99%BA%E3%82%B5%E3%83%BC%E3%83%8F%E3%82%99%E3%83%BC)の場合と同様に、これらの変数はコマンドラインで渡す代わりに `.env` ファイルで指定することもできます。

最後に `build` ディレクトリのファイル全てを Web サーバの公開ディレクトリに配置してください。

::: warning 注意
`index.html` は Mini Tokyo 3D [プラグイン](../user-guide/plugins.md)を読み込みます。各プラグインを個別にビルドし、`npm run build-all` を実行する前に対応する `MT3D_PLUGIN_<NAME>` 環境変数（`<NAME>` は `PRECIPITATION`、`FIREWORKS`、`LIVECAM`、`PLATEAU`、`GTFS` のいずれか）にそのビルド済みファイルのパスを設定します。参照されたファイルは自動的に `build` ディレクトリにコピーされ、変数が設定されていないプラグインは省略されます。
:::
