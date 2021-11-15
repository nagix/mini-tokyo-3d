# Map

`Map` オブジェクトは、Web ページ上の Mini Tokyo 3D マップを表しています。`Map` を作るには `container` やその他のオプションを指定してコンストラクタを呼び出します。すると、Web ページ上のマップが初期化され、`Map` が返されます。

```js
new Map(options: Object)
```

## パラメータ

### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

名前 | 説明
:-- | :--
**`options.container`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | Mini Tokyo 3D がマップを表示する HTML エレメントの `id`
**`options.accessToken`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Mapbox](https://www.mapbox.com) のアクセストークン。未指定の場合はマップのロード時にエラーが起きるため、必ず自分の Web サイト専用のアクセストークンを入手して指定する
**`options.secrets`**<br>[`Secrets`](./secrets.md) | データ取得に使用するアクセストークンを格納するオブジェクト
**`options.lang`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | 言語を表す [IETF 言語タグ](https://ja.wikipedia.org/wiki/IETF言語タグ)。未指定の場合は、ブラウザのデフォルト言語が使われる。現在 `'ja'`, `'en'`, `'ko'`, `'zh-Hans'`, `'zh-Hant'`, `'th'`, `'ne'` がサポートされている。サポートしていない言語が指定された場合は `'en'` が使われる
**`options.dataUrl`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | Mini Tokyo 3D のデータ URL。未指定の場合は、`'https://minitokyo3d.com/data'` が使われる
**`options.clockControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、時刻表示をマップに追加する
**`options.searchControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、検索ボタンをマップに追加する
**`options.navigationControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、ナビゲーションボタンをマップに追加する
**`options.fullscreenControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、フルスクリーンボタンをマップに追加する
**`options.modeControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、表示モード切り替えボタンをマップに追加する
**`options.configControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、設定ボタンをマップに追加する
**`options.trackingMode`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)<br>デフォルト: `'helicopter'` | 初期の追跡モードを指定する。`'helicopter'` または `'heading'` がサポートされている
**`options.ecoMode`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)<br>デフォルト: `'normal'` | 初期のエコモードを指定する。`'normal'` または `'eco'` がサポートされている
**`options.center`**<br>[`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)<br>デフォルト: `[139.7670, 35.6814]` | 初期のマップ中心点の座標。未指定の場合は、東京駅付近（`[139.7670, 35.6814]`）に設定される。注: Mini Tokyo 3D では、GeoJSON と同様に経度、緯度の順で座標を指定する
**`options.zoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `14` | 初期のマップのズームレベル。未指定の場合は、`14` に設定される
**`options.bearing`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `0` | 初期のマップの方角。真北から反時計回りの角度で指定する。未指定の場合は、真北（`0`）に設定される
**`options.pitch`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `60` | 初期のマップの傾き。画面に対する地表面の角度（0〜85）で指定する。未指定の場合は、`60` に設定される
**`options.ecoFrameRate`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `1` | エコモードがオンの場合の、列車や旅客機のアニメーションのフレームレート（1秒あたりのフレーム数）。1〜60 の間で指定する。数値を小さくすると、アニメーションの滑らかさが減少する一方で CPU リソースの使用も下がるため、モバイルデバイスでのバッテリー消費を抑えることができる。未指定の場合は、`1` に設定される
**`options.selection`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | 追跡する列車またはフライトの ID。列車 ID は`'odpt.Train:<事業者ID>.<路線ID>.<列車番号>'`、フライト ID は`'odpt.FlightInformationArrival:<事業者ID>.<空港ID>.<フライト番号>'`または`'odpt.FlightInformationDeparture:<事業者ID>.<空港ID>.<フライト番号>'`の形式で表される文字列。`'odpt.*:'`の部分は省略可。詳細は[東京公共交通オープンデータチャレンジ API 仕様](https://developer-tokyochallenge.odpt.org/documents)を参照のこと
**`options.plugins`**<br>[`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)`<`[`PluginInterface`](./plugin.md)`>` | 追加するプラグインの配列。各プラグインは [PluginInterface](./plugin.md) を実装する必要がある

## インスタンスメンバ

### **`addLayer(layer)`**

マップにレイヤーを追加します。

#### パラメータ

**`layer`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) | [`CustomLayerInterface`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#customlayerinterface) | [`ThreeLayerInterface`](./three-layer.md)) Mapbox スタイル仕様の[レイヤー定義](https://docs.mapbox.com/mapbox-gl-js/style-spec/#layers)、[CustomLayerInterface](https://docs.mapbox.com/mapbox-gl-js/api/properties/#customlayerinterface) 仕様、または [ThreeLayerInterface](./three-layer.md) 仕様のいずれかに準拠した、追加するレイヤー

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`easeTo(options)`**

center、zoom、bearing および pitch の任意の組み合わせを、新旧の値の間のアニメーションによる遷移で変更します。マップは、`options` で指定されていない項目については、現在の値を保持します。

注: ユーザーがオペレーティングシステムで `reduced motion` (動きの抑制) アクセシビリティ機能を有効にしている場合、`options` に `essential:true` が含まれていない限り、遷移は即座に行われます。

#### パラメータ

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) 遷移先とアニメーションを記述するオプション。[`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions) と [`AnimationOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions) が使用可能

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`flyTo(options)`**

center、zoom、bearing および pitch の任意の組み合わせを変更し、飛行をイメージした曲線に沿って遷移をアニメーションします。アニメーションにはズームとパンがシームレスに組み込まれており、ユーザーが長距離を移動した後でも方向感を維持できるようになっています。

注: ユーザーがオペレーティングシステムで `reduced motion` (動きの抑制) アクセシビリティ機能を有効にしている場合、`options` に `essential:true` が含まれていない限り、アニメーションはスキップされ `jumpTo` と同じ動作になります。

#### パラメータ

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) 遷移先とアニメーションを記述するオプション。[`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions)、[`AnimationOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions) に加えて、次に示すオプションが使用可能

名前 | 説明
:-- | :--
**`options.curve`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `1.42` | 飛行経路に沿って発生するズームの「カーブ」。高い値を設定するとズームのアニメーションの誇張が最大になり、低い値を設定するとズームの効果が最小になって [`Map#easeTo`](./map.md#easeto-options) の動きに近づく。1.42 は、[van Wijk (2003)](https://www.win.tue.nl/~vanwijk/zoompan.pdf) で論じられた、ユーザー調査の参加者によって選択された平均値。`Math.pow(6, 0.25)` の値は平均速度の平方根に相当する。1 の値は円運動を生成する
**`options.minZoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | 飛行経路のピークでのゼロベースのズームレベル。`options.curve` が指定された場合、このオプションは無視される
**`options.speed`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `1.2` | `options.curve` と関連して定義されるアニメーションの平均速度。速度が 1.2 の場合、マップが飛行経路に沿って 1 秒ごとに `options.curve` の 1.2 倍のスクリーンフルで移動しているように見えることを意味する。*スクリーンフル*とは、マップの表示部分の幅のこと。これは固定の物理的な距離に対応するものではなく、ズームレベルによって変化する
**`options.screenSpeed`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | 直線的なタイミングカーブを想定した場合の、1秒あたりのスクリーンフルで表したアニメーションの平均速度。`options.curve` が指定された場合、このオプションは無視される
**`options.maxDuration`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | アニメーションの最大継続時間をミリ秒単位で指定。継続時間が最大継続時間を超えると、0 にリセットされる

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`getBearing()`**

現在のマップの方角を返します。方角は、コンパスの方向を「上」としたものです。例えば、90°の方角は、東が上になるように地図の向きを変えた状態です。

#### 返り値

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): 現在のマップの方角

---

### **`getCenter()`**

マップ中心点の座標を返します。

#### 返り値

[`LngLat`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglat): マップ中心点の座標

---

### **`getClockMode()`**

現在のクロックモードを返します。

#### 返り値

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 現在のクロックモードを表す文字列。`'realtime'` または `'playback'` のどちらか

---

### **`getEcoMode()`**

現在のエコモードを返します。

#### 返り値

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 現在のエコモードを表す文字列。`'normal'` または `'eco'` のどちらか

---

### **`getModelPosition(lnglat, altitude)`**

`LngLat` を `MercatorCoordinate` に投影し、東京駅を原点とした変換後のメルカトル座標を返します。

#### パラメータ

**`lnglat`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) 投影する地理的位置

**`altitude`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 位置の高度（メートル単位）

#### 返り値

{x: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), y: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), z: [`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)}: 東京駅を原点とした変換後のメルカトル座標

---

### **`getModelScale()`**

メートル単位の現実世界の座標系から `MercatorCoordinate` に変換する際のスケールを返します。これにより、東京駅における `MercatorCoordinate` 単位での1メートルの距離が得られます。

#### 返り値

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): メートル単位の現実世界での座標系から `MercatorCoordinate` に変換する際のスケール

---

### **`getPitch()`**

現在のマップの傾きを返します。

#### 返り値

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): 現在のマップの傾き。画面に対する地表面の角度で表される

---

### **`getSelection()`**

追跡中の列車またはフライトの ID を返します。

#### 返り値

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 追跡中の列車またはフライトの ID。列車 ID は`'<事業者ID>.<路線ID>.<列車番号>'`、フライト ID は`'<事業者ID>.<空港ID>.<フライト番号>'`の形式で表される文字列

---

### **`getTrackingMode()`**

現在の追跡モードを返します。

#### 返り値

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 現在の追跡モードを表す文字列。`'helicopter'` または `'heading'` のどちらか

---

### **`getViewMode()`**

現在のビューモードを返します。

#### 返り値

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 現在のビューモードを表す文字列。`'ground'` または `'underground'` のどちらか

---

### **`getZoom()`**

現在のマップのズームレベルを返します。

#### 返り値

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): 現在のマップのズームレベル

---

### **`jumpTo(options)`**

center、zoom、bearing および pitch の任意の組み合わせを、アニメーションによる遷移なしで変更します。マップは、`options` で指定されていない項目については、現在の値を保持します。

#### パラメータ

**`options`** ([`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions)) オプションのオブジェクト

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`off(type, listener)`**

[`Map#on`](./map.md#on-type-listener) で追加したイベントリスナを削除します。

#### パラメータ

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) リスナの登録に使用したイベントタイプ

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) リスナとして登録した関数

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`on(type, listener)`**

指定したタイプのイベントのリスナを追加します。

#### パラメータ

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 待ち受けるイベントタイプ

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) イベントが発生したときに呼び出される関数

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`once(type, listener)`**

指定したイベントタイプに対して一度だけ呼び出されるリスナを追加します。

#### パラメータ

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 待ち受けるイベントタイプ

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) イベントが発生したときに呼び出される関数

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`removeLayer(id)`**

指定された ID のレイヤーをマップから削除します。

#### パラメータ

**`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 削除するレイヤーの ID

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setBearing(bearing)`**

マップの方角を設定します。方角は、コンパスの方向を「上」としたものです。例えば、90°の方角は、東が上になるように地図の向きを変えた状態です。

`jumpTo({bearing: bearing})` と同じ。

#### パラメータ

**`bearing`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 設定する方角

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setCenter(center)`**

マップ中心点の座標を設定します。`jumpTo({center: center})` と同じです。

#### パラメータ

**`center`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglatlike)) 設定する中心点の座標

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setClockMode(mode)`**

クロックモードを設定します。リアルタイムクロックモード（`'realtime'`）では、列車や旅客機は現在時刻の実際の運行に合わせて地図上に表示されます。再生クロックモード（`'playback'`）では、時刻や時間の経過速度の指定ができるようになります。

#### パラメータ

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) クロックモードを表す文字列。`'realtime'` または `'playback'` のどちらか

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setEcoMode(mode)`**

エコモードを設定します。ノーマルモード（`'normal'`）では、列車や旅客機のアニメーションのフレームレートは60に設定されます。エコモード（`'eco'`）では、フレームレートは [`Map`](./map.md) のコンストラクタオプション `ecoFrameRate` で指定された値に設定されます。

#### パラメータ

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) エコモードを表す文字列。`'normal'` または `'eco'` のどちらか

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setPitch(pitch)`**

マップの傾きを設定します。`jumpTo({pitch: pitch})` と同じです。

#### パラメータ

**`pitch`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 設定する傾き。画面に対する地表面の角度（0〜85）で指定する

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setSelection(id)`**

追跡する列車またはフライトの ID を設定します。列車 ID は`'odpt.Train:<事業者ID>.<路線ID>.<列車番号>'`、フライト ID は`'odpt.FlightInformationArrival:<事業者ID>.<空港ID>.<フライト番号>'`または`'odpt.FlightInformationDeparture:<事業者ID>.<空港ID>.<フライト番号>'`の形式で表される文字列です。`'odpt.*:'`の部分は省略可能です。詳細は[東京公共交通オープンデータチャレンジ API 仕様](https://developer-tokyochallenge.odpt.org/documents)を参照してください。

#### パラメータ

**`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 追跡する列車またはフライトの ID

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setTrackingMode(mode)`**

追跡モードを設定します。ヘリコプター追跡モード（`'helicopter'`）では、対象の列車や旅客機を中心に360度旋回を行います。進行方向追跡モード（`'heading'`）では、対象の列車や旅客機の上空または斜め後方から進行方向を上にして追跡します。

#### パラメータ

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 追跡モードを表す文字列。`'helicopter'` または `'heading'` のどちらか

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setViewMode(mode)`**

ビューモードを設定します。地上表示モード（`'ground'`）では、地上の路線や駅、列車や旅客機が明るく表示され、地下の路線、駅、列車は半透明になります。地下表示モード（`'underground'`）では、地図が暗転して地上の路線や駅、列車や旅客機が半透明になる一方で、地下の路線、駅、列車が明るく表示されます。

#### パラメータ

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) ビューモードを表す文字列。`'ground'` または `'underground'` のどちらか

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

---

### **`setZoom(zoom)`**

マップのズームレベルを設定します。`jumpTo({zoom: zoom})` と同じです。

#### パラメータ

**`zoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 設定するズームレベル (0〜20)

#### 返り値

[`Map`](./map.md): メソッドチェーンを可能にするために自分自身を返す

## イベント

### **`boxzoomcancel`**

ユーザーが「ボックスズーム」操作をキャンセルした場合や、境界ボックスが最小サイズのしきい値を満たしていない場合に発生します。[`BoxZoomHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler) を参照してください。

#### プロパティ

**`data`** ([`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdboxzoomevent))

---

### **`boxzoomend`**

「ボックスズーム」操作が終了したときに発生します。[`BoxZoomHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler) を参照してください。

#### プロパティ

**`data`** ([`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdboxzoomevent))

---

### **`boxzoomstart`**

「ボックスズーム」操作が開始されたときに発生します。[`BoxZoomHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler) を参照してください。

#### プロパティ

**`data`** ([`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdboxzoomevent))

---

### **`click`**

マップ上の同じ場所でポインティングデバイス（通常はマウス）を押して離すと発生します。

#### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent))

---

### **`clockmode`**

クロックモードが変更されたときに発生します。

#### プロパティ

**`data`** (`{mode: `[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`}`)

---

### **`contextmenu`**

マウスの右ボタンがクリックされたとき、またはマップ内でコンテキストメニューキーが押されたときに発生します。

#### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent))

---

### **`dblclick`**

マップ上の同じ場所でポインティングデバイス（通常はマウス）を2回連続して押して離すと発生します。

#### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent))

---

### **`deselection`**

列車または航空機の追跡が解除された時に発生します。

#### プロパティ

**`data`** (`{deselection: `[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`}`)

---

### **`drag`**

「移動のためのドラッグ」操作中に繰り返し発生します。[`DragPanHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler) を参照してください。

#### プロパティ

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

### **`dragend`**

「移動のためのドラッグ」操作が終了したときに発生します。[`DragPanHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler) を参照してください。

#### プロパティ

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

### **`dragstart`**

「移動のためのドラッグ」操作が開始されたときに発生します。[`DragPanHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler) を参照してください。

#### プロパティ

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

### **`ecomode`**

エコモードが変更されたときに発生します。

#### プロパティ

**`data`** (`{mode: `[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`}`)

---

### **`error`**

エラーが発生したときに発生します。これは Mini Tokyo 3D の主要なエラー報告メカニズムです。`throw` の代わりにイベントを使用することで、非同期処理に対応できるようにしています。リスナが `error` イベントにバインドされていない場合、エラーはコンソールに出力されます。

#### プロパティ

**`data`** (`{error: {message: `[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`}}`)

---

### **`load`**

必要なリソースがすべてダウンロードされ、最初の完全なマップの視覚的なレンダリングが行われた後、直ちに発生します。

---

### **`mousedown`**

マップ内でポインティングデバイス（通常はマウス）が押されたときに発生します。

#### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent))

---

### **`mousemove`**

カーソルがマップ内にあるときにポインティングデバイス（通常はマウス）が移動したときに発生します。マップ上でカーソルを移動すると、カーソルがマップ内の位置を変更するたびにイベントが発生します。

#### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent))

---

### **`mouseover`**

ポインティングデバイス（通常はマウス）がマップ内で移動したときに発生します。マップを含む Web ページ上でカーソルを移動すると、カーソルがマップまたは子要素に入るたびにイベントが発生します。

#### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent))

---

### **`mouseup`**

マップ内でポインティングデバイス（通常はマウス）が離されたときに発生します。

#### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent))

---

### **`move`**

ユーザの操作や [`Map#flyTo`](./map.md#flyto-options) などのメソッドの結果として、あるビューから別のビューへのアニメーション遷移中に繰り返し発生します。

#### プロパティ

**`data`** (`(`[`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent)` | `[`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent)`)`)

---

### **`moveend`**

ユーザの操作や [`Map#jumpTo`](./map.md#jumpto-options) などのメソッドの結果として、マップがあるビューから別のビューへの遷移を完了した直後に発生します。

#### プロパティ

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

### **`movestart`**

ユーザの操作や [`Map#jumpTo`](./map.md#jumpto-options) などのメソッドの結果として、マップがあるビューから別のビューに遷移する直前に発生します。

#### プロパティ

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

### **`pitch`**

ユーザの操作や [`Map#flyTo`](./map.md#flyto-options) などのメソッドの結果として、マップの傾きの状態遷移アニメーションの間に繰り返し発生します。

#### プロパティ

**`data`** (`MapEventData`)

---

### **`pitchend`**

ユーザの操作や [`Map#flyTo`](./map.md#flyto-options) などのメソッドの結果として、マップの傾きが変化し終わった直後に発生します。

#### プロパティ

**`data`** (`MapEventData`)

---

### **`pitchstart`**

ユーザの操作や [`Map#flyTo`](./map.md#flyto-options) などのメソッドの結果として、マップの傾きが変化し始める直前に発生します。

#### プロパティ

**`data`** (`MapEventData`)

---

### **`resize`**

マップのサイズが変更された直後に発生します。

---

### **`rotate`**

「回転のためのドラッグ」操作中に繰り返し発生します。[`DragRotateHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler) を参照してください。

#### プロパティ

**`data`** (`(`[`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent)` | `[`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent)`)`)

---

### **`rotateend`**

「回転のためのドラッグ」操作が終了したときに発生します。[`DragRotateHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler)を参照してください。

#### プロパティ

**`data`** (`(`[`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent)` | `[`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent)`)`)

---

### **`rotatestart`**

「回転のためのドラッグ」操作が開始されたときに発生します。[`DragRotateHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler)を参照してください。

#### プロパティ

**`data`** (`(`[`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent)` | `[`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent)`)`)

---

### **`selection`**

列車または航空機の追跡が開始された時に発生します。

#### プロパティ

**`data`** (`{selection: `[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`}`)

---

### **`touchcancel`**

マップ内で [`touchcancel`](https://developer.mozilla.org/docs/Web/Events/touchcancel) イベントが発生したときに発生します。

#### プロパティ

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent))

---

### **`touchend`**

マップ内で [`touchend`](https://developer.mozilla.org/docs/Web/Events/touchend) イベントが発生したときに発生します。

#### プロパティ

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent))

---

### **`touchmove`**

マップ内で [`touchmove`](https://developer.mozilla.org/docs/Web/Events/touchmove) イベントが発生したときに発生します。

#### プロパティ

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent))

---

### **`touchstart`**

マップ内で [`touchstart`](https://developer.mozilla.org/docs/Web/Events/touchstart) イベントが発生したときに発生します。

#### プロパティ

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent))

---

### **`trackingmode`**

追跡モードが変更されたときに発生します。

#### プロパティ

**`data`** (`{mode: `[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`}`)

---

### **`viewmode`**

ビューモードが変更されたときに発生します。

#### プロパティ

**`data`** (`{mode: `[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`}`)

---

### **`wheel`**

マップ内で [`wheel`](https://developer.mozilla.org/docs/Web/Events/wheel) イベントが発生したときに発生します。

#### プロパティ

**`data`** ([`MapWheelEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdwheelevent))

---

### **`zoom`**

ユーザの操作や [`Map#flyTo`](./map.md#flyto-options) などのメソッドの結果として、あるズームレベルから別のズームレベルへのアニメーション遷移中に繰り返し発生します。

#### プロパティ

**`data`** (`(`[`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent)` | `[`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent)`)`)

---

### **`zoomend`**

ユーザの操作や [`Map#flyTo`](./map.md#flyto-options) などのメソッドの結果として、マップがあるズームレベルから別のズームレベルへの移行を完了した直後に発生します。

#### プロパティ

**`data`** (`(`[`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent)` | `[`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent)`)`)

---

### **`zoomstart`**

ユーザの操作や [`Map#flyTo`](./map.md#flyto-options) などのメソッドの結果として、マップがあるズームレベルから別のズームレベルへの移行を開始する直前に発生します。

#### プロパティ

**`data`** (`(`[`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdmouseevent)` | `[`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/./map.mdtouchevent)`)`)
