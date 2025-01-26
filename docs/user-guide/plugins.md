# Plugins

A variety of plugins are available to display additional information on the 3D map. The information provided by each plugin is displayed as a layer on the map, and can be toggled on and off in the [Layer Display Settings](./configuration.md#layer-display-settings) panel.

## Precipitation Plugin

<img :src="$withBase('/images/weather.jpg')" style="width: 580px;">

Based on real-time radar information, precipitation animations are displayed on the map according to the intensity of rain. As you increase the zoom level, the intensity of precipitation is displayed in finer mesh units, and is updated every 10 minutes with the latest information.

For more information, please visit [Mini Tokyo 3D Precipitation Plugin GitHub Repository](https://github.com/nagix/mt3d-plugin-precipitation).

## Fireworks Plugin

<img :src="$withBase('/images/fireworks.jpg')" style="width: 580px;">

This plugin displays fireworks animations on a map. You can watch 3D animation of fireworks launch at a specific location on the map on a scheduled date and time. On the day fireworks festivals are to be held, a list of festivals will appear on the left side of the screen, and clicking or tapping on an item will take you to the location where the festival is to be held.

For more information, please visit [Mini Tokyo 3D Fireworks Plugin GitHub Repository](https://github.com/nagix/mt3d-plugin-fireworks).

## Live Camera Plugin

<img :src="$withBase('/images/livecam.jpg')" style="width: 580px;">

You can watch trains running on live cameras placed in various locations around Tokyo. Clicking or tapping on a live camera button on the map will zoom in on the location and display the live camera video stream being broadcast from the same viewpoint. The video is transmitted in real-time, but there is a delay of a few tens of seconds, so the actual train tends to appear a little later than the movement of the train on the map. Clicking on a map where there is no live camera button will deselect the live camera.

For more information, please visit [Mini Tokyo 3D Live Camera Plugin GitHub Repository](https://github.com/nagix/mt3d-plugin-livecam).

## PLATEAU Plugin

<img :src="$withBase('/images/plateau.jpg')" style="width: 580px;">

A 3D city model of Tokyo provided by [Project PLATEAU](https://www.mlit.go.jp/plateau/) is displayed in combination with Mini Tokyo 3D. Detailed geometry data and textures of buildings are available for the city center, allowing for the display of very realistic urban landscapes. Due to the relatively heavy load and large memory requirements, use on a high performance device is recommended.

For more information, please visit [Mini Tokyo 3D PLATEAU Plugin GitHub Repository](https://github.com/nagix/mt3d-plugin-plateau).

## GTFS Plugin

<img :src="$withBase('/images/gtfs-plugin.jpg')" style="width: 580px;">

This plugin displays transit routes and vehicles on the the Mini Tokyo 3D map based on [GTFS](https://gtfs.org) datasets and GTFS Realtime feeds. As with trains and aircrafts, hovering the mouse pointer over a vehicle or tapping it will display detailed information about the vehicle. Clicking or tapping on a vehicle toggles the tracking mode on, and the screen automatically moves to follow the vehicle's movement. Due to the relatively heavy load and large memory requirements, use on a high performance device is recommended.

For more information, please visit [Mini Tokyo 3D GTFS Plugin GitHub Repository](https://github.com/nagix/mt3d-plugin-gtfs).

::: warning
Currently, the plugin only supports real-time location display for Toei Bus, Yokohama Municipal Bus, and Keisei Transit Bus. Also, vehicles will not be displayed when [Playback Mode](./display-modes.md#playback-mode) is on.
:::

## Tokyo 2020 Olympics Plugin

<img :src="$withBase('/images/olympics.jpg')" style="width: 580px;">

This plugin displays information about the competition schedule and venues for the Tokyo 2020 Olympic Games, which was held from July 23 to August 8, 2021. Just below the time display in the upper left corner of the screen, a countdown to the opening ceremony if it is before the event, or an indication of what day it is during the event will be displayed. In addition, pictograms of the competitions will appear on the map at the locations of the competition venues, and when clicked or tapped, it will zoom in to that location and show the details of the competition schedule for that venue. Also, near the Kokuritsu-kyogijo station, an elaborate 3D model of the Olympic Stadium built for the Tokyo 2020 Olympics is displayed.

For more information, please visit [Mini Tokyo 3D Tokyo 2020 Olympics Plugin GitHub Repository](https://github.com/nagix/mt3d-plugin-olympics2020).

::: warning
The Tokyo 2020 Olympics plugin is not shown at [https://minitokyo3d.com](https://minitokyo3d.com). You can view on the page of [Mini Tokyo 3D 2021 for Open Data Challenge for Public Transportation in Tokyo](https://minitokyo3d.com/2021/).
:::
