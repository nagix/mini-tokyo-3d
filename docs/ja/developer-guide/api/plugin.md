# PluginInterface

マップに追加するカスタムプラグインのインターフェースです。これは実装者がモデル化するための仕様であり、エクスポートされたメソッドやクラスではありません。

開発者はコールバックメソッドを実装して、Mini Tokyo 3D Map をカスタマイズすることができます。プラグインを追加するには、このインターフェースを実装したオブジェクトを [`Map`](./map.md) のコンストラクタのオプション `plugins` に設定する必要があります。

カスタムプラグインは一意の `id` を持ち、`name` と `iconStyle` を持つ必要があります。これらのプラグインは `onAdd`、`onRemove`、`onEnabled`、`onDisabled`、`onVisibilityChanged` を実装することができます。

## プロパティ

### **`clockModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

ここで指定されたクロックモードの時だけ、プラグインが表示されます。`'realtime'`、`'playback'` がサポートされています。指定がない場合は、常に表示されます。

### **`enabled`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean))

`false`の場合、プラグインは無効化された状態でマップに追加されます。指定しない場合は、有効になります。

### **`iconStyle`** ([`Object`](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration))

レイヤーパネルに表示されるアイコン要素のインラインスタイルです。[CSSStyleDeclaration](https://developer.mozilla.org/docs/Web/API/CSSStyleDeclaration) に含まれるすべてのスタイルプロパティに対応しています。

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

固有のプラグイン ID です。

### **`name`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

プラグインの名前です。各プロパティのキーは言語コード、値はその言語での名前を示します。ブラウザで使用されている言語がプロパティに含まれていない場合は、英語の名前が使われます。

名前 | 説明
:-- | :--
**`name.en`** | 英語の名前
**`name.es`** | スペイン語の名前
**`name.fr`** | フランス語の名前
**`name.ja`** | 日本語の名前
**`name.ko`** | 韓国語の名前
**`name.ne`** | ネパール語の名前
**`name.pt`** | ポルトガル語の名前
**`name.th`** | タイ語の名前
**`name.zh-Hans`** | 簡体中国語の名前
**`name.zh-Hant`** | 繁体中国語の名前

### **`searchModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

ここで指定された検索モードの時だけ、プラグインが表示されます。`'none'`、`'edit'`、`'route'` がサポートされています。指定がない場合は、検索パネルが表示されていない時に表示されます。

### **`viewModes`** ([`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`>`)

ここで指定された表示モードの時だけ、プラグインが表示されます。`'ground'`、`'underground'` がサポートされています。指定がない場合は、常に表示されます。

## インスタンスメンバ

### **`onAdd(map)`**

プラグインが Map に追加されたときに呼び出される、任意実装のメソッドです。これを利用して、プラグインはリソースを初期化し、イベントリスナーを登録することができます。

#### パラメータ

**`map`** ([`Map`](./map.md)) このプラグインが追加された Mini Tokyo 3D の Map

---

### **`onDisabled()`**

プラグインがユーザによって無効化されたときに呼び出される、任意実装のメソッドです。これを利用して、プラグインは表示要素を削除することができます。

---

### **`onEnabled()`**

プラグインがユーザーによって有効にされたときに呼び出される、任意実装のメソッドです。これを利用して、プラグインは表示要素を初期化することができます。

---

### **`onRemove(map)`**

プラグインが Map から削除されたときに呼び出される、任意実装のメソッドです。これを利用して、プラグインはリソースを解放し、イベントリスナーを削除することができます。

#### パラメータ

**`map`** ([`Map`](./map.md)) このプラグインが削除された Mini Tokyo 3D の Map

---

### **`onVisibilityChanged(visible)`**

マップの表示モードが変更されたときなど、プラグインの表示状態が変更されたときに呼び出される、任意実装のメソッドです。これを利用して、プラグインは表示要素の状態を変更することができます。

#### パラメータ

**`visible`** ([`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)) `true` はプラグインが表示されている状態であることを示す
