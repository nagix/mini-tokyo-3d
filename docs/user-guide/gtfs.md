# Displaying GTFS datasets

<img :src="$withBase('/images/gtfs.jpg')" style="width: 576px;">

Mini Tokyo 3D supports the [GTFS](https://gtfs.org) (General Transit Feed Specification) and the GTFS Realtime. By specifying data sources, you can view vehicles moving along routes on a map in real-time.

Vehicles of the GTFS dataset are represented as slightly smaller boxes than the usual Mini Tokyo 3D trains and aircrafts. GTFS datasets to display are not limited to the Tokyo area, but can be from any region of the world. In other words, Mini Tokyo 3D can be used as a simple viewer for GTFS datasets.

::: warning
Note that this is an experimental feature which is under development and is prone to change.

Currently, you must specify both a GTFS dataset and a GTFS Realtime feed to view vehicles moving along routes. Also, vehicles will not be displayed when [Playback Mode](./display-modes.md#playback-mode) is on.
:::

## Specifying data sources

To specify a specific GTFS dataset and GTFS Realtime VehiclePosition feed, append a `?` followed by key/value pairs (query parameters) to the URL to access Mini Tokyo 3D. If you specify a data URL as `gtfsurl` or `gtfsvpurl` which is hosted by the Public Transportation Open Data Center and begins with `https://api.odpt.org/`, the `acl:consumerKey` parameter specifying an access token is not required.

```
https://minitokyo3d.com/?gtfsurl=<URL>&gtfsvpurl=<URL>&gtfscolor=<color code>
```

Query parameter | Description | Example
-- | -- | --
`gtfsurl` | The URL of a [GTFS dataset zip file](https://gtfs.org/documentation/schedule/reference/#_10) (URL encoding required) | `https%3A%2F%2Fapi-public.odpt.org%2Fapi%2Fv4%2Ffiles%2FToei%2Fdata%2FToeiBus-GTFS.zip`
`gtfsvpurl` | The URL of a [VehiclePosition feed of GTFS Realtime](https://gtfs.org/documentation/realtime/reference/#message-vehicleposition) (URL encoding required) | `https%3A%2F%2Fapi-public.odpt.org%2Fapi%2Fv4%2Fgtfs%2Frealtime%2FToeiBus`
`gtfscolor` | A color used to display routes and vehicles. Hexadecimal color code (no leading `#`) | `9FC105`

Since a GTFS dataset to display does not necessarily cover the area around Tokyo, it is useful to specify `#` followed by multiple elements separated by `/` (hash) to make the initial position and orientation of the map suitable for displaying the dataset. The hash should be placed after the query parameters above.

```
https://minitokyo3d.com/?<query parameters>#<zoom>/<lat>/<lon>/<bearing>/<pitch>
```

Hash element | Description | Example
-- | -- | --
1st | The initial zoom level of the map | `14`
2nd | The latitude of the initial centerpoint of the map | `35.6814`
3rd | The longitude of the initial centerpoint of the map | `139.7670`
4th | The initial bearing (rotation) of the map, measured in degrees counter-clockwise from north | `0`
5th | The initial pitch (tilt) of the map, measured in degrees away from the plane of the screen (0-85) | `60`

## Displaying Detailed Information on Vehicles

<img :src="$withBase('/images/vehicle-details.jpg')" style="width: 251px;">

Place the mouse pointer or tap on the vehicle to display detailed information about it. Detailed information includes operator name, route number, destination, vehicle number, previous stop and next stop.

## Tracking Vehicles

<img :src="$withBase('/images/vehicle-tracking.jpg')" style="width: 400px;">

Clicking or tapping on a vehicle will turn on Tracking Mode and the screen will automatically move following the movement of the vehicle. There are eight viewpoints in Tracking Mode: “Position only”, “Back”, “Top-back”, “Front”, “Top-front”, “Helicopter”, “Drone” and “Bird”, allowing you to enjoy the scenery along the route from your preferred viewpoint. When the Tracking Mode is turned on, map panning, zooming in/out, rotation and tilting operations are disabled (zooming in/out, rotation and tilting are enabled only for the “Position only” viewpoint). Clicking or tapping on a map with no vehicles turns Tracking Mode off.

When Tracking Mode is on, the timetable and current position of the vehicle being tracked is displayed at the bottom of the screen. The timetable can be scrolled by using the mouse wheel, dragging the scroll bar, or dragging your finger. Click or tap on the “∨” icon in the upper right corner of the timetable to hide the timetable at the bottom of the screen, and click or tap on the “∧” icon to display it again.

The viewpoint in Tracking Mode can be changed in the Tracking Mode Settings panel. See [here](./configuration.md#tracking-mode-settings) for more details.
