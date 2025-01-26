# GTFS データセットの表示

<img :src="$withBase('/images/gtfs.jpg')" style="width: 576px;">

Mini Tokyo 3D は [GTFS](https://gtfs.org/ja/) (General Transit Feed Specification) および GTFS Realtime をサポートしています。データソースを指定することにより、リアルタイムでマップ上の路線に沿って移動する車両を表示することができます。

GTFS データセットの車両は、通常の Mini Tokyo 3D の列車や旅客機と比べて、やや小さめの直方体で表現されています。表示する GTFS データセットは東京周辺に限らず、世界中のどの地域のものでも構いません。つまり、Mini Tokyo 3D を GTFS データセットの簡易ビューアとして利用することができます。

::: warning 注意
これは開発中の実験的な機能であり、変更される可能性があることに注意してください。

現時点では、路線上を移動する車両を表示するには GTFS データセットおよび GTFS Realtime フィードの両方を指定する必要があります。また、[再生モード](./display-modes.md#%E5%86%8D%E7%94%9F%E3%83%A2%E3%83%BC%E3%83%88%E3%82%99)がオンの状態では車両は表示されません。
:::

## データソースの指定

Mini Tokyo 3D にアクセスする際の URL の末尾に、「`?`」に続けてキーと値のペア（クエリパラメータ）を記述することで、特定の GTFS データセットおよび GTFS Realtime VehiclePosition フィードを指定します。`gtfsurl` または `gtfsvpurl` に、`https://api.odpt.org/` で始まる公共交通オープンデータセンター配信データの URL を指定する場合には、アクセストークンを指定する `acl:consumerKey` パラメータは不要です。

```
https://minitokyo3d.com/?gtfsurl=<URL>&gtfsvpurl=<URL>&gtfscolor=<カラーコード>
```

クエリパラメータ | 説明 | 例
-- | -- | --
`gtfsurl` | [GTFS データセットの zip ファイル](https://gtfs.org/ja/documentation/schedule/reference/#_10)の URL（URL エンコードが必要） | `https%3A%2F%2Fapi-public.odpt.org%2Fapi%2Fv4%2Ffiles%2FToei%2Fdata%2FToeiBus-GTFS.zip`
`gtfsvpurl` | [GTFS Realtime の VehiclePosition フィード](https://gtfs.org/ja/documentation/realtime/reference/#message-vehicleposition)の URL（URL エンコードが必要） | `https%3A%2F%2Fapi-public.odpt.org%2Fapi%2Fv4%2Fgtfs%2Frealtime%2FToeiBus`
`gtfscolor` | 路線および車両の表示に使用する色。16進数のカラーコード（先頭に `#` はつけない） | `9FC105`

表示する GTFS データセットは東京周辺とは限らないため、「`#`」に続けて「`/`」で区切られた複数の要素（ハッシュ）を指定することで、マップの初期位置や向きをデータセットの表示に適した値にすると便利です。ハッシュは、上記のクエリパラメータの後に記述してください。

```
https://minitokyo3d.com/?<クエリパラメータ>#<ズーム>/<緯度>/<経度>/<方角>/<傾き>
```

ハッシュ要素 | 説明 | 例
-- | -- | --
1つ目 | 初期のマップのズームレベル | `14`
2つ目 | 初期のマップ中心点の緯度 | `35.6814`
3つ目 | 初期のマップ中心点の経度 | `139.7670`
4つ目 | 初期のマップの方角。真北から反時計回りの角度で指定する | `0`
5つ目 | 初期のマップの傾き。画面に対する地表面の角度（0〜85）で指定する | `60`

## 車両の詳細情報の表示

<img :src="$withBase('/images/vehicle-details.jpg')" style="width: 251px;">

車両にマウスポインタを合わせたり、タップをすると車両の詳細情報が表示されます。詳細情報は、運行事業者名、系統番号、行先、車両番号、前停留所、次停留所を含みます。

## 車両の追跡

<img :src="$withBase('/images/vehicle-tracking.jpg')" style="width: 400px;">

車両をクリックまたはタップすると、追跡モードがオンに切り替わり、車両の動きに追随して画面が自動的に移動します。追跡モードにおける視点は「位置のみ」「後方」「後方上空」「前方」「前方上空」「ヘリコプター」「ドローン」「鳥」の8種類があり、お好みの視点で沿道の風景を楽しむことができます。追跡モードがオンの状態では、地図のスクロール、拡大・縮小、回転、傾きの変更操作は無効になります（「位置のみ」視点に限り、拡大・縮小、回転、傾きの変更は可能です）。車両が存在しない地図上をクリックまたはタップすると、追跡モードがオフに切り替わり元の視点に戻ります。

追跡モードがオンの状態では、追跡中の車両の時刻表と現在位置が画面下部に表示されます。時刻表はマウスホイール、スクロールバーのドラッグ、もしく指でのドラッグにてスクロールさせることができます。時刻表の右上の「∨」アイコンをクリックまたはタップすると時刻表が画面下部に隠れ、「∧」アイコンをクリックまたはタップすると再表示されます。

追跡モードにおける視点は追跡モード設定パネルにて変更できます。詳細については[こちら](./configuration.md#%E8%BF%BD%E8%B7%A1%E3%83%A2%E3%83%BC%E3%83%88%E3%82%99%E8%A8%AD%E5%AE%9A)をご覧ください。
