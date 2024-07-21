# Mini Tokyo 3D

A real-time 3D digital map of Tokyo's public transport system.

![Screenshot](https://minitokyo3d.com/images/screenshot1.jpg)

![Screenshot](https://minitokyo3d.com/images/screenshot2.jpg)

![Screenshot](https://minitokyo3d.com/images/screenshot3.jpg)

See a [Live Demo](https://minitokyo3d.com).

## Demo Videos

- [Demo Video (2021, English)](https://youtu.be/CGkHDAj8rGY)
- [Demo Video (2021, Japanese)](https://youtu.be/C9AA3bDcHk8)
- [Demo Video (2019, English)](https://youtu.be/sxFEwj0sBJk)
- [Demo Video (2019, Japanese)](https://youtu.be/_3N651UnxDA)

## User Guides

- [User Guide (English)](https://minitokyo3d.com/docs/master/)
- [User Guide (Japanese)](https://minitokyo3d.com/docs/master/ja/)

## Developer Guides

- [Developer Guide (English)](https://minitokyo3d.com/docs/master/developer-guide/)
- [Developer Guide (Japanese)](https://minitokyo3d.com/docs/master/ja/developer-guide/)

## Cheat Sheet

Operation | Description
--- | ---
Mouse or finger drag | Pan
Mouse wheel rotation | Zoom in/out
Right click or Ctrl key + mouse drag | Tilt up/down and rotate
Shift key + mouse drag | Box zoom
Pinch in/out | Zoom in/out
Two-finger drag | Tilt up/down and rotate
Double-click or triple-tap | Zoom in
Shift key + Double-click or two-finger tap | Zoom out
Click or tap the search button | Show/hide the route search panel
Click or tap +/- buttons | Zoom in/out
Click or tap the compass button | Reset bearing to north
Click or tap the compass button + mouse or finder drag | Rotate
Click or tap the fullscreen button | Toggle the fullscreen mode
Click or tap the eye button | Toggle the underground mode
Click or tap the playback button | Toggle the playback mode
Click or tap the battery button | Toggle the eco mode
Click or tap the layer button | Show/hide the layer display settings panel
Click or tap the camera button | Show/hide the tracking mode settings panel
Click or tap the info button | Show/hide the app info panel
Click or tap a train/aircraft/station | Enable tracking or select station
Click or tap the map | Disable tracking or deselect station
Hover a train/aircraft/station | Show the train/aircraft/station information

## Language Support

Currently, the following languages are supported. Any help or contribution with translations and additional language support is always greatly appreciated.

Language | User Interface | Map Labels | Stations, Railways, Airlines, etc. | User Guide
--- | --- | --- | --- | ---
English | Yes | Yes | Yes | Yes
Japanese | Yes | Yes | Yes | Yes
Chinese (Simplified) | Yes | Yes | Yes | -
Chinese (Traditional) | Yes | Yes | Yes | -
Korean | Yes | Yes | Yes | -
Thai | Yes | - | - | -
Nepali | Yes | - | - | -
Portuguese (Brazil) | Yes | - | - | -
French | Yes | - | - | -
Spanish | Yes | - | - | -

If you want to contribute, please start with translating the UI messages in the `dictionary-<ISO 639-1 code>.json` file in the [`data`](https://github.com/nagix/mini-tokyo-3d/tree/master/data) directory. Then, if you have extra energy, add the title of each item in your language to [`airports.json`](https://github.com/nagix/mini-tokyo-3d/blob/master/data/airports.json), [`flight-statuses.json`](https://github.com/nagix/mini-tokyo-3d/blob/master/data/flight-statuses.json), [`operators.json`](https://github.com/nagix/mini-tokyo-3d/blob/master/data/operators.json), [`poi.json`](https://github.com/nagix/mini-tokyo-3d/blob/master/data/poi.json), [`rail-directions.json`](https://github.com/nagix/mini-tokyo-3d/blob/master/data/rail-directions.json), [`railways.json`](https://github.com/nagix/mini-tokyo-3d/blob/master/data/railways.json), [`stations.json`](https://github.com/nagix/mini-tokyo-3d/blob/master/data/stations.json), [`train-types.json`](https://github.com/nagix/mini-tokyo-3d/blob/master/data/train-types.json) in the [`data`](https://github.com/nagix/mini-tokyo-3d/tree/master/data) directory.

## About Data

The data for this visualization are sourced from the [Public Transportation Open Data Center](https://www.odpt.org), which includes station information and train timetables as well as real-time data such as train location information and status information of multiple railway lines in the Greater Tokyo area.

## How to Build

First, get access tokens for the public transportation data and map tiles by signing up at the [Public Transportation Open Data Center](https://developer.odpt.org/signup) and [Mapbox](https://account.mapbox.com/auth/signup/). At the Public Transportation Open Data Center, you need to get both tokens for ODPT Center and Challenge 2024.

The latest version of Node.js is required. Move to the root directory of the application, run the following commands, then the script, dataset and static web page will be generated in the `build` directory.
```bash
npm install
npm run build-all
```

Finally, pass your Mapbox access token as `accessToken` and tokens for ODPT Center and Challenge 2024 as `secrets` property to a `Map` constructor in `index.html`.

```js
map = new Map({
    /* ... */
    accessToken: 'pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxx',
    secrets: {
        odpt: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        challenge2024: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
});
```

See the [Developer Guides](#developer-guides) for more details.

## License

Mini Tokyo 3D is available under the [MIT license](https://opensource.org/licenses/MIT).

## Supporting Mini Tokyo 3D

Your support, large or small, helps keep this project strong!

- [Monthly donation through GitHub Sponsors](https://github.com/sponsors/nagix)
- [One-time donation through PayPal](https://www.paypal.me/akusanagi)
