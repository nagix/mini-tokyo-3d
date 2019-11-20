# Mini Tokyo 3D

A real-time 3D digital map of Tokyo's public transport system.

![Screenshot](https://nagix.github.io/mini-tokyo-3d/images/screenshot1.jpg)

![Screenshot](https://nagix.github.io/mini-tokyo-3d/images/screenshot2.jpg)

![Screenshot](https://nagix.github.io/mini-tokyo-3d/images/screenshot3.jpg)

See a [Live Demo](https://nagix.github.io/mini-tokyo-3d).

## Demo Videos

- [Demo Video (English)](https://youtu.be/sxFEwj0sBJk)
- [Demo Video (Japanese)](https://youtu.be/_3N651UnxDA)

## User Guides

- [User Guide (English)](https://github.com/nagix/mini-tokyo-3d/blob/master/USER_GUIDE-en.md)
- [User Guide (Japanese)](https://github.com/nagix/mini-tokyo-3d/blob/master/USER_GUIDE-ja.md)

## Cheat Sheet

Operation | Description
--- | ---
Mouse drag or swipe | Pan
Mouse wheel rotation | Zoom in/out
Right click or Ctrl key + mouse drag | Tilt up/down and rotate
Shift key + mouse drag | Box zoom
Pinch in/out | Zoom in/out and rotate
Double-click or double-tap | Zoom in
Click or tap the search button | Show/hide the station search window
Click or tap +/- buttons | Zoom in/out
Click or tap the compass button | Reset bearing to north
Click or tap the compass button + mouse drag or swipe | Tilt up/down and rotate
Click or tap the fullscreen button | Toggle the fullscreen mode
Click or tap the eye button | Toggle the underground mode
Click or tap the train/helicopter button | Switch the tracking mode
Click or tap the clock button | Toggle the real-time mode
Click or tap the weather button | Show/hide the weather
Click or tap the info button | Show/hide the app info dialog
Click or tap a train | Enable tracking
Click or tap the map | Disable tracking
Hover a train | Show the train information

## Language Support

Currently, the following languages are supported. Any help or contribution with translations and additional language support is always greatly appreciated.

Language | User Interface | Map Labels | Stations, Railways, Airlines, etc. | User Guide
--- | --- | --- | --- | ---
English | Yes | Yes | Yes | Yes
Japanese | Yes | Yes | Yes | Yes
Chinese (Simplified) | Yes | Yes | Yes | -
Korean | Yes | Yes | Yes | -
Thai | Yes | - | - | -
Nepali | Yes | - | - | -

If you want to contribute, please start with translating the UI messages in the `dictionary-<ISO 639-1 code>.json` file in the [`data`](https://github.com/nagix/mini-tokyo-3d/tree/v2/data) directory. Then, if you have extra energy, add the title of each item in your language to [`airport.json`](https://github.com/nagix/mini-tokyo-3d/blob/v2/data-extra/airports.json), [`flight-status.json`](https://github.com/nagix/mini-tokyo-3d/blob/v2/data-extra/flight-status.json), [`operators.json`](https://github.com/nagix/mini-tokyo-3d/blob/v2/data-extra/operators.json), [`rail-directions.json`](https://github.com/nagix/mini-tokyo-3d/blob/v2/data-extra/rail-directions.json), [`railways.json`](https://github.com/nagix/mini-tokyo-3d/blob/v2/data-extra/railways.json), [`stations.json`](https://github.com/nagix/mini-tokyo-3d/blob/v2/data-extra/stations.json), [`train-types.json`](https://github.com/nagix/mini-tokyo-3d/blob/v2/data-extra/train-types.json) in the [`data-extra`](https://github.com/nagix/mini-tokyo-3d/tree/v2/data-extra) directory.

**Note that the `v2` branch is currently active and the target for your pull request while the `master` branch is only for minor maintenance.**

## About Data

The data for this visualization are sourced from [Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/), which includes station information and train timetables as well as real-time data such as train location information and status information of multiple railway lines in the Greater Tokyo area.

## License

Mini Tokyo 3D is available under the [Apache license 2.0](opensource.org/licenses/Apache-2.0).
