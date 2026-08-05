# 显示 GTFS 数据集

<img :src="$withBase('/images/gtfs.jpg')" style="width: 576px;">

Mini Tokyo 3D 支持 [GTFS](https://gtfs.org)（General Transit Feed Specification，通用公共交通数据规范）和 GTFS Realtime。指定数据源后，可以在地图上实时查看沿线路移动的车辆。

GTFS 数据集中的车辆会显示为比 Mini Tokyo 3D 常规列车和飞机略小的方块。可显示的 GTFS 数据集不限于东京地区，可以来自世界任何地区。也就是说，Mini Tokyo 3D 可以用作简易的 GTFS 数据集查看器。

## 指定数据源

要指定某个 GTFS 数据集和 GTFS Realtime VehiclePosition 数据源，请在 Mini Tokyo 3D 的访问网址后添加 `?`，再附上键值对（查询参数）。如果通过 `gtfsurl` 或 `gtfsvpurl` 指定的数据网址由公共交通开放数据中心托管，且以 `https://api.odpt.org/` 开头，则不需要用于指定访问令牌的 `acl:consumerKey` 参数。

```
https://minitokyo3d.com/?gtfsurl=<URL>&gtfsvpurl=<URL>&gtfscolor=<颜色代码>
```

查询参数 | 说明 | 示例
-- | -- | --
`gtfsurl` | [GTFS 数据集 ZIP 文件](https://gtfs.org/documentation/schedule/reference/#dataset-publishing-general-practices)的网址（需要进行 URL 编码） | `https%3A%2F%2Fapi-public.odpt.org%2Fapi%2Fv4%2Ffiles%2FToei%2Fdata%2FToeiBus-GTFS.zip`
`gtfsvpurl` | [GTFS Realtime VehiclePosition 数据源](https://gtfs.org/documentation/realtime/reference/#message-vehicleposition)的网址（需要进行 URL 编码）。省略时，车辆会按照时刻表运行 | `https%3A%2F%2Fapi-public.odpt.org%2Fapi%2Fv4%2Fgtfs%2Frealtime%2FToeiBus`
`gtfscolor` | 用于显示线路和车辆的颜色。使用十六进制颜色代码（不带开头的 `#`） | `9FC105`

由于同源策略的限制，`gtfsurl` 和 `gtfsvpurl` 所指定的网址必须与 Mini Tokyo 3D 本身位于同一来源（origin），或在提供时配置了适当的 CORS（跨源资源共享）设置。

以这种方式指定 GTFS 数据集时，Mini Tokyo 3D 仅显示该数据集，而不加载默认的东京交通数据，时钟也会使用该数据集的本地时区（取自其 GTFS 的 `agency_timezone`）来显示时间。

要显示的 GTFS 数据集未必覆盖东京周边，因此可以在上述查询参数之后添加 `#`，再以 `/` 分隔多个元素（hash），将地图的初始位置和朝向设置为适合显示该数据集的状态。

```
https://minitokyo3d.com/?<查询参数>#<缩放级别>/<纬度>/<经度>/<方位角>/<倾斜角>
```

Hash 元素 | 说明 | 示例
-- | -- | --
第 1 项 | 地图的初始缩放级别 | `14`
第 2 项 | 地图初始中心点的纬度 | `35.6814`
第 3 项 | 地图初始中心点的经度 | `139.7670`
第 4 项 | 地图的初始方位角（旋转角度），从正北方向逆时针计算，单位为度 | `0`
第 5 项 | 地图的初始倾斜角，相对于屏幕平面计算，单位为度（0–85） | `60`

## 查看车辆详细信息

<img :src="$withBase('/images/vehicle-details.jpg')" style="width: 251px;">

将鼠标指针悬停在车辆上或轻触车辆，可查看其详细信息，包括运营商名称、线路编号、目的地、车辆编号、上一站和下一站。

运营商名称右侧显示的无线电波图标表示该车辆采用了实时位置信息。

## 跟踪车辆

<img :src="$withBase('/images/vehicle-tracking.jpg')" style="width: 400px;">

单击或轻触车辆会开启跟踪模式，画面将自动跟随车辆移动。跟踪模式提供八种视角：“仅位置”“后方”“后方的天空”“前方”“前方的天空”“直升机”“无人机”和“鸟”，可以从喜欢的视角欣赏沿线风景。跟踪模式开启时，地图的平移、缩放、旋转和倾斜操作会被禁用（“仅位置”视角下仍可缩放、旋转和倾斜）。单击或轻触没有车辆的地图区域可关闭跟踪模式。

跟踪模式开启时，画面底部会显示正在跟踪的车辆的时刻表和当前位置。可以使用鼠标滚轮、拖动滚动条或手指拖动来滚动时刻表。单击或轻触时刻表右上角的“∨”图标，可隐藏画面底部的时刻表；单击或轻触“∧”图标，可再次显示。

跟踪模式的视角可在“跟踪模式设置”面板中更改。更多信息请参阅[跟踪模式设置](./configuration.md#跟踪模式设置)。
