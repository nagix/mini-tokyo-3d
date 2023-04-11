# ThreeLayerInterface

カスタム three.js レイヤーのインターフェースです。これは実装者がモデル化するための仕様であり、エクスポートされたメソッドやクラスではありません。

カスタム three.js レイヤーには、[three.js](https://threejs.org/docs/) のシーンが含まれています。開発者は、マップのカメラを使って、three.js オブジェクトをマップの GL コンテキストに直接レンダリングすることができます。このレイヤーは [Map#addLayer](./map.md#addlayer-layer) を使ってマップに追加できます。

カスタムの three.js レイヤーは、一意の `id` を持ち、`type` が `'three'` である必要があります。また、`onAdd`と`onRemove` を実装することができます。

## プロパティ

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

固有のレイヤー ID です。

### **`lightColor`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | [`Color`](https://threejs.org/docs/#api/en/math/Color) | [`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

ライトの色です。16進数のカラー、three.js の [Color](https://threejs.org/docs/#api/en/math/Color) インスタンス、または CSS 形式の文字列を指定できます。指定しない場合は、現在の日時に基づいた動的なライトの色が使用されます。

### **`maxzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

レイヤーの最大ズームレベルです。maxzoom 以上のズームレベルでは、レイヤーは非表示になります。値は `0` から `24`（これを含む）までの任意の数値です。maxzoom が指定されていない場合は、レイヤーはすべてのズームレベルで表示されます。

### **`minzoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

レイヤーの最小のズームレベルです。minzoom 未満のズームレベルでは、レイヤーは非表示になります。値は `0` から `24`（これを含む）の間の任意の数値です。minzoom が指定されていない場合は、レイヤーはすべてのズームレベルで表示されます。

### **`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

レイヤーのタイプです。必ず `'three'` と指定してください。

## インスタンスメンバ

### **`onAdd(map, context)`**

[Map#addLayer](./map.md#addlayer-layer) でレイヤーが Map に追加された際に呼び出される、任意実装のメソッドです。これを利用して、レイヤーは three.js のリソースを初期化し、イベントリスナーを登録することができます。

#### パラメータ

**`map`** ([`Map`](./map.md)) このレイヤーが追加された Mini Tokyo 3D の Map

**`context`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) このレイヤーに含まれる three.js のレンダラー、シーン、カメラオブジェクトです。

名前 | 説明
:-- | :--
**`context.camera`**<br>[`PerspectiveCamera`](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera) | Camera オブジェクト
**`context.renderer`**<br>[`WebGLRenderer`](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) | Renderer オブジェクト
**`context.scene`**<br>[`Scene`](https://threejs.org/docs/#api/en/scenes/Scene) | Scene オブジェクト

---

### **`onRemove(map, context)`**

[Map#removeLayer](./map.md#removelayer-id) でレイヤーが Map から削除されたときに呼び出される、任意実装のメソッドです。これを利用して、レイヤーは three.js のリソースを解放し、イベントリスナーを削除することができます。

#### パラメータ

**`map`** ([`Map`](./map.md)) このレイヤーが削除された Mini Tokyo 3D の Map

**`context`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) このレイヤーに含まれる three.js のレンダラー、シーン、カメラオブジェクトです。

名前 | 説明
:-- | :--
**`context.camera`**<br>[`PerspectiveCamera`](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera) | Camera オブジェクト
**`context.renderer`**<br>[`WebGLRenderer`](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) | Renderer オブジェクト
**`context.scene`**<br>[`Scene`](https://threejs.org/docs/#api/en/scenes/Scene) | Scene オブジェクト
