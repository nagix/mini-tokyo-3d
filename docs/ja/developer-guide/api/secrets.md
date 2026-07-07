# Secrets

`Secrets` オブジェクトは、データ取得に使用するアクセストークンを格納するオブジェクトで、[`Map`](./map.md) のコンストラクタオプション `secrets` に指定します。

**型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## プロパティ

### **`challenge`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

`api-challenge.odpt.org` でホストされている[公共交通オープンデータチャレンジ](https://challenge2026.odpt.org) API のアクセストークンです。そのホストの[データソース](./data-source.md) URL に利用者キーとして付与されます。未指定の場合は、デフォルトのトークンが使われます。

### **`odpt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

`api.odpt.org` でホストされている[公共交通オープンデータセンター](https://www.odpt.org) API のアクセストークンです。そのホストの[データソース](./data-source.md) URL に利用者キーとして付与されます。未指定の場合は、デフォルトのトークンが使われます。
