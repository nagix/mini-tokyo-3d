# Secrets

`Secrets` オブジェクトは、データ取得に使用するアクセストークンを格納するオブジェクトで、[`Map`](./map.md) のコンストラクタオプション `secrets` に指定します。

**型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## プロパティ

### **`challenge2024`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

[公共交通オープンデータチャレンジ2024](https://challenge2024.odpt.org)のアクセストークンです。未指定の場合は、デフォルトのトークンが使われます。

::: warning 注意
公共交通オープンデータチャレンジ2024の終了に伴い、バージョン 4.0 以降はこのパラメータは使用されません。
:::

### **`challenge2025`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

[公共交通オープンデータチャレンジ2025](https://challenge2025.odpt.org)のアクセストークンです。未指定の場合は、デフォルトのトークンが使われます。

### **`odpt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

[公共交通オープンデータセンター](https://www.odpt.org)のアクセストークンです。未指定の場合は、デフォルトのトークンが使われます。

### **`tokyochallenge`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

[東京公共交通オープンデータチャレンジ](https://tokyochallenge.odpt.org)のアクセストークンです。未指定の場合は、デフォルトのトークンが使われます。

::: warning 注意
東京公共交通オープンデータチャレンジの終了に伴い、バージョン 3.1 以降はこのパラメータは使用されません。
:::
