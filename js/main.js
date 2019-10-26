/*
 * Copyright 2019 Akihiko Kusanagi
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 *
 * More information about this project is available at:
 *
 *    https://github.com/nagix/mini-tokyo-3d
 */

// Standing duration at origin in milliseconds
var STANDING_DURATION = 60000;

// Minimum standing duration in milliseconds
var MIN_STANDING_DURATION = 30000;

// Interval of refreshing train positions in milliseconds
var TRAIN_REFRESH_INTERVAL = 60000;

// Maximum train speed in km/h
var MAX_SPEED_KMPH = 80;

// Train acceleration in km/h/s
var ACCELERATION_KMPHPS = 3;

// Time factor for the non-real-time mode
var TIME_FACTOR = 12;

var MAX_SPEED = MAX_SPEED_KMPH / 3600000;
var ACCELERATION = ACCELERATION_KMPHPS / 3600000000;
var MAX_ACCELERATION_TIME = MAX_SPEED / ACCELERATION;
var MAX_ACC_DISTANCE = MAX_ACCELERATION_TIME * MAX_SPEED / 2;

// Maximum flight speed in km/h
var MAX_FLIGHT_SPEED_KMPH = 500;

// Flight acceleration in km/h/s
var FLIGHT_ACCELERATION_KMPHPS = 12;

var MAX_FLIGHT_SPEED = MAX_FLIGHT_SPEED_KMPH / 3600000;
var FLIGHT_ACCELERATION = FLIGHT_ACCELERATION_KMPHPS / 3600000000;

// Delay in milliseconds for precision error
var MIN_DELAY = 25000;

// Minimum flight interval in milliseconds
var MIN_FLIGHT_INTERVAL = 75000;

// API URL
var API_URL = 'https://api-tokyochallenge.odpt.org/api/v4/';

var SQRT3 = Math.sqrt(3);
var DEGREE_TO_RADIAN = Math.PI / 180;

var modelOrigin = mapboxgl.MercatorCoordinate.fromLngLat([139.7670, 35.6814]);
var modelScale = 1 / 2 / Math.PI / 6378137 / Math.cos(35.6814 * DEGREE_TO_RADIAN);

var lang = getLang();
var today = new Date();
var isUndergroundVisible = false;
var isRealtime = true;
var trackingMode = 'helicopter';
var opacityStore = {};
var animations = {};
var featureLookup = {};
var activeTrainLookup = {};
var realtimeTrainLookup = {};
var flightLookup = {};
var activeFlightLookup = {};
var animationID = 0;
var stationLookup, railwayLookup, railDirectionLookup, trainTypeLookup, trainLookup, timetableLookup, operatorLookup, airportLookup, a;
var trackedObject, markedObject, lastTrainRefresh, lastFrameRefresh, trackingBaseBearing, viewAnimationID, layerZoom, altitudeUnit, objectUnit, objectScale, carScale, aircraftScale;

// Replace MapboxLayer.render to support underground rendering
var render = MapboxLayer.prototype.render;
MapboxLayer.prototype.render = function(gl, matrix) {
	var deck = this.deck;
	var map = this.map;
	var center = map.getCenter();

	if (!deck.layerManager) {
		// Not yet initialized
		return;
	}

	if (!deck.props.userData.currentViewport) {
		deck.props.userData.currentViewport = new WebMercatorViewport({
			x: 0,
			y: 0,
			width: deck.width,
			height: deck.height,
			longitude: center.lng,
			latitude: center.lat,
			zoom: map.getZoom(),
			bearing: map.getBearing(),
			pitch: map.getPitch(),
			nearZMultiplier: 0,
			farZMultiplier: 10
		});
	}
	render.apply(this, arguments);
};

var MapboxGLButtonControl = function(options) {
	this.initialize(options);
};

MapboxGLButtonControl.prototype.initialize = function(optionArray) {
	this._options = optionArray.map(function(options) {
		return {
			className: options.className || '',
			title: options.title || '',
			eventHandler: options.eventHandler
		};
	});
};

MapboxGLButtonControl.prototype.onAdd = function(map) {
	var me = this;

	me._map = map;

	me._container = document.createElement('div');
	me._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

	me._buttons = me._options.map(function(options) {
		var button = document.createElement('button');

		button.className = 'mapboxgl-ctrl-icon ' + options.className;
		button.type = 'button';
		button.title = options.title;
		button.onclick = options.eventHandler;

		me._container.appendChild(button);

		return button;
	});

	return me._container;
};

MapboxGLButtonControl.prototype.onRemove = function() {
	var me = this;

	me._container.parentNode.removeChild(me._container);
	me._map = undefined;
};

var TrainLayer = function(id) {
	this.initialize(id);
}

TrainLayer.prototype.initialize = function(id) {
	this.id = id;
	this.type = 'custom';
	this.renderingMode = '3d';
};

TrainLayer.prototype.onAdd = function(map, gl) {
	var renderer = this.renderer = new THREE.WebGLRenderer({
		canvas: map.getCanvas(),
		context: gl
	});
	var scene = this.scene = new THREE.Scene();
	var light = this.light = new THREE.DirectionalLight(0xffffff, .8);

	renderer.autoClear = false;

	scene.add(light);
	scene.add(new THREE.AmbientLight(0xffffff, .4));

	// This is needed to avoid a black screen with empty scene
	scene.add(new THREE.Mesh());

	this.map = map;
	this.camera = new THREE.PerspectiveCamera(map.transform._fov / DEGREE_TO_RADIAN, window.innerWidth / window.innerHeight);
	this.raycaster = new THREE.Raycaster();
};

TrainLayer.prototype.render = function(gl, matrix) {
	var id = this.id;
	var map = this.map;
	var renderer = this.renderer;
	var camera = this.camera;
	var transform = map.transform;
	var halfFov = transform._fov / 2;
	var cameraToCenterDistance = transform.cameraToCenterDistance;
	var angle = Math.PI / 2 - transform._pitch;
	var topHalfSurfaceDistance = Math.sin(halfFov) * cameraToCenterDistance / Math.sin(angle - halfFov);
	var furthestDistance = Math.cos(angle) * topHalfSurfaceDistance + cameraToCenterDistance;
	var nearZ = transform.height / 50;
	var halfHeight = Math.tan(halfFov) * nearZ;
	var halfWidth = halfHeight * transform.width / transform.height;

	var m = new THREE.Matrix4().fromArray(matrix);
	var l = new THREE.Matrix4()
		.makeTranslation(modelOrigin.x, modelOrigin.y, 0)
		.scale(new THREE.Vector3(1, -1, 1));

	var projectionMatrixI = new THREE.Matrix4();

	camera.projectionMatrix = new THREE.Matrix4().makePerspective(
		-halfWidth, halfWidth, halfHeight, -halfHeight, nearZ, furthestDistance * 1.01);
	projectionMatrixI.getInverse(camera.projectionMatrix);
	camera.matrix.getInverse(projectionMatrixI.multiply(m).multiply(l));
	camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

	if (id.indexOf('-ug', id.length - 3) !== -1 && isUndergroundVisible) {
		// Recalculate the projection matrix to replace the far plane
		camera.projectionMatrix = new THREE.Matrix4().makePerspective(
			-halfWidth, halfWidth, halfHeight, -halfHeight, nearZ, furthestDistance * 2.5);
	}

	var rad = (map.getBearing() + 30) * DEGREE_TO_RADIAN;
	this.light.position.set(-Math.sin(rad), -Math.cos(rad), SQRT3).normalize();

	renderer.state.reset();
	renderer.render(this.scene, camera);
	map.triggerRepaint();
};

TrainLayer.prototype.onResize = function(event) {
	var camera = this.camera;
	var transform = event.target.transform;

	camera.aspect = transform.width / transform.height;
	camera.updateProjectionMatrix();
};

TrainLayer.prototype.pickObject = function(point) {
	var mouse = new THREE.Vector2(
		(point.x / window.innerWidth) * 2 - 1,
		-(point.y / window.innerHeight) * 2 + 1
	);
	var raycaster = this.raycaster;
	var intersects, i;

	raycaster.setFromCamera(mouse, this.camera);
	intersects = raycaster.intersectObjects(this.scene.children);
	for (i = 0; i < intersects.length; i++) {
		if (intersects[i].object.userData.coord) {
			return intersects[i].object;
		}
	}
};

var calendar = JapaneseHolidays.isHoliday(today) || today.getDay() == 6 || today.getDay() == 0
	? 'holiday' : 'weekday';

Promise.all([
	loadJSON('data/dictionary-' + lang + '.json'),
	loadJSON('data/stations.json'),
	loadJSON('data/railways.json'),
	loadJSON('data/trains.json'),
	loadJSON('data/flights.json'),
	loadJSON('data/features.json'),
	loadJSON('data/timetable-' + calendar + '.json'),
	loadJSON('data/rail-directions.json'),
	loadJSON('data/train-types.json'),
	loadJSON('data/operators.json'),
	loadJSON('data/airports.json'),
	loadJSON('data/flight-status.json'),
	loadJSON('https://mini-tokyo.appspot.com/e')
]).then(function([
	dict, stationRefData, railwayRefData, trainData, flightData, railwayFeatureCollection, timetableRefData,
	railDirectionRefData, trainTypeRefData, operatorRefData, airportRefData, flightStatusRefData, e
]) {

mapboxgl.accessToken = 'pk.eyJ1IjoibmFnaXgiLCJhIjoiY2sxaTZxY2gxMDM2MDNjbW5nZ2h4aHB6ZyJ9.npSnxvMC4r5S74l8A9Hrzw';

var map = new mapboxgl.Map({
	container: 'map',
	style: 'data/osm-liberty.json',
	attributionControl: true,
	hash: true,
	center: [139.7670, 35.6814],
	zoom: 14,
	pitch: 60
});

var unit = Math.pow(2, 14 - clamp(map.getZoom(), 13, 19));

layerZoom = clamp(Math.floor(map.getZoom()), 13, 18);
altitudeUnit = Math.pow(2, 14 - layerZoom) * modelScale * 100;
objectUnit = Math.max(unit * .19, .02);
objectScale = unit * modelScale * 100;
carScale = Math.max(.02 / .19, unit) * modelScale * 100;
aircraftScale = Math.max(.06 / .285, unit) * modelScale * 100;

stationLookup = buildLookup(stationRefData);
railwayLookup = buildLookup(railwayRefData);

// Build feature lookup dictionary and update feature properties
turf.featureEach(railwayFeatureCollection, function(feature) {
	var id = feature.properties.id;
	if (id) {
		featureLookup[id] = feature;
		updateDistances(feature);
	}
});

var trainLayers = {
	ug: new TrainLayer('trains-ug'),
	og: new TrainLayer('trains-og'),
	addObject: function(object, train, duration) {
		var layer = train.altitude < 0 ? this.ug : this.og;

		object.material.opacity = 0;
		layer.scene.add(object);
		if (duration > 0) {
			startAnimation({
				callback: function(elapsed) {
					object.material.opacity = getTrainOpacity(train) * elapsed / duration;
				},
				duration: duration
			});
		}
	},
	removeObject: function(object, train, duration) {
		var layer = train.altitude < 0 ? this.ug : this.og;

		if (!object) {
			return;
		}
		if (duration > 0) {
			startAnimation({
				callback: function(elapsed) {
					object.material.opacity = getTrainOpacity(train) * (1 - elapsed / duration);
				},
				complete: function() {
					layer.scene.remove(object);
				},
				duration: duration
			});
		} else {
			layer.scene.remove(object);
		}
	},
	pickObject: function(point) {
		if (isUndergroundVisible) {
			return this.ug.pickObject(point) || this.og.pickObject(point);
		} else {
			return this.og.pickObject(point) || this.ug.pickObject(point);
		}
	},
	onResize: function(event) {
		this.ug.onResize(event);
		this.og.onResize(event);
	}
};

trainLookup = buildLookup(timetableRefData, 't');
timetableLookup = buildLookup(timetableRefData);

// Update timetable lookup dictionary
timetableRefData.forEach(function(train) {
	var railway = railwayLookup[train.r];
	var direction = train.d === railway.ascending ? 1 : -1;
	var table = train.tt;
	var length = table.length;
	var previousTableIDs = train.pt;
	var nextTableIDs = train.nt;
	var previousTrain, nextTrain, nextTable;

	if (previousTableIDs) {
		previousTrain = timetableLookup[previousTableIDs[0]];
	}
	if (nextTableIDs) {
		nextTrain = timetableLookup[nextTableIDs[0]];
		if (nextTrain) {
			nextTable = nextTrain.tt;
			table[length - 1].dt = nextTable[0].dt;
		}
	}

	train.start = getTime(table[0].dt) - STANDING_DURATION;
	train.end = getTime(table[length - 1].dt
		|| table[length - 1].at
		|| table[Math.max(length - 2, 0)].dt);
	train.direction = direction;
	train.altitude = railway.altitude;
	train.carComposition = railway.carComposition;
	train.previousTrain = previousTrain;
	train.nextTrain = nextTrain;
});

railDirectionLookup = buildLookup(railDirectionRefData);
trainTypeLookup = buildLookup(trainTypeRefData);
operatorLookup = buildLookup(operatorRefData);
airportLookup = buildLookup(airportRefData);
flightStatusLookup = buildLookup(flightStatusRefData);

map.once('load', function () {
	document.getElementById('loader').style.display = 'none';
});

map.once('styledata', function () {
	map.setLayoutProperty('poi', 'text-field', '{name_' + (lang === 'ja' || lang === 'ko' ? lang : lang === 'zh' ? 'zh-Hans' : 'en') + '}');

	[13, 14, 15, 16, 17, 18].forEach(function(zoom) {
		var minzoom = zoom <= 13 ? 0 : zoom;
		var maxzoom = zoom >= 18 ? 24 : zoom + 1;
		var lineWidthScale = zoom === 13 ? clamp(Math.pow(2, map.getZoom() - 12), .125, 1) : 1;

		map.addLayer(new MapboxLayer({
			id: 'railways-ug-' + zoom,
			type: GeoJsonLayer,
			data: filterFeatures(railwayFeatureCollection, function(p) {
				return p.zoom === zoom && p.type === 0 && p.altitude < 0;
			}),
			filled: false,
			stroked: true,
			getLineWidth: function(d) {
				return d.properties.width;
			},
			getLineColor: function(d) {
				return colorToRGBArray(d.properties.color);
			},
			lineWidthUnits: 'pixels',
			lineWidthScale: lineWidthScale,
			lineJointRounded: true,
			opacity: .0625
		}), 'building-3d');
		map.setLayerZoomRange('railways-ug-' + zoom, minzoom, maxzoom);
		map.addLayer(new MapboxLayer({
			id: 'stations-ug-' + zoom,
			type: GeoJsonLayer,
			data: filterFeatures(railwayFeatureCollection, function(p) {
				return p.zoom === zoom && p.type === 1 && p.altitude < 0;
			}),
			filled: true,
			stroked: true,
			getLineWidth: 4,
			getLineColor: [0, 0, 0],
			lineWidthUnits: 'pixels',
			lineWidthScale: lineWidthScale,
			getFillColor: [255, 255, 255, 179],
			opacity: .0625
		}), 'building-3d');
		map.setLayerZoomRange('stations-ug-' + zoom, minzoom, maxzoom);
	});

	// Workaround for deck.gl #3522
	map.__deck.props.getCursor = function() {
		return map.getCanvas().style.cursor;
	};

	map.addLayer(trainLayers.ug, 'building-3d');

	[13, 14, 15, 16, 17, 18].forEach(function(zoom) {
		var minzoom = zoom <= 13 ? 0 : zoom;
		var maxzoom = zoom >= 18 ? 24 : zoom + 1;
		var getWidth = ['get', 'width'];
		var lineWidth = zoom === 13 ?
			['interpolate', ['exponential', 2], ['zoom'], 9, ['/', getWidth, 8], 12, getWidth] : getWidth;

		map.addLayer({
			id: 'railways-og-' + zoom,
			type: 'line',
			source: {
				type: 'geojson',
				data: filterFeatures(railwayFeatureCollection, function(p) {
					return p.zoom === zoom && p.type === 0 && p.altitude === 0;
				})
			},
			paint: {
				'line-color': ['get', 'color'],
				'line-width': lineWidth
			},
			minzoom: minzoom,
			maxzoom: maxzoom
		}, 'building-3d');
		map.addLayer({
			id: 'stations-og-' + zoom,
			type: 'fill',
			source: {
				type: 'geojson',
				data: filterFeatures(railwayFeatureCollection, function(p) {
					return p.zoom === zoom && p.type === 1 && p.altitude === 0;
				})
			},
			paint: {
				'fill-color': ['get', 'color'],
				'fill-opacity': .7
			},
			minzoom: minzoom,
			maxzoom: maxzoom
		}, 'building-3d');
		map.addLayer({
			id: 'stations-outline-og-' + zoom,
			type: 'line',
			source: {
				type: 'geojson',
				data: filterFeatures(railwayFeatureCollection, function(p) {
					return p.zoom === zoom && p.type === 1 && p.altitude === 0;
				})
			},
			paint: {
				'line-color': ['get', 'outlineColor'],
				'line-width': lineWidth
			},
			minzoom: minzoom,
			maxzoom: maxzoom
		}, 'building-3d');
	});

	map.addLayer(trainLayers.og, 'building-3d');

	map.getStyle().layers.filter(function(layer) {
		return layer.type === 'line' || layer.type.lastIndexOf('fill', 0) !== -1;
	}).forEach(function(layer) {
		opacityStore[layer.id] = map.getPaintProperty(layer.id, layer.type + '-opacity') || 1;
	});

	var control = new mapboxgl.NavigationControl();
	control._zoomInButton.title = dict['zoom-in'];
	control._zoomOutButton.title = dict['zoom-out'];
	control._compass.title = dict['compass'];
	map.addControl(control);

	control = new mapboxgl.FullscreenControl();
	control._updateTitle = function() {
		mapboxgl.FullscreenControl.prototype._updateTitle.apply(this,arguments);
		this._fullscreenButton.title = dict[(this._isFullscreen() ? 'exit' : 'enter') + '-fullscreen'];
	}
	map.addControl(control);

	map.addControl(new MapboxGLButtonControl([{
		className: 'mapbox-ctrl-underground',
		title: dict['enter-underground'],
		eventHandler: function(event) {
			isUndergroundVisible = !isUndergroundVisible;
			this.title = dict[(isUndergroundVisible ? 'exit' : 'enter') + '-underground'];
			if (isUndergroundVisible) {
				this.classList.add('mapbox-ctrl-underground-visible');
				map.setPaintProperty('background', 'background-color', 'rgb(16,16,16)');
			} else {
				this.classList.remove('mapbox-ctrl-underground-visible');
				map.setPaintProperty('background', 'background-color', 'rgb(239,239,239)');
			}
			map.getStyle().layers.forEach(function(layer) {
				var id = layer.id;
				var opacity = opacityStore[id];
				if (opacity !== undefined) {
					if (isUndergroundVisible) {
						opacity *= id.indexOf('-og-') !== -1 ? .25 : .0625;
					}
					map.setPaintProperty(id, layer.type + '-opacity', opacity);
				}
			});

			startAnimation({
				callback: function(elapsed) {
					var t = elapsed / 300;

					[13, 14, 15, 16, 17, 18].forEach(function(zoom) {
						var opacity = isUndergroundVisible ?
							1 * t + .0625 * (1 - t) : 1 * (1 - t) + .0625 * t;

						setLayerProps(map, 'railways-ug-' + zoom, {opacity: opacity});
						setLayerProps(map, 'stations-ug-' + zoom, {opacity: opacity});
					});
					Object.keys(activeTrainLookup).forEach(function(key) {
						var train = activeTrainLookup[key];
						var opacity = isUndergroundVisible === (train.altitude < 0) ?
							.9 * t + .225 * (1 - t) : .9 * (1 - t) + .225 * t;

						train.cars.forEach(function(car) {
							car.material.opacity = opacity;
						});
						if (train.delayMarker) {
							train.delayMarker.material.opacity = opacity;
						}
					});
					Object.keys(activeFlightLookup).forEach(function(key) {
						var flight = activeFlightLookup[key];
						var opacity = !isUndergroundVisible ?
							.9 * t + .225 * (1 - t) : .9 * (1 - t) + .225 * t;

						flight.body.material.opacity = flight.wing.material.opacity = flight.vTail.material.opacity = opacity;
					});
				},
				duration: 300
			});
		}
	}, {
		className: 'mapbox-ctrl-track mapbox-ctrl-track-helicopter',
		title: dict['track'],
		eventHandler: function(event) {
			if (trackingMode === 'helicopter') {
				trackingMode = 'train';
				this.classList.remove('mapbox-ctrl-track-helicopter');
				this.classList.add('mapbox-ctrl-track-train');
			} else {
				trackingMode = 'helicopter';
				this.classList.remove('mapbox-ctrl-track-train');
				this.classList.add('mapbox-ctrl-track-helicopter');
			}
			if (trackedObject) {
				startViewAnimation();
			}
			event.stopPropagation();
		}
	}, {
		className: 'mapbox-ctrl-realtime mapbox-ctrl-realtime-active',
		title: dict['exit-realtime'],
		eventHandler: function() {
			isRealtime = !isRealtime;
			this.title = dict[(isRealtime ? 'exit' : 'enter') + '-realtime'];
			stopAllTrains();
			trackedObject = undefined;
			stopViewAnimation();
			document.getElementsByClassName('mapbox-ctrl-track')[0].classList.remove('mapbox-ctrl-track-active');
			if (isRealtime) {
				this.classList.add('mapbox-ctrl-realtime-active');
			} else {
				this.classList.remove('mapbox-ctrl-realtime-active');
				initModelTrains();
			}
		}
	}]), 'top-right');

	map.addControl(new MapboxGLButtonControl([{
		className: 'mapbox-ctrl-github',
		title: dict['github'],
		eventHandler: function() {
			window.open('https://github.com/nagix/mini-tokyo-3d');
		}
	}]), 'top-right');

	var popup = new mapboxgl.Popup({
		closeButton: false,
		closeOnClick: false,
		offset: {
			top: [0, 10],
			bottom: [0, -30]
		}
	});

	map.on('mousemove', function(e) {
		var userData;

		if (isRealtime) {
			markedObject = trainLayers.pickObject(e.point);
			if (markedObject) {
				map.getCanvas().style.cursor = 'pointer';
				userData = markedObject.userData;
				popup.setLngLat(adjustCoord(userData.coord, userData.altitude))
					.setHTML(userData.object.description)
					.addTo(map);
			} else if (popup.isOpen()) {
				map.getCanvas().style.cursor = '';
				popup.remove();
			}
		}
	});

	map.on('click', function(e) {
		stopViewAnimation();
		trackedObject = trainLayers.pickObject(e.point);
		if (trackedObject) {
			startViewAnimation();
			document.getElementsByClassName('mapbox-ctrl-track')[0]
				.classList.add('mapbox-ctrl-track-active');
		} else {
			document.getElementsByClassName('mapbox-ctrl-track')[0]
				.classList.remove('mapbox-ctrl-track-active');
		}

		/* For development
		console.log(e.lngLat);
		*/
	});

	map.on('zoom', function() {
		if (trackedObject) {
			altitude = trackedObject.userData.altitude;
			// Keep camera off from the tracked aircraft
			if (altitude > 0 && Math.pow(2, 22 - map.getZoom()) / altitude < .5) {
				map.setZoom(22 - Math.log2(altitude * .5));
			}
		}

		var zoom = map.getZoom();
		var unit = Math.pow(2, 14 - clamp(zoom, 13, 19));
		var lineWidthScale = clamp(Math.pow(2, zoom - 12), .125, 1);

		setLayerProps(map, 'railways-ug-13', {lineWidthScale: lineWidthScale});
		setLayerProps(map, 'stations-ug-13', {lineWidthScale: lineWidthScale});

		layerZoom = clamp(Math.floor(zoom), 13, 18);
		altitudeUnit = Math.pow(2, 14 - layerZoom) * modelScale * 100;
		objectUnit = Math.max(unit * .19, .02);
		objectScale = unit * modelScale * 100;
		carScale = Math.max(.02 / .19, unit) * modelScale * 100;
		aircraftScale = Math.max(.06 / .285, unit) * modelScale * 100;

		Object.keys(activeTrainLookup).forEach(function(key) {
			var train = activeTrainLookup[key];

			updateTrainProps(train);
			updateTrainShape(train);
		});
		Object.keys(activeFlightLookup).forEach(function(key) {
			updateFlightShape(activeFlightLookup[key]);
		});

	});

	map.on('resize', function(e) {
		trainLayers.onResize(e);
	});

	repeat();

	if (!isRealtime) {
		initModelTrains();
	}

	a = e[0];

	startAnimation({
		callback: function() {
			var now = Date.now();
			var userData, altitude, bearing;

			if (isRealtime) {
				// Remove all trains if the page has been invisible for more than ten seconds
				if (now - lastFrameRefresh >= 10000) {
					stopAllTrains();
				}
				lastFrameRefresh = now;

				if (Math.floor((now - MIN_DELAY) / TRAIN_REFRESH_INTERVAL) !== Math.floor(lastTrainRefresh / TRAIN_REFRESH_INTERVAL)) {
					refreshTrains();
					refreshFlights();
					loadRealtimeTrainData();
					loadRealtimeFlightData();
					lastTrainRefresh = now - MIN_DELAY;
				}
				if (markedObject) {
					userData = markedObject.userData;
					popup.setLngLat(adjustCoord(userData.coord, userData.altitude))
						.setHTML(userData.object.description);
				}
			}
			if (trackedObject) {
				altitude = trackedObject.userData.altitude;
				// Keep camera off from the tracked aircraft
				if (altitude > 0 && Math.pow(2, 22 - map.getZoom()) / altitude < .5) {
					map.setZoom(22 - Math.log2(altitude * .5));
				}
			}
			if (trackedObject && !viewAnimationID) {
				userData = trackedObject.userData;
				bearing = map.getBearing();
				map.easeTo({
					center: adjustCoord(userData.coord, userData.altitude),
					bearing: trackingMode === 'helicopter' ?
						(trackingBaseBearing + performance.now() / 100) % 360 :
						bearing + ((userData.bearing - bearing + 540) % 360 - 180) * .02,
					duration: 0
				});
			}
		}
	});

	function updateTrainProps(train) {
		var feature = train.railwayFeature = featureLookup[train.r + '.' + layerZoom];
		var stationOffsets = feature.properties['station-offsets'];
		var sectionIndex = train.sectionIndex;
		var offset = train.offset = stationOffsets[sectionIndex];

		train.interval = stationOffsets[sectionIndex + train.sectionLength] - offset;
	}

	function updateTrainShape(train, t) {
		var feature = train.railwayFeature;
		var offset = train.offset;
		var cars = train.cars;
		var length = cars.length;
		var carComposition = clamp(Math.floor(train.carComposition * .02 / objectUnit), 1, train.carComposition);
		var compositionChanged = length !== carComposition;
		var delayMarker = train.delayMarker;
		var i, ilen, railway, car, position, scale, userData, p, coord, bearing, mCoord;

		if (t !== undefined) {
			train._t = t;
		}
		if (train._t === undefined) {
			return;
		}

		for (i = length - 1; i >= carComposition; i--) {
			trainLayers.removeObject(cars.pop(), train);
		}
		for (i = length; i < carComposition; i++) {
			railway = railway || railwayLookup[train.r];
			car = createCube(.88, 1.76, .88, railway.color);
			userData = car.userData;
			userData.object = train;
			userData.altitude = (train.altitude || 0) * Math.pow(2, 14 - layerZoom) * 100;
			cars.push(car);
			trainLayers.addObject(car, train, 1000);
		}
		if (compositionChanged) {
			if (markedObject && markedObject.userData.object === train) {
				markedObject = cars[Math.floor(carComposition / 2)];
			}
			if (trackedObject && trackedObject.userData.object === train) {
				trackedObject = cars[Math.floor(carComposition / 2)];
			}
		}

		for (i = 0, ilen = cars.length; i < ilen; i++) {
			car = cars[i];
			position = car.position;
			scale = car.scale;
			userData = car.userData;

			p = getCoordAndBearing(feature, offset + train._t * train.interval + (i - (carComposition - 1) / 2) * objectUnit);

			coord = userData.coord = p.coord;
			userData.altitude = p.altitude;
			bearing = userData.bearing = p.bearing + (train.direction < 0 ? 180 : 0);
			mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord);

			position.x = mCoord.x - modelOrigin.x;
			position.y = -(mCoord.y - modelOrigin.y);
			position.z = (train.altitude || 0) * altitudeUnit + objectScale / 2;
			scale.x = scale.z = objectScale;
			scale.y = carScale;
			car.rotation.z = -bearing * DEGREE_TO_RADIAN;
		}

		if (train.delay) {
			if (!delayMarker) {
				delayMarker = train.delayMarker = createDelayMarker();
				trainLayers.addObject(delayMarker, train, 1000);
			}

			car = cars[Math.floor(carComposition / 2)];
			merge(delayMarker.position, car.position);
			scale = delayMarker.scale;
			scale.x = scale.y = scale.z = carScale;
		} else if (delayMarker) {
			trainLayers.removeObject(delayMarker, train);
			delete train.delayMarker;
		}
	}

	function updateFlightShape(flight, t) {
		var body = flight.body;
		var wing = flight.wing;
		var vTail = flight.vTail;
		var operator, p, coord, bearing, mCoord;

		if (t !== undefined) {
			flight._t = t;
		}
		if (flight._t === undefined) {
			return;
		}
		if (!body) {
			operator = operatorLookup[flight.a];
			body = flight.body = createCube(.88, 2.64, .88, operator.color || '#FFFFFF');
			wing = flight.wing = createCube(2.64, .88, .1, operator.color || '#FFFFFF');
			vTail = flight.vTail = createCube(.1, .88, .88, operator.tailcolor || '#FFFFFF');
			vTail.geometry.translate(0, -.88, .88);
			body.userData.object = wing.userData.object = vTail.userData.object = flight;
			trainLayers.addObject(body, flight, 1000);
			trainLayers.addObject(wing, flight, 1000);
			trainLayers.addObject(vTail, flight, 1000);
		}

		p = getCoordAndBearing(flight.feature, flight._t * flight.feature.properties.length);

		coord = body.userData.coord = wing.userData.coord = vTail.userData.coord = p.coord;
		body.userData.altitude = wing.userData.altitude = vTail.userData.altitude = p.altitude;
		bearing = body.userData.bearing = wing.userData.bearing = vTail.userData.bearing = p.bearing;
		mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord);

		position = body.position;
		position.x = mCoord.x - modelOrigin.x;
		position.y = -(mCoord.y - modelOrigin.y);
		position.z = p.altitude * modelScale + objectScale / 2;
		scale = body.scale;
		scale.x = scale.z = objectScale;
		scale.y = aircraftScale;
		body.rotation.z = -bearing * DEGREE_TO_RADIAN;

		merge(wing.position, body.position);
		scale = wing.scale;
		scale.x = aircraftScale;
		scale.y = scale.z = objectScale;
		wing.rotation.z = body.rotation.z;

		merge(vTail.position, body.position);
		scale = vTail.scale
		scale.x = scale.z = objectScale;
		scale.y = aircraftScale;
		vTail.rotation.z = body.rotation.z;
	}

	function initModelTrains() {
		trainData.forEach(function(train, i) {
			var railway = railwayLookup[train.r];

			train.t = i;
			activeTrainLookup[train.t] = train;

			train.sectionLength = train.direction;
			train.carComposition = railway.carComposition;
			train.cars = [];
			updateTrainProps(train);

			function repeat() {
				train.animationID = startTrainAnimation(function(t) {
					updateTrainShape(train, t);
				}, function() {
					var direction = train.direction;
					var sectionIndex = train.sectionIndex = train.sectionIndex + direction;

					if (sectionIndex <= 0 || sectionIndex >= railway.stations.length - 1) {
						train.direction = train.sectionLength = -direction;
					}
					updateTrainProps(train);
					updateTrainShape(train, 0);

					// Stop and go
					train.animationID = startAnimation({complete: repeat, duration: 1000});
				}, Math.abs(train.interval), TIME_FACTOR);
			}
			repeat();
		});
	}

	function refreshTrains() {
		var now = Date.now();

		timetableRefData.forEach(function(train) {
			var d = train.delay || 0;
			if (train.start + d <= now && now <= train.end + d &&
				!activeTrainLookup[train.t] &&
				(!train.previousTrain || !activeTrainLookup[train.previousTrain.t]) &&
				(!train.nextTrain || !activeTrainLookup[train.nextTrain.t]) &&
				(!railwayLookup[train.r].status || realtimeTrainLookup[train.t])) {
				function start(index) {
					var now = Date.now();
					var departureTime;

					if (!setSectionData(train, index)) {
						return; // Out of range
					}
					activeTrainLookup[train.t] = train;
					train.cars = [];
					departureTime = getTime(train.departureTime) + (train.delay || 0);
					if (now >= departureTime) {
						updateTrainProps(train);
						repeat(now - departureTime);
					} else {
						stand();
					}
				}

				function stand(final) {
					var departureTime = getTime(train.departureTime) + (train.delay || 0);

					if (!final) {
						updateTrainProps(train);
						updateTrainShape(train, 0);
					}
					setTrainStandingStatus(train, true);
					train.animationID = startAnimation({
						complete: !final ? repeat : function() {
							stopTrain(train);
						},
						duration: Math.max(departureTime - Date.now(), MIN_STANDING_DURATION)
					});
				}

				function repeat(elapsed) {
					setTrainStandingStatus(train, false);
					train.animationID = startTrainAnimation(function(t) {
						updateTrainShape(train, t);
					}, function() {
						var markedObjectIndex, trackedObjectIndex;

						if (!setSectionData(train, train.timetableIndex + 1)) {
							markedObjectIndex = train.cars.indexOf(markedObject);
							trackedObjectIndex = train.cars.indexOf(trackedObject);
							if (train.nextTrain) {
								stopTrain(train);
								train = train.nextTrain;
								if (!activeTrainLookup[train.t]) {
									start(0);
									if (train.cars) {
										if (markedObjectIndex !== -1) {
											markedObject = train.cars[markedObjectIndex];
										}
										if (trackedObjectIndex !== -1) {
											trackedObject = train.cars[trackedObjectIndex];
										}
									}
								}
								return;
							}
							stand(true);
						} else {
							stand();
						}
					}, Math.abs(train.interval), 1, elapsed);
				}

				start();
			}
		});
	}

	function refreshFlights() {
		var now = Date.now();

		Object.keys(flightLookup).forEach(function(key) {
			var flight = flightLookup[key];

			if (flight.standing <= now && now <= flight.end && !activeFlightLookup[flight.id]) {
				activeFlightLookup[flight.id] = flight;
				if (now >= flight.start) {
					repeat(now - flight.start);
				} else {
					updateFlightShape(flight, 0);
					setFlightStandingStatus(flight, true);
					flight.animationID = startAnimation({
						complete: repeat,
						duration: flight.start - now
					});
				}

				function repeat(elapsed) {
					setFlightStandingStatus(flight, false);
					flight.animationID = startFlightAnimation(function(t) {
						updateFlightShape(flight, t);
					}, function() {
						setFlightStandingStatus(flight, true);
						flight.animationID = startAnimation({
							complete: function() {
								stopFlight(flight);
							},
							duration: Math.max(flight.end - Date.now(), 0)
						});
					}, flight.feature.properties.length, flight.maxSpeed, flight.acceleration, elapsed);
				}
			}
		});
	}

	function startViewAnimation() {
		var t2 = 0;

		trackingBaseBearing = map.getBearing() - performance.now() / 100;
		viewAnimationID = startAnimation({
			callback: function(elapsed) {
				var t1 = easeOutQuart(elapsed / 1000);
				var factor = (1 - t1) / (1 - t2);
				var userData = trackedObject.userData;
				var coord = adjustCoord(userData.coord, userData.altitude);
				var lng = coord[0];
				var lat = coord[1];
				var center = map.getCenter();
				var bearing = userData.bearing;

				map.easeTo({
					center: [lng - (lng - center.lng) * factor, lat - (lat - center.lat) * factor],
					bearing: trackingMode === 'helicopter' ?
						(trackingBaseBearing + performance.now() / 100) % 360 :
						bearing - ((bearing - map.getBearing() + 540) % 360 - 180) * factor,
					duration: 0
				});
				t2 = t1;
			},
			complete: function() {
				viewAnimationID = undefined;
			},
			duration: 1000
		});
	}

	function stopViewAnimation() {
		if (viewAnimationID) {
			stopAnimation(viewAnimationID);
			viewAnimationID = undefined;
		}
	}

	function adjustCoord(coord, altitude) {
		var mCoord, pos, world;

		if (!altitude) {
			return coord;
		}
		mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord);
		pos = new THREE.Vector3(mCoord.x - modelOrigin.x, -(mCoord.y - modelOrigin.y), altitude * modelScale).project(trainLayers.ug.camera);
		world = map.unproject([(pos.x + 1) / 2 * map.transform.width, (1 - pos.y) / 2 * map.transform.height]);
		return [world.lng, world.lat];
	}

	function getLocalizedRailwayTitle(railway) {
		title = (railwayLookup[railway] || {}).title || {};
		return title[lang] || title['en'];
	}

	function getLocalizedRailDirectionTitle(direction) {
		title = (railDirectionLookup[direction] || {}).title || {};
		return title[lang] || title['en'];
	}

	function getLocalizedTrainTypeTitle(type) {
		title = (trainTypeLookup[type] || {}).title || {};
		return title[lang] || title['en'];
	}

	function getLocalizedStationTitle(station) {
		station = Array.isArray(station) ? station[0] : station;
		title = (stationLookup[station] || {}).title || {};
		return title[lang] || title['en'];
	}

	function getLocalizedOperatorTitle(operator) {
		title = (operatorLookup[operator] || {}).title || {};
		return title[lang] || title['en'];
	}

	function getLocalizedAirportTitle(airport) {
		title = (airportLookup[airport] || {}).title || {};
		return title[lang] || title['en'];
	}

	function getLocalizedFlightStatusTitle(status) {
		title = (flightStatusLookup[status] || {}).title || {};
		return title[lang] || title['en'];
	}

	function setTrainStandingStatus(train, standing) {
		var railwayID = train.r;
		var railway = railwayLookup[railwayID];
		var destination = train.ds;
		var delay = train.delay || 0;

		train.standing = standing;
		train.description =
			'<span class="desc-box" style="background-color: ' + railway.color + ';"></span> ' +
			'<strong>' + getLocalizedRailwayTitle(railwayID) + '</strong>' +
			'<br>' + getLocalizedTrainTypeTitle(train.y) + ' ' +
			(destination ? dict['for'].replace('$1', getLocalizedStationTitle(destination)) : getLocalizedRailDirectionTitle(train.d)) +
			'<br><strong>' + dict['train-number'] + ':</strong> ' + train.n +
			'<br>' + (delay >= 60000 ? '<span class="desc-caution">' : '') +
			'<strong>' + dict[train.standing ? 'standing-at' : 'previous-stop'] + ':</strong> ' +
			getLocalizedStationTitle(train.departureStation) +
			' ' + getTimeString(getTime(train.departureTime) + delay) +
			(train.arrivalStation ?
				'<br><strong>' + dict['next-stop'] + ':</strong> ' +
				getLocalizedStationTitle(train.arrivalStation) +
				' ' + getTimeString(getTime(train.arrivalTime) + delay) : '') +
			(delay >= 60000 ? '<br>' + dict['delay'].replace('$1', Math.floor(delay / 60000)) + '</span>' : '') +
			(railway.status && lang === 'ja' ? '<br><span class="desc-caution"><strong>' + railway.status + ':</strong> ' + railway.text + '</span>' : '');
	}

	function setFlightStandingStatus(flight, standing) {
		var airlineID = flight.a;
		var flightNumber = flight.n;
		var destination = flight.ds;
		var origin = flight.or;
		var scheduledTime = flight.sdt || flight.sat;
		var estimatedTime = flight.edt || flight.eat;
		var actualTime = flight.adt || flight.aat;
		var delayed = (estimatedTime || actualTime) && scheduledTime !== (estimatedTime || actualTime);

		flight.description =
			'<span class="desc-box" style="background-color: ' + (operatorLookup[airlineID].tailcolor || '#FFFFFF') + ';"></span> ' +
			'<strong>' + getLocalizedOperatorTitle(airlineID) + '</strong>' +
			'<br>' + flightNumber[0] + ' ' +
			dict[destination ? 'to' : 'from'].replace('$1', getLocalizedAirportTitle(destination || origin)) +
			'<br><strong>' + dict['status'] + ':</strong> ' + getLocalizedFlightStatusTitle(flight.s) +
			'<br><strong>' + dict['scheduled-' + (destination ? 'departure' : 'arrival') + '-time'] + ':</strong> ' + scheduledTime +
			(delayed ? '<span class="desc-caution">' : '') +
			(estimatedTime || actualTime ? '<br><strong>' + (estimatedTime ?
				dict['estimated-' + (destination ? 'departure' : 'arrival') + '-time'] + ':</strong> ' + estimatedTime :
				dict['actual-' + (destination ? 'departure' : 'arrival') + '-time'] + ':</strong> ' + actualTime) : '') +
			(delayed ? '</span>' : '') +
			(flightNumber.length > 1 ? '<br><strong>' + dict['code-share'] + ':</strong> ' + flightNumber.slice(1).join(' ') : '');
	}

	function stopTrain(train) {
		stopAnimation(train.animationID);
		if (train.cars) {
			train.cars.forEach(function(car) {
				trainLayers.removeObject(car, train, 1000);
			});
		}
		delete train.cars;
		delete activeTrainLookup[train.t];
		if (train.delayMarker) {
			trainLayers.removeObject(train.delayMarker, train, 1000);
			delete train.delayMarker;
		}
	}

	function stopFlight(flight) {
		stopAnimation(flight.animationID);
		trainLayers.removeObject(flight.body, flight, 1000);
		trainLayers.removeObject(flight.wing, flight, 1000);
		trainLayers.removeObject(flight.vTail, flight, 1000);
		delete flight.body;
		delete flight.wing;
		delete flight.vTail;
		delete activeFlightLookup[flight.id];
	}

	function stopAllTrains() {
		Object.keys(activeTrainLookup).forEach(function(key) {
			stopTrain(activeTrainLookup[key]);
		});
		Object.keys(activeFlightLookup).forEach(function(key) {
			stopFlight(activeFlightLookup[key]);
		});
		lastTrainRefresh = undefined;
	}

	function adjustTrainID(id, type) {
		if (type === 'JR-East.Rapid' || type === 'JR-East.LimitedExpress') {
			return id.replace(/JR-East\.(NaritaAirportBranch|Narita|Sobu)/, 'JR-East.SobuRapid');
		}
		return id;
	}

	function loadRealtimeTrainData() {
		Promise.all([
			loadJSON(API_URL + 'odpt:TrainInformation?odpt:operator=odpt.Operator:JR-East,odpt.Operator:TWR,odpt.Operator:TokyoMetro,odpt.Operator:Toei,odpt.Operator:Keio'),
			loadJSON(API_URL + 'odpt:Train?odpt:operator=odpt.Operator:JR-East,odpt.Operator:TokyoMetro,odpt.Operator:Toei')
		]).then(function([trainInfoRefData, trainRefData]) {
			realtimeTrainLookup = {};

			trainRefData.forEach(function(trainRef) {
				var delay = trainRef['odpt:delay'] * 1000;
				var carComposition = trainRef['odpt:carComposition'];
				var trainType = removePrefix(trainRef['odpt:trainType']);
				var destination = removePrefix(trainRef['odpt:destinationStation']);
				var id = adjustTrainID(removePrefix(trainRef['owl:sameAs']));
				var train = trainLookup[id];
				var activeTrain = activeTrainLookup[id];
				var changed = false;

				if (train) {
					realtimeTrainLookup[id] = train;
					if (delay && train.delay !== delay) {
						train.delay = delay;
						changed = true;
					}
					if (carComposition && train.carComposition !== carComposition) {
						train.carComposition = carComposition;
						changed = true;
					}
					if (trainType && train.y !== trainType) {
						train.y = trainType;
						changed = true;
					}
					if (train.ds && destination && train.ds[0] !== destination[0]) {
						train.ds = destination;
						changed = true;
					}
					if (changed && activeTrainLookup[id]) {
						stopTrain(train);
					}
				}
			});

			// Reset railway information text
			railwayRefData.forEach(function(railway) {
				delete railway.status;
				delete railway.text;
			});

			trainInfoRefData.forEach(function(trainInfoRef) {
				var operatorID = removePrefix(trainInfoRef['odpt:operator']);
				var railwayID = removePrefix(trainInfoRef['odpt:railway']);
				var status = trainInfoRef['odpt:trainInformationStatus'];
				var text = trainInfoRef['odpt:trainInformationText'];

				// Train information text is provided in Japanese only
				if (railwayID && status && status.ja &&
					(operatorID === 'JR-East' || operatorID === 'TokyoMetro' || operatorID === 'Toei') &&
					(status.ja.indexOf('見合わせ') !== -1 ||
					status.ja.indexOf('折返し運転') !== -1 ||
					status.ja.indexOf('運休') !== -1 ||
					status.ja.indexOf('遅延') !== -1)) {
					railway = railwayLookup[railwayID];
					railway.status = status.ja;
					railway.text = text.ja;
					Object.keys(activeTrainLookup).forEach(function(key) {
						var train = activeTrainLookup[key];
						if (train.r === railwayID && !realtimeTrainLookup[train.t]) {
							stopTrain(train);
						}
					});
				}
			});

			refreshTrains();
		});
	}

	function loadRealtimeFlightData() {
		Promise.all([
			loadJSON(API_URL + 'odpt:FlightInformationArrival?odpt:operator=odpt.Operator:NAA,odpt.Operator:HND-JAT,odpt.Operator:HND-TIAT'),
			loadJSON(API_URL + 'odpt:FlightInformationDeparture?odpt:operator=odpt.Operator:NAA,odpt.Operator:HND-JAT,odpt.Operator:HND-TIAT')
		]).then(function(flightRefData) {
			var flightQueue = {};

			concat(flightRefData).forEach(function(flightRef) {
				var id = removePrefix(flightRef['owl:sameAs']);
				var flight = flightLookup[id];
				var status = removePrefix(flightRef['odpt:flightStatus']);
				var maxSpeed = MAX_FLIGHT_SPEED;
				var acceleration = FLIGHT_ACCELERATION;
				var departureAirport, arrivalAirport, runway, feature, departureTime, arrivalTime, duration;

				if (!flight) {
					if (status === 'Cancelled') {
						return;
					}
					departureAirport = removePrefix(flightRef['odpt:departureAirport']);
					arrivalAirport = removePrefix(flightRef['odpt:arrivalAirport']);
					runway = departureAirport === 'NRT' ? departureAirport + '.34L.Dep' :
						arrivalAirport === 'NRT' ? arrivalAirport + '.34R.Arr' :
						departureAirport === 'HND' ? departureAirport + '.05.Dep' :
						arrivalAirport === 'HND' ? arrivalAirport + '.34L.Arr' : undefined;
					feature = featureLookup[runway];
					if (feature) {
						flight = flightLookup[id] = {
							id: id,
							n: flightRef['odpt:flightNumber'],
							a: removePrefix(flightRef['odpt:airline']),
							dp: departureAirport,
							ar: arrivalAirport,
							ds: removePrefix(flightRef['odpt:destinationAirport']),
							or: removePrefix(flightRef['odpt:originAirport']),
							runway: runway,
							feature: feature
						};
					} else {
						return;
					}
				}
				merge(flight, {
					s: status,
					edt: flightRef['odpt:estimatedDepartureTime'],
					adt: flightRef['odpt:actualDepartureTime'],
					sdt: flightRef['odpt:scheduledDepartureTime'],
					eat: flightRef['odpt:estimatedArrivalTime'],
					aat: flightRef['odpt:actualArrivalTime'],
					sat: flightRef['odpt:scheduledArrivalTime']
				});

				departureTime = flight.edt || flight.adt || flight.sdt;
				arrivalTime = flight.eat || flight.aat || flight.sat;

				if (arrivalTime) {
					maxSpeed /= 2;
					acceleration /= -2;
				}

				duration = maxSpeed / Math.abs(acceleration) / 2 + flight.feature.properties.length / maxSpeed;

				if (departureTime) {
					flight.start = getTime(departureTime);
					flight.standing = flight.start - STANDING_DURATION;
					flight.end = flight.start + duration;
				} else {
					flight.start = flight.standing = getTime(arrivalTime) - duration;
					flight.end = flight.start + duration + STANDING_DURATION;
				}
				flight.maxSpeed = maxSpeed;
				flight.acceleration = acceleration;

				queue = flightQueue[flight.runway] = flightQueue[flight.runway] || [];
				queue.push(flight);
			});

			Object.keys(flightQueue).forEach(function(key) {
				var queue = flightQueue[key];
				var latest = 0;

				queue.sort(function(a, b) {
					return a.start - b.start;
				});
				queue.forEach(function(flight) {
					var delay = Math.max(flight.start, latest + MIN_FLIGHT_INTERVAL) - flight.start;

					if (delay) {
						flight.start += delay;
						flight.standing += delay;
						flight.end += delay;
					}
					latest = flight.start;
				});
			});

			refreshFlights();
		});
	}
});

}).catch(function(error) {
	document.getElementById('loader').style.display = 'none';
	document.getElementById('loading-error').innerHTML = 'Loading failed. Please reload the page.';
	document.getElementById('loading-error').style.display = 'block';
	throw error;
});

function colorToRGBArray(color) {
	var c = parseInt(color.replace('#', ''), 16);
	return [Math.floor(c / 65536) % 256, Math.floor(c / 256) % 256, c % 256, 255];
}

function updateDistances(line) {
	var coords = turf.getCoords(line);
	var travelled = 0;
	var distances = [];
	var i;

	for (i = 0; i < coords.length; i++) {
		if (i > 0) {
			travelled += turf.distance(coords[i - 1], coords[i]);
		}
		distances.push(travelled);
	}
	line.properties.distances = distances;
}

/**
  * Returns coordinates, altitude and bearing of the train from its distance
  * @param {object} line - lineString of the railway
  * @param {number} distance - Distance from the beginning of the lineString
  * @returns {object} coord, altitude and bearing
  */
function getCoordAndBearing(line, distance) {
	var coords = turf.getCoords(line);
	var distances = line.properties.distances;
	var start = 0;
	var end = coords.length - 1;
	var center, index, coord, nextCoord, baseDistance, overshot, altitude, bearing;

	if (distance >= distances[end]) {
		coord = coords[end];
		return {
			coord: coord,
			altitude: coord[2] || 0,
			bearing: turf.bearing(coords[end - 1], coord)
		};
	}

	while (start !== end - 1) {
		center = Math.floor((start + end) / 2);
		if (distance < distances[center]) {
			end = center;
		} else {
			start = center;
		}
	}
	index = start;

	coord = coords[index];
	nextCoord = coords[index + 1];
	baseDistance = distances[index];
	overshot = distance - baseDistance;
	altitude = coord[2] || 0;
	bearing = turf.bearing(coord, nextCoord);
	return {
		coord: overshot === 0 ? coord : turf.getCoord(turf.destination(coord, overshot, bearing)),
		altitude: altitude + ((nextCoord[2] || 0) - altitude) * overshot / (distances[index + 1] - baseDistance),
		bearing: bearing
	};
}

function getLocationAlongLine(line, point) {
	var nearestPoint = turf.nearestPointOnLine(line, point);
	return nearestPoint.properties.location;
}

function filterFeatures(featureCollection, fn) {
	return turf.featureCollection(featureCollection.features.filter(function(feature) {
		return fn(feature.properties);
	}));
}

function setLayerProps(map, id, props) {
	map.getLayer(id).implementation.setProps(props);
}

function repeat() {
	var ids = Object.keys(animations);
	var now = performance.now();
	var i, ilen, id, animation, start, duration, elapsed, callback;

	for (i = 0, ilen = ids.length; i < ilen; i++) {
		id = ids[i];
		animation = animations[id];
		if (animation) {
			start = animation.start = animation.start || now;
			duration = animation.duration;
			elapsed = now - start;
			callback = animation.callback;
			if (callback) {
				callback(Math.min(elapsed, duration), duration);
			}
			if (elapsed >= duration) {
				callback = animation.complete;
				if (callback) {
					callback();
				}
				stopAnimation(id);
			}
		}
	}
	requestAnimationFrame(repeat);
}

/**
  * Starts a new animation.
  * @param {object} options - Animation options
  * @param {function} options.callback - Function called on every frame
  * @param {function} options.complete - Function called when the animation completes
  * @param {number} options.duration - Animation duration. Default is Infinity
  * @param {number} options.start - Animation start time (same timestamp as performance.now())
  * @returns {number} Animation ID which can be used to stop
  */
function startAnimation(options) {
	if (options.duration === undefined) {
		options.duration = Infinity;
	}
	animations[animationID] = options;
	return animationID++;
}

/**
  * Stops an animation
  * @param {number} id - Animation ID to stop
  */
function stopAnimation(id) {
	if (animations[id]) {
		delete animations[id];
	}
}

function startTrainAnimation(callback, endCallback, distance, timeFactor, start) {
	var maxSpeed = MAX_SPEED * timeFactor;
	var acceleration = ACCELERATION * timeFactor * timeFactor;
	var maxAccelerationTime = MAX_ACCELERATION_TIME / timeFactor;
	var duration = distance < MAX_ACC_DISTANCE * 2 ?
		Math.sqrt(distance / acceleration) * 2 :
		maxAccelerationTime * 2 + (distance - MAX_ACC_DISTANCE * 2) / maxSpeed;
	var accelerationTime = Math.min(maxAccelerationTime, duration / 2);

	return startAnimation({
		callback: function(elapsed) {
			var left = duration - elapsed;
			var d;

			if (elapsed <= accelerationTime) {
				d = acceleration / 2 * elapsed * elapsed;
			} else if (left <= accelerationTime) {
				d = distance - acceleration / 2 * left * left;
			} else {
				d = MAX_ACC_DISTANCE + maxSpeed * (elapsed - maxAccelerationTime);
			}
			callback(d / distance);
		},
		complete: endCallback,
		duration: duration,
		start: start > 0 ? performance.now() - start : undefined
	});
}

function startFlightAnimation(callback, endCallback, distance, maxSpeed, acceleration, start) {
	var accelerationTime = maxSpeed / Math.abs(acceleration);
	var duration = accelerationTime / 2 + distance / maxSpeed;

	return startAnimation({
		callback: function(elapsed) {
			var left = duration - elapsed;
			var d;

			if (acceleration > 0) {
				if (elapsed <= accelerationTime) {
					d = acceleration / 2 * elapsed * elapsed;
				} else {
					d = maxSpeed * (elapsed - accelerationTime / 2);
				}
			} else {
				if (left <= accelerationTime) {
					d = distance + acceleration / 2 * left * left;
				} else {
					d = maxSpeed * elapsed;
				}
			}
			callback(d / distance);
		},
		complete: endCallback,
		duration: duration,
		start: start > 0 ? performance.now() - start : undefined
	});
}

function easeOutQuart(t) {
	return -((t = t - 1) * t * t * t - 1);
}

function concat(arr) {
	return Array.prototype.concat.apply([], arr);
}

function merge(target, source) {
	if (target === undefined || source === undefined) {
		return;
	}
	Object.keys(source).forEach(function(key) {
		target[key] = source[key];
	});
	return target;
}

function clamp(value, lower, upper) {
	return Math.min(Math.max(value, lower), upper);
}

function inRange(value, start, end) {
	return value >= start && value < end;
}

function removePrefix(value) {
	if (typeof value === 'string') {
		return value.replace(/.*:/, '');
	}
	if (Array.isArray(value)) {
		return value.map(removePrefix);
	}
	return value;
}

function loadJSON(url) {
	return new Promise(function(resolve, reject) {
		var request = new XMLHttpRequest();

		if (url.indexOf(API_URL) === 0) {
			url += a;
		}
		request.open('GET', url);
		request.onreadystatechange = function() {
			if (request.readyState === 4) {
				if (request.status === 200) {
					resolve(JSON.parse(request.response));
				} else {
					reject(Error(request.statusText));
				}
			}
		}
		request.send();
	});
}

function buildLookup(array, key) {
	var lookup = {};

	key = key || 'id';
	array.forEach(function(element) {
		lookup[element[key]] = element;
	});
	return lookup;
}

function getTime(timeString) {
	var date = new Date();
	var timeStrings = (timeString || '').split(':');
	var hours = +timeStrings[0];
	var tzDiff = date.getTimezoneOffset() + 540; // Difference between local time to JST

	// Adjust local time to JST (UTC+9)
	date.setMinutes(date.getMinutes() + tzDiff);

	// Special handling of time between midnight and 3am
	hours += (date.getHours() < 3 ? -24 : 0) + (hours < 3 ? 24 : 0);

	// Adjust JST back to local time
	return date.setHours(hours, +timeStrings[1] - tzDiff, Math.floor(MIN_DELAY / 1000), MIN_DELAY % 1000);
}

function getTimeString(time) {
	var date = new Date(time);
	var tzDiff = date.getTimezoneOffset() + 540; // Difference between local time to JST

	// Adjust local time to JST (UTC+9)
	date.setMinutes(date.getMinutes() + tzDiff);

	return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
}

function createCube(x, y, z, color) {
	var geometry = new THREE.BoxBufferGeometry(x, y, z);
	var material = new THREE.MeshLambertMaterial({
		color: parseInt(color.replace('#', ''), 16),
		transparent: true,
		polygonOffset: true,
		polygonOffsetFactor: Math.random()
	});
	return new THREE.Mesh(geometry, material);
}

function createDelayMarker() {
	var geometry = new THREE.SphereBufferGeometry(1.8, 32, 32);
	var material = new THREE.ShaderMaterial({
		uniforms: {glowColor: {type: "c", value: new THREE.Color(0xff9900)}},
		vertexShader: document.getElementById('vertexShader').textContent,
		fragmentShader: document.getElementById('fragmentShader').textContent,
		blending: THREE.MultiplyBlending,
		depthWrite: false
	});
	return new THREE.Mesh(geometry, material);
}

function getTrainOpacity(train) {
	return isUndergroundVisible === (train.altitude < 0) ? .9 : .225;
}

function setSectionData(train, index) {
	var table = train.tt;
	var delay = train.delay || 0;
	var now = Date.now();
	var index = index !== undefined ? index :
		table.reduce(function(acc, cur, i) {
			return getTime(cur.dt) + delay <= now ? i : acc;
		}, 0);
	var current = table[index];
	var next = table[index + 1];
	var stations = railwayLookup[train.r].stations;
	var departureStation = current.ds || current.as;
	var arrivalStation = next && (next.as || next.ds);
	var currentSection, nextSection;

	if (train.direction > 0) {
		currentSection = stations.indexOf(departureStation);
		nextSection = stations.indexOf(arrivalStation, currentSection);
	} else {
		currentSection = stations.lastIndexOf(departureStation);
		nextSection = stations.lastIndexOf(arrivalStation, currentSection);
	}

	train.timetableIndex = index;
	train.departureStation = departureStation;
	train.departureTime = current.dt || current.at;

	if (currentSection >= 0 && nextSection >= 0) {
		train.sectionIndex = currentSection;
		train.sectionLength = nextSection - currentSection;
		train.arrivalStation = arrivalStation;
		train.arrivalTime = next.at || next.dt;

		return true;
	}

	train.arrivalStation = undefined;
	train.arrivalTime = undefined;
}

function getLang() {
	var match = location.search.match(/lang=(.*?)(&|$)/);
	var lang = match ? decodeURIComponent(match[1]).substring(0, 2) : '';

	if (lang.match(/ja|en|ko|zh|th|ne/)) {
		return lang;
	}

	lang = (window.navigator.languages && window.navigator.languages[0]) ||
		window.navigator.language ||
		window.navigator.userLanguage ||
		window.navigator.browserLanguage || '';
	lang = lang.substring(0, 2);

	return lang.match(/ja|en|ko|zh|th|ne/) ? lang : 'en';
}
