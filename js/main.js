var apiUrl = 'https://api-tokyochallenge.odpt.org/api/v4/';
var apiToken = 'acl:consumerKey=772cd76134e664fb9ee7dbf0f99ae25998834efee29febe782b459f48003d090';
var today = new Date();
var isRealtime = true;
var calendarLookup = {};
var stationLookup = {};
var stationLookup2 = {};
var lineLookup = {};
var railwayLookup = {};
var trainLookup = {};
var trackingMode = 'helicopter';
var trackedCar, markedCar, trainLastRefresh;

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
	this._btn.className = "mapboxgl-ctrl-icon" + ' ' + this._className;
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

var lang = getLang();

Promise.all([
	loadJSON('data/dictionary-' + lang + '.json'),
	loadJSON('data/lines.json'),
	loadJSON('data/stations.json'),
	loadJSON('data/cars.json'),
	loadJSON(apiUrl + 'odpt:Railway?odpt:operator=odpt.Operator:JR-East&' + apiToken),
	loadJSON(apiUrl + 'odpt:Station?odpt:operator=odpt.Operator:JR-East&' + apiToken),
	loadJSON(apiUrl + 'odpt:TrainTimetable?odpt:operator=odpt.Operator:JR-East&odpt:railway=odpt.Railway:JR-East.Yamanote&odpt:calendar=odpt.Calendar:' + calendar + '&' + apiToken),
	loadJSON(apiUrl + 'odpt:TrainTimetable?odpt:operator=odpt.Operator:JR-East&odpt:railway=odpt.Railway:JR-East.ChuoSobuLocal&odpt:calendar=odpt.Calendar:Weekday&' + apiToken),
	loadJSON(apiUrl + 'odpt:TrainTimetable?odpt:operator=odpt.Operator:JR-East&odpt:railway=odpt.Railway:JR-East.ChuoRapid&odpt:calendar=odpt.Calendar:' + calendar + '&' + apiToken),
	loadJSON(apiUrl + 'odpt:TrainTimetable?odpt:operator=odpt.Operator:JR-East&odpt:railway=odpt.Railway:JR-East.KeihinTohokuNegishi&odpt:calendar=odpt.Calendar:' + calendar + '&' + apiToken)
]).then(function([
	dict, lineData, stationData, carData, railwayData, stationData2,
	timetableData1, timetableData2, timetableData3, timetableData4
]) {

var timetableData = timetableData1.concat(timetableData2, timetableData3, timetableData4);

var map = new mapboxgl.Map({
	container: 'map',
	style: 'data/osm-liberty.json',
	attributionControl: true,
	hash: true,
	center: [139.7670, 35.6814],
	zoom: 14,
	pitch: 60
});

stationData2.forEach(function(station) {
	stationLookup2[station['owl:sameAs']] = station;
});

var stationCollection = turf.featureCollection(stationData.stations.map(function(station) {
	var span = station.span;
	var properties = {outlineColor: '#000000', width: 4, color: '#FFFFFF'};
	var point = turf.point(station.coords, properties);

	// Build station loopup dictionary
	stationLookup[station['odpt:station']] = station;
	if (station.aliases) {
		station.aliases.forEach(function(alias) {
			stationLookup[alias] = station;
		});
	}

	return turf.transformRotate(turf.buffer(span ? turf.lineString([
		turf.getCoord(turf.transformTranslate(point, span[0] * .1, 90)),
		turf.getCoord(turf.transformTranslate(point, span[1] * .1, 90))
	], properties) : point, .1), station.angle || 0, {pivot: station.coords, mutate: true});
}));

railwayData.forEach(function(railway) {
	railwayLookup[railway['owl:sameAs']] = railway;
});

var lineCollection = turf.featureCollection(lineData.lines.map(function(line) {
	var stationOrder, stations;

	// Build line loopup dictionary
	lineLookup[line['odpt:railway']] = line;

	stationOrder = railwayLookup[line['odpt:railway']]['odpt:stationOrder'];
	if (line['odpt:railway'] === 'odpt.Railway:JR-East.ChuoSobuLocal') {
		stationOrder = stationOrder.slice(20, 30);
	} else if (line['odpt:railway'] === 'odpt.Railway:JR-East.ChuoRapid') {
		stationOrder = stationOrder.slice(0, 5);
	} else if (line['odpt:railway'] === 'odpt.Railway:JR-East.KeihinTohokuNegishi') {
		stationOrder = stationOrder.slice(13, 27);
	}
	stations = line.stations = stationOrder.map(function(station) {
		return station['odpt:station'];
	});

	line.feature = turf.lineString(concat(line.sublines.map(function(subline) {
		var overlap = lineLookup[subline['odpt:railway']];
		var start, end, stations;

		if (overlap) {
			start = subline.start;
			end = subline.end;
			subline.feature = turf.lineOffset(turf.lineSlice(
				turf.point(stationLookup[start].coords),
				turf.point(stationLookup[end].coords),
				overlap.feature
			), subline.offset * .125);
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
			var CoordsIndex = !reverse ? nextCoordinates.length - 1 : 0;
			var feature = lineLookup[nextSubline['odpt:railway']].feature;
			var offset = turf.distance(
				turf.point(stationLookup[stationName].coords),
				turf.point(nextCoordinates[CoordsIndex])
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
			coordinates[start] = nextCoordinates[CoordsIndex];
		}

		if (!subline['odpt:railway']) {
			coordinates = subline.coordinates;
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
		var coords = turf.getCoords(line.feature);
		coords.push(coords[0]);
	}

	// Set station offsets
	var start = stationLookup[line.stations[0]];
	line.stationOffsets = stations.slice(0, -1).map(function(station) {

		/* For development
		if (line['odpt:railway'] === 'odpt.Railway:JR-East.ChuoSobuLocal') {
			console.log(station, getPointAndBearing(line.feature, turf.length(turf.lineSlice(
				turf.point(start.coords),
				turf.point(stationLookup[station].coords),
				line.feature)
			), 1).bearing);
		} */

		return turf.length(turf.lineSlice(
			turf.point(start.coords),
			turf.point(stationLookup[station].coords),
			line.feature
		));
	});

	// Make sure the last offset is equal to the length
	line.stationOffsets.push(turf.length(line.feature));

	return line.feature;
}));

timetableData.forEach(function(train) {
	var line = lineLookup[train['odpt:railway']];
	var railway = railwayLookup[train['odpt:railway']];
	var direction = train['odpt:railDirection'] === railway['odpt:ascendingRailDirection'] ? 1 : -1;
	var table = train['odpt:trainTimetableObject'];

	// Build train timetable loopup dictionary
	trainLookup[train['owl:sameAs']] = train;

	train.start = getTime(table[0]['odpt:departureTime']);
	train.end = getTime(table[table.length - 1]['odpt:arrivalTime']
		|| table[table.length - 1]['odpt:departureTime']
		|| table[Math.max(table.length - 2, 0)]['odpt:departureTime']);
	train.direction = direction;
});

var carCollection = turf.featureCollection([]);

map.once('load', function () {
	document.getElementById('loader').style.display = 'none';
});

map.once('styledata', function () {
	map.getStyle().layers.forEach(function(layer) {
		if (layer.type === 'symbol') {
			map.setLayoutProperty(layer.id, 'visibility', 'none');
		}
	});

	map.addLayer({
		id: 'lines',
		type: 'line',
		source: {
			type: 'geojson',
			data: lineCollection
		},
		paint: {
			'line-color': ['get', 'color'],
			'line-width': ['get', 'width']
		},
	});
	map.addLayer({
		id: 'stations',
		type: 'fill',
		source: {
			type: 'geojson',
			data: stationCollection
		},
		paint: {
			'fill-color': ['get', 'color'],
			'fill-opacity': .7
		},
	});
	map.addLayer({
		id: 'stations-outline',
		type: 'line',
		source: {
			type: 'geojson',
			data: stationCollection
		},
		paint: {
			'line-color': ['get', 'outlineColor'],
			'line-width': ['get', 'width']
		},
	});
	map.addLayer({
		id: 'cars',
		type: 'fill-extrusion',
		source: {
			type: 'geojson',
			data: carCollection
		},
		paint: {
			'fill-extrusion-color': ['get', 'color'],
			'fill-extrusion-height': ['interpolate', ['exponential', 0.5], ['zoom'], 0, 1638400, 19, 3.125],
			'fill-extrusion-opacity': .9
		},
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
			carCollection.features = [];
			trackedCar = undefined;
			document.getElementsByClassName('mapbox-ctrl-track')[0].classList.remove('mapbox-ctrl-track-active');
			if (isRealtime) {
				this.classList.add('mapbox-ctrl-realtime-active');
				trainLastRefresh = undefined;
				timetableData.forEach(function(train) {
					train.active = undefined;
				});
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

	map.on('mouseenter', 'cars', function(e) {
		map.getCanvas().style.cursor = 'pointer';
		if (isRealtime) {
			markedCar = getCar(e);
			popup.setLngLat([markedCar.properties.lat, markedCar.properties.lng])
				.setHTML(markedCar.properties.description)
				.addTo(map);
		}
	});

	map.on('mousemove', 'cars', function(e) {
		if (isRealtime) {
			markedCar = getCar(e);
			popup.setLngLat([markedCar.properties.lat, markedCar.properties.lng])
				.setHTML(markedCar.properties.description)
		}
	});
	map.on('mouseleave', 'cars', function() {
		map.getCanvas().style.cursor = '';
		if (isRealtime) {
			markedCar = undefined;
			popup.remove();
		}
	});

	map.on('click', 'cars', function(e) {
		trackedCar = getCar(e);
		document.getElementsByClassName('mapbox-ctrl-track')[0]
			.classList.add('mapbox-ctrl-track-active');
		e.originalEvent.cancelBubble = true;
	});

	map.on('click', function(e) {
		if (trackedCar && !e.originalEvent.cancelBubble) {
			trackedCar = undefined;
			document.getElementsByClassName('mapbox-ctrl-track')[0]
				.classList.remove('mapbox-ctrl-track-active');
		}
	});

	map.on('zoom', function() {
		var size = Math.pow(2, 14 - map.getZoom()) * .1;
		var properties;

		carCollection.features.forEach(function(feature) {
			properties = feature.properties;
			feature.geometry = generateCarGeometry(
				turf.point([properties.lat, properties.lng]), size, properties.bearing);
		});
	});

	function getCar(event) {
		var i, feature;
		for (var i = 0; i < carCollection.features.length; ++i) {
			feature = carCollection.features[i];
			if (feature.properties['odpt:train'] === event.features[0].properties['odpt:train']) {
				return feature;
			}
		}
	}

	function initModelTrains() {
		carCollection = turf.featureCollection(carData.cars.map(function(car, i) {
			var line = lineLookup[car['odpt:railway']];
			var sectionIndex = car.sectionIndex;
			var direction = car.direction;
			var stationOffsets = line.stationOffsets;
			var offset = stationOffsets[sectionIndex];
			var length = stationOffsets[sectionIndex + direction] - offset;
			var feature = turf.polygon([[[0,0],[1,0],[1,1],[0,0]]], {color: line.color});

			function repeat() {
				animate(function(t) {
					var p = getPointAndBearing(line.feature, offset + t * length, direction);
					var size = Math.pow(2, 14 - map.getZoom()) * .1;
					var properties = feature.properties;

					feature.geometry = generateCarGeometry(p.point, size, p.bearing);
					properties['odpt:train'] = i;
					properties.lat = turf.getCoord(p.point)[0];
					properties.lng = turf.getCoord(p.point)[1];
					properties.bearing = p.bearing;
				}, function() {
					sectionIndex = sectionIndex + direction;
					if (sectionIndex <= 0 || sectionIndex >= stationOffsets.length - 1) {
						direction = -direction;
					}
					offset = stationOffsets[sectionIndex];
					length = stationOffsets[sectionIndex + direction] - offset;

					if (!isRealtime) {
						// Stop and go
						delay(repeat, 1000);
					}
				}, 5000 * Math.abs(length));
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
			if (markedCar) {
				properties = markedCar.properties;
				popup.setLngLat([properties.lat, properties.lng]).setHTML(properties.description);
			}
		}
		map.getSource('cars').setData(carCollection);
		if (trackedCar) {
			properties = trackedCar.properties;
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

		if (parseInt(now / 60000) !== parseInt(trainLastRefresh / 60000)) {
			trainLastRefresh = now;
			timetableData.forEach(function(train) {
				if (train.start <= now && now <= train.end && !train.active) {
					train.active = true;

					var line = lineLookup[train['odpt:railway']];
					var table = train['odpt:trainTimetableObject'];
					var timetableIndex = table.reduce(function(acc, cur, i) {
						return getTime(cur['odpt:departureTime']) <= now ? i : acc;
					}, 0);
					var direction = train.direction;
					var departureStation = table[timetableIndex]['odpt:departureStation'];
					var sectionIndex = direction > 0
						? line.stations.indexOf(departureStation)
						: line.stations.lastIndexOf(departureStation);
					var stationOffsets = line.stationOffsets;
					var offset = stationOffsets[sectionIndex];
					var length = stationOffsets[sectionIndex + direction] - offset;
					var feature = turf.polygon([[[0,0],[1,0],[1,1],[0,0]]], {color: line.color});

					// Out of range
					if (isNaN(offset) || isNaN(length)) {
						return;
					}

					function repeat() {
						animate(function(t) {
							var p = getPointAndBearing(line.feature, offset + t * length, direction);
							var size = Math.pow(2, 14 - map.getZoom()) * .1;
							var properties = feature.properties;

							feature.geometry = generateCarGeometry(p.point, size, p.bearing);
							properties['odpt:train'] = train['odpt:train'];
							properties.lat = turf.getCoord(p.point)[0];
							properties.lng = turf.getCoord(p.point)[1];
							properties.bearing = p.bearing;
							properties.description = '<strong>' + dict['train-number'] +':</strong> '
								+ train['odpt:trainNumber']
								+ '<br><strong>' + dict['destination'] +':</strong> '
								+ (train['odpt:destinationStation'] ? stationLookup2[train['odpt:destinationStation'][0]]['odpt:stationTitle'][lang === 'ja' ? 'ja' : 'en'] : 'N/A')
								+ '<br><strong>' + dict['previous-stop'] +':</strong> '
								+ stationLookup2[table[timetableIndex]['odpt:departureStation']]['odpt:stationTitle'][lang === 'ja' ? 'ja' : 'en'] + ' ' + table[timetableIndex]['odpt:departureTime']
								+ '<br><strong>' + dict['next-stop'] +':</strong> '
								+ stationLookup2[(table[timetableIndex + 1]['odpt:arrivalStation'] || table[timetableIndex + 1]['odpt:departureStation'])]['odpt:stationTitle'][lang === 'ja' ? 'ja' : 'en'] + ' ' + (table[timetableIndex + 1]['odpt:arrivalTime'] || table[timetableIndex + 1]['odpt:departureTime']);
						}, function() {
							timetableIndex++;
							sectionIndex = sectionIndex + direction;
							if (timetableIndex >= table.length - 1 || sectionIndex <= 0 || sectionIndex >= stationOffsets.length - 1) {
								carCollection.features.splice(carCollection.features.indexOf(feature), 1);
								train.active = undefined;
							} else {
								offset = stationOffsets[sectionIndex];
								length = stationOffsets[sectionIndex + direction] - offset;

								if (isRealtime) {
									// Stop at station
									delay(repeat, Math.max(getTime(table[timetableIndex]['odpt:departureTime']) - Date.now(), 30000));
								}
							}
						}, 60000 * Math.abs(length));
					}
					repeat();
					carCollection.features.push(feature);

				}
			});
		}
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

function generateCarGeometry(point, size, bearing) {
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

function animate(callback, endCallback, duration) {
	var start;
	var frameRefresh = function() {
		var now = performance.now();
		var t;

		start = start || now;
		t = Math.min((now - start) / duration, 1);
		if (callback) {
			callback(easeSin(t));
		}
		if (t < 1) {
			requestAnimationFrame(frameRefresh);
		} else if (endCallback) {
			endCallback();
		}
	};
	requestAnimationFrame(frameRefresh);
}

function delay(callback, duration) {
	animate(null, callback, duration);
}

function concat(arr) {
	return Array.prototype.concat.apply([], arr);
}

function inRange(value, start, end) {
	return value >= start && value < end;
}

function loadJSON(url) {
	return new Promise(function(resolve, reject) {
		var request = new XMLHttpRequest();

		request.open("GET", url);
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

function getTime(timeString) {
	var date = new Date();
	var timeStrings = (timeString || '').split(':');

	date.setHours(+timeStrings[0], +timeStrings[1], 0, 0);
	return date.getTime();
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
