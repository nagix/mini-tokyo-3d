# Panel

パネルコンポーネントを作成します。

[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) を拡張しています。

```js
new Panel(options: Object)
```

## パラメータ

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

名前 | 説明
:-- | :--
**`options.modal`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean) | `true`の場合、パネルはモーダルになり、ユーザーが外側をクリックすると閉じます。

## インスタンスメンバ

### **`setTitle(title)`**

パネルのタイトルを文字列で設定します。

#### パラメータ

**`title`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) パネルのタイトル

#### 返り値

[`Panel`](./panel.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setHTML(html)`**

パネルのコンテンツを、文字列で指定された HTML に設定します。

このメソッドは、HTML のフィルタリングやサニタイズを行いませんので、信頼できるコンテンツにのみ使用してください。

#### パラメータ

**`html`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) パネルの HTML コンテンツを表す文字列

#### 返り値

[`Panel`](./panel.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setButtons(buttons)`**

パネルのタイトルにボタンを設定します。

#### パラメータ

**`buttons`** ([`Array`](./map.md)`<`[`HTMLElement`](https://developer.mozilla.org/docs/Web/HTML/Element)`>`) パネルのタイトル上のボタンとして使用するDOM要素の配列

#### 返り値

[`Panel`](./panel.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`addTo(map)`**

マップにパネルを追加します。

#### パラメータ

**`map`** ([`Map`](./map.md)) パネルを追加する Mini Tokyo 3D マップ

#### 返り値

[`Panel`](./panel.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`remove()`**

マップからパネルを削除します。

#### 返り値

[`Panel`](./panel.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`isOpen()`**

パネルが開いているかどうかを確認します。

#### 返り値

[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean): パネルが開いていれば`true`、閉じていれば`false`
