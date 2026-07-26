# 旧バージョンからの移行

Mini Tokyo 3D の各メジャーリリースでは、いくつかの互換性を損なう変更が行われます。拡張性と使いやすさを向上させるために、後方互換性を手放す必要がありますが、メリットがある場合にのみ行うことを目指しています。

## v4.0.0 への移行

### 互換性を損なう変更

#### Mapbox GL JS v3 へのアップグレード

Mini Tokyo 3D は Mapbox GL JS v3 に依存するようになり（従来は v2）、組み込みのマップスタイルもそれに合わせて更新されました。`mt3d.mapboxgl` 名前空間経由でマップをカスタマイズしている場合や、内部の Mapbox マップを直接操作している場合は、一部の v2 API やスタイルの挙動が変更されているため、[Mapbox GL JS v3 移行ガイド](https://docs.mapbox.com/mapbox-gl-js/guides/migrate-to-v3/)を確認してください。

#### `secrets.tokyochallenge` および `secrets.challenge2024` を `secrets.challenge` に置き換え

かつての東京公共交通オープンデータチャレンジ用の `secrets.tokyochallenge` と、2024 年チャレンジ用の `secrets.challenge2024` は、どちらも廃止されました。以降は年号を含まない `secrets.challenge` を使用してください（毎年キー名を変更する必要がなくなります）。

```js
const options = {
  /* ... */
  secrets: {
    odpt: '<公共交通オープンデータセンターのアクセストークン>',
    challenge: '<公共交通オープンデータチャレンジのアクセストークン>'
  }
};
```

詳しくは、[Secrets](./api/secrets.md)をご覧ください。

#### `dataSources` が組み込みデータソースを置き換え、`id` が必須に

v3.x では `Map` コンストラクタの `options.dataSources` は、組み込みの列車・フライトデータに加えて追加する GTFS データソースを指定するものでした。v4.0.0 では組み込みの ODPT および Mini Tokyo 3D データ自体が `dataSources` の要素となり、渡した `dataSources` がそのデフォルトの集合を置き換えます。組み込みデータを残したまま独自のソースを追加するには、`dataSources` を指定せずに実行時に [`Map#addDataSource`](./api/map.md#adddatasource-source) で追加する（組み込みソースは削除されません）か、組み込みソースと独自ソースをまとめて `dataSources` 配列に含めてください。また、各 [`DataSource`](./api/data-source.md) には一意の `id` が必要になり、[`Map#addDataSource`](./api/map.md#adddatasource-source) および [`Map#removeDataSource`](./api/map.md#removedatasource-id) のキーとして使われます。`id` を指定せずに追加したソースは個別に管理できません。

詳しくは、[DataSource](./api/data-source.md)をご覧ください。

#### `getModelPosition()` と `getModelScale()` が `options.center` 基準に

相対的なメルカトル座標を計算するための原点は従来、東京駅付近に固定されていました。v4.0.0 では `Map` コンストラクタの `options.center` から導出されるため、[`Map#getModelPosition`](./api/map.md#getmodelposition-lnglat-altitude) と [`Map#getModelScale`](./api/map.md#getmodelscale) は初期のマップ中心点を基準とした値を返します（スケールはその緯度に依存します）。カスタム three.js レイヤーやプラグインは、東京駅付近を原点と決め打ちせず、これらのメソッドから実行時に位置を計算してください。デフォルトの中心のまま利用している場合は影響ありません。

#### マップスタイルとローカライズ辞書を `assets` に移動

従来 `Map` コンストラクタの `options.dataUrl` から配信されていたマップスタイルとローカライズ辞書のファイル（`osm-liberty.json` および `dictionary-<lang>.json`）は、v4.0.0 ではバンドルと同じ場所にある `assets` フォルダから読み込まれるようになりました（`style.json` および `dictionary-<lang>.json`）。jsDelivr CDN を使う場合は自動的に配信されます。Mini Tokyo 3D を自分のアプリケーションにバンドルする場合は、`dist` に含まれる `assets` フォルダをバンドルと同じ場所に配置してください。gz 圧縮データは引き続き `options.dataUrl` から読み込まれます。また、新しいスタイルは以前のものと互換性がないため、それをベースにしたカスタムスタイルは作り直す必要があります。

詳しくは、[Mini Tokyo 3D の使用](./integration.md)をご覧ください。

## v3.0.0 への移行

### 互換性を損なう変更

#### `MiniTokyo3D` クラスではなく `mt3d` 名前空間をエクスポート

従来の `MiniTokyo3D` クラスの代わりに、`mt3d.Map` クラスにコンストラクタオプションを渡して Mini Tokyo 3D マップのオブジェクトを作成します。`mt3d` 名前空間には `Map` クラスの他にも複数のクラスや Mapbox GL JS、three.js ライブラリ全体が含まれており、マップのカスタマイズに利用することができます。

```js
const options = {
  container: 'mini-tokyo-3d',
  accessToken: '<Mapbox アクセストークン>'
};
const map = new mt3d.Map(options);
```

詳しくは、[Mini Tokyo 3D の使用](./integration.md)をご覧ください。

#### プラグインフレームワークを再設計してすべてのプラグインを個別に提供

旧バージョンでは、いくつかのプラグインは Mini Tokyo 3D ライブラリに含まれる形で提供されていましたが、v3.0.0 ではプラグインフレームワークの設計を一から見直すとともに、すべてのプラグインを別モジュールとして提供するようになりました。このため、プラグインを追加する際には `Map` クラスのコンストラクタオプションとして、明示的に `PluginInterface` を実装したオブジェクトのリストを指定する必要があります。

```js
const options = {
  /* ... */
  plugins: [mt3dPrecipitation(), mt3dFireworks()]
};
const map = new mt3d.Map(options);
```

詳しくは、[プラグインの追加](./integration.md#%E3%83%95%E3%82%9A%E3%83%A9%E3%82%AF%E3%82%99%E3%82%A4%E3%83%B3%E3%81%AE%E8%BF%BD%E5%8A%A0)をご覧ください。

#### コンストラクタオプション `secrets.mapbox` の代わりに `accessToken` を使用

従来 `MiniTokyo3D` コンストラクタのオプション `secrets.mapbox` で指定していた Mapbox アクセストークンは、`accessToken` に指定して `Map` オブジェクトを作成します。

```js
const options = {
  /* ... */
  accessToken: '<Mapbox アクセストークン>'
};
const map = new mt3d.Map(options);
```

詳しくは、[Mini Tokyo 3D の使用](./integration.md)をご覧ください。
