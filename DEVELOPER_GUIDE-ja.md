# Mini Tokyo 3D 開発者ガイド

English version is available [here](DEVELOPER_GUIDE-en.md).

本ドキュメントは、開発者が Mini Tokyo 3D を Web ページに埋め込んだり、自分のアプリケーションに組み込んで使うための方法を説明します。Mini Tokyo 3D 自体の使い方を知りたい場合は、[Mini Tokyo 3D ユーザーガイド](USER_GUIDE-ja.md)をご覧ください。

## Mini Tokyo 3D の使用

Mini Tokyo 3D を Web ページに埋め込んで利用する、もしくは API を使って操作する方法は非常にシンプルです。まずは、このセクションの説明に従って設定してください。

### 使用の準備

Mini Tokyo 3D は ES6 に対応した主要ブラウザで動作します。Internet Explorer には非対応です。 

#### Mapbox アクセストークンの入手

Mini Tokyo 3D は地図タイルに [Mapbox](https://www.mapbox.com) のサービスを利用しているため、利用には Mapbox のアクセストークンが必要です。[Map Loads for Web](https://www.mapbox.com/pricing/#maploads) セッションを利用しており、月間 50,000 接続までは無料です。下記の手順に従って、アクセストークンを入手してください。

1. [サインアップ](https://account.mapbox.com/auth/signup/)ページでユーザー情報を入力して、Mapbox アカウントを作成します。
2. Mapbox アカウントログイン後、画面上部のメニューから「Tokens」をクリックしてアクセストークン一覧を表示します。アカウント作成直後はデフォルトの「Default public token」のみが表示されます。
3. 画面右上の「Create a token」ボタンをクリックして、アクセストークン作成ページに進みます。
4. 「Token name」にはあなたの Web サイト名やアプリ名など、任意の名前を入力します。
5. 「Token scopes」はデフォルト設定（Public scopes にすべてチェックが入った状態）のままにします。
6. 「Token restrictions」の「URL」欄には、Mini Tokyo 3D を設置するサイトの URL を入力して「Add URL」ボタンをクリックします。URL の形式は、[URL restrictions](https://docs.mapbox.com/accounts/overview/tokens/#url-restrictions) を参考にしてください。この URL 制限を設定しておくことで、他のサイトからこのアクセストークンを利用されることを防ぎます。
7. 最後に画面下部の「Create token」ボタンをクリックすると、アクセストークン一覧に新たに作成されたトークンが表示されます。

### 直接 Web ページに組み込む

単純に Web ページに Mini Tokyo 3D のマップを表示するだけであれば、次のように HTML ファイルを編集するだけです。

まず、jsDelivr CDN のリンクを使用して、Mini Tokyo 3D のスタイルシートと JavaScript コードを HTML ファイルの `<head>` エレメント内で読み込みます。

```html
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.js"></script>
</head>
```

同じ HTML ファイルの `<body>` エレメント内で、`id` のついた HTML エレメント（下の例では `<div>` エレメント）を追加し、`<script>` エレメントで Mini Tokyo 3D インスタンスを作成する JavaScript コードを記述します。コンストラクタに渡す `options` オブジェクトの `container` には HTML エレメントの `id` を指定します。また、`secrets.mapbox` には、上のステップで入手した Mapbox アクセストークンを指定します。

```html
<body>
  <div id="mini-tokyo-3d" style="width: 400px; height: 400px;"></div>

  <script>
    const options = {
      container: 'mini-tokyo-3d',
      secrets: {
        mapbox: '<Mapbox アクセストークン>'
      }
    };
    const mt3d = new MiniTokyo3D(options);
  </script>
</body>
```

### モジュールとしてアプリに組み込む

バンドラーを使って Mini Tokyo 3D を自分のアプリケーションのコードに組み込む場合には、次の手順に従ってください。

まず、Mini Tokyo 3D の npm モジュールをインストールし、あなたのアプリケーションの `package.json` に登録します。

```bash
npm install mini-tokyo-3d --save
```

CommomJS 形式でモジュールを読み込む場合は、コードの先頭で次のように記載します。

```js
const MiniTokyo3D = require('mini-tokyo-3d');
```

ES6 形式でモジュールを読み込む場合は、コードの先頭で次のように記載します。

```js
import MiniTokyo3D from 'mini-tokyo-3d';
```

アプリケーションのコード内で、次のようにして MiniTokyo3D オブジェクトを初期化します。`options` オブジェクトの `container` には Mini Tokyo 3D がマップを表示する HTML エレメントの ID を指定します。また、`secrets.mapbox` には、上のステップで入手した Mapbox アクセストークンを指定します。

```js
const options = {
  container: '<コンテナエレメントの ID>',
  secrets: {
    mapbox: '<Mapbox アクセストークン>'
  }
};
const mt3d = new MiniTokyo3D(options);
```

## Mini Tokyo 3D API

JavaScript で Mini Tokyo 3D API を使うことで、様々なカスタマイズを行うことが可能です。

**注意**: 現在 Mini Tokyo 3D API はベータ版です。API の変更の可能性があるため、バージョン間の互換性は保証されません。

クラス／オブジェクト | 詳細
:--|:--
[`MiniTokyo3D`](#minitokyo3d) | **パラメータ**<br>[`options`](#options-object)<br>**インスタンスメンバ**<br>[`easeTo`](#easetooptions) [`flyTo`](#flytooptions) [`getBearing`](#getbearing) [`getCenter`](#getcenter) [`getClockMode`](#getclockmode) [`getPitch`](#getpitch) [`getSelection`](#getselection) [`getTrackingMode`](#gettrackingmode) [`getViewMode`](#getviewmode) [`getZoom`](#getzoom) [`jumpTo`](#jumptooptions) [`off`](#offtype-listener) [`on`](#ontype-listener) [`once`](#oncetype-listener) [`setBearing`](#setbearingbearing) [`setCenter`](#setcentercenter) [`setClockMode`](#setclockmode) [`setPitch`](#setpitchpitch) [`setSelection`](#setselection) [`setTrackingMode`](#settrackingmode) [`setViewMode`](#setviewmode) [`setZoom`](#setzoomzoom)<br>**イベント**<br>[`boxzoomcancel`](#boxzoomcancel) [`boxzoomend`](#boxzoomend) [`boxzoomstart`](#boxzoomstart) [`click`](#click) [`contextmenu`](#contextmenu) [`dblclick`](#dblclick) [`drag`](#drag) [`dragend`](#dragend) [`dragstart`](#dragstart) [`error`](#error) [`load`](#load) [`mousedown`](#mousedown) [`mousemove`](#mousemove) [`mouseout`](#mouseout) [`mouseover`](#mouseover) [`mouseup`](#mouseup) [`move`](#move) [`moveend`](#moveend) [`movestart`](#movestart) [`pitch`](#pitch) [`pitchend`](#pitchend) [`pitchstart`](#pitchstart) [`resize`](#resize) [`rotate`](#rotate) [`rotateend`](#rotateend) [`rotatestart`](#rotatestart) [`touchcancel`](#touchcancel) [`touchend`](#touchend) [`touchmove`](#touchmove) [`touchstart`](#touchstart) [`wheel`](#wheel) [`zoom`](#zoom) [`zoomend`](#zoomend) [`zoomstart`](#zoomstart)
[`Secrets`](#secrets) |

### MiniTokyo3D

`MiniTokyo3D` オブジェクトは、Web ページ上の Mini Tokyo 3D マップを表しています。`MiniTokyo3D` を作るには `container` やその他のオプションを指定してコンストラクタを呼び出します。すると、Web ページ上のマップが初期化され、`MiniTokyo3D` が返されます。

```js
new MiniTokyo3D(options: Object)
```

#### パラメータ

##### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

名前 | 説明
:-- | :--
**`options.container`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | Mini Tokyo 3D がマップを表示する HTML エレメントの `id`
**`options.secrets`**<br>[`Secrets`](#secrets) | データ取得に使用するアクセストークンを格納するオブジェクト
**`options.lang`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | 言語を表す [IETF 言語タグ](https://ja.wikipedia.org/wiki/IETF言語タグ)。未指定の場合は、ブラウザのデフォルト言語が使われる。現在 `'ja'`, `'en'`, `'ko'`, `'zh-Hans'`, `'zh-Hant'`, `'th'`, `'ne'` がサポートされている。サポートしていない言語が指定された場合は `'en'` が使われる
**`options.dataUrl`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | Mini Tokyo 3D のデータ URL。未指定の場合は、`'https://minitokyo3d.com/data'` が使われる
**`options.clockControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、時刻表示をマップに追加する
**`options.searchControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、検索ボタンをマップに追加する
**`options.navigationControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、ナビゲーションボタンをマップに追加する
**`options.fullscreenControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、フルスクリーンボタンをマップに追加する
**`options.modeControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、表示モード切り替えボタンをマップに追加する
**`options.configControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>デフォルト: `true` | `true` の場合、設定ボタンをマップに追加する
**`options.trackingMode`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)<br>デフォルト: `'helicopter'` | 初期の追跡モードを指定する。`'helicopter'` または `'heading'` がサポートされている
**`options.center`**<br>[`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/#lnglatlike)<br>デフォルト: `[139.7670, 35.6814]` | 初期のマップ中心点の座標。未指定の場合は、東京駅付近（`[139.7670, 35.6814]`）に設定される。注: Mini Tokyo 3D では、GeoJSON と同様に経度、緯度の順で座標を指定する
**`options.zoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `14` | 初期のマップのズームレベル。未指定の場合は、`14` に設定される
**`options.bearing`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `0` | 初期のマップの方角。真北から反時計回りの角度で指定する。未指定の場合は、真北（`0`）に設定される
**`options.pitch`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `60` | 初期のマップの傾き。画面に対する地表面の角度（0〜60）で指定する。未指定の場合は、`60` に設定される
**`options.frameRate`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `60` | 列車や旅客機のアニメーションのフレームレート（1秒あたりのフレーム数）。1〜60 の間で指定する。数値を小さくすると、アニメーションの滑らかさが減少する一方で CPU リソースの使用も下がるため、モバイルデバイスでのバッテリー消費を抑えることができる。未指定の場合は、`60` に設定される
**`options.selection`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | 追跡する列車またはフライトの ID。列車 ID は`'odpt.Train:<事業者ID>.<路線ID>.<列車番号>'`、フライト ID は`'odpt.FlightInformationArrival:<事業者ID>.<空港ID>.<フライト番号>'`または`'odpt.FlightInformationDeparture:<事業者ID>.<空港ID>.<フライト番号>'`の形式で表される文字列。`'odpt.*:'`の部分は省略可。詳細は[東京公共交通オープンデータチャレンジ API 仕様](https://developer-tokyochallenge.odpt.org/documents)を参照のこと

#### インスタンスメンバ

##### **`easeTo(options)`**

center、zoom、bearing および pitch の任意の組み合わせを、新旧の値の間のアニメーションによる遷移で変更します。マップは、`options` で指定されていない項目については、現在の値を保持します。

注: ユーザーがオペレーティングシステムで `reduced motion` (動きの抑制) アクセシビリティ機能を有効にしている場合、`options` に `essential:true` が含まれていない限り、遷移は即座に行われます。

###### パラメータ

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) 遷移先とアニメーションを記述するオプション。[`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions) と [`AnimationOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions) が使用可能

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`flyTo(options)`**

center、zoom、bearing および pitch の任意の組み合わせを変更し、飛行をイメージした曲線に沿って遷移をアニメーションします。アニメーションにはズームとパンがシームレスに組み込まれており、ユーザーが長距離を移動した後でも方向感を維持できるようになっています。

注: ユーザーがオペレーティングシステムで `reduced motion` (動きの抑制) アクセシビリティ機能を有効にしている場合、`options` に `essential:true` が含まれていない限り、アニメーションはスキップされ `jumpTo` と同じ動作になります。

###### パラメータ

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) 遷移先とアニメーションを記述するオプション。[`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions)、[`AnimationOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions) に加えて、次に示すオプションが使用可能

名前 | 説明
:-- | :--
**`options.curve`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `1.42` | 飛行経路に沿って発生するズームの「カーブ」。高い値を設定するとズームのアニメーションの誇張が最大になり、低い値を設定するとズームの効果が最小になって [`MiniTokyo3D#easeTo`](#easetooptions) の動きに近づく。1.42 は、[van Wijk (2003)](https://www.win.tue.nl/~vanwijk/zoompan.pdf) で論じられた、ユーザー調査の参加者によって選択された平均値。`Math.pow(6, 0.25)` の値は平均速度の平方根に相当する。1 の値は円運動を生成する
**`options.minZoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | 飛行経路のピークでのゼロベースのズームレベル。`options.curve` が指定された場合、このオプションは無視される
**`options.speed`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>デフォルト: `1.2` | `options.curve` と関連して定義されるアニメーションの平均速度。速度が 1.2 の場合、マップが飛行経路に沿って 1 秒ごとに `options.curve` の 1.2 倍のスクリーンフルで移動しているように見えることを意味する。*スクリーンフル*とは、マップの表示部分の幅のこと。これは固定の物理的な距離に対応するものではなく、ズームレベルによって変化する
**`options.screenSpeed`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | 直線的なタイミングカーブを想定した場合の、1秒あたりのスクリーンフルで表したアニメーションの平均速度。`options.curve` が指定された場合、このオプションは無視される
**`options.maxDuration`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | アニメーションの最大継続時間をミリ秒単位で指定。継続時間が最大継続時間を超えると、0 にリセットされる

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`getBearing()`**

現在のマップの方角を返します。方角は、コンパスの方向を「上」としたものです。例えば、90°の方角は、東が上になるように地図の向きを変えた状態です。

###### 返り値

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): 現在のマップの方角

---

##### **`getCenter()`**

マップ中心点の座標を返します。

###### 返り値

[`LngLat`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglat): マップ中心点の座標

---

##### **`getClockMode()`**

現在のクロックモードを返します。

###### 返り値

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 現在のクロックモードを表す文字列。`'realtime'` または `'playback'` のどちらか

---

##### **`getPitch()`**

現在のマップの傾きを返します。

###### 返り値

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): 現在のマップの傾き。画面に対する地表面の角度（0〜60）で表される

---

##### **`getSelection()`**

追跡中の列車またはフライトの ID を返します。

###### 返り値

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 追跡中の列車またはフライトの ID。列車 ID は`'<事業者ID>.<路線ID>.<列車番号>'`、フライト ID は`'<事業者ID>.<空港ID>.<フライト番号>'`の形式で表される文字列

---

##### **`getTrackingMode()`**

現在の追跡モードを返します。

###### 返り値

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 現在の追跡モードを表す文字列。`'helicopter'` または `'heading'` のどちらか

---

##### **`getViewMode()`**

現在のビューモードを返します。

###### 返り値

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): 現在のビューモードを表す文字列。`'ground'` または `'underground'` のどちらか

---

##### **`getZoom()`**

現在のマップのズームレベルを返します。

###### 返り値

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): 現在のマップのズームレベル

---

##### **`jumpTo(options)`**

center、zoom、bearing および pitch の任意の組み合わせを、アニメーションによる遷移なしで変更します。マップは、`options` で指定されていない項目については、現在の値を保持します。

###### パラメータ

**`options`** ([`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions)) オプションのオブジェクト

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`off(type, listener)`**

[`MiniTokyo3D#on`](#ontype-listener) で追加したイベントリスナを削除します。

###### パラメータ

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) リスナの登録に使用したイベントタイプ

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) リスナとして登録した関数

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`on(type, listener)`**

指定したタイプのイベントのリスナを追加します。

###### パラメータ

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 待ち受けるイベントタイプ

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) イベントが発生したときに呼び出される関数

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`once(type, listener)`**

指定したイベントタイプに対して一度だけ呼び出されるリスナを追加します。

###### パラメータ

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 待ち受けるイベントタイプ

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) イベントが発生したときに呼び出される関数

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setBearing(bearing)`**

マップの方角を設定します。方角は、コンパスの方向を「上」としたものです。例えば、90°の方角は、東が上になるように地図の向きを変えた状態です。

`jumpTo({bearing: bearing})` と同じ。

###### パラメータ

**`bearing`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 設定する方角

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setCenter(center)`**

マップ中心点の座標を設定します。`jumpTo({center: center})` と同じです。

###### パラメータ

**`center`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/#lnglatlike)) 設定する中心点の座標

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setClockMode(mode)`**

クロックモードを設定します。リアルタイムクロックモード（`'realtime'`）では、列車や旅客機は現在時刻の実際の運行に合わせて地図上に表示されます。再生クロックモード（`'playback'`）では、時刻や時間の経過速度の指定ができるようになります。

###### パラメータ

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) クロックモードを表す文字列。`'realtime'` または `'playback'` のどちらか

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setPitch(pitch)`**

マップの傾きを設定します。`jumpTo({pitch: pitch})` と同じです。

###### パラメータ

**`pitch`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 設定する傾き。画面に対する地表面の角度（0〜60）で指定する

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setSelection(id)`**

追跡する列車またはフライトの ID を設定します。列車 ID は`'odpt.Train:<事業者ID>.<路線ID>.<列車番号>'`、フライト ID は`'odpt.FlightInformationArrival:<事業者ID>.<空港ID>.<フライト番号>'`または`'odpt.FlightInformationDeparture:<事業者ID>.<空港ID>.<フライト番号>'`の形式で表される文字列です。`'odpt.*:'`の部分は省略可能です。詳細は[東京公共交通オープンデータチャレンジ API 仕様](https://developer-tokyochallenge.odpt.org/documents)を参照してください。

###### パラメータ

**`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 追跡する列車またはフライトの ID

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setTrackingMode(mode)`**

追跡モードを設定します。ヘリコプター追跡モード（`'helicopter'`）では、対象の列車や旅客機を中心に360度旋回を行います。進行方向追跡モード（`'heading'`）では、対象の列車や旅客機の上空または斜め後方から進行方向を上にして追跡します。

###### パラメータ

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) 追跡モードを表す文字列。`'helicopter'` または `'heading'` のどちらか

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setViewMode(mode)`**

ビューモードを設定します。地上表示モード（`'ground'`）では、地上の路線や駅、列車や旅客機が明るく表示され、地下の路線、駅、列車は半透明になります。地下表示モード（`'underground'`）では、地図が暗転して地上の路線や駅、列車や旅客機が半透明になる一方で、地下の路線、駅、列車が明るく表示されます。

###### パラメータ

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) ビューモードを表す文字列。`'ground'` または `'underground'` のどちらか

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setZoom(zoom)`**

マップのズームレベルを設定します。`jumpTo({zoom: zoom})` と同じです。

###### パラメータ

**`zoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) 設定するズームレベル (0〜20)

###### 返り値

[`MiniTokyo3D`](#minitokyo3d): `this`

#### イベント

##### **`boxzoomcancel`**

ユーザーが「ボックスズーム」操作をキャンセルした場合や、境界ボックスが最小サイズのしきい値を満たしていない場合に発生します。[`BoxZoomHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler) を参照してください。

###### プロパティ

**`data`** ([`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent))

---

##### **`boxzoomend`**

「ボックスズーム」操作が終了したときに発生します。[`BoxZoomHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler) を参照してください。

###### プロパティ

**`data`** ([`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent))

---

##### **`boxzoomstart`**

「ボックスズーム」操作が開始されたときに発生します。[`BoxZoomHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler) を参照してください。

###### プロパティ

**`data`** ([`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent))

---

##### **`click`**

マップ上の同じ場所でポインティングデバイス（通常はマウス）を押して離すと発生します。

###### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`contextmenu`**

マウスの右ボタンがクリックされたとき、またはマップ内でコンテキストメニューキーが押されたときに発生します。

###### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`dblclick`**

マップ上の同じ場所ででポインティングデバイス（通常はマウス）を2回連続して押して離すと発生します。

###### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`drag`**

「移動のためのドラッグ」操作中に繰り返し発生します。[`DragPanHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler) を参照してください。

###### プロパティ

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

##### **`dragend`**

「移動のためのドラッグ」操作が終了したときに発生します。[`DragPanHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler) を参照してください。

###### プロパティ

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

##### **`dragstart`**

「移動のためのドラッグ」操作が開始されたときに発生します。[`DragPanHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler) を参照してください。

###### プロパティ

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

##### **`error`**

エラーが発生したときに発生します。これは Mini Tokyo 3D の主要なエラー報告メカニズムです。throw の代わりにイベントを使用することで、非同期処理に対応できるようにしています。リスナがエラーイベントにバインドされていない場合、エラーはコンソールに出力されます。

###### プロパティ

**`data`** (`{error: {message: `[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`}}`)

---

##### **`load`**

必要なリソースがすべてダウンロードされ、最初の完全なマップの視覚的なレンダリングが行われた後、直ちに発生します。

---

##### **`mousedown`**

マップ内でポインティングデバイス（通常はマウス）が押されたときに発生します。

###### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`mousemove`**

カーソルがマップ内にあるときにポインティングデバイス（通常はマウス）が移動したときに発生します。マップ上でカーソルを移動すると、カーソルがマップ内の位置を変更するたびにイベントが発生します。

###### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`mouseover`**

ポインティングデバイス（通常はマウス）がマップ内で移動したときに発生します。マップを含む Web ページ上でカーソルを移動すると、カーソルがマップまたは子要素に入るたびにイベントが発生します。

###### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`mouseup`**

マップ内でポインティングデバイス（通常はマウス）が離されたときに発生します。

###### プロパティ

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`move`**

ユーザの操作や [`MiniTokyo3D#flyTo`](#flytooptions) などのメソッドの結果として、あるビューから別のビューへのアニメーション遷移中に繰り返し発生します。

---

##### **`moveend`**

ユーザの操作や [`MiniTokyo3D#jumpTo`](#jumptooptions) などのメソッドの結果として、マップがあるビューから別のビューへの遷移を完了した直後に発生します。

---

##### **`movestart`**

ユーザの操作や [`MiniTokyo3D#jumpTo`](#jumptooptions) などのメソッドの結果として、マップがあるビューから別のビューに遷移する直前に発生します。

---

##### **`pitch`**

ユーザの操作や [`MiniTokyo3D#flyTo`](#flytooptions) などのメソッドの結果として、マップの傾きの状態遷移アニメーションの間に繰り返し発生します。

---

##### **`pitchend`**

ユーザの操作や [`MiniTokyo3D#flyTo`](#flytooptions) などのメソッドの結果として、マップの傾きが変化し終わった直後に発生します。

---

##### **`pitchstart`**

ユーザの操作や [`MiniTokyo3D#flyTo`](#flytooptions) などのメソッドの結果として、マップの傾きが変化し始める直前に発生します。

---

##### **`resize`**

マップのサイズが変更された直後に発生します。

---

##### **`rotate`**

「回転のためのドラッグ」操作中に繰り返し発生します。[`DragRotateHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler) を参照してください。

---

##### **`rotateend`**

「回転のためのドラッグ」操作が終了したときに発生します。[`DragRotateHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler)を参照してください。

---

##### **`rotatestart`**

「回転のためのドラッグ」操作が開始されたときに発生します。[`DragRotateHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler)を参照してください。

---

##### **`touchcancel`**

マップ内で [`touchcancel`](https://developer.mozilla.org/docs/Web/Events/touchcancel) イベントが発生したときに発生します。

###### プロパティ

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

##### **`touchend`**

マップ内で [`touchend`](https://developer.mozilla.org/docs/Web/Events/touchend) イベントが発生したときに発生します。

###### プロパティ

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

##### **`touchmove`**

マップ内で [`touchmove`](https://developer.mozilla.org/docs/Web/Events/touchmove) イベントが発生したときに発生します。

###### プロパティ

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

##### **`touchstart`**

マップ内で [`touchstart`](https://developer.mozilla.org/docs/Web/Events/touchstart) イベントが発生したときに発生します。

###### プロパティ

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

##### **`wheel`**

マップ内で [`wheel`](https://developer.mozilla.org/docs/Web/Events/wheel) イベントが発生したときに発生します。

###### プロパティ

**`data`** ([`MapWheelEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapwheelevent))

---

##### **`zoom`**

ユーザの操作や [`MiniTokyo3D#flyTo`](#flytooptions) などのメソッドの結果として、あるズームレベルから別のズームレベルへのアニメーション遷移中に繰り返し発生します。

---

##### **`zoomend`**

ユーザの操作や [`MiniTokyo3D#flyTo`](#flytooptions) などのメソッドの結果として、マップがあるズームレベルから別のズームレベルへの移行を完了した直後に発生します。

---

##### **`zoomstart`**

ユーザの操作や [`MiniTokyo3D#flyTo`](#flytooptions) などのメソッドの結果として、マップがあるズームレベルから別のズームレベルへの移行を開始する直前に発生します。

### Secrets

`Secrets` オブジェクトは、データ取得に使用するアクセストークンを格納するオブジェクトで、[`MiniTokyo3D`](#minitokyo3d) のコンストラクタオプション `secrets` に指定します。

#### プロパティ

**`tokyochallenge`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : [東京公共交通オープンデータチャレンジ](https://tokyochallenge.odpt.org)のアクセストークン。未指定の場合は、デフォルトのトークンが使われる

**`odpt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) : [公共交通オープンデータセンター](https://www.odpt.org)のアクセストークン。未指定の場合は、デフォルトのトークンが使われる

**`mapbox`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : [Mapbox](https://www.mapbox.com) のアクセストークン。未指定の場合はマップのロード時にエラーが起きるため、必ず自分の Web サイト専用のアクセストークンを入手して指定する

## Mini Tokyo 3D のビルド

リリース前の最新版の機能を試したい、自分でコードを改造したい、Mini Tokyo 3D の開発にコントリビュートしたい、という場合には、本セクションの手順に従ってソースコードからプロジェクトをビルドすることができます。

### ビルド準備

次のソフトウェアが必要です。

- [Node.js](https://nodejs.org/ja/) 最新版
- [Git](https://git-scm.com) 最新版（リポジトリをクローンする場合）

Mini Tokyo 3D は次のデータソースを使用しており、ビルド時にそれぞれのデータソースに対するアクセストークンが必要です。下記の手順に従って、アクセストークンを入手してください。

データソース | サインアップ用 URL | アクセストークンの形式
:-- | :-- | :--
[東京公共交通オープンデータチャレンジ](https://tokyochallenge.odpt.org) | [リンク](https://developer-tokyochallenge.odpt.org/users/sign_up) | 数字と英小文字からなる文字列
[公共交通オープンデータセンター](https://www.odpt.org) | [リンク](https://developer.odpt.org/users/sign_up) | 数字と英小文字からなる文字列
[Mapbox](https://www.mapbox.com) | [リンク](https://account.mapbox.com/auth/signup/) | `pk.` で始まるピリオドを含む英数字文字列

#### 東京公共交通オープンデータチャレンジアクセストークンの入手

Mini Tokyo 3D は[東京公共交通オープンデータチャレンジ](https://tokyochallenge.odpt.org)で配信されている列車データや旅客機データを利用しています。データの入手には開発者としての登録が必要ですが、無料で利用可能です。

1. [開発者サイトへの登録](https://developer-tokyochallenge.odpt.org/users/sign_up)ページでユーザー情報を入力して、開発者登録をします。登録完了のメールが届くまでに数日かかる場合があります。
2. 開発者アカウントでログイン後、画面上部のメニューから「Account」をクリックして「アクセストークンの確認・追加」を選びます。
3. アクセストークン一覧が表示されます。アカウント作成直後はデフォルトの「DefaultApplication」のみが表示されます。「アクセストークンの追加発行」をクリックします。
4. 「名前」に任意のアプリケーション名を入力して、「Submit」ボタンをクリックします。
5. アクセストークン一覧に新たに作成されたトークンが表示されます。

#### 公共交通オープンデータセンターアクセストークンの入手

Mini Tokyo 3D は[公共交通オープンデータセンター](https://www.odpt.org)のデータも併せて利用しています。こちらも、データの入手には開発者としての登録が必要ですが、無料で利用可能です。

1. [開発者サイトへの登録](https://developer.odpt.org/users/sign_up)ページでユーザー情報を入力して、開発者登録をします。登録完了のメールが届くまでに数日かかる場合があります。
2. 開発者アカウントでログイン後、画面上部のメニューから「Account」をクリックして「アクセストークンの確認・追加」を選びます。
3. アクセストークン一覧が表示されます。アカウント作成直後はデフォルトの「DefaultApplication」のみが表示されます。「アクセストークンの追加発行」をクリックします。
4. 「名前」に任意のアプリケーション名を入力して、「Submit」ボタンをクリックします。
5. アクセストークン一覧に新たに作成されたトークンが表示されます。

#### Mapbox アクセストークンの入手

[Mapbox アクセストークンの入手](#mapbox-%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E3%83%88%E3%83%BC%E3%82%AF%E3%83%B3%E3%81%AE%E5%85%A5%E6%89%8B) を参照してください。

### ビルド手順

#### 1. ファイルのダウンロード

Mini Tokyo 3D の [GitHub レポジトリ](https://github.com/nagix/mini-tokyo-3d)から `master` ブランチ最新版をダウンロードして、zipファイルを展開します。`mini-tokyo-3d-master` というディレクトリができますが、`mini-tokyo-3d` という名前に変更しておきます。

```bash
curl -LO https://github.com/nagix/mini-tokyo-3d/archive/master.zip
unzip master.zip
mv mini-tokyo-3d-master mini-tokyo-3d
```

もし Git をお使いでしたら、上記のコマンドの代わりに GitHub からリポジトリを直接クローンしても構いません。

```bash
git clone https://github.com/nagix/mini-tokyo-3d.git
```

#### 2. ビルド

Mini Tokyo 3D のトップディレクトリに移動します。

```bash
cd mini-tokyo-3d
```

ビルド準備のステップで取得したアクセストークンを記載した JSON ファイルを作成し、`secrets` というファイル名でこのディレクトリに保存します。

```json
{
    "tokyochallenge": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "odpt": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "mapbox": "pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxx"
}
```

依存 npm モジュールをインストールします。

```bash
npm install
```

次のコマンドでプロジェクトをビルドします。

```bash
npm run build-all
```

ビルドが正常に完了すると、`dist` ディレクトリが作成されます。この中には配布用のスタイルシートおよび JavaScript ファイルが含まれています。また、同時に `build` ディレクトリも作成されます。この中には Web サイトへの設置に必要なすべてのファイルが含まれています。

#### 3. Web サイトへの設置

`build` ディレクトリに含まれる `index.html` は [https://minitokyo3d.com](http://minitokyo3d.com) 用の Web ページです。設置する Web サイトに合わせて編集した上で、`build` ディレクトリのファイル全てを Web サーバの公開ディレクトリに配置してください。
