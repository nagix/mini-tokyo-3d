# ThreeLayer

three.js のシーンを含むカスタムスタイルレイヤーです。これにより、ユーザーは、マップのカメラを使って、three.js オブジェクトをマップの GL コンテキストに直接レンダリングすることができます。このレイヤーは [Map#addLayer](./map.md#addlayer-layer) を使ってマップに追加できます。

## パラメータ

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

名前 | 説明
:-- | :--
**`options.id`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | 固有のレイヤーID
**`options.manzoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | レイヤーの最大ズームレベル。maxzoom 以上のズームレベルでは、レイヤーは非表示になる。値は `0` から `24`（これを含む）までの任意の数値。maxzoom が指定されていない場合は、レイヤーはすべてのズームレベルで表示される
**`options.minzoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | レイヤーの最小のズームレベル。minzoom 未満のズームレベルでは、レイヤーは非表示になる。値は `0` から `24`（これを含む）の間の任意の数値。minzoom が指定されていない場合は、レイヤーはすべてのズームレベルで表示される

## インスタンスメンバ

### **`onAdd(map)`**

[Map#addLayer](./map.md#addlayer-layer) でレイヤーが Map に追加された際に呼び出される、任意実装のメソッド。これを利用して、レイヤーは three.js のリソースを初期化し、イベントリスナーを登録することができる

#### パラメータ

**`map`** ([`Map`](./map.md)) このレイヤーが追加された Mini Tokyo 3D の Map

### **`onRemove(map)`**

[Map#removeLayer](./map.md#removelayer-id) でレイヤーが Map から削除されたときに呼び出される、任意実装のメソッド。これを利用して、レイヤーは three.js のリソースを解放し、イベントリスナーを削除することができる

#### パラメータ

**`map`** ([`Map`](./map.md)) このレイヤーが削除された Mini Tokyo 3D の Map

---

### **`add(object)`**

シーンに three.js オブジェクトを追加します。オブジェクトの位置とスケールは、東京駅を原点とした球面メルカトル座標で表されます。

#### パラメータ

**`object`** ([`Object3D`](https://threejs.org/docs/#api/en/core/Object3D)) 追加する three.js オブジェクト

#### 返り値

[`ThreeLayer`](./three-layer.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`remove(object)`**

シーンから three.js オブジェクトを削除します。

#### パラメータ

**`object`** ([`Object3D`](https://threejs.org/docs/#api/en/core/Object3D)) 削除する three.js オブジェクト

#### 返り値

[`ThreeLayer`](./three-layer.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`getModelOrigin()`**

メルカトル座標の原点となる東京駅の位置を表す `MercatorCoordinate` オブジェクトを返します。

#### 返り値

[`MercatorCoordinate`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#mercatorcoordinate): メルカトル座標の原点

---

### **`getModelScale()`**

メートル単位の現実世界の座標系から `MercatorCoordinate` に変換する際のスケールを返します。これにより、東京駅における `MercatorCoordinate` 単位での1メートルの距離が得られます。

#### 返り値

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): メートル単位の現実世界での座標系から `MercatorCoordinate` に変換する際のスケール

---

### **`getModelPosition(lnglat, altitude)`**

`LngLat` を `MercatorCoordinate` に投影し、東京駅を原点とした変換後のメルカトル座標を返します。

#### パラメータ

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) 投影する地理的位置

**`altitude`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 位置の高度（メートル単位）

#### 返り値

{x: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), y: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), z: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)}: 東京駅を原点とした変換後のメルカトル座標

---

### **`project(lnglat, altitude)`**

指定された地理的位置に対応する、マップの `container` を基準としたピクセル座標を表す [Point](https://docs.mapbox.com/mapbox-gl-js/api/geography/#point) を返します。

#### パラメータ

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) 投影する地理的位置

**`altitude`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 位置の高度（メートル単位）

#### 返り値

[`Point`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#point): マップの `container` を基準とした、`lnglat` と `altitude` に対応する [Point](https://docs.mapbox.com/mapbox-gl-js/api/geography/#point)
