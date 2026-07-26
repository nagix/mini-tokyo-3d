# DataSource

The `DataSource` object is used to specify a train, flight or bus data source. What a data source loads is determined by which URL properties it carries. Data sources can be set as an array in the [`Map`](./map.md) constructor option `dataSources`, or added and removed at runtime with [`Map#addDataSource`](./map.md#adddatasource-source) and [`Map#removeDataSource`](./map.md#removedatasource-id).

For train data (`trainUrl` and `trainInfoUrl`), the format of each object is detected automatically from its `@type`: objects with `@type` of `'odpt:Train'` or `'odpt:TrainInformation'` are parsed as the raw [ODPT](https://www.odpt.org/en/) format, otherwise as the pre-normalized Mini Tokyo 3D format. When multiple data sources contain the same train, flight or train information, sources that appear later in the array override earlier ones.

For a URL whose host is registered as an ODPT-compatible host, the corresponding access token in [`Secrets`](./secrets.md) is automatically appended as a consumer key.

Due to the same-origin policy, the URLs loaded by a data source must be either on the same origin as Mini Tokyo 3D itself, or served with appropriate CORS (Cross-Origin Resource Sharing) settings.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Properties

### **`atisUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

The URL for the airport traffic information (ATIS) data used together with `flightUrl` to determine runway operations. If omitted, no ATIS data is loaded from this data source.

### **`color`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

For a GTFS data source (with `gtfsUrl`), a color used to display routes and vehicles. It is specified by a hexadecimal color code starting with `#`.

### **`expiresAt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

An [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) date-time string. Once the current time reaches this value, the data source is no longer loaded. If omitted, the data source never expires.

### **`flightUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

The URL for the flight data. If omitted, no flights are loaded from this data source.

### **`gtfsUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

The URL of [a GTFS dataset zip file](https://gtfs.org/documentation/schedule/reference/#dataset-publishing-general-practices). A GTFS dataset must contain at least the following files.

- agency.txt
- stops.txt
- routes.txt
- trips.txt
- stop_times.txt
- calendar.txt or calendar_dates.txt
- shapes.txt

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

A unique ID of the data source. It is used as the key for [`Map#addDataSource`](./map.md#adddatasource-source) and [`Map#removeDataSource`](./map.md#removedatasource-id).

### **`trainInfoUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

The URL for the train information data. For the raw ODPT format, it is a fully expanded [ODPT `odpt:TrainInformation`](https://developer.odpt.org) request URL. If omitted, no train information is loaded from this data source.

### **`trainUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

The URL for the train position data. For the raw ODPT format, it is a fully expanded [ODPT `odpt:Train`](https://developer.odpt.org) request URL. If omitted, no train positions are loaded from this data source.

### **`vehiclePositionUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

For a GTFS data source (with `gtfsUrl`), the URL for [a GTFS Realtime VehiclePosition feed](https://gtfs.org/documentation/realtime/reference/#message-vehicleposition). If omitted, vehicles will operate according to the timetables.
