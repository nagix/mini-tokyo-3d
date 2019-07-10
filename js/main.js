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

// Average train speed in km/h
var SPEED = 60;

// API URL
var API_URL = 'https://api-tokyochallenge.odpt.org/api/v4/';

// API Token
var API_TOKEN = 'acl:consumerKey=772cd76134e664fb9ee7dbf0f99ae25998834efee29febe782b459f48003d090';

var lang = getLang();
var today = new Date();
var isRealtime = true;
var trackingMode = 'helicopter';
var trainLookup = {};
var stationLookup, railwayLookup, lineLookup, railDirectionLookup, trainTypeLookup;
var trackedTrain, markedTrain, trainLastRefresh;

var MapboxGLButtonControl = function(options) {
	this.initialize(options);
};

MapboxGLButtonControl.prototype.initialize = function(options) {
	this._className = options.className || '';
	this._title = options.title || '';
	this._eventHandler = options.eventHandler;
}

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

var calendar = JapaneseHolidays.isHoliday(today) || today.getDay() == 6 || today.getDay() == 0
	? 'SaturdayHoliday' : 'Weekday';

Promise.all([
	loadJSON('data/dictionary-' + lang + '.json'),
	loadJSON('data/railways.json'),
	loadJSON('data/stations.json'),
	loadJSON('data/trains.json'),
	loadJSON(API_URL + 'odpt:Railway?odpt:operator=odpt.Operator:JR-East&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:RailDirection?' + API_TOKEN),
	loadJSON(API_URL + 'odpt:Station?odpt:operator=odpt.Operator:JR-East&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.Yamanote&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.ChuoSobuLocal&odpt:calendar=odpt.Calendar:Weekday&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.ChuoRapid&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:JR-East.KeihinTohokuNegishi&odpt:calendar=odpt.Calendar:' + calendar + '&' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainType?odpt:operator=odpt.Operator:JR-East&' + API_TOKEN)
]).then(function([
	dict, railwayData, stationData, trainData, railwayRefData, railDirectionRefData, stationRefData,
	timetableRefData1, timetableRefData2, timetableRefData3, timetableRefData4, trainTypeRefData
]) {

var timetableRefData = timetableRefData1.concat(timetableRefData2, timetableRefData3, timetableRefData4);

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
		stationRef._coords = station.coords;
		merge(stationRef['odpt:stationTitle'], station['odpt:stationTitle']);
	});
});

railwayLookup = buildLookup(railwayRefData);
lineLookup = buildLookup(railwayData.railways);

railwayData.railways.forEach(function(railway) {
	var id = railway['owl:sameAs'];
	var railwayRef = railwayLookup[id];
	var stationOrder = railwayRef['odpt:stationOrder'];

	if (id === 'odpt.Railway:JR-East.ChuoSobuLocal') {
		stationOrder = stationOrder.slice(20, 30);
	} else if (id === 'odpt.Railway:JR-East.ChuoRapid') {
		stationOrder = stationOrder.slice(0, 5);
	} else if (id === 'odpt.Railway:JR-East.KeihinTohokuNegishi') {
		stationOrder = stationOrder.slice(13, 27);
	}
	railway.stations = stationOrder.map(function(station) {
		return station['odpt:station'];
	});
	merge(railwayRef['odpt:railwayTitle'], railway['odpt:railwayTitle']);
});

var railwayLayers = [13, 14, 15, 16, 17, 18].map(function(zoom) {
	var stationCollection = turf.featureCollection(stationData.stations.map(function(station) {
		var span = station.span;
		var properties = {outlineColor: '#000000', width: 4, color: '#FFFFFF'};
		var point = turf.point(station.coords, properties);

		return turf.transformRotate(turf.buffer(span ? turf.lineString([
			turf.getCoord(turf.transformTranslate(point, span[0] * Math.pow(2, 14 - zoom) * .1, 90)),
			turf.getCoord(turf.transformTranslate(point, span[1] * Math.pow(2, 14 - zoom) * .1, 90))
		], properties) : point, Math.pow(2, 14 - zoom) * .1), station.angle || 0, {pivot: station.coords, mutate: true});
	}));

	var railwayCollection = turf.featureCollection(railwayData.railways.map(function(line) {
		var railwayFeature = line.feature = line.feature || {};

		railwayFeature[zoom] = turf.lineString(concat(line.sublines.map(function(subline) {
			var overlap = lineLookup[subline['odpt:railway']];
			var start, end, stations;

			if (overlap) {
				start = subline.start;
				end = subline.end;
				subline.feature = turf.lineOffset(turf.lineSlice(
					turf.point(stationLookup[start]._coords),
					turf.point(stationLookup[end]._coords),
					overlap.feature[zoom]
				), subline.offset * Math.pow(2, 14 - zoom) * .125);
				stations = overlap.stations;

				// Rewind if the overlap line is in opposite direction
				if (stations.indexOf(start) > stations.indexOf(end)) {
					turf.rewind(subline.feature, {mutate: true});
				}

				/* Exclude invaild points that can be generated by lineOffset
				subline.feature.geometry.coordinates = turf.getCoords(subline.feature).filter(function(coords) {
					return !isNaN(coords[0]) && !isNaN(coords[1]);
				}); */
			}

			return subline;
		}).map(function(subline, i, sublines) {
			var coordinates, nextSubline;

			function smoothCoords(reverse) {
				var start = !reverse ? 0 : coordinates.length - 1;
				var end = !reverse ? coordinates.length - 1 : 0;
				var step = !reverse ? 1 : -1;
				var stationName = !reverse ? nextSubline.end : nextSubline.start;
				var nextCoordinates = turf.getCoords(nextSubline.feature);
				var coordsIndex = !reverse ? nextCoordinates.length - 1 : 0;
				var feature = lineLookup[nextSubline['odpt:railway']].feature[zoom];
				var offset = turf.distance(
					turf.point(stationLookup[stationName]._coords),
					turf.point(nextCoordinates[coordsIndex])
				);
				var j, p1, p2, distance, bearing, lineBearing, angle;

				for (j = start; j !== end; j += step) {
					p1 = turf.point(coordinates[j]);
					p2 = turf.nearestPointOnLine(feature, p1);
					distance = p2.properties.dist;
					if (distance > offset * 5) {
						break;
					}
					bearing = turf.bearing(p2, p1);
					lineBearing = turf.bearing(
						turf.point(turf.getCoords(feature)[p2.properties.index]),
						turf.point(turf.getCoords(feature)[p2.properties.index + 1])
					);
					angle = (bearing - lineBearing + 540) % 360 - 180;
					coordinates[j] = turf.getCoord(turf.transformTranslate(
						p1,
						distance <= offset ? offset : offset - (distance - offset) / 4,
						bearing + (nextSubline.offset * angle < 0 ? 180 : 0)
					));
				}
				coordinates[start] = nextCoordinates[coordsIndex];
			}

			if (!subline['odpt:railway']) {
				coordinates = subline.coordinates.slice();
				nextSubline = sublines[i - 1];
				if (nextSubline && nextSubline['odpt:railway']) {
					smoothCoords();
				}
				nextSubline = sublines[i + 1];
				if (nextSubline && nextSubline['odpt:railway']) {
					smoothCoords(true);
				}
				subline.feature = turf.bezierSpline(turf.lineString(coordinates), {sharpness: .4});
			}

			return turf.getCoords(subline.feature);
		})), {color: line.color, width: 8});

		// Make sure the last and first coords are equal if loop is true
		if (line.loop) {
			var coords = turf.getCoords(railwayFeature[zoom]);
			coords.push(coords[0]);
		}

		// Set station offsets
		var start = stationLookup[line.stations[0]];
		var stationOffsets = line.stationOffsets = line.stationOffsets || {};
		stationOffsets[zoom] = line.stations.slice(0, -1).map(function(station) {

			/* For development
			if (line['odpt:railway'] === 'odpt.Railway:JR-East.ChuoSobuLocal') {
				console.log(station, getPointAndBearing(railwayFeature[zoom], turf.length(turf.lineSlice(
					turf.point(start.coords),
					turf.point(stationLookup[station]._coords),
					railwayFeature[zoom])
				), 1).bearing);
			} */

			return turf.length(turf.lineSlice(
				turf.point(start._coords),
				turf.point(stationLookup[station]._coords),
				railwayFeature[zoom]
			));
		});

		// Make sure the last offset is equal to the length
		stationOffsets[zoom].push(turf.length(railwayFeature[zoom]));

		return railwayFeature[zoom];
	}));

	return {
		minzoom: zoom <= 13 ? 0 : zoom,
		maxzoom: zoom >= 18 ? 24 : zoom + 1,
		railways: railwayCollection,
		stations: stationCollection
	};
});

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
});

trainTypeLookup = buildLookup(trainTypeRefData);

// Update train type lookup dictionary
trainData.types.map(function(type) {
	merge(trainTypeLookup[type['odpt:trainType']]['odpt:trainTypeTitle'], type['odpt:trainTypeTitle']);
});

var trainCollection = turf.featureCollection([]);

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
		map.addLayer({
			id: 'railways-' + layer.minzoom,
			type: 'line',
			source: {
				type: 'geojson',
				data: layer.railways
			},
			paint: {
				'line-color': ['get', 'color'],
				'line-width': ['get', 'width']
			},
			minzoom: layer.minzoom,
			maxzoom: layer.maxzoom
		});
		map.addLayer({
			id: 'stations-' + layer.minzoom,
			type: 'fill',
			source: {
				type: 'geojson',
				data: layer.stations
			},
			paint: {
				'fill-color': ['get', 'color'],
				'fill-opacity': .7
			},
			minzoom: layer.minzoom,
			maxzoom: layer.maxzoom
		});
		map.addLayer({
			id: 'stations-outline-' + layer.minzoom,
			type: 'line',
			source: {
				type: 'geojson',
				data: layer.stations
			},
			paint: {
				'line-color': ['get', 'outlineColor'],
				'line-width': ['get', 'width']
			},
			minzoom: layer.minzoom,
			maxzoom: layer.maxzoom
		});
	});

	map.addLayer({
		id: 'trains',
		type: 'fill-extrusion',
		source: {
			type: 'geojson',
			data: trainCollection
		},
		paint: {
			'fill-extrusion-color': ['get', 'color'],
			'fill-extrusion-height': ['interpolate', ['exponential', 0.5], ['zoom'], 13, 200, 19, 3.125],
			'fill-extrusion-opacity': .9
		}
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
		closeOnClick: false,
		offset: {
			'top': [0, 10],
			'bottom': [0, -30],
		}
	});

	map.on('mouseenter', 'trains', function(e) {
		map.getCanvas().style.cursor = 'pointer';
		if (isRealtime) {
			markedTrain = getTrain(e);
			popup.setLngLat([markedTrain.properties.lat, markedTrain.properties.lng])
				.setHTML(markedTrain.properties.description)
				.addTo(map);
		}
	});

	map.on('mousemove', 'trains', function(e) {
		if (isRealtime) {
			markedTrain = getTrain(e);
			popup.setLngLat([markedTrain.properties.lat, markedTrain.properties.lng])
				.setHTML(markedTrain.properties.description)
		}
	});
	map.on('mouseleave', 'trains', function() {
		map.getCanvas().style.cursor = '';
		if (isRealtime) {
			markedTrain = undefined;
			popup.remove();
		}
	});

	map.on('click', 'trains', function(e) {
		trackedTrain = getTrain(e);
		document.getElementsByClassName('mapbox-ctrl-track')[0]
			.classList.add('mapbox-ctrl-track-active');
		e.originalEvent.cancelBubble = true;
	});

	map.on('click', function(e) {
		if (trackedTrain && !e.originalEvent.cancelBubble) {
			trackedTrain = undefined;
			document.getElementsByClassName('mapbox-ctrl-track')[0]
				.classList.remove('mapbox-ctrl-track-active');
		}
	});

	map.on('zoom', function() {
		Object.keys(trainLookup).forEach(function(key) {
			updateTrainShape(trainLookup[key], {reset: true});
		});
	});

	function getTrain(event) {
		return trainLookup[event.features[0].properties['odpt:train']]._feature;
	}

	function updateTrainShape(train, options) {
		var zoom = map.getZoom();
		var line = lineLookup[train['odpt:railway']];
		var direction = train._direction;
		var sectionIndex = train._sectionIndex;
		var feature = train._feature;
		var properties = feature.properties;
		var layerZoom, stationOffsets, offset, p, size;

		if (options.t !== undefined) {
			train._t = options.t;
		}

		if (options.reset) {
			layerZoom = Math.min(Math.max(Math.floor(zoom), 13), 18);
			stationOffsets = line.stationOffsets[layerZoom];
			offset = train._offset = stationOffsets[sectionIndex];
			train._length = stationOffsets[sectionIndex + direction] - offset;
			train._lineFeature = line.feature[layerZoom];
		}

		p = getPointAndBearing(train._lineFeature, train._offset + train._t * train._length, direction);
		size = Math.pow(2, 14 - Math.min(Math.max(zoom, 13), 19)) * .1;

		feature.geometry = generateTrainGeometry(p.point, size, p.bearing);
		properties.lat = turf.getCoord(p.point)[0];
		properties.lng = turf.getCoord(p.point)[1];
		properties.bearing = p.bearing;
	}

	function initModelTrains() {
		trainCollection = turf.featureCollection(trainData.trains.map(function(train, i) {
			var line = lineLookup[train['odpt:railway']];
			var feature = train._feature = turf.polygon([[[0,0],[1,0],[1,1],[0,0]]], {color: line.color});

			feature.properties['odpt:train'] = train['odpt:train'] = i;

			trainLookup[train['odpt:train']] = train;
			updateTrainShape(train, {t: 0, reset: true});

			function repeat() {
				train._stop = animate(function(t) {
					updateTrainShape(train, {t: t});
				}, function() {
					var direction = train._direction;
					var sectionIndex = train._sectionIndex = train._sectionIndex + direction;

					if (sectionIndex <= 0 || sectionIndex >= line.stations.length - 1) {
						train._direction = -direction;
					}
					updateTrainShape(train, {t: 0, reset: true});

					// Stop and go
					train._stop = delay(repeat, 1000);
				}, 5000 * Math.abs(train._length));
			}
			repeat();
			return feature;
		}));
	}
	if (!isRealtime) {
		initModelTrains();
	}

	function refresh(timestamp) {
		var properties;

		if (isRealtime) {
			refreshTrains(timestamp);
			if (markedTrain) {
				properties = markedTrain.properties;
				popup.setLngLat([properties.lat, properties.lng]).setHTML(properties.description);
			}
		}
		map.getSource('trains').setData(trainCollection);
		if (trackedTrain) {
			properties = trackedTrain.properties;
			if (trackingMode === 'helicopter') {
				map.easeTo({
					center: [properties.lat, properties.lng],
					bearing: (timestamp / 100) % 360,
					duration: 0
				});
			} else {
				map.easeTo({
					center: [properties.lat, properties.lng],
					bearing: properties.bearing,
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
					var line = lineLookup[train['odpt:railway']];
					var table = train['odpt:trainTimetableObject'];
					var timetableIndex = table.reduce(function(acc, cur, i) {
						return getTime(cur['odpt:departureTime']) + d <= now ? i : acc;
					}, 0);
					var direction = train._direction;
					var departureStation = table[timetableIndex]['odpt:departureStation'];
					var sectionIndex = train._sectionIndex = direction > 0
						? line.stations.indexOf(departureStation)
						: line.stations.lastIndexOf(departureStation);

					// Out of range
					if (sectionIndex === -1 || sectionIndex + direction < 0 || sectionIndex + direction >= line.stations.length) {
						return;
					}

					var feature = train._feature = turf.polygon([[[0,0],[1,0],[1,1],[0,0]]], {color: line.color});
					var properties = feature.properties;

					properties['odpt:train'] = train['odpt:train'];
					properties.description = getTrainDescription(train, timetableIndex);

					trainLookup[train['odpt:train']] = train;
					updateTrainShape(train, {t: 0, reset: true});

					function repeat() {
						train._stop = animate(function(t) {
							updateTrainShape(train, {t: t});
						}, function() {
							timetableIndex++;
							sectionIndex = train._sectionIndex = sectionIndex + direction;
							if (timetableIndex >= table.length - 1 || sectionIndex <= 0 || sectionIndex >= line.stations.length - 1) {
								stopTrain(train);
							} else {
								properties.description = getTrainDescription(train, timetableIndex);
								updateTrainShape(train, {t: 0, reset: true});

								// Stop at station
								train._stop = delay(repeat, Math.max((getTime(table[timetableIndex]['odpt:departureTime']) + (train._delay || 0)) - Date.now(), MIN_STOP_DURATION));
							}
						}, Math.abs(train._length) * 3600000 / SPEED, Date.now() - (getTime(table[timetableIndex]['odpt:departureTime']) + (train._delay || 0)));
					}
					repeat();
					trainCollection.features.push(feature);
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

	function getTrainDescription(train, timetableIndex) {
		var table = train['odpt:trainTimetableObject'];
		var destination = train['odpt:destinationStation'];
		var current = table[timetableIndex];
		var next = table[timetableIndex + 1];
		var delay = train._delay || 0;

		return '<span class="desc-box" style="background-color: ' + lineLookup[train['odpt:railway']].color + ';"></span> '
			+ '<strong>' + getLocalizedRailwayTitle(train['odpt:railway']) + '</strong>'
			+ '<br>' + getLocalizedTrainTypeTitle(train['odpt:trainType']) + ' '
			+ (destination ? dict['to'].replace('$1', getLocalizedStationTitle(destination)) : getLocalizedRailDirectionTitle(train['odpt:railDirection']))
			+ '<br><strong>' + dict['train-number'] + ':</strong> '
			+ train['odpt:trainNumber']
			+ '<br>' + (delay >= 60000 ? '<span class="desc-delay">' : '')
			+ '<strong>' + dict['previous-stop'] + ':</strong> '
			+ getLocalizedStationTitle(current['odpt:departureStation'])
			+ ' ' + getTimeString(getTime(current['odpt:departureTime']) + delay)
			+ '<br><strong>' + dict['next-stop'] + ':</strong> '
			+ getLocalizedStationTitle(next['odpt:arrivalStation'] || next['odpt:departureStation'])
			+ ' ' + getTimeString(getTime(next['odpt:arrivalTime'] || next['odpt:departureTime']) + delay)
			+ (delay >= 60000 ? '<br>' + dict['delay'].replace('$1', Math.floor(delay / 60000)) + '</span>' : '');
	}

	function stopTrain(train) {
		train._stop();
		trainCollection.features.splice(trainCollection.features.indexOf(train._feature), 1);
		delete train._feature;
		delete train._stop;
		delete trainLookup[train['odpt:train']];
	}

	function updateDelays() {
		loadJSON(API_URL + 'odpt:Train?odpt:operator=odpt.Operator:JR-East&' + API_TOKEN).then(function(trainRefData) {
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

function getPointAndBearing(line, distance, direction) {
	var p1 = turf.along(line, distance);
	var delta = distance >= 1e-6 ? -1e-6 : 1e-6;
	var p2 = turf.along(line, distance + delta);

	return {
		point: p1,
		bearing: direction * delta > 0 ? turf.bearing(p1, p2) : turf.bearing(p2, p1)
	};
}

function generateTrainGeometry(point, size, bearing) {
	return turf.getGeom(turf.transformRotate(turf.polygon([[
		turf.getCoord(turf.transformTranslate(point, size, -150)),
		turf.getCoord(turf.transformTranslate(point, size, -30)),
		turf.getCoord(turf.transformTranslate(point, size, 30)),
		turf.getCoord(turf.transformTranslate(point, size, 150)),
		turf.getCoord(turf.transformTranslate(point, size, -150))
	]]), bearing, {pivot: point}));
}

function easeSin(t) {
	return -(Math.cos(Math.PI * t) - 1) / 2;
}

function animate(callback, endCallback, duration, elapsed) {
	var start, requestID;
	var frameRefresh = function() {
		var now = performance.now();
		var t;

		start = start || now;
		t = Math.min((now - start) / duration, 1);
		if (callback) {
			callback(easeSin(t));
		}
		if (t < 1) {
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
	return animate(null, callback, duration);
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
