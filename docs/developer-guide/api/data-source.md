# DataSource

The `DataSource` object is used to specify additional [GTFS](https://gtfs.org) (General Transit Feed Specification) and GTFS Realtime data sources, set as an array in the [`Map`](./map.md) constructor option `dataSources`.

::: warning
Note that this is an experimental feature which is under development and is prone to change.

Currently, you must specify both a GTFS dataset and a GTFS Realtime feed to view vehicles moving along routes. Also, vehicles will not be displayed when [Playback Mode](../../user-guide/display-modes.md#playback-mode) is on.
:::

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Properties

### **`color`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

A color used to display routes and vehicles. It is specified by a hexadecimal color code starting with `#`.

### **`gtfsUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Specifies the URL of [a GTFS dataset zip file](https://gtfs.org/documentation/schedule/reference/#dataset-publishing-general-practices). A GTFS dataset must contain at least the following files.

- agency.txt
- stops.txt
- routes.txt
- trips.txt
- stop_times.txt
- calendar.txt
- calendar_dates.txt
- shapes.txt
- translations.txt
- feed_info.txt

### **`vehiclePositionUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Specifies the URL for [a GTFS Realtime VehiclePosition feed](https://gtfs.org/documentation/realtime/reference/#message-vehicleposition).
