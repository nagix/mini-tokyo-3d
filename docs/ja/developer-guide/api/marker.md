# Marker

マーカーコンポーネントを作成します。

[Evented](https://docs.mapbox.com/mapbox-gl-js/ja/api/events/#evented) を拡張しています。

```js
new Marker(options: Object)
```

## パラメータ

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

名前 | 説明
:-- | :--
**`options.element`**<br>[`HTMLElement`](https://developer.mozilla.org/docs/Web/HTML/Element) | マーカーとして使用する DOM エレメント。デフォルトは、水色のしずく型の SVG マーカー

## インスタンスメンバ

### **`addTo(map)`**

`Marker` を `Map` オブジェクトに取り付けます。

#### パラメータ

**`map`** ([`Map`](./map.md)) マーカーを追加する Mini Tokyo 3D マップ

#### 返り値

[`Marker`](./marker.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`remove()`**

マーカーをマップから削除します。

#### 返り値

[`Marker`](./marker.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setActivity(active)`**

マーカーのアクティブ状態を設定します。アクティブな状態とは、マーカーが選択されてハイライト表示されている状態を指します。

#### パラメータ

**`active`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) trueの場合、マーカーがアクティブになる

#### 返り値

[`Marker`](./marker.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setLngLat(lnglat)`**

マーカーの地理的な位置を設定し、移動させます。

#### パラメータ

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/ja/api/geography/#lnglatlike)) マーカーを設置する位置を示す [LngLatLike](https://docs.mapbox.com/mapbox-gl-js/ja/api/geography/#lnglatlike)

#### 返り値

[`Marker`](./marker.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setVisibility(visible)`**

マーカーの表示状態を設定します。

#### パラメータ

**`visible`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) `true` の場合、マーカーが表示される

#### 返り値

[`Marker`](./marker.md): メソッドチェーンを可能にするために自分自身を返す

## イベント

### **`click`**

マーカー上でポインティングデバイス（通常はマウス）を押して離すと発生します。

---

### **`mouseenter`**

ポインティングデバイス（通常はマウス）がマーカーに入ったときに発生します。

---

### **`mouseleave`**

ポインティングデバイス（通常はマウス）がマーカーから離れたときに発生します。
