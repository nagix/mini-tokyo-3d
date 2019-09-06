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

// Minimum stop duration in milliseconds
var MIN_STOP_DURATION = 30000;

// Interval of refreshing train positions in milliseconds
var TRAIN_REFRESH_INTERVAL = 60000;

// Maximum train speed in km/h
var MAX_SPEED_KMPH = 90;

// Train acceleration in km/h/s
var ACCELERATION_KMPHPS = 3;

// Time factor for the non-real-time mode
var TIME_FACTOR = 12;

var MAX_SPEED = MAX_SPEED_KMPH / 3600000;
var ACCELERATION = ACCELERATION_KMPHPS / 3600000000;
var ACCELERATION_TIME = MAX_SPEED / ACCELERATION;
var ACC_DISTANCE = ACCELERATION_TIME * MAX_SPEED / 2;

// API URL
var API_URL = 'https://api-tokyochallenge.odpt.org/api/v4/';

// API Token
var API_TOKEN = 'acl:consumerKey=772cd76134e664fb9ee7dbf0f99ae25998834efee29febe782b459f48003d090';

var SQRT3 = Math.sqrt(3);

var modelOrigin = mapboxgl.MercatorCoordinate.fromLngLat([139.7670, 35.6814]);
var modelScale = 1 / 2 / Math.PI / 6378137 / Math.cos(35.6814 * Math.PI / 180);

var lang = getLang();
var today = new Date();
var isUndergroundVisible = false;
var isRealtime = true;
var trackingMode = 'helicopter';
var opacityStore = {};
var featureLookup = {};
var trainLookup = {};
var stationLookup, railwayLookup, railDirectionLookup, trainTypeLookup, timetableLookup;
var trackedTrain, markedTrain, trainLastRefresh, trackingBaseBearing, viewAnimationID;

// Replace MapboxLayer.render to support underground rendering
var render = MapboxLayer.prototype.render;
MapboxLayer.prototype.render = function(gl, matrix) {
	var deck = this.deck;
	var map = this.map;
	var center = map.getCenter();

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

MapboxGLButtonControl.prototype.initialize = function(options) {
	this._className = options.className || '';
	this._title = options.title || '';
	this._eventHandler = options.eventHandler;
};

MapboxGLButtonControl.prototype.onAdd = function(map) {
	this._btn = document.createElement('button');
	this._btn.className = 'mapboxgl-ctrl-icon ' + this._className;
	this._btn.type = 'button';
	this._btn.title = this._title;
	this._btn.onclick = this._eventHandler;

	this._container = document.createElement('div');
	this._container.className = 'mapboxgl-ctrl-group mapboxgl-ctrl';
	this._container.appendChild(this._btn);

	return this._container;
};

MapboxGLButtonControl.prototype.onRemove = function() {
	this._container.parentNode.removeChild(this._container);
	this._map = undefined;
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
	this.camera = new THREE.PerspectiveCamera(map.transform._fov * 180 / Math.PI, window.innerWidth / window.innerHeight);
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

	var rad = (map.getBearing() + 30) * Math.PI / 180;
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
	? 'SaturdayHoliday' : 'Weekday';

Promise.all([
	loadJSON('data/dictionary-' + lang + '.json'),
	loadJSON('data/railways.json'),
	loadJSON('data/stations.json'),
	loadJSON('data/trains.json'),
	loadJSON('data/features.json'),
	loadJSON(API_URL + 'odpt:Railway?odpt:operator=odpt.Operator:JR-East,odpt.Operator:TWR,odpt.Operator:TokyoMetro,odpt.Operator:Toei&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:RailDirection?' + API_TOKEN),
	loadJSON(API_URL + 'odpt:Station?odpt:operator=odpt.Operator:JR-East,odpt.Operator:JR-Central,odpt.Operator:TWR&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:Station?odpt:operator=odpt.Operator:TokyoMetro,odpt.Operator:Toei,odpt.Operator:Tobu,odpt.Operator:ToyoRapid,odpt.Operator:Odakyu,odpt.Operator:Keikyu,odpt.Operator:Keisei,odpt.Operator:Hokuso,odpt.Operator:Shibayama&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.Yamanote&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.ChuoRapid&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.ChuoSobuLocal&odpt:calendar=odpt.Calendar:Weekday&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.Tokaido,odpt.Railway:JR-East.Utsunomiya,odpt.Railway:JR-East.Takasaki&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.KeihinTohokuNegishi&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.JobanRapid,odpt.Railway:JR-East.JobanLocal&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.SobuRapid,odpt.Railway:JR-East.Yokosuka&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.Keiyo&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.SaikyoKawagoe,odpt.Railway:TWR.Rinkai,odpt.Railway:JR-East.ShonanShinjuku&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:TokyoMetro.Ginza&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:TokyoMetro.Marunouchi&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:TokyoMetro.MarunouchiBranch&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:TokyoMetro.Hibiya&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:TokyoMetro.Tozai&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:TokyoMetro.Chiyoda&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:Toei.Asakusa&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainType?odpt:operator=odpt.Operator:JR-East,odpt.Operator:TWR,odpt.Operator:TokyoMetro,odpt.Operator:Toei&' + API_TOKEN)
]).then(function([
	dict, railwayData, stationData, trainData, railwayFeatureCollection, railwayRefData, railDirectionRefData,
	stationRefData1, stationRefData2, timetableRefData1, timetableRefData2, timetableRefData3, timetableRefData4,
	timetableRefData5, timetableRefData6, timetableRefData7, timetableRefData8, timetableRefData9, timetableRefData10,
	timetableRefData11, timetableRefData12, timetableRefData13, timetableRefData14, timetableRefData15, timetableRefData16,
	trainTypeRefData
]) {

var stationRefData = stationRefData1.concat(stationRefData2);
var timetableRefData = timetableRefData1.concat(
	timetableRefData2, timetableRefData3, timetableRefData4, timetableRefData5, timetableRefData6, timetableRefData7,
	timetableRefData8, timetableRefData9, timetableRefData10, timetableRefData11, timetableRefData12, timetableRefData13,
	timetableRefData14, timetableRefData15, timetableRefData16
);

var map = new mapboxgl.Map({
	container: 'map',
	style: 'data/osm-liberty.json',
	attributionControl: true,
	hash: true,
	center: [139.7670, 35.6814],
	zoom: 14,
	pitch: 60
});

stationLookup = buildLookup(stationRefData);

// Update station lookup dictionary
stationData.stations.forEach(function(station) {
	station.aliases.forEach(function(alias) {
		var stationRef = stationLookup[alias];
		merge(stationRef['odpt:stationTitle'], station['odpt:stationTitle']);
	});
});

railwayLookup = buildLookup(railwayRefData);

// Update railway lookup dictionary
railwayData.railways.forEach(function(railway) {
	var id = railway['odpt:railway'];
	var railwayRef = railwayLookup[id];
	var stationOrder = railwayRef['odpt:stationOrder'];

	if (id === 'odpt.Railway:JR-East.Tokaido') {
		stationOrder = stationOrder.slice(0, 7);
	} else if (id === 'odpt.Railway:JR-East.Utsunomiya') {
		stationOrder = stationOrder.slice(0, 13);
	} else if (id === 'odpt.Railway:JR-East.Takasaki') {
		stationOrder = stationOrder.slice(0, 13);
	} else if (id === 'odpt.Railway:JR-East.Yokosuka') {
		stationOrder = stationOrder.slice(0, 11);
	}
	railwayRef._stations = stationOrder.map(function(station) {
		return station['odpt:station'];
	});
	merge(railwayRef['odpt:railwayTitle'], railway['odpt:railwayTitle']);
	railwayRef._color = railway._color;
	railwayRef._altitude = railway._altitude;
});

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
	addObject: function(object, train) {
		var layer = train._altitude < 0 ? this.ug : this.og;
		object.material.opacity = getTrainOpacity(train);
		layer.scene.add(object);
	},
	removeObject: function(object, train) {
		var layer = train._altitude < 0 ? this.ug : this.og;
		layer.scene.remove(object);
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

railDirectionLookup = buildLookup(railDirectionRefData);

// Update rail direction lookup dictionary
trainData.railDirections.forEach(function(direction) {
	merge(railDirectionLookup[direction['odpt:railDirection']]['odpt:railDirectionTitle'], direction['odpt:railDirectionTitle']);
});

timetableLookup = buildLookup(timetableRefData);

timetableRefData.forEach(function(train) {
	var railway = railwayLookup[train['odpt:railway']];
	var direction = train['odpt:railDirection'] === railway['odpt:ascendingRailDirection'] ? 1 : -1;
	var table = train['odpt:trainTimetableObject'];
	var length = table.length;
	var nextTrainID = train['odpt:nextTrainTimetable'];
	var nextTrain, nextTable;

	if (nextTrainID) {
		nextTrain = timetableLookup[nextTrainID];
		if (nextTrain) {
			nextTable = nextTrain['odpt:trainTimetableObject'];
			table[length - 1]['odpt:departureTime'] = nextTable[0]['odpt:departureTime'];
		}
	}

	train._start = getTime(table[0]['odpt:departureTime']);
	train._end = getTime(table[length - 1]['odpt:departureTime']
		|| table[length - 1]['odpt:arrivalTime']
		|| table[Math.max(length - 2, 0)]['odpt:departureTime']);
	train._direction = direction;
	train._altitude = railway._altitude;
});

trainTypeLookup = buildLookup(trainTypeRefData);

// Update train type lookup dictionary
trainData.types.map(function(type) {
	merge(trainTypeLookup[type['odpt:trainType']]['odpt:trainTypeTitle'], type['odpt:trainTypeTitle']);
});

map.once('load', function () {
	document.getElementById('loader').style.display = 'none';
});

map.once('styledata', function () {
	map.getStyle().layers.forEach(function(layer) {
		if (layer.type === 'symbol') {
			map.setLayoutProperty(layer.id, 'visibility', 'none');
		}
	});

	[13, 14, 15, 16, 17, 18].forEach(function(zoom) {
		var minzoom = zoom <= 13 ? 0 : zoom;
		var maxzoom = zoom >= 18 ? 24 : zoom + 1;
		var lineWidthScale = zoom === 13 ? clamp(Math.pow(2, map.getZoom() - 12), .125, 1) : 1;

		map.addLayer(new MapboxLayer({
			id: 'railways-ug-' + zoom,
			type: GeoJsonLayer,
			data: filterFeatures(railwayFeatureCollection, function(p) {
				return p.zoom === zoom && p.type === 0 && p.altitude === -1;
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
				return p.zoom === zoom && p.type === 1 && p.altitude === -1;
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

	map.addControl(new MapboxGLButtonControl({
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

			var start = performance.now();
			function repeat() {
				var t = Math.min((performance.now() - start) / 300, 1);
				[13, 14, 15, 16, 17, 18].forEach(function(zoom) {
					var opacity = isUndergroundVisible ?
						1 * t + .0625 * (1 - t) : 1 * (1 - t) + .0625 * t;

					setLayerProps(map, 'railways-ug-' + zoom, {opacity: opacity});
					setLayerProps(map, 'stations-ug-' + zoom, {opacity: opacity});
				});
				Object.keys(trainLookup).forEach(function(key) {
					var train = trainLookup[key];
					var opacity = isUndergroundVisible === (train._altitude < 0) ?
						.9 * t + .225 * (1 - t) : .9 * (1 - t) + .225 * t;

					train._cube.material.opacity = opacity;
					if (train._delayMarker) {
						train._delayMarker.material.opacity = opacity;
					}
				});
				if (t < 1) {
					requestAnimationFrame(repeat);
				}
			}
			repeat();
		}
	}), 'top-right');

	map.addControl(new MapboxGLButtonControl({
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
			startViewAnimation();
			event.stopPropagation();
		}
	}), 'top-right');

	map.addControl(new MapboxGLButtonControl({
		className: 'mapbox-ctrl-realtime mapbox-ctrl-realtime-active',
		title: dict['exit-realtime'],
		eventHandler: function() {
			isRealtime = !isRealtime;
			this.title = dict[(isRealtime ? 'exit' : 'enter') + '-realtime'];
			Object.keys(trainLookup).forEach(function(key) {
				stopTrain(trainLookup[key]);
			});
			trackedTrain = undefined;
			stopViewAnimation();
			document.getElementsByClassName('mapbox-ctrl-track')[0].classList.remove('mapbox-ctrl-track-active');
			if (isRealtime) {
				this.classList.add('mapbox-ctrl-realtime-active');
				trainLastRefresh = undefined;
			} else {
				this.classList.remove('mapbox-ctrl-realtime-active');
				initModelTrains();
			}
		}
	}), 'top-right');

	map.addControl(new MapboxGLButtonControl({
		className: 'mapbox-ctrl-github',
		title: dict['github'],
		eventHandler: function() {
			window.open('https://github.com/nagix/mini-tokyo-3d');
		}
	}), 'top-right');

	var popup = new mapboxgl.Popup({
		closeButton: false,
		closeOnClick: false
	});

	map.on('mousemove', function(e) {
		var userData, offset;

		if (isRealtime) {
			markedTrain = trainLayers.pickObject(e.point);
			if (markedTrain) {
				map.getCanvas().style.cursor = 'pointer';
				userData = markedTrain.userData;
				offset = Math.sin(map.getPitch() * Math.PI / 180) * 25;
				popup.options.offset = userData.altitude < 0 ?
					{'top': [0, 10 + offset], 'bottom': [0, -30 + offset]} :
					{'top': [0, 10], 'bottom': [0, -30]}
				popup.setLngLat(userData.coord)
					.setHTML(userData.description)
					.addTo(map);
			} else if (popup.isOpen()) {
				map.getCanvas().style.cursor = '';
				popup.remove();
			}
		}
	});

	map.on('click', function(e) {
		trackedTrain = trainLayers.pickObject(e.point);
		if (trackedTrain) {
			startViewAnimation();
			document.getElementsByClassName('mapbox-ctrl-track')[0]
				.classList.add('mapbox-ctrl-track-active');
		} else {
			stopViewAnimation();
			document.getElementsByClassName('mapbox-ctrl-track')[0]
				.classList.remove('mapbox-ctrl-track-active');
		}

		/* For development
		console.log(e.lngLat);
		*/
	});

	map.on('zoom', function() {
		var lineWidthScale = clamp(Math.pow(2, map.getZoom() - 12), .125, 1);

		setLayerProps(map, 'railways-ug-13', {lineWidthScale: lineWidthScale});
		setLayerProps(map, 'stations-ug-13', {lineWidthScale: lineWidthScale});

		Object.keys(trainLookup).forEach(function(key) {
			updateTrainShape(trainLookup[key], {reset: true});
		});
	});

	map.on('resize', function(e) {
		trainLayers.onResize(e);
	});

	function updateTrainShape(train, options) {
		var zoom = map.getZoom();
		var offset = train._offset;
		var layerZoom = clamp(Math.floor(zoom), 13, 18);
		var feature = train._railwayFeature;
		var cube = train._cube;
		var position = cube.position;
		var scale = cube.scale;
		var userData = cube.userData;
		var delayMarker = train._delayMarker;
		var stationOffsets, sectionIndex, p, s, coord, bearing, mCoord;

		if (options.t !== undefined) {
			train._t = options.t;
		}

		if (options.reset) {
			feature = train._railwayFeature = featureLookup[train['odpt:railway'] + '.' + layerZoom];
			stationOffsets = feature.properties['station-offsets'];
			sectionIndex = train._sectionIndex;
			offset = train._offset = stationOffsets[sectionIndex];
			train._interval = stationOffsets[sectionIndex + train._sectionLength] - offset;
		}

		p = getCoordAndBearing(feature, offset + train._t * train._interval);
		s = Math.pow(2, 14 - clamp(zoom, 13, 19)) * modelScale * 100;

		coord = userData.coord = p.coord;
		bearing = userData.bearing = p.bearing + (train._direction < 0 ? 180 : 0);
		mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord);

		position.x = mCoord.x - modelOrigin.x;
		position.y = -(mCoord.y - modelOrigin.y);
		position.z = (train._altitude || 0) * Math.pow(2, 14 - layerZoom) * modelScale * 100 + s / 2;
		scale.x = scale.y = scale.z = s;
		cube.rotation.z = -bearing * Math.PI / 180;

		if (train._delay) {
			if (!delayMarker) {
				delayMarker = train._delayMarker = createDelayMarker();
				trainLayers.addObject(delayMarker, train);
			}

			merge(delayMarker.position, position);
			merge(delayMarker.scale, scale);
		} else if (delayMarker) {
			trainLayers.removeObject(delayMarker, train);
			delete train._delayMarker;
		}
	}

	function initModelTrains() {
		trainData.trains.forEach(function(train, i) {
			var railway = railwayLookup[train['odpt:railway']];
			var cube = train._cube = createCube(railway._color);
			trainLayers.addObject(cube, train);

			train['odpt:train'] = i;
			trainLookup[train['odpt:train']] = train;

			train._sectionLength = train._direction;
			updateTrainShape(train, {t: 0, reset: true});

			function repeat() {
				train._stop = animate(function(t) {
					updateTrainShape(train, {t: t});
				}, function() {
					var direction = train._direction;
					var sectionIndex = train._sectionIndex = train._sectionIndex + direction;

					if (sectionIndex <= 0 || sectionIndex >= railway._stations.length - 1) {
						train._direction = train._sectionLength = -direction;
					}
					updateTrainShape(train, {t: 0, reset: true});

					// Stop and go
					train._stop = delay(repeat, 1000);
				}, Math.abs(train._interval), TIME_FACTOR);
			}
			repeat();
		});
	}
	if (!isRealtime) {
		initModelTrains();
	}

	function refresh(timestamp) {
		var userData, bearing;

		if (isRealtime) {
			refreshTrains(timestamp);
			if (markedTrain) {
				userData = markedTrain.userData;
				popup.setLngLat(userData.coord).setHTML(userData.description);
			}
		}
		if (trackedTrain && !viewAnimationID) {
			userData = trackedTrain.userData;
			bearing = map.getBearing();
			map.easeTo({
				center: userData.coord,
				bearing: trackingMode === 'helicopter' ?
					(trackingBaseBearing + timestamp / 100) % 360 :
					bearing + ((userData.bearing - bearing + 540) % 360 - 180) * .02,
				duration: 0
			});
		}
		requestAnimationFrame(refresh);
	}
	refresh(0);

	function refreshTrains() {
		var now = Date.now();

		if (Math.floor(now / TRAIN_REFRESH_INTERVAL) !== Math.floor(trainLastRefresh / TRAIN_REFRESH_INTERVAL)) {
			trainLastRefresh = now;
			timetableRefData.forEach(function(train) {
				var d = train._delay || 0;
				if (train._start + d <= now && now <= train._end + d && !trainLookup[train['odpt:train']]) {
					if (!setSectionData(train, now)) {
						return; // Out of range
					}
					startTrain(train);

					function repeat(elapsed) {
						setTrainStandingStatus(train, false);
						train._stop = animate(function(t) {
							updateTrainShape(train, {t: t});
						}, function() {
							var nextTrainID, isMarked, isTracked;

							train._timetableIndex++;
							if (!setSectionData(train)) {
								isMarked = markedTrain === train._cube;
								isTracked = trackedTrain === train._cube;
								stopTrain(train);

								nextTrainID = train['odpt:nextTrainTimetable'];
								if (nextTrainID) {
									train = timetableLookup[nextTrainID];
									if (train && !trainLookup[train['odpt:train']]) {
										train._timetableIndex = 0;
										if (!setSectionData(train)) {
											return;
										}
										startTrain(train);
										if (isMarked) {
											markedTrain = train._cube;
										}
										if (isTracked) {
											trackedTrain = train._cube;
										}
										setTrainStandingStatus(train, true);
										train._stop = delay(repeat, Math.max((getTime(train._departureTime) + (train._delay || 0)) - Date.now(), MIN_STOP_DURATION));
									}
								}
							} else {
								updateTrainShape(train, {t: 0, reset: true});
								setTrainStandingStatus(train, true);

								// Stop at station
								train._stop = delay(repeat, Math.max((getTime(train._departureTime) + (train._delay || 0)) - Date.now(), MIN_STOP_DURATION));
							}
						}, Math.abs(train._interval), 1, elapsed);
					}
					repeat(now - (getTime(train._departureTime) + d));
				}
			});
			updateDelays();
		}
	}

	function startViewAnimation() {
		var t2 = 0;
		var start;
		var frameRefresh = function() {
			var now = performance.now();
			var t, t1, factor, userData, coord, lng, lat, center, bearing;

			start = start || now;
			t = Math.min((now - start) / 1000, 1);
			t1 = -((t - 1) * (t - 1) * (t - 1) * (t - 1) - 1);

			factor = (1 - t1) / (1 - t2);
			userData = trackedTrain.userData;
			coord = userData.coord;
			lng = coord[0];
			lat = coord[1];
			center = map.getCenter();
			bearing = userData.bearing;

			map.easeTo({
				center: [lng - (lng - center.lng) * factor, lat - (lat - center.lat) * factor],
				bearing: trackingMode === 'helicopter' ?
					(trackingBaseBearing + now / 100) % 360 :
					bearing - ((bearing - map.getBearing() + 540) % 360 - 180) * factor,
				duration: 0
			});
			t2 = t1;

			if (t < 1) {
				viewAnimationID = requestAnimationFrame(frameRefresh);
			} else {
				viewAnimationID = undefined;
			}
		};

		trackingBaseBearing = map.getBearing() - performance.now() / 100;
		viewAnimationID = requestAnimationFrame(frameRefresh);
	}

	function stopViewAnimation() {
		cancelAnimationFrame(viewAnimationID);
		viewAnimationID = undefined;
	}

	function getLocalizedRailwayTitle(railway) {
		title = (railwayLookup[railway] || {})['odpt:railwayTitle'] || {};
		return title[lang] || title['en'];
	}

	function getLocalizedRailDirectionTitle(direction) {
		title = (railDirectionLookup[direction] || {})['odpt:railDirectionTitle'] || {};
		return title[lang] || title['en'];
	}

	function getLocalizedTrainTypeTitle(type) {
		title = (trainTypeLookup[type] || {})['odpt:trainTypeTitle'] || {};
		return title[lang] || title['en'];
	}

	function getLocalizedStationTitle(station) {
		station = Array.isArray(station) ? station[0] : station;
		title = (stationLookup[station] || {})['odpt:stationTitle'] || {};
		return title[lang] || title['en'];
	}

	function setTrainStandingStatus(train, standing) {
		var railwayID = train['odpt:railway'];
		var destination = train['odpt:destinationStation'];
		var delay = train._delay || 0;

		train._standing = standing;
		train._cube.userData.description =
			'<span class="desc-box" style="background-color: ' + railwayLookup[railwayID]._color + ';"></span> ' +
			'<strong>' + getLocalizedRailwayTitle(railwayID) + '</strong>' +
			'<br>' + getLocalizedTrainTypeTitle(train['odpt:trainType']) + ' ' +
			(destination ? dict['to'].replace('$1', getLocalizedStationTitle(destination)) : getLocalizedRailDirectionTitle(train['odpt:railDirection'])) +
			'<br><strong>' + dict['train-number'] + ':</strong> ' +
			train['odpt:trainNumber'] +
			'<br>' + (delay >= 60000 ? '<span class="desc-delay">' : '') +
			'<strong>' + dict[train._standing ? 'standing-at' : 'previous-stop'] + ':</strong> ' +
			getLocalizedStationTitle(train._departureStation) +
			' ' + getTimeString(getTime(train._departureTime) + delay) +
			'<br><strong>' + dict['next-stop'] + ':</strong> ' +
			getLocalizedStationTitle(train._arrivalStation) +
			' ' + getTimeString(getTime(train._arrivalTime) + delay) +
			(delay >= 60000 ? '<br>' + dict['delay'].replace('$1', Math.floor(delay / 60000)) + '</span>' : '');
	}

	function startTrain(train) {
		var railway = railwayLookup[train['odpt:railway']];
		var cube = train._cube = createCube(railway._color);

		trainLayers.addObject(cube, train);
		trainLookup[train['odpt:train']] = train;
		updateTrainShape(train, {t: 0, reset: true});
		cube.userData.altitude = train._altitude;
	}

	function stopTrain(train) {
		train._stop();
		trainLayers.removeObject(train._cube, train);
		delete train._cube;
		delete train._stop;
		delete trainLookup[train['odpt:train']];
		if (train._delayMarker) {
			trainLayers.removeObject(train._delayMarker, train);
			delete train._delayMarker;
			delete train._delay;
		}
	}

	function updateDelays() {
		loadJSON(API_URL + 'odpt:Train?odpt:operator=odpt.Operator:JR-East,odpt.Operator:TWR,odpt.Operator:TokyoMetro,odpt.Operator:Toei&' + API_TOKEN).then(function(trainRefData) {
			trainRefData.forEach(function(trainRef) {
				var delay = (trainRef['odpt:delay'] || 0) * 1000;
				var train = trainLookup[trainRef['owl:sameAs']];

				if (delay && train && train._delay !== delay) {
					stopTrain(train);
					train._delay = delay;
					trainLastRefresh = undefined;
				}
			});
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

function getCoordAndBearing(line, distance) {
	var coords = turf.getCoords(line);
	var distances = line.properties.distances;
	var length = coords.length;
	var index, coord, overshot, bearing;

	if (distance >= distances[length - 1]) {
		return {
			coord: coords[length - 1],
			bearing: turf.bearing(coords[length - 2], coords[length - 1])
		};
	}

	function findPoint(start, end) {
		var center;
		if (start === end - 1) {
			return start;
		}
		center = Math.floor((start + end) / 2);
		if (distance < distances[center]) {
			return findPoint(start, center);
		} else {
			return findPoint(center, end);
		}
	}

	index = findPoint(0, length - 1);
	coord = coords[index];
	overshot = distance - distances[index];
	bearing = turf.bearing(coord, coords[index + 1]);
	return {
		coord: overshot === 0 ? coord : turf.getCoord(turf.destination(coord, overshot, bearing)),
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

function animate(callback, endCallback, distance, timeFactor, elapsed) {
	var maxSpeed = MAX_SPEED * timeFactor;
	var acceleration = ACCELERATION * Math.pow(timeFactor, 2);
	var accelerationTime = ACCELERATION_TIME / timeFactor;
	var duration = distance < ACC_DISTANCE * 2 ?
		Math.sqrt(distance / acceleration) * 2 :
		accelerationTime * 2 + (distance - ACC_DISTANCE * 2) / maxSpeed;
	var start, requestID;
	var frameRefresh = function() {
		var now = performance.now();
		var t, u;

		start = start || now;
		t = Math.min((now - start), duration);
		if (t <= Math.min(accelerationTime, duration / 2)) {
			u = acceleration / 2 * Math.pow(t, 2) / distance;
		} else if (duration - t <= Math.min(accelerationTime, duration / 2)) {
			u = 1 - acceleration / 2 * Math.pow(duration - t, 2) / distance;
		} else {
			u = ACC_DISTANCE / distance + (1 - ACC_DISTANCE / distance * 2) / (duration - accelerationTime * 2) * (t - accelerationTime);
		}
		if (callback) {
			callback(u);
		}
		if (t < duration) {
			requestID = requestAnimationFrame(frameRefresh);
		} else if (endCallback) {
			endCallback();
		}
	};
	if (elapsed > 0) {
		start = performance.now() - elapsed;
	}
	requestID = requestAnimationFrame(frameRefresh);
	return function() {
		cancelAnimationFrame(requestID);
	};
}

function delay(callback, duration) {
	var start, requestID;
	var frameRefresh = function() {
		var now = performance.now();

		start = start || now;
		if (now - start < duration) {
			requestID = requestAnimationFrame(frameRefresh);
		} else if (callback) {
			callback();
		}
	};
	requestID = requestAnimationFrame(frameRefresh);
	return function() {
		cancelAnimationFrame(requestID);
	};
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

function loadJSON(url) {
	return new Promise(function(resolve, reject) {
		var request = new XMLHttpRequest();

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

	key = key || 'owl:sameAs';
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
	return date.setHours(hours, +timeStrings[1] - tzDiff, 0, 0);
}

function getTimeString(time) {
	var date = new Date(time);
	var tzDiff = date.getTimezoneOffset() + 540; // Difference between local time to JST

	// Adjust local time to JST (UTC+9)
	date.setMinutes(date.getMinutes() + tzDiff);

	return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
}

function createCube(color) {
	var geometry = new THREE.BoxBufferGeometry(.88, 1.76, .88);
	var material = new THREE.MeshLambertMaterial({
		color: parseInt(color.replace('#', ''), 16),
		transparent: true
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
	return isUndergroundVisible === (train._altitude < 0) ? .9 : .225;
}

function setSectionData(train, now) {
	var table = train['odpt:trainTimetableObject'];
	var delay = train._delay || 0;
	var index = now ?
		table.reduce(function(acc, cur, i) {
			return getTime(cur['odpt:departureTime']) + delay <= now ? i : acc;
		}, 0) :
		train._timetableIndex;
	var current = table[index];
	var next = table[index + 1];
	var stations = railwayLookup[train['odpt:railway']]._stations;
	var departureStation = current['odpt:departureStation'];
	var arrivalStation = next && (next['odpt:arrivalStation'] || next['odpt:departureStation']);
	var currentSection, nextSection;

	if (train._direction > 0) {
		currentSection = stations.indexOf(departureStation);
		nextSection = stations.indexOf(arrivalStation, currentSection);
	} else {
		currentSection = stations.lastIndexOf(departureStation);
		nextSection = stations.lastIndexOf(arrivalStation, currentSection);
	}

	if (currentSection >= 0 && nextSection >= 0) {
		train._timetableIndex = index;
		train._sectionIndex = currentSection;
		train._sectionLength = nextSection - currentSection;
		train._departureStation = departureStation;
		train._departureTime = current['odpt:departureTime'];
		train._arrivalStation = arrivalStation;
		train._arrivalTime = next['odpt:arrivalTime'] || next['odpt:departureTime'];

		return true;
	}
}

function getLang() {
	var match = location.search.match(/lang=(.*?)(&|$)/);
	var lang = match ? decodeURIComponent(match[1]).substring(0, 2) : '';

	if (lang.match(/ja|en|ko|zh/)) {
		return lang;
	}

	lang = (window.navigator.languages && window.navigator.languages[0]) ||
		window.navigator.language ||
		window.navigator.userLanguage ||
		window.navigator.browserLanguage || '';
	lang = lang.substring(0, 2);

	return lang.match(/ja|en|ko|zh/) ? lang : 'en';
}
