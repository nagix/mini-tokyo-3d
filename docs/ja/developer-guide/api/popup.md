# Popup

ポップアップコンポーネントです。

[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) を拡張しています。

```js
new Popup()
```

## インスタンスメンバ

### **`addTo(map)`**

ポップアップをマップに追加します。

#### パラメータ

**`map`** ([`Map`](./map.md)) ポップアップを追加する Mini Tokyo 3D マップ

#### 返り値

[`Popup`](./popup.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`remove()`**

ポップアップをマップから削除します。

#### 返り値

[`Popup`](./popup.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setHTML(html)`**

ポップアップのコンテンツを、文字列で指定された HTML に設定します。

このメソッドは、HTML のフィルタリングやサニタイズを行いませんので、信頼できるコンテンツにのみ使用してください。

#### パラメータ

**`html`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) ポップアップの HTML コンテンツを表す文字列

#### 返り値

[`Popup`](./popup.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setLngLat(lnglat)`**

ポップアップのアンカーの地理的位置を設定し、移動させます。

#### パラメータ

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/ja/api/geography/#lnglatlike)) ポップアップのアンカーとして設定する地理的な位置

#### 返り値

[`Popup`](./popup.md): メソッドチェーンを可能にするために自分自身を返す
