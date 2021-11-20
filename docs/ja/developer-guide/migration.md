# 旧バージョンからの移行

Mini Tokyo 3D v3.0.0では、いくつかの互換性を損なう変更が行われました。拡張性と使いやすさを向上させるために、後方互換性を手放す必要がありましたが、メリットがある場合にのみ行うことを目指しました。

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
