# DataSource

`DataSource` オブジェクトは、列車・フライト・バスのデータソースを指定するためのオブジェクトです。何を読み込むかは、そのデータソースが持つ URL プロパティによって決まります。[`Map`](./map.md) のコンストラクタオプション `dataSources` に配列として指定するか、実行時に [`Map#addDataSource`](./map.md#adddatasource-source) および [`Map#removeDataSource`](./map.md#removedatasource-id) で追加・削除できます。

列車データ（`trainUrl` および `trainInfoUrl`）では、各オブジェクトの形式は `@type` から自動判定されます。`@type` が `'odpt:Train'` または `'odpt:TrainInformation'` のオブジェクトは生の [ODPT](https://www.odpt.org/) 形式として、それ以外は正規化済みの Mini Tokyo 3D 形式としてパースされます。複数のデータソースに同一の列車・フライト・運行情報が含まれる場合、配列の後方にあるソースが前方のソースを上書きします。

ホストが ODPT 互換ホストとして登録されている URL には、[`Secrets`](./secrets.md) の対応するアクセストークンが利用者キーとして自動的に付与されます。

同一オリジンポリシーの制約により、データソースが読み込む URL は、Mini Tokyo 3D 本体と同じオリジンの URL とするか、適切な CORS（オリジン間リソース共有）設定がなされた URL を指定する必要があります。

**型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## プロパティ

### **`atisUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

滑走路の運用を判定するために `flightUrl` と併せて使う、空港の運航情報（ATIS）データの URL です。省略した場合、このデータソースから ATIS データは読み込まれません。

### **`color`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

GTFS データソース（`gtfsUrl` を持つ）において、路線および車両の表示に使用する色です。`#` から始まる16進数のカラーコードで指定します。

### **`expiresAt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

[ISO 8601](https://ja.wikipedia.org/wiki/ISO_8601) の日時文字列です。現在時刻がこの値に達すると、そのデータソースは読み込まれなくなります。省略した場合、期限切れになりません。

### **`flightUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

フライトデータの URL です。省略した場合、このデータソースからフライトは読み込まれません。

### **`gtfsUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

[GTFS データセットの zip ファイル](https://gtfs.org/ja/documentation/schedule/reference/#_10)の URL です。GTFS データセットには少なくとも次のファイルが含まれている必要があります。

- agency.txt
- stops.txt
- routes.txt
- trips.txt
- stop_times.txt
- calendar.txt または calendar_dates.txt
- shapes.txt

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

データソースの一意な ID です。[`Map#addDataSource`](./map.md#adddatasource-source) および [`Map#removeDataSource`](./map.md#removedatasource-id) のキーとして使われます。

### **`trainInfoUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

運行情報データの URL です。生 ODPT 形式では、展開済みの [ODPT `odpt:TrainInformation`](https://developer.odpt.org) リクエスト URL を指定します。省略した場合、このデータソースから運行情報は読み込まれません。

### **`trainUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

列車位置データの URL です。生 ODPT 形式では、展開済みの [ODPT `odpt:Train`](https://developer.odpt.org) リクエスト URL を指定します。省略した場合、このデータソースから列車位置は読み込まれません。

### **`vehiclePositionUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

GTFS データソース（`gtfsUrl` を持つ）において、[GTFS Realtime の VehiclePosition フィード](https://gtfs.org/ja/documentation/realtime/reference/#message-vehicleposition)の URL です。省略した場合は、時刻表通りの運行が行われます。
