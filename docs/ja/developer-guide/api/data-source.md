# DataSource

`DataSource` オブジェクトは、追加の [GTFS](https://gtfs.org/ja/) (General Transit Feed Specification) および GTFS Realtime データソースを指定するためのオブジェクトで、[`Map`](./map.md) のコンストラクタオプション `dataSources` に配列として指定します。

::: warning 注意
これは開発中の実験的な機能であり、変更される可能性があることに注意してください。
:::

**型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## プロパティ

### **`color`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

路線および車両の表示に使用する色です。`#` から始まる16進数のカラーコードで指定します。

### **`gtfsUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

[GTFS データセットの zip ファイル](https://gtfs.org/ja/documentation/schedule/reference/#_10)の URL を指定します。GTFS データセットには少なくとも次のファイルが含まれている必要があります。

- agency.txt
- stops.txt
- routes.txt
- trips.txt
- stop_times.txt
- calendar.txt または calendar_dates.txt
- shapes.txt

### **`vehiclePositionUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

[GTFS Realtime の VehiclePosition フィード](https://gtfs.org/ja/documentation/realtime/reference/#message-vehicleposition)の URL を指定します。省略した場合は、時刻表通りの運行が行われます。
