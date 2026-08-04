# DataSource

`DataSource` 对象用于指定列车、航班或巴士数据源。数据源加载的内容由它所包含的网址属性决定。数据源可以作为数组设置到 [`Map`](./map.md) 构造函数选项 `dataSources` 中，也可以在运行时通过 [`Map#addDataSource`](./map.md#adddatasource-source) 和 [`Map#removeDataSource`](./map.md#removedatasource-id) 添加或移除。

对于列车数据（`trainUrl` 和 `trainInfoUrl`），系统会根据每个对象的 `@type` 自动检测格式：`@type` 为 `'odpt:Train'` 或 `'odpt:TrainInformation'` 的对象按原始 [ODPT](https://www.odpt.org/) 格式解析，其他对象则按预先规范化的 Mini Tokyo 3D 格式解析。当多个数据源包含同一列车、航班或列车运行信息时，数组中靠后的数据源会覆盖靠前的数据源。

对于主机已登记为 ODPT 兼容主机的网址，[`Secrets`](./secrets.md) 中相应的访问令牌会自动作为 consumer key 附加到网址中。

由于同源策略的限制，数据源加载的网址必须与 Mini Tokyo 3D 本身位于同一来源（origin），或在提供时配置了适当的 CORS（跨源资源共享）设置。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## 属性

### **`atisUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

机场交通信息（ATIS）数据的网址，该数据与 `flightUrl` 一起用于确定跑道运行情况。省略时，不从此数据源加载 ATIS 数据。

### **`color`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

对于 GTFS 数据源（包含 `gtfsUrl`），用于显示线路和车辆的颜色。使用以 `#` 开头的十六进制颜色代码指定。

### **`expiresAt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

[ISO 8601](https://zh.wikipedia.org/wiki/ISO_8601) 日期时间字符串。当前时间达到此值后，不再加载该数据源。省略时，数据源永不过期。

### **`flightUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

航班数据的网址。省略时，不从此数据源加载航班。

### **`gtfsUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

[GTFS 数据集 ZIP 文件](https://gtfs.org/documentation/schedule/reference/#dataset-publishing-general-practices)的网址。GTFS 数据集至少必须包含以下文件。

- agency.txt
- stops.txt
- routes.txt
- trips.txt
- stop_times.txt
- calendar.txt 或 calendar_dates.txt
- shapes.txt

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

数据源的唯一 ID。它用作 [`Map#addDataSource`](./map.md#adddatasource-source) 和 [`Map#removeDataSource`](./map.md#removedatasource-id) 的键。

### **`trainInfoUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

列车运行信息数据的网址。对于原始 ODPT 格式，它是完整展开的 [ODPT `odpt:TrainInformation`](https://developer.odpt.org) 请求网址。省略时，不从此数据源加载列车运行信息。

### **`trainUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

列车位置数据的网址。对于原始 ODPT 格式，它是完整展开的 [ODPT `odpt:Train`](https://developer.odpt.org) 请求网址。省略时，不从此数据源加载列车位置。

### **`vehiclePositionUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

对于 GTFS 数据源（包含 `gtfsUrl`），这是 [GTFS Realtime VehiclePosition 数据源](https://gtfs.org/documentation/realtime/reference/#message-vehicleposition)的网址。省略时，车辆将按照时刻表运行。
