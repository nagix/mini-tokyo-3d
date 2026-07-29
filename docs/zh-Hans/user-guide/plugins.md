# 插件

Mini Tokyo 3D 提供多种插件，用于在 3D 地图上显示附加信息。各插件提供的信息会作为图层显示在地图上，并可在[图层显示设置](./configuration.md#图层显示设置)面板中开启或关闭。

## 降水插件

<img :src="$withBase('/images/weather.jpg')" style="width: 580px;">

该插件依据实时雷达信息，按照降雨强度在地图上显示降水动画。地图放大后，会以更精细的网格显示降水强度，并每 10 分钟更新一次最新信息。

更多信息请访问 [Mini Tokyo 3D 降水插件 GitHub 仓库](https://github.com/nagix/mt3d-plugin-precipitation)。

## 烟花插件

<img :src="$withBase('/images/fireworks.jpg')" style="width: 580px;">

该插件在地图上显示烟花动画。你可以在预定日期和时间，观看烟花从地图上指定地点升空的 3D 动画。烟花大会举办当天，屏幕左侧会显示大会列表；单击或轻触其中一项，地图便会移至举办地点。

更多信息请访问 [Mini Tokyo 3D 烟花插件 GitHub 仓库](https://github.com/nagix/mt3d-plugin-fireworks)。

## 实时摄像头插件

<img :src="$withBase('/images/livecam.jpg')" style="width: 580px;">

你可以通过设置在东京各地的实时摄像头观看列车运行。单击或轻触地图上的实时摄像头按钮，地图会放大至该地点，并以相同视角显示正在直播的视频。视频虽为实时传输，但会有数十秒延迟，因此实际列车通常会比地图上的列车稍晚出现。单击没有实时摄像头按钮的地图区域，可取消选择摄像头。

更多信息请访问 [Mini Tokyo 3D 实时摄像头插件 GitHub 仓库](https://github.com/nagix/mt3d-plugin-livecam)。

## PLATEAU 插件

<img :src="$withBase('/images/plateau.jpg')" style="width: 580px;">

该插件将日本国土交通省 [Project PLATEAU](https://www.mlit.go.jp/plateau/) 提供的东京 3D 城市模型与 Mini Tokyo 3D 结合显示。市中心区域提供精细的建筑几何数据和纹理，可呈现非常逼真的城市景观。由于运行负载和内存需求较高，建议使用高性能设备。

更多信息请访问 [Mini Tokyo 3D PLATEAU 插件 GitHub 仓库](https://github.com/nagix/mt3d-plugin-plateau)。

## GTFS 插件

<img :src="$withBase('/images/gtfs-plugin.jpg')" style="width: 580px;">

该插件根据 [GTFS](https://gtfs.org) 数据集和 GTFS Realtime 数据源，在 Mini Tokyo 3D 地图上显示公共交通线路和车辆。与列车和飞机一样，将鼠标指针悬停在车辆上或轻触车辆，可查看详细信息；单击或轻触车辆则会开启跟踪模式，画面会自动跟随车辆移动。由于运行负载和内存需求较高，建议使用高性能设备。

更多信息请访问 [Mini Tokyo 3D GTFS 插件 GitHub 仓库](https://github.com/nagix/mt3d-plugin-gtfs)。

::: warning 注意
目前，该插件支持显示都营巴士、横滨市营巴士和京成巴士千叶西部。
:::

## 东京 2020 奥运会插件

<img :src="$withBase('/images/olympics.jpg')" style="width: 580px;">

该插件显示于 2021 年 7 月 23 日至 8 月 8 日举行的东京 2020 奥运会赛程和场馆信息。开幕前，屏幕左上角时间下方会显示开幕式倒计时；赛事期间则会显示当前是第几个比赛日。此外，各比赛场馆所在位置会在地图上显示项目图标。单击或轻触图标，地图会放大至该地点，并显示该场馆的详细赛程。国立竞技场站附近还会显示为东京 2020 奥运会建造的国立竞技场精细 3D 模型。

更多信息请访问 [Mini Tokyo 3D 东京 2020 奥运会插件 GitHub 仓库](https://github.com/nagix/mt3d-plugin-olympics2020)。

::: warning 注意
[https://minitokyo3d.com](https://minitokyo3d.com) 上不会显示东京 2020 奥运会插件。你可以在[面向东京公共交通开放数据挑战赛的 Mini Tokyo 3D 2021](https://minitokyo3d.com/2021/) 页面查看。
:::
