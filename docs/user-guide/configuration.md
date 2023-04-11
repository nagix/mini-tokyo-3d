# Configuration

## Layer Display Settings

<img :src="$withBase('/images/layer-panel.jpg')" style="width: 490px;"> <img :src="$withBase('/images/layer-icon.jpg')" style="width: 59px; vertical-align: top;">

Click or tap the layer icon button to show the Layer Display Settings panel. In the Layer Display Settings panel, you can turn on/off the layer that is superimposed on the map. By incorporating the [Plugins](./plugins.md), Precipitation layer, Fireworks layer, Live Cameras layer, PLATEAU layer and Tokyo 2020 Olympics layer will be displayed in the list. Click or tap the “x” button in the top right corner of the panel or outside the panel to close the panel.

Click or tap the icon of each layer to toggle the layer display on and off (the outer frame of the icon is shown in light blue when it is on). See [here](./plugins.md) to learn more about the functions of each layer.

## Tracking Mode Settings

<img :src="$withBase('/images/tracking-mode-panel.jpg')" style="width: 490px;"> <img :src="$withBase('/images/camera-icon.jpg')" style="width: 59px; vertical-align: top;">

Click or tap the camera icon button to show the Tracking Mode Settings panel. The Tracking Mode Settings panel allows you to toggle the viewpoint position used when tracking a train or airplane. Click or tap the “x” button in the top right corner of the panel or outside the panel to close the panel.

### Position Only

<img :src="$withBase('/images/tracking-position.jpg')" style="width: 400px;">

It tracks the target train or airplane without changing the current distance, direction, or depression angle. In this viewpoint mode, the map can be zoomed in and out, rotated, and tilted using the navigation buttons or keyboard controls.

### Back

<img :src="$withBase('/images/tracking-back.jpg')" style="width: 400px;">

It tracks the target train or airplane from behind, facing the direction of travel.

### Top-back

<img :src="$withBase('/images/tracking-topback.jpg')" style="width: 400px;">

It tracks the target train or airplane from diagonally above and behind it while keeping its direction of travel up.

### Front

<img :src="$withBase('/images/tracking-front.jpg')" style="width: 400px;">

It tracks the target train or airplane from the front of it, facing the opposite direction of travel.

### Top-front

<img :src="$withBase('/images/tracking-topfront.jpg')" style="width: 400px;">

It tracks the target train or airplane from diagonally above and ahead of it while keeping its direction of travel down.

### Helicopter

<img :src="$withBase('/images/tracking-helicopter.jpg')" style="width: 400px;">

It makes a 360 degree turn from an aerial perspective around the target train or airplane.

### Drone

<img :src="$withBase('/images/tracking-drone.jpg')" style="width: 400px;">

It makes a 360 degree turn at a lower altitude and a closer distance around the target train or airplane.

### Bird

<img :src="$withBase('/images/tracking-bird.jpg')" style="width: 400px;">

It tracks the target train or airplane, smoothly and dynamically changing the distance, direction and depression angle.

## Showing Application Information

<img :src="$withBase('/images/about-panel.jpg')" style="width: 490px;"> <img :src="$withBase('/images/info-icon.jpg')" style="width: 59px; vertical-align: top;">

Click or tap the information icon button to show application and data information. The last update time of static data and dynamic data is also displayed. Click or tap the “x” button in the top right corner of the panel or outside the panel to close the panel.
