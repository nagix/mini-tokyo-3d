# Mini Tokyo 3D Developer Guide

日本語版は[こちら](DEVELOPER_GUIDE-ja.md)でご覧いただけます。

This document describes how developers can embed Mini Tokyo 3D into their web page and integrate it into their applications. If you want to know how to use Mini Tokyo 3D itself, see the [Mini Tokyo 3D User Guide](USER_GUIDE-en.md).

## How to Integrate Mini Tokyo 3D

Embedding Mini Tokyo 3D into a web page, or using the APIs to customize it, is very simple. Please follow the instructions in this section to get started.

### Preparation for Use

Mini Tokyo 3D works on all major browsers that support ES6. Internet Explorer is not supported.

#### Getting a Mapbox Access Token

Mini Tokyo 3D uses the [Mapbox](https://www.mapbox.com) service for its map tiles, so you will need a Mapbox access token to use it. It uses [Map Loads for Web](https://www.mapbox.com/pricing/#maploads) sessions, which are free for up to 50,000 connections per month. Follow the steps below to get an access token.

1. Create a Mapbox account by entering your user information on the [sign-up page](https://account.mapbox.com/auth/signup/).
2. After logging in with your Mapbox account, click on "Tokens" in the menu at the top of the screen to view the list of access tokens. Only the "Default public token" will be displayed right after creating the account.
3. Click on the "Create a token" button in the upper right corner of the screen to go to the page for creating an access token.
4. In the "Token name" field, enter your web site name, app name, or any other name you want.
5. The "Token scopes" should be the default setting (all public scopes should be checked).
6. Enter the URL of the site where you want to install Mini Tokyo 3D in the "URL" field in the "Token restrictions" section, and then click the "Add URL" button. For the URL format, please refer to the [URL restrictions](https://docs.mapbox.com/accounts/overview/tokens/#url-restrictions). By setting this URL restriction, you can prevent other sites from using this access token for their own purposes.
7. Finally, click the "Create token" button at the bottom of the screen and the newly created token will appear in the list of access tokens.

### Embedding Directly Into a Web Page

If you simply want to display a Mini Tokyo 3D map on your web page, you can edit the HTML file as follows.

First, use the jsDelivr CDN link to load the Mini Tokyo 3D style sheet and JavaScript code within the `<head>` element of the HTML file.

```html
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.js"></script>
</head>
```

Within the `<body>` element of the same HTML file, add an HTML element with an `id` (a `<div>` element in the example below), and write JavaScript code to create a Mini Tokyo 3D instance in the `<script>` element. Specify the `id` of the HTML element to `container` of the `options` object passed to the constructor. In addition, specify the Mapbox access token obtained in the above step to `secrets.mapbox`.

```html
<body>
  <div id="mini-tokyo-3d" style="width: 400px; height: 400px;"></div>

  <script>
    const options = {
      container: 'mini-tokyo-3d',
      secrets: {
        mapbox: '<Mapbox access token>'
      }
    };
    const mt3d = new MiniTokyo3D(options);
  </script>
</body>
```

### Embedding Into an App as a Module

To embed Mini Tokyo 3D into your application code using a bundler, follow the steps below.

First, install the npm module of Mini Tokyo 3D and register it to your application's `package.json`.

```bash
npm install mini-tokyo-3d --save
```

If you want to load the module in the CommomJS style, you need to include the following at the beginning of your code.

```js
const MiniTokyo3D = require('mini-tokyo-3d');
```

To load the module in the ES6 style, you need to include the following at the beginning of your code.

```js
import MiniTokyo3D from 'mini-tokyo-3d';
```

In your application code, you need to initialize the MiniTokyo3D object as follows. `container` of the `options` object represents the ID of the HTML element in which Mini Tokyo 3D will render the map. You also need to specify the Mapbox access token obtained in the above step to `secrets.mapbox`.

```js
const options = {
  container: '<container element ID>',
  secrets: {
    mapbox: '<Mapbox access token>'
  }
};
const mt3d = new MiniTokyo3D(options);
```

## Mini Tokyo 3D API

Using Mini Tokyo 3D API in JavaScript, you can customize Mini Tokyo 3D in a variety of ways.

**Note**: The Mini Tokyo 3D API is currently in beta. Due to the possibility of API changes, compatibility between versions is not guaranteed.

Class/Object | Details
:--|:--
[`MiniTokyo3D`](#minitokyo3d) | **Parameters**<br>[`options`](#options-object)<br>**Instance Members**<br>[`easeTo`](#easetooptions) [`flyTo`](#flytooptions) [`getBearing`](#getbearing) [`getCenter`](#getcenter) [`getClockMode`](#getclockmode) [`getPitch`](#getpitch) [`getSelection`](#getselection) [`getTrackingMode`](#gettrackingmode) [`getViewMode`](#getviewmode) [`getZoom`](#getzoom) [`jumpTo`](#jumptooptions) [`off`](#offtype-listener) [`on`](#ontype-listener) [`once`](#oncetype-listener) [`setBearing`](#setbearingbearing) [`setCenter`](#setcentercenter) [`setClockMode`](#setclockmode) [`setPitch`](#setpitchpitch) [`setSelection`](#setselection) [`setTrackingMode`](#settrackingmode) [`setViewMode`](#setviewmode) [`setZoom`](#setzoomzoom)<br>**Events**<br>[`boxzoomcancel`](#boxzoomcancel) [`boxzoomend`](#boxzoomend) [`boxzoomstart`](#boxzoomstart) [`click`](#click) [`contextmenu`](#contextmenu) [`dblclick`](#dblclick) [`drag`](#drag) [`dragend`](#dragend) [`dragstart`](#dragstart) [`error`](#error) [`load`](#load) [`mousedown`](#mousedown) [`mousemove`](#mousemove) [`mouseout`](#mouseout) [`mouseover`](#mouseover) [`mouseup`](#mouseup) [`move`](#move) [`moveend`](#moveend) [`movestart`](#movestart) [`pitch`](#pitch) [`pitchend`](#pitchend) [`pitchstart`](#pitchstart) [`resize`](#resize) [`rotate`](#rotate) [`rotateend`](#rotateend) [`rotatestart`](#rotatestart) [`touchcancel`](#touchcancel) [`touchend`](#touchend) [`touchmove`](#touchmove) [`touchstart`](#touchstart) [`wheel`](#wheel) [`zoom`](#zoom) [`zoomend`](#zoomend) [`zoomstart`](#zoomstart)
[`Secrets`](#secrets) |

### MiniTokyo3D

The `MiniTokyo3D` object represents the Mini Tokyo 3D map on your page. You create a `MiniTokyo3D` by specifying a `container` and other `options`. Then Mini Tokyo 3D initializes the map on the page and returns your `MiniTokyo3D` object.

```js
new MiniTokyo3D(options: Object)
```

#### Parameters

##### **`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Name | Description
:-- | :--
**`options.container`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | The `id` of the HTML element in which Mini Tokyo 3D will render the map
**`options.secrets`**<br>[`Secrets`](#secrets) | An object to store the access tokens used to retrieve data
**`options.lang`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [IETF language tag](https://en.wikipedia.org/wiki/IETF_language_tag) for the language. If not specified, the browser's default language is used. Currently `'ja'`, `'en'`, `'ko'`, `'zh-Hans'`, `'zh-Hant'`, `'th'` and `'ne'` are supported. If an unsupported language is specified, then 'en' is used.
**`options.dataUrl`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | Mini Tokyo 3D data URL. If not specified, `'https://minitokyo3d.com/data'` will be used.
**`options.clockControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the date and time display will be added to the map
**`options.searchControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the search button will be added to the map
**`options.navigationControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the navigation buttons will be added to the map
**`options.fullscreenControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the fullscreen button will be added to the map
**`options.modeControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the mode switch buttons will be added to the map
**`options.infoControl`**<br>[`boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)<br>default: `true` | If `true`, the app info button will be added to the map
**`options.trackingMode`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)<br>default: `'helicopter'` | The initial tracking mode. `'helicopter'` and `'heading'` are supported.
**`options.center`**<br>[`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/#lnglatlike)<br>default: `[139.7670, 35.6814]` | The initial geographical center point of the map. If not specified, it will default to around Tokyo station (`[139.7670, 35.6814]`). Note: Mini Tokyo 3D uses longitude, latitude coordinate order to match GeoJSON.
**`options.zoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>default: `14` | The initial zoom level of the map. If not specified, it will default to `14`.
**`options.bearing`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>default: `0` | The initial bearing (rotation) of the map, measured in degrees counter-clockwise from north. If not specified, it will default to the true north (`0`).
**`options.pitch`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>default: `60` | The initial pitch (tilt) of the map, measured in degrees away from the plane of the screen (0-60). If not specified, it will default to `60`.
**`options.frameRate`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>default: `60` | Frame rate for train and airplane animations (frames per second). Specify on a scale of 1 to 60. Lower values result in less smoother animations and lower CPU resource usage, thus reducing battery consumption on mobile devices. If not specified, it will default to `60`.
**`options.selection`**<br>[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | ID of the train or flight to be tracked. The train ID is a string in the form of `'odpt.Train:<operator ID>.<railway ID>.<train number>'`. The fright ID is a string in the form of `'odpt.FlightInformationArrival:<operator ID>.<airport ID>.<flight number>'` or `'odpt.FlightInformationDeparture:<operator ID>.<airport ID>.<flight number>'`. The `'odpt.*:'` part can be omitted. For details, see the [Open Data Challenge for Public Transportation in Tokyo: API Specification](https://developer-tokyochallenge.odpt.org/en/documents).

#### Instance Members

##### **`easeTo(options)`**

Changes any combination of center, zoom, bearing, pitch, and padding with an animated transition between old and new values. The map will retain its current values for any details not specified in `options`.

Note: The transition will happen instantly if the user has enabled the reduced motion accessibility feature enabled in their operating system, unless `options` includes `essential: true`.

###### Parameters

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) Options describing the destination and animation of the transition. Accepts [`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions) and [`AnimationOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions).

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`flyTo(options)`**

Changes any combination of center, zoom, bearing, and pitch, animating the transition along a curve that evokes flight. The animation seamlessly incorporates zooming and panning to help the user maintain her bearings even after traversing a great distance.

Note: The animation will be skipped, and this will behave equivalently to `jumpTo` if the user has the `reduced motion` accessibility feature enabled in their operating system, unless `options` includes `essential: true`.

###### Parameters

**`options`** ([`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) Options describing the destination and animation of the transition. Accepts [`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions), [`AnimationOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions), and the following additional options.

Name | Description
:-- | :--
**`options.curve`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>default: `1.42` | The zooming "curve" that will occur along the flight path. A high value maximizes zooming for an exaggerated animation, while a low value minimizes zooming for an effect closer to [`MiniTokyo3D#easeTo`](#easetooptions). 1.42 is the average value selected by participants in the user study discussed in [van Wijk (2003)](https://www.win.tue.nl/~vanwijk/zoompan.pdf). A value of `Math.pow(6, 0.25)` would be equivalent to the root mean squared average velocity. A value of 1 would produce a circular motion.
**`options.minZoom`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | The zero-based zoom level at the peak of the flight path. If `options.curve` is specified, this option is ignored.
**`options.speed`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)<br>default: `1.2` | The average speed of the animation defined in relation to `options.curve`. A speed of 1.2 means that the map appears to move along the flight path by 1.2 times `options.curve` screenfuls every second. A *screenful* is the map's visible span. It does not correspond to a fixed physical distance, but varies by zoom level.
**`options.screenSpeed`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | The average speed of the animation measured in screenfuls per second, assuming a linear timing curve. If `options.speed` is specified, this option is ignored.
**`options.maxDuration`**<br>[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | The animation's maximum duration, measured in milliseconds. If duration exceeds maximum duration, it resets to 0.

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`getBearing()`**

Returns the map's current bearing. The bearing is the compass direction that is "up"; for example, a bearing of 90° orients the map so that east is up.

###### Returns

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): The map's current bearing.

---

##### **`getCenter()`**

Returns the map's geographical centerpoint.

###### Returns

[`LngLat`](https://docs.mapbox.com/mapbox-gl-js/api/geography/#lnglat): The map's geographical centerpoint.

---

##### **`getClockMode()`**

Returns the current clock mode.

###### Returns

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): A string representing the current clock mode. Either `'realtime'` or `'playback'`.

---

##### **`getPitch()`**

Returns the map's current pitch (tilt).

###### Returns

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): The map's current pitch, measured in degrees away from the plane of the screen.

---

##### **`getSelection()`**

Returns the ID of the train or flight being tracked.

###### Returns

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): The ID of the train or flight being tracked. The train ID is a string in the form of `'<operator ID>.<line ID>.<train number>'`. The flight ID is a string in the form of `'<operator ID>.<airport ID>.<flight number>'`.

---

##### **`getTrackingMode()`**

Returns the current tracking mode.

###### Returns

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): A string representing the current tracking mode. Either `'helicopter'` or `'heading'`.

---

##### **`getViewMode()`**

Returns the current view mode.

###### Returns

[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String): A string representing the current view mode. Either `'ground'` or `'underground'`.

---

##### **`getZoom()`**

Returns the map's current zoom level.

###### Returns

[`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number): The map's current zoom level.

---

##### **`jumpTo(options)`**

Changes any combination of center, zoom, bearing, and pitch, without an animated transition. The map will retain its current values for any details not specified in `options`.

###### Parameters

**`options`** ([`CameraOptions`](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions)) Options object

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`off(type, listener)`**

Removes an event listener previously added with [`MiniTokyo3D#on`](#ontype-listener).

###### Parameters

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) The event type previously used to install the listener.

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) The function previously installed as a listener.

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`on(type, listener)`**

Adds a listener for events of a specified type.

###### Parameters

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) The event type to listen for.

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) The function to be called when the event is fired.

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`once(type, listener)`**

Adds a listener that will be called only once to a specified event type.

###### Parameters

**`type`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) The event type to add a listener for.

**`listener`** ([`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)) The function to be called when the event is fired.

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setBearing(bearing)`**

Sets the map's bearing (rotation). The bearing is the compass direction that is "up"; for example, a bearing of 90° orients the map so that east is up.

Equivalent to `jumpTo({bearing: bearing})`.

###### Parameters

**`bearing`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) The desired bearing.

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setCenter(center)`**

Sets the map's geographical centerpoint. Equivalent to `jumpTo({center: center})`.

###### Parameters

**`center`** ([`LngLatLike`](https://docs.mapbox.com/mapbox-gl-js/api/#lnglatlike)) The centerpoint to set.

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setClockMode(mode)`**

Sets the clock mode. In the real-time clock mode (`'realtime'`), trains and airplanes are displayed on the map according to the actual operation at the current time. In the playback clock mode (`'playback'`), you can specify the time and the speed of time passing.

###### Parameters

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) A string representing the clock mode. Either `'realtime'` or `'playback'`.

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setPitch(pitch)`**

Sets the map's pitch (tilt). Equivalent to `jumpTo({pitch: pitch})`.

###### Parameters

**`pitch`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) The pitch to set, measured in degrees away from the plane of the screen (0-60).

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setSelection(id)`**

Sets the ID of the train or flight you want to track. The train ID is a string in the form of `'odpt.Train:<operator ID>.<railway ID>.<train number>'`. The fright ID is a string in the form of `'odpt.FlightInformationArrival:<operator ID>.<airport ID>.<flight number>'` or `'odpt.FlightInformationDeparture:<operator ID>.<airport ID>.<flight number>'`. The `'odpt.*:'` part can be omitted. For details, see the [Open Data Challenge for Public Transportation in Tokyo: API Specification](https://developer-tokyochallenge.odpt.org/en/documents).

###### Parameters

**`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) ID of the train or flight to be tracked.

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setTrackingMode(mode)`**

Sets the tracking mode. In the helicopter tracking mode (`'helicopter'`), it makes a 360 degree turn around the target train or airplane. In the heading tracking mode (`'heading'`), it tracks the target train or airplane from above or diagonally behind in the direction of travel up.

###### Parameters

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) A string representing the tracking mode. Either `'helicopter'` or `'heading'`.

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setViewMode(mode)`**

Sets the view mode. In the ground view mode (`ground'`), ground railways, stations, trains and airplanes will be displayed brightly, and underground railways, stations and trains will be translucent. In the underground view mode (`'underground'`), the map will turn dark and ground railways, stations, trains and airplanes will be translucent, while underground railways, stations and trains will appear brighter.

###### Parameters

**`mode`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) A string representing the view mode. Either `'ground'` or `'underground'`.

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

---

##### **`setZoom(zoom)`**

Sets the map's zoom level. Equivalent to `jumpTo({zoom: zoom})`.

###### Parameters

**`zoom`** ([`number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)) The zoom level to set (0-20).

###### Returns

[`MiniTokyo3D`](#minitokyo3d): `this`

#### Events

##### **`boxzoomcancel`**

Fired when the user cancels a "box zoom" interaction, or when the bounding box does not meet the minimum size threshold. See [`BoxZoomHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler).

###### Properties

**`data`** ([`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent))

---

##### **`boxzoomend`**

Fired when a "box zoom" interaction ends. See [`BoxZoomHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler).

###### Properties

**`data`** ([`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent))

---

##### **`boxzoomstart`**

Fired when a "box zoom" interaction starts. See [`BoxZoomHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#boxzoomhandler).

###### Properties

**`data`** ([`MapBoxZoomEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapboxzoomevent))

---

##### **`click`**

Fired when a pointing device (usually a mouse) is pressed and released at the same point on the map.

###### Properties

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`contextmenu`**

Fired when the right button of the mouse is clicked or the context menu key is pressed within the map.

###### Properties

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`dblclick`**

Fired when a pointing device (usually a mouse) is pressed and released twice at the same point on the map in rapid succession.

###### Properties

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`drag`**

Fired repeatedly during a "drag to pan" interaction. See [`DragPanHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler).

###### Properties

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

##### **`dragend`**

Fired when a "drag to pan" interaction ends. See [`DragPanHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler).

###### Properties

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

##### **`dragstart`**

Fired when a "drag to pan" interaction starts. See [`DragPanHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragpanhandler).

###### Properties

**`data`** (`{originalEvent: `[`DragEvent`](https://developer.mozilla.org/docs/Web/API/DragEvent)`}`)

---

##### **`error`**

Fired when an error occurs. This is Mini Tokyo 3D's primary error reporting mechanism. We use an event instead of throw to better accommodate asynchronous operations. If no listeners are bound to the error event, the error will be printed to the console.

###### Properties

**`data`** (`{error: {message: `[`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)`}}`)

---

##### **`load`**

Fired immediately after all necessary resources have been downloaded and the first visually complete rendering of the map has occurred.

---

##### **`mousedown`**

Fired when a pointing device (usually a mouse) is pressed within the map.

###### Properties

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`mousemove`**

Fired when a pointing device (usually a mouse) is moved while the cursor is inside the map. As you move the cursor across the map, the event will fire every time the cursor changes position within the map.

###### Properties

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`mouseover`**

Fired when a pointing device (usually a mouse) is moved within the map. As you move the cursor across a web page containing a map, the event will fire each time it enters the map or any child elements.

###### Properties

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`mouseup`**

Fired when a pointing device (usually a mouse) is released within the map.

###### Properties

**`data`** ([`MapMouseEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapmouseevent))

---

##### **`move`**

Fired repeatedly during an animated transition from one view to another, as the result of either user interaction or methods such as [`MiniTokyo3D#flyTo`](#flytooptions).

---

##### **`moveend`**

Fired just after the map completes a transition from one view to another, as the result of either user interaction or methods such as [`MiniTokyo3D#jumpTo`](#jumptooptions).

---

##### **`movestart`**

Fired just before the map begins a transition from one view to another, as the result of either user interaction or methods such as [`MiniTokyo3D#jumpTo`](#jumptooptions).

---

##### **`pitch`**

Fired repeatedly during the map's pitch (tilt) animation between one state and another as the result of either user interaction or methods such as [`MiniTokyo3D#flyTo`](#flytooptions).

---

##### **`pitchend`**

Fired immediately after the map's pitch (tilt) finishes changing as the result of either user interaction or methods such as [`MiniTokyo3D#flyTo`](#flytooptions).

---

##### **`pitchstart`**

Fired whenever the map's pitch (tilt) begins a change as the result of either user interaction or methods such as [`MiniTokyo3D#flyTo`](#flytooptions).

---

##### **`resize`**

Fired immediately after the map has been resized.

---

##### **`rotate`**

Fired repeatedly during a "drag to rotate" interaction. See [`DragRotateHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler).

---

##### **`rotateend`**

Fired when a "drag to rotate" interaction ends. See [`DragRotateHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler).

---

##### **`rotatestart`**

Fired when a "drag to rotate" interaction starts. See [`DragRotateHandler`](https://docs.mapbox.com/mapbox-gl-js/api/handlers/#dragrotatehandler).

---

##### **`touchcancel`**

Fired when a [`touchcancel`](https://developer.mozilla.org/docs/Web/Events/touchcancel) event occurs within the map.

###### Properties

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

##### **`touchend`**

Fired when a [`touchend`](https://developer.mozilla.org/docs/Web/Events/touchend) event occurs within the map.

###### Properties

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

##### **`touchmove`**

Fired when a [`touchmove`](https://developer.mozilla.org/docs/Web/Events/touchmove) event occurs within the map.

###### Properties

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

##### **`touchstart`**

Fired when a [`touchstart`](https://developer.mozilla.org/docs/Web/Events/touchstart) event occurs within the map.

###### Properties

**`data`** ([`MapTouchEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#maptouchevent))

---

##### **`wheel`**

Fired when a [`wheel`](https://developer.mozilla.org/docs/Web/Events/wheel) event occurs within the map.

###### Properties

**`data`** ([`MapWheelEvent`](https://docs.mapbox.com/mapbox-gl-js/api/events/#mapwheelevent))

---

##### **`zoom`**

Fired repeatedly during an animated transition from one zoom level to another, as the result of either user interaction or methods such as [`MiniTokyo3D#flyTo`](#flytooptions).

---

##### **`zoomend`**

Fired just after the map completes a transition from one zoom level to another, as the result of either user interaction or methods such as [`MiniTokyo3D#flyTo`](#flytooptions).

---

##### **`zoomstart`**

Fired just before the map begins a transition from one zoom level to another, as the result of either user interaction or methods such as [`MiniTokyo3D#flyTo`](#flytooptions).

### Secrets

The `Secrets` object is an object that stores the access tokens used to retrieve data and is set to the [`MiniTokyo3D`](#minitokyo3d) constructor option `secrets`.

#### Properties

**`tokyochallenge`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : Access token for the [Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/). If not specified, the default token will be used.

**`odpt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)) : Access token for the [Public Transportation Open Data Center](https://www.odpt.org). If not specified, the default token will be used.

**`mapbox`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)) : Access token for [Mapbox](https://www.mapbox.com). If you don't specify this token, an error will occur when loading the map, so make sure to get an access token specific to your web site.

## Building Mini Tokyo 3D

If you want to try out the latest features before they are released, modify the code yourself, or contribute to Mini Tokyo 3D development, you can build your project from source code by following the instructions in this section.

### Preparation for Build

The following software are required.

- The latest version of [Node.js](https://nodejs.org)
- The latest version of [Git](https://git-scm.com) if you're cloning the repository

Mini Tokyo 3D uses the following data sources and requires an access token for each of them at build time. Follow the instructions below to obtain access tokens.

Data Source | Sign-Up URL | Access Token Format
:-- | :-- | :--
[Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/) | [Link](https://developer-tokyochallenge.odpt.org/en/users/sign_up) | A string of numbers and lowercase letters
[Public Transportation Open Data Center](https://www.odpt.org) | [Link](https://developer.odpt.org/en/users/sign_up) | A string of numbers and lowercase letters
[Mapbox](https://www.mapbox.com) | [Link](https://account.mapbox.com/auth/signup/) | Alphanumeric string containing a period beginning with `pk.`

#### Getting an Access Token for Open Data Challenge for Public Transportation in Tokyo

Mini Tokyo 3D is using train and airplane data from the [Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/). You need to register as a developer to get the data, but it is available for free.

1. Register as a developer by entering your user information on the [developer site's registration page](https://developer-tokyochallenge.odpt.org/en/users/sign_up). It may take a few days to receive your registration confirmation email.
2. After logging in with your developer account, click on "Account" in the menu at the top of the screen and select "Manage Access Token".
3. A list of access tokens will be displayed. Only the "DefaultApplication" token will be displayed right after creating the account. Click on "Issuing an access token".
4. Enter an application name in the "Name" field and click the "Submit" button.
5. The newly created token will appear in the list of access tokens

#### Getting an Access Token for Public Transportation Open Data Center

Mini Tokyo 3D is also using data from the [Public Transportation Open Data Center](https://www.odpt.org). Again, you need to register as a developer to get the data, but it is available for free.

1. Register as a developer by entering your user information on the [developer site's registration page](https://developer.odpt.org/en/users/sign_up). It may take a few days to receive your registration confirmation email.
2. After logging in with your developer account, click on "Account" in the menu at the top of the screen and select "Manage Access Token".
3. A list of access tokens will be displayed. Only the "DefaultApplication" token will be displayed right after creating the account. Click on "Issuing an access token".
4. Enter an application name in the "Name" field and click the "Submit" button.
5. The newly created token will appear in the list of access tokens

#### Getting an Access Token for Mapbox

See [Getting a Mapbox Access Token](#getting-a-mapbox-access-token).

### Build Instructions

#### 1. Downloading Files

Download the latest `master` branch from Mini Tokyo 3D's [GitHub repository](https://github.com/nagix/mini-tokyo-3d) and extract the zip file. A directory named `mini-tokyo-3d-master` will be created, so change the name to `mini-tokyo-3d`.

```bash
curl -LO https://github.com/nagix/mini-tokyo-3d/archive/master.zip
unzip master.zip
mv mini-tokyo-3d-master mini-tokyo-3d
```

If you are using Git, you can clone the repository directly from GitHub instead of the above commands.

```bash
git clone https://github.com/nagix/mini-tokyo-3d.git
```

#### 2. Build

Go to the top directory of Mini Tokyo 3D.

```bash
cd mini-tokyo-3d
```

Create a JSON file containing the access tokens obtained in the build preparation step and save it in this directory with the file name `secrets`.

```json
{
    "tokyochallenge": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "odpt": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "mapbox": "pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxx"
}
```

Install the dependent npm modules.

```bash
npm install
```

Build the project with the following command.

```bash
npm run build-all
```

When the build completes successfully, the `dist` directory will be created. It includes style sheet and JavaScript files for distribution. The `build` directory will also be created at the same time. It contains all the files needed for deployment on your web site.

#### 3. Deploying on a Web Site

The `index.html` in the `build` directory is for the web page on [https://minitokyo3d.com](http://minitokyo3d.com). Edit it for your web site, and place all the files in the `build` directory in the public directory of your web server.
