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
var trainLookup = {};
var stationLookup, railwayLookup, lineLookup, railDirectionLookup, trainTypeLookup;
var trackedTrain, markedTrain, trainLastRefresh;

// Replace MapboxLayer.render to support underground rendering
var render = deck.MapboxLayer.prototype.render;
deck.MapboxLayer.prototype.render = function(gl, matrix) {
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
	var halfHeight = Math.tan(halfFov);
	var halfWidth = halfHeight * transform.width / transform.height;
	var cameraToCenterDistance = transform.cameraToCenterDistance;
	var angle = Math.PI / 2 - transform._pitch;
	var topHalfSurfaceDistance = Math.sin(halfFov) * cameraToCenterDistance / Math.sin(angle - halfFov);
	var furthestDistance = Math.cos(angle) * topHalfSurfaceDistance + cameraToCenterDistance;

	var m = new THREE.Matrix4().fromArray(matrix);
	var l = new THREE.Matrix4()
		.makeTranslation(modelOrigin.x, modelOrigin.y, 0)
		.scale(new THREE.Vector3(1, -1, 1));

	var projectionMatrixI = new THREE.Matrix4();

	camera.projectionMatrix = new THREE.Matrix4().makePerspective(
		-halfWidth, halfWidth, halfHeight, -halfHeight, 1, furthestDistance * 1.01);
	projectionMatrixI.getInverse(camera.projectionMatrix);
	camera.matrix.getInverse(projectionMatrixI.multiply(m).multiply(l));
	camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

	if (id.indexOf('-ug', id.length - 3) !== -1 && isUndergroundVisible) {
		// Recalculate the projection matrix to replace the far plane
		camera.projectionMatrix = new THREE.Matrix4().makePerspective(
			-halfWidth, halfWidth, halfHeight, -halfHeight, 1, furthestDistance * 2.5);
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
		if (intersects[i].object.userData.lngLat) {
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
	loadJSON(API_URL + 'odpt:Railway?odpt:operator=odpt.Operator:JR-East,odpt.Operator:TokyoMetro&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:RailDirection?' + API_TOKEN),
	loadJSON(API_URL + 'odpt:Station?odpt:operator=odpt.Operator:JR-East&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:Station?odpt:operator=odpt.Operator:TokyoMetro&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.Yamanote&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.ChuoSobuLocal&odpt:calendar=odpt.Calendar:Weekday&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.ChuoRapid&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.KeihinTohokuNegishi&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:TokyoMetro.Ginza&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainType?odpt:operator=odpt.Operator:JR-East,odpt.Operator:TokyoMetro&' + API_TOKEN)
]).then(function([
	dict, railwayData, stationData, trainData, railwayRefData, railDirectionRefData, stationRefData1, stationRefData2,
	timetableRefData1, timetableRefData2, timetableRefData3, timetableRefData4, timetableRefData5, trainTypeRefData
]) {

var stationRefData = stationRefData1.concat(stationRefData2);
var timetableRefData = timetableRefData1.concat(timetableRefData2, timetableRefData3, timetableRefData4, timetableRefData5);

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
lineLookup = buildLookup(railwayData.railways);

railwayData.railways.forEach(function(railway) {
	var id = railway['owl:sameAs'];
	var railwayRef = railwayLookup[id];
	var stationOrder = railwayRef['odpt:stationOrder'];

	if (id === 'odpt.Railway:JR-East.ChuoRapid') {
		stationOrder = stationOrder.slice(0, 12);
	}
	railway.stations = stationOrder.map(function(station) {
		return station['odpt:station'];
	});
	merge(railwayRef['odpt:railwayTitle'], railway['odpt:railwayTitle']);
});

function generateRailwayLayers() {
	return [13, 14, 15, 16, 17, 18].map(function(zoom) {
		var railwaysUnderground = [];
		var railwaysOverground = [];
		railwayData.railways.forEach(function(line) {
			var railwayFeatures = line.features = line.features || {};
			var sublines = line.sublines;

			var railwayFeature = railwayFeatures[zoom] = turf.lineString(concat(sublines.map(function(subline) {
				var overlap = lineLookup[subline['odpt:railway']];
				var start, end, startStationRef, endStationRef, stations;

				if (overlap) {
					start = subline.start;
					end = subline.end;
					startStationRef = stationLookup[start];
					endStationRef = stationLookup[end];
					subline.feature = lineOffset(turf.lineSlice(
						[startStationRef['geo:long'], startStationRef['geo:lat']],
						[endStationRef['geo:long'], endStationRef['geo:lat']],
						overlap.features[zoom]
					), subline.offset * Math.pow(2, 14 - zoom) * .125);
					stations = overlap.stations;

					// Rewind if the overlap line is in opposite direction
					if (stations.indexOf(start) > stations.indexOf(end)) {
						turf.rewind(subline.feature, {mutate: true});
					}
				}

				return subline;
			}).map(function(subline, i) {
				var coordinates, nextSubline;

				function smoothCoords(reverse) {
					var start = !reverse ? 0 : coordinates.length - 1;
					var end = !reverse ? coordinates.length - 1 : 0;
					var step = !reverse ? 1 : -1;
					var feature = lineLookup[nextSubline['odpt:railway']].features[zoom];
					var offset = Math.abs(nextSubline.offset * Math.pow(2, 14 - zoom) * .1);
					var baseDistance = turf.nearestPointOnLine(feature, coordinates[start]).properties.dist;
					var j, p1, p2, distance, bearing, lineBearing, shift, angle;

					for (j = start; j !== end; j += step) {
						p1 = turf.point(coordinates[j]);
						p2 = turf.nearestPointOnLine(feature, p1);
						distance = p2.properties.dist;
						if (distance >= offset * 4) {
							break;
						}
						if (distance < baseDistance) {
							baseDistance = distance;
						}
						bearing = turf.bearing(p2, p1);
						lineBearing = turf.bearing(
							turf.getCoords(feature)[p2.properties.index],
							turf.getCoords(feature)[p2.properties.index + 1]
						);
						shift = (offset * 4 - distance) / (offset * 4 - baseDistance) * (offset - baseDistance);
						angle = (bearing - lineBearing + 540) % 360 - 180;
						coordinates[j] = turf.getCoord(turf.transformTranslate(
							p1,
							Math.abs(shift),
							bearing + (nextSubline.offset * angle * shift < 0 ? 180 : 0)
						));
					}
				}

				if (subline.coordinates) {
					coordinates = subline.coordinates.map(function(d) { return d.slice(); });
					nextSubline = sublines[i - 1];
					if (nextSubline && nextSubline['odpt:railway']) {
						smoothCoords();
					}
					nextSubline = sublines[i + 1];
					if (nextSubline && nextSubline['odpt:railway']) {
						smoothCoords(true);
					}
					subline.feature = turf.lineString(coordinates);
				}

				return turf.getCoords(subline.feature);
			})), {color: line.color, width: 8});

			// Set station offsets
			var stationOffsets = line.stationOffsets = line.stationOffsets || {};
			stationOffsets[zoom] = line.stations.map(function(station) {
				var stationRef = stationLookup[station];
				var point = turf.nearestPointOnLine(railwayFeature, [stationRef['geo:long'], stationRef['geo:lat']]);
				return point.properties.location;
			});

			if (line.altitude < 0) {
				setAltitude(railwayFeature, -Math.pow(2, 14 - zoom) * 100);
				railwaysUnderground.push(railwayFeature);
			} else {
				railwaysOverground.push(railwayFeature);
			}
		});

		var stationsUnderground = [];
		var stationsOverground = [];
		stationData.stations.forEach(function(station) {
			var stationRef = stationLookup[station.aliases[0]];
			var line = lineLookup[stationRef['odpt:railway']];
			var point = turf.nearestPointOnLine(line.features[zoom], [stationRef['geo:long'], stationRef['geo:lat']]);
			var bearing = getPointAndBearing(line.features[zoom], point.properties.location, 1).bearing;
			var span = station.span;
			var size = Math.pow(2, 14 - zoom) * .1;
			var feature = turf.transformRotate(turf.buffer(span ? turf.lineString([
				turf.getCoord(turf.transformTranslate(point, span[0] * size, 90)),
				turf.getCoord(turf.transformTranslate(point, span[1] * size, 90))
			]) : point, size), bearing, {pivot: turf.getCoord(point), mutate: true});

			feature.properties = {outlineColor: '#000000', width: 4, color: '#FFFFFF'};

			if (station.coords[2] < 0) {
				setAltitude(feature, -Math.pow(2, 14 - zoom) * 100);
				stationsUnderground.push(feature);
			} else {
				stationsOverground.push(feature);
			}
		});

		return {
			zoom: zoom,
			minzoom: zoom <= 13 ? 0 : zoom,
			maxzoom: zoom >= 18 ? 24 : zoom + 1,
			railwaysUnderground: turf.featureCollection(railwaysUnderground),
			railwaysOverground: turf.featureCollection(railwaysOverground),
			stationsUnderground: turf.featureCollection(stationsUnderground),
			stationsOverground: turf.featureCollection(stationsOverground)
		};
	});
}

var railwayLayers = generateRailwayLayers();

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
		return this.og.pickObject(point) || this.ug.pickObject(point);
	},
	onResize: function(event) {
		this.ug.onResize(event);
		this.og.onResize(event);
	}
};

var markerCollection = turf.featureCollection([]);

if (location.search.match(/edit/)) {
	railwayData.railways.forEach(function(line, i) {
		line.sublines.forEach(function(subline, j) {
			(subline.coordinates || []).forEach(function(coord, k) {
				markerCollection.features.push(turf.point(coord, {
					lineID: line['owl:sameAs'],
					line: i,
					subline: j,
					index: k
				}, {
					id: (i * 1000 + j) * 1000 + k
				}));
			});
		});
	});
}

railDirectionLookup = buildLookup(railDirectionRefData);

// Update rail direction lookup dictionary
trainData.railDirections.forEach(function(direction) {
	merge(railDirectionLookup[direction['odpt:railDirection']]['odpt:railDirectionTitle'], direction['odpt:railDirectionTitle']);
});

timetableRefData.forEach(function(train) {
	var line = lineLookup[train['odpt:railway']];
	var railway = railwayLookup[train['odpt:railway']];
	var direction = train['odpt:railDirection'] === railway['odpt:ascendingRailDirection'] ? 1 : -1;
	var table = train['odpt:trainTimetableObject'];

	train._start = getTime(table[0]['odpt:departureTime']);
	train._end = getTime(table[table.length - 1]['odpt:arrivalTime']
		|| table[table.length - 1]['odpt:departureTime']
		|| table[Math.max(table.length - 2, 0)]['odpt:departureTime']);
	train._direction = direction;
	train._altitude = line.altitude;
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

	railwayLayers.forEach(function(layer) {
		map.addLayer(new deck.MapboxLayer({
			id: 'railways-ug-' + layer.zoom,
			type: deck.GeoJsonLayer,
			data: layer.railwaysUnderground,
			filled: false,
			stroked: true,
			getLineWidth: function(d) {
				return d.properties.width;
			},
			getLineColor: function(d) {
				return colorToRGBArray(d.properties.color);
			},
			lineWidthUnits: 'pixels',
			lineJointRounded: true,
			opacity: .0625
		}), 'building-3d');
		map.setLayerZoomRange('railways-ug-' + layer.zoom, layer.minzoom, layer.maxzoom);
		map.addLayer(new deck.MapboxLayer({
			id: 'stations-ug-' + layer.zoom,
			type: deck.GeoJsonLayer,
			data: layer.stationsUnderground,
			filled: true,
			stroked: true,
			getLineWidth: 4,
			getLineColor: [0, 0, 0],
			lineWidthUnits: 'pixels',
			getFillColor: [255, 255, 255, 179],
			opacity: .0625
		}), 'building-3d');
		map.setLayerZoomRange('stations-ug-' + layer.zoom, layer.minzoom, layer.maxzoom);
	});

	map.addLayer(trainLayers.ug, 'building-3d');

	railwayLayers.forEach(function(layer) {
		map.addLayer({
			id: 'railways-og-' + layer.zoom,
			type: 'line',
			source: {
				type: 'geojson',
				data: layer.railwaysOverground
			},
			paint: {
				'line-color': ['get', 'color'],
				'line-width': ['get', 'width']
			},
			minzoom: layer.minzoom,
			maxzoom: layer.maxzoom
		}, 'building-3d');
		map.addLayer({
			id: 'stations-og-' + layer.zoom,
			type: 'fill',
			source: {
				type: 'geojson',
				data: layer.stationsOverground
			},
			paint: {
				'fill-color': ['get', 'color'],
				'fill-opacity': .7
			},
			minzoom: layer.minzoom,
			maxzoom: layer.maxzoom
		}, 'building-3d');
		map.addLayer({
			id: 'stations-outline-og-' + layer.zoom,
			type: 'line',
			source: {
				type: 'geojson',
				data: layer.stationsOverground
			},
			paint: {
				'line-color': ['get', 'outlineColor'],
				'line-width': ['get', 'width']
			},
			minzoom: layer.minzoom,
			maxzoom: layer.maxzoom
		}, 'building-3d');
	});

	if (location.search.match(/edit/)) {
		map.addLayer({
			id: 'markers',
			type: 'circle',
			source: {
				type: 'geojson',
				data: markerCollection
			},
			paint: {
				'circle-radius': 5,
				'circle-color': ["case",
					["boolean", ["feature-state", "hover"], false],
					'#FF0000',
					'#000000'
				]
			}
		}, 'building-3d');
	}

	map.addLayer(trainLayers.og, 'building-3d');

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
			this.title = dict[(isRealtime ? 'exit' : 'enter') + '-underground'];
			if (isUndergroundVisible) {
				this.classList.add('mapbox-ctrl-underground-visible');
				map.setPaintProperty('background', 'background-color', 'rgb(16,16,16)');
				map.getStyle().layers.forEach(function(layer) {
					var id = layer.id;
					var type = layer.type;
					if (id.indexOf('-og') !== -1) {
						var opacity = opacityStore[id] = map.getPaintProperty(id, type + '-opacity') || 1;
						map.setPaintProperty(id, type + '-opacity', opacity * .25);
					} else if (type === 'line' || type === 'fill' || type === 'fill-extrusion') {
						var opacity = opacityStore[id] = map.getPaintProperty(id, type + '-opacity') || 1;
						map.setPaintProperty(id, type + '-opacity', opacity * .0625);
					}
				});
				railwayLayers.forEach(function(layer) {
					map.getLayer('railways-ug-' + layer.zoom).implementation.setProps({opacity: 1});
					map.getLayer('stations-ug-' + layer.zoom).implementation.setProps({opacity: 1});
				});
			} else {
				this.classList.remove('mapbox-ctrl-underground-visible');
				map.setPaintProperty('background', 'background-color', 'rgb(239,239,239)');
				map.getStyle().layers.forEach(function(layer) {
					var id = layer.id;
					var type = layer.type;
					if (id.indexOf('-og') !== -1 || type === 'line' || type === 'fill' || type === 'fill-extrusion') {
						map.setPaintProperty(id, type + '-opacity', opacityStore[id]);
					}
				});
				railwayLayers.forEach(function(layer) {
					map.getLayer('railways-ug-' + layer.zoom).implementation.setProps({opacity: .0625});
					map.getLayer('stations-ug-' + layer.zoom).implementation.setProps({opacity: .0625});
				});
			}
			Object.keys(trainLookup).forEach(function(key) {
				var train = trainLookup[key];
				var opacity = getTrainOpacity(train);

				train._cube.material.opacity = opacity;
				if (train._delayMarker) {
					train._delayMarker.material.opacity = opacity;
				}
			});
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
			event.stopPropagation();
		}
	}), 'top-right');

	map.addControl(new MapboxGLButtonControl({
		className: 'mapbox-ctrl-realtime mapbox-ctrl-realtime-active',
		title: dict['enter-realtime'],
		eventHandler: function() {
			isRealtime = !isRealtime;
			this.title = dict[(isRealtime ? 'exit' : 'enter') + '-realtime'];
			Object.keys(trainLookup).forEach(function(key) {
				stopTrain(trainLookup[key]);
			});
			trackedTrain = undefined;
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
				popup.setLngLat(userData.lngLat)
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
			document.getElementsByClassName('mapbox-ctrl-track')[0]
				.classList.add('mapbox-ctrl-track-active');
		} else {
			document.getElementsByClassName('mapbox-ctrl-track')[0]
				.classList.remove('mapbox-ctrl-track-active');
		}
	});

	var hoveredMarkerId;
	map.on('mouseenter', 'markers', function(e) {
		map.getCanvas().style.cursor = 'pointer';
		hoveredMarkerId = e.features[0].id;
		map.setFeatureState({source: 'markers', id: hoveredMarkerId}, {hover: true});
	});

	map.on('mousedown', 'markers', function(e) {
		var properties = e.features[0].properties;
		var coordinates = railwayData.railways[properties.line].sublines[properties.subline].coordinates;
		function onMove(e) {
			var lngLat = e.lngLat;
			var coord = turf.featureReduce(markerCollection, function(pre, cur) {
				return cur.id === hoveredMarkerId ? turf.getCoord(cur) : pre;
			});
			coord[0] = +lngLat.lng.toFixed(4);
			coord[1] = +lngLat.lat.toFixed(4);
			map.getSource('markers').setData(markerCollection);
		}
		e.preventDefault();
		if (e.originalEvent.shiftKey || e.originalEvent.ctrlKey) {
			var features = markerCollection.features;
			var index = turf.featureReduce(markerCollection, function(pre, cur, i) {
				return cur.id === hoveredMarkerId ? i : pre;
			});
			if (e.originalEvent.shiftKey) {
				var lngLat = e.lngLat;
				var coord = [+lngLat.lng.toFixed(4) + .0003, +lngLat.lat.toFixed(4) + .0003];
				var point = turf.clone(e.features[0]);
				turf.getGeom(point).coordinates = coord;
				coordinates.splice(properties.index, 0, coord);
				features.splice(index, 0, point);
			} else {
				coordinates.splice(properties.index, 1);
				features.splice(index, 1);
			}
			index = 0;
			turf.featureEach(markerCollection, function(feature) {
				if (feature.properties.line === properties.line && feature.properties.subline === properties.subline) {
					feature.properties.index = index;
					feature.id = (properties.line * 1000 + properties.subline) * 1000 + index;
					index++;
				}
			});
			map.getSource('markers').setData(markerCollection);
		} else {
			map.on('mousemove', onMove);
		}
		map.once('mouseup', function(e) {
			console.log(coordinates.map(function(coord) {
				return '\t\t\t\t[' + coord[0].toFixed(4) + ', ' + coord[1].toFixed(4) + '],';
			}).join('\n'));
			if (!e.originalEvent.shiftKey) {
				generateRailwayLayers().forEach(function(layer) {
					map.getSource('railways-og-' + layer.zoom).setData(layer.railwaysOverground);
				});
			}
			map.off('mousemove', onMove);
		});
	});

	map.on('mouseleave', 'markers', function(e) {
		map.getCanvas().style.cursor = '';
		map.setFeatureState({source: 'markers', id: hoveredMarkerId}, {hover: false});
	});

	map.on('zoom', function() {
		Object.keys(trainLookup).forEach(function(key) {
			updateTrainShape(trainLookup[key], {reset: true});
		});
	});

	map.on('resize', function(e) {
		trainLayers.onResize(e);
	});

	function updateTrainShape(train, options) {
		var zoom = map.getZoom();
		var line = lineLookup[train['odpt:railway']];
		var offset = train._offset;
		var direction = train._direction;
		var sectionIndex = train._sectionIndex;
		var layerZoom = Math.min(Math.max(Math.floor(zoom), 13), 18);
		var stationOffsets, p, s, lngLat, bearing, coord, cube, position, scale;

		if (options.t !== undefined) {
			train._t = options.t;
		}

		if (options.reset) {
			stationOffsets = line.stationOffsets[layerZoom];
			offset = train._offset = stationOffsets[sectionIndex];
			train._interval = stationOffsets[sectionIndex + train._sectionLength] - offset;
			train._lineFeature = line.features[layerZoom];
		}

		p = getPointAndBearing(train._lineFeature, offset + train._t * train._interval, direction);
		s = Math.pow(2, 14 - Math.min(Math.max(zoom, 13), 19)) * modelScale * 100;

		cube = train._cube;
		lngLat = cube.userData.lngLat = turf.getCoord(p.point);
		bearing = cube.userData.bearing = p.bearing;
		coord = mapboxgl.MercatorCoordinate.fromLngLat(lngLat);
		position = cube.position;
		scale = cube.scale;

		position.x = coord.x - modelOrigin.x;
		position.y = -(coord.y - modelOrigin.y);
		position.z = (train._altitude || 0) * Math.pow(2, 14 - layerZoom) * modelScale * 100 + s / 2;
		scale.x = scale.y = scale.z = s;
		cube.rotation.z = -bearing * Math.PI / 180;

		if (train._delay) {
			var delayMarker = train._delayMarker;

			if (!delayMarker) {
				delayMarker = train._delayMarker = createDelayMarker();
				trainLayers.addObject(delayMarker, train);
			}

			position = delayMarker.position;
			scale = delayMarker.scale;
			position.x = coord.x - modelOrigin.x;
			position.y = -(coord.y - modelOrigin.y);
			position.z = (train._altitude || 0) * Math.pow(2, 14 - layerZoom) * 100 + s / 2;
			scale.x = scale.y = scale.z = s;
		} else if (train._delayMarker) {
			trainLayers.removeObject(train._delayMarker, train);
			delete train._delayMarker;
		}
	}

	function initModelTrains() {
		trainData.trains.forEach(function(train, i) {
			var line = lineLookup[train['odpt:railway']];
			var cube = train._cube = createCube(line.color);
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

					if (sectionIndex <= 0 || sectionIndex >= line.stations.length - 1) {
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
		var userData;

		if (isRealtime) {
			refreshTrains(timestamp);
			if (markedTrain) {
				userData = markedTrain.userData;
				popup.setLngLat(userData.lngLat).setHTML(userData.description);
			}
		}
		if (trackedTrain) {
			userData = trackedTrain.userData;
			if (trackingMode === 'helicopter') {
				map.easeTo({
					center: userData.lngLat,
					bearing: (timestamp / 100) % 360,
					duration: 0
				});
			} else {
				map.easeTo({
					center: userData.lngLat,
					bearing: userData.bearing,
					duration: 0
				});
			}
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

					var line = lineLookup[train['odpt:railway']];
					var cube = train._cube = createCube(line.color);
					trainLayers.addObject(cube, train);

					trainLookup[train['odpt:train']] = train;

					updateTrainShape(train, {t: 0, reset: true});

					function repeat(elapsed) {
						train._standing = false;
						cube.userData.description = getTrainDescription(train);
						cube.userData.altitude = train._altitude;
						train._stop = animate(function(t) {
							updateTrainShape(train, {t: t});
						}, function() {
							train._timetableIndex++;
							if (!setSectionData(train)) {
								stopTrain(train);
							} else {
								updateTrainShape(train, {t: 0, reset: true});
								train._standing = true;
								cube.userData.description = getTrainDescription(train);

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

	function getTrainDescription(train) {
		var destination = train['odpt:destinationStation'];
		var delay = train._delay || 0;

		return '<span class="desc-box" style="background-color: ' + lineLookup[train['odpt:railway']].color + ';"></span> '
			+ '<strong>' + getLocalizedRailwayTitle(train['odpt:railway']) + '</strong>'
			+ '<br>' + getLocalizedTrainTypeTitle(train['odpt:trainType']) + ' '
			+ (destination ? dict['to'].replace('$1', getLocalizedStationTitle(destination)) : getLocalizedRailDirectionTitle(train['odpt:railDirection']))
			+ '<br><strong>' + dict['train-number'] + ':</strong> '
			+ train['odpt:trainNumber']
			+ '<br>' + (delay >= 60000 ? '<span class="desc-delay">' : '')
			+ '<strong>' + dict[train._standing ? 'standing-at' : 'previous-stop'] + ':</strong> '
			+ getLocalizedStationTitle(train._departureStation)
			+ ' ' + getTimeString(getTime(train._departureTime) + delay)
			+ '<br><strong>' + dict['next-stop'] + ':</strong> '
			+ getLocalizedStationTitle(train._arrivalStation)
			+ ' ' + getTimeString(getTime(train._arrivalTime) + delay)
			+ (delay >= 60000 ? '<br>' + dict['delay'].replace('$1', Math.floor(delay / 60000)) + '</span>' : '');
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
		loadJSON(API_URL + 'odpt:Train?odpt:operator=odpt.Operator:JR-East,odpt.Operator:TokyoMetro&' + API_TOKEN).then(function(trainRefData) {
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

function setAltitude(geojson, altitude) {
	turf.coordEach(geojson, function(coord) {
		coord[2] = altitude;
	});
}

function getPointAndBearing(line, distance, direction) {
	var p1 = turf.along(line, distance);
	var delta = distance >= 1e-6 ? -1e-6 : 1e-6;
	var p2 = turf.along(line, distance + delta);

	return {
		point: p1,
		bearing: direction * delta > 0 ? turf.bearing(p1, p2) : turf.bearing(p2, p1)
	};
}

// Better version of turf.lineOffset
function lineOffset(geojson, distance) {
	var coords = turf.getCoords(geojson);
	var coordsLen = coords.length;
	var start = turf.point(coords[0]);
	var startBearing = turf.bearing(start, coords[2] || coords[1]);
	var end = turf.point(coords[coordsLen - 1]);
	var endBearing = turf.bearing(coords[coordsLen - 3] || coords[coordsLen - 2], end);
	var bearingOffset = distance > 0 ? 90 : -90;

	var dist = Math.abs(distance);
	var polygonLine = turf.polygonToLine(
		turf.buffer(geojson, dist, {step: coordsLen * 2 + 64})
	);
	var polygonLineCoords = turf.getCoords(polygonLine);
	var length = polygonLineCoords.length;
	var p0 = turf.nearestPointOnLine(polygonLine, turf.transformTranslate(start, dist, startBearing + 180));
	var tempCoords = [];
	var step = distance > 0 ? -1 : 1;
	var i;

	// First, rotate coordinates
	for (i = 0; i < length; i++) {
		tempCoords.push(polygonLineCoords[(p0.properties.index + i * step + length) % length]);
	}

	// Then, slice the line
	var p1 = turf.nearestPointOnLine(polygonLine, turf.transformTranslate(start, dist, startBearing + bearingOffset));
	var p2 = turf.nearestPointOnLine(polygonLine, turf.transformTranslate(end, dist, endBearing + bearingOffset));

	return turf.lineSlice(p1, p2, turf.lineString(tempCoords));
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
	var stations = lineLookup[train['odpt:railway']].stations;
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
