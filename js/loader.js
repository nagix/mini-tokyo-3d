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

// API URL
var API_URL = 'https://api-tokyochallenge.odpt.org/api/v4/';

// API Token
var API_TOKEN = 'acl:consumerKey=772cd76134e664fb9ee7dbf0f99ae25998834efee29febe782b459f48003d090';

var timetables = {};
var isUndergroundVisible = false;
var opacityStore = {};
var animations = {};
var featureLookup = {};
var animationID = 0;
var stationLookup, railwayLookup;

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

loadJSON('data-extra/railways.json').then(function(railwayData) {
	['Weekday', 'SaturdayHoliday'].forEach(function(calendar) {
		Promise.all(railwayData.map(function(railway) {
			var id = railway.id;
			return loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:' + id +
				(id === 'JR-East.ChuoSobuLocal' ? '' : '&odpt:calendar=odpt.Calendar:' + calendar) +
				'&' + API_TOKEN);
		})).then(function(timetableRefData) {
			timetables[calendar] = concat(timetableRefData).map(function(table) {
				return {
					t: removePrefix(table['odpt:train']),
					id: removePrefix(table['owl:sameAs']),
					r: removePrefix(table['odpt:railway']),
					y: removePrefix(table['odpt:trainType']),
					n: table['odpt:trainNumber'],
					d: removePrefix(table['odpt:railDirection']),
					ds: removePrefix(table['odpt:destinationStation']),
					nt: removePrefix(table['odpt:nextTrainTimetable']),
					tt: table['odpt:trainTimetableObject'].map(function(obj) {
						return {
							at: obj['odpt:arrivalTime'],
							dt: obj['odpt:departureTime'],
							as: removePrefix(obj['odpt:arrivalStation']),
							ds: removePrefix(obj['odpt:departureStation'])
						};
					}),
					pt: removePrefix(table['odpt:previousTrainTimetable'])
				};
			});
		});
	});
});

Promise.all([
	loadJSON('data-extra/coordinates.json'),
	loadJSON('data-extra/stations.json'),
	loadJSON('data-extra/railways.json'),
	loadJSON('data-extra/rail-directions.json'),
	loadJSON('data-extra/train-types.json'),
	loadStationRefData(),
	loadRailwayRefData(),
	loadJSON(API_URL + 'odpt:RailDirection?' + API_TOKEN),
	loadJSON(API_URL + 'odpt:TrainType?odpt:operator=' + ['JR-East', 'TWR', 'TokyoMetro', 'Toei', 'Keio'].map(function(operator) {
		return 'odpt.Operator:' + operator;
	}).join(',') + '&' + API_TOKEN)
]).then(function([
	coordinateData, stationData, railwayData, railDirectionData, trainTypeData,
	stationRefData, railwayRefData, railDirectionRefData, trainTypeRefData
]) {

var map = new mapboxgl.Map({
	container: 'map',
	style: 'data/osm-liberty.json',
	attributionControl: true,
	hash: true,
	center: [139.7670, 35.6814],
	zoom: 14,
	pitch: 60
});

stationLookup = buildLookup(stationRefData, 'id');

// Update station lookup dictionary
stationData.forEach(function(stations) {
	if (!Array.isArray(stations)) {
		stations = [stations];
	}
	stations.forEach(function(station) {
		station.aliases.forEach(function(alias) {
			merge(stationLookup[alias].title, station.title);
		});
	});
});

railwayLookup = buildLookup(railwayRefData, 'id');

// Update railway lookup dictionary
railwayData.forEach(function(railway) {
	var id = railway.id;
	var railwayRef = railwayLookup[id];
	var stationOrder = railwayRef.order;

	if (id === 'JR-East.Ome') {
		stationOrder = stationOrder.slice(0, 13);
	} else if (id === 'JR-East.Tokaido') {
		stationOrder = stationOrder.slice(0, 7);
	} else if (id === 'JR-East.Utsunomiya') {
		stationOrder = stationOrder.slice(0, 13);
	} else if (id === 'JR-East.Takasaki') {
		stationOrder = stationOrder.slice(0, 13);
	} else if (id === 'JR-East.Sobu') {
		stationOrder = stationOrder.slice(0, 6);
	} else if (id === 'JR-East.Narita') {
		stationOrder = stationOrder.slice(0, 3);
	} else if (id === 'JR-East.Uchibo' || id === 'JR-East.Sotobo') {
		stationOrder = stationOrder.slice(0, 3);
	} else if (id === 'JR-East.Yokosuka') {
		stationOrder = stationOrder.slice(0, 11);
	}
	railwayRef.stations = stationOrder.map(function(station) {
		return station.s;
	});
	merge(railwayRef.title, railway.title);
	railwayRef.color = railway.color;
	railwayRef.altitude = railway.altitude;
	railwayRef.carComposition = railway.carComposition;
});

var railwayFeatureArray = [];

[13, 14, 15, 16, 17, 18].forEach(function(zoom) {
	var unit = Math.pow(2, 14 - zoom) * .1;

	coordinateData.railways.forEach(function(railway) {
		var id = railway.id;
		var sublines = railway.sublines;
		var railwayFeature = turf.lineString(concat(sublines.map(function(subline) {
			var start = subline.start;
			var end = subline.end;
			var coords = subline.coords;
			var feature, offset;

			if (subline.type === 'sub') {
				feature = turf.lineSlice(coords[0], coords[coords.length - 1], featureLookup[start.railway + '.' + zoom]);
				offset = start.offset;

				if (offset) {
					feature = lineOffset(feature, offset * unit);
				}

				// Rewind if the overlap line is in opposite direction
				if (subline.reverse) {
					turf.getCoords(feature).reverse();
				}

				subline.feature = feature;
			}

			return subline;
		}).map(function(subline, i) {
			var interpolate, coordinates, feature1, feature2, length1, length2, coord1, coord2, f, nextSubline;

			function smoothCoords(reverse) {
				var start = !reverse ? 0 : coordinates.length - 1;
				var end = !reverse ? coordinates.length - 1 : 0;
				var step = !reverse ? 1 : -1;
				var feature = featureLookup[nextSubline.railway + '.' + zoom];
				var nearest = getNearestPointProperties(feature, coordinates[start]);
				var baseOffset = nextSubline.offset * unit - nearest.distance;
				var baseFeature = turf.lineString(coordinates);
				var baseLocation = getLocationAlongLine(baseFeature, coordinates[start]);
				var transition = Math.abs(nextSubline.offset) * .5 + .5;
				var factors = [];
				var j, distance;

				for (j = start; j !== end; j += step) {
					distance = Math.abs(getLocationAlongLine(baseFeature, coordinates[j]) - baseLocation);
					if (distance > transition) {
						break;
					}
					factors[j] = easeInOutQuad(1 - distance / transition);
				}
				for (j = start; j !== end && factors[j] > 0; j += step) {
					coordinates[j] = turf.getCoord(turf.destination(
						coordinates[j], baseOffset * factors[j], nearest.bearing
					));
				}
			}

			if (subline.type === 'interpolate') {
				interpolate = subline.interpolate;
				coordinates = [];
				feature1 = lineOffset(turf.lineSlice(
					sublines[i - 1].coords[sublines[i - 1].coords.length - 1],
					sublines[i + 1].coords[0],
					featureLookup[sublines[i - 1].end.railway + '.' + zoom]
				), sublines[i - 1].end.offset * unit);
				feature2 = lineOffset(turf.lineSlice(
					sublines[i - 1].coords[sublines[i - 1].coords.length - 1],
					sublines[i + 1].coords[0],
					featureLookup[sublines[i + 1].start.railway + '.' + zoom]
				), sublines[i + 1].start.offset * unit);
				length1 = turf.length(feature1);
				length2 = turf.length(feature2);
				for (j = 1; j < interpolate; j++) {
					coord1 = turf.getCoord(turf.along(feature1, length1 * (!sublines[i - 1].reverse ? j : interpolate - j) / interpolate));
					coord2 = turf.getCoord(turf.along(feature2, length2 * (!sublines[i + 1].reverse ? j : interpolate - j) / interpolate));
					f = easeInOutQuad(j / interpolate);
					coordinates.push([
						coord1[0] * (1 - f) + coord2[0] * f,
						coord1[1] * (1 - f) + coord2[1] * f
					]);
				}
				subline.feature = turf.lineString(coordinates);
			} else if (subline.type === 'main') {
				coordinates = subline.coords.map(function(d) { return d.slice(); });
				nextSubline = subline.start;
				if (nextSubline) {
					smoothCoords();
				}
				nextSubline = subline.end;
				if (nextSubline) {
					smoothCoords(true);
				}
				subline.feature = turf.lineString(coordinates);
			}

			return turf.getCoords(subline.feature);
		})), {color: railway.color, width: 8});

		if (railway.altitude < 0) {
			setAltitude(railwayFeature, railway.altitude * unit * 1000);
		}

		railwayFeature.properties.id = id + '.' + zoom;
		railwayFeature.properties.zoom = zoom;
		railwayFeature.properties.type = 0;
		railwayFeature.properties.altitude = (railway.altitude || 0) * unit * 1000;

		// Set station offsets
		railwayFeature.properties['station-offsets'] = railwayLookup[id].stations.map(function(station, i, stations) {
			// If the line has a loop, the last offset must be set explicitly
			// Otherwise, the location of the last station goes wrong
			return railway.loop && i === stations.length - 1 ?
				turf.length(railwayFeature) :
				getLocationAlongLine(railwayFeature, stationLookup[station].coord);
		});

		railwayFeatureArray.push(railwayFeature);
		featureLookup[id + '.' + zoom] = railwayFeature;
	});

	stationData.forEach(function(stations) {
		var features = [];
		var connectionCoords = [];
		var feature;

		if (!Array.isArray(stations)) {
			stations = [stations];
		}

		stations.forEach(function(station) {
			var coords = station.aliases.map(function(s) {
				var stationRef = stationLookup[s];
				var feature = featureLookup[stationRef.railway + '.' + zoom];
				return turf.getCoord(turf.nearestPointOnLine(feature, stationRef.coord));
			});
			var feature = coords.length === 1 ? turf.point(coords[0]) : turf.lineString(coords);

			features.push(turf.buffer(feature, unit));
			connectionCoords.push(coords[0]);
		});

		// If there are connections, add extra features
		if (connectionCoords.length > 1) {
			features.push(turf.buffer(turf.lineString(connectionCoords), unit / 4));
		}

		feature = turf.union.apply(this, features);

		if (stations[0].altitude < 0) {
			setAltitude(feature, stations[0].altitude * unit * 1000);
		}

		feature.properties = {
			outlineColor: '#000000',
			width: 4,
			color: '#FFFFFF',
			zoom: zoom,
			type: 1,
			altitude: (stations[0].altitude || 0) * unit * 1000
		};

		railwayFeatureArray.push(feature);
	});
});

coordinateData.airways.forEach(function(airway) {
	var id = airway.id;
	var airwayFeature = turf.lineString(airway.coords, {color: airway.color, width: 8});

	airwayFeature.properties.id = id;
	airwayFeature.properties.type = 0;
	airwayFeature.properties.altitude = 1;
	airwayFeature.properties.length = turf.length(airwayFeature);

	railwayFeatureArray.push(airwayFeature);
	featureLookup[id] = airwayFeature;
});

var railwayFeatureCollection = turf.featureCollection(railwayFeatureArray);

railDirectionRefData = railDirectionRefData.map(function(direction) {
	return {
		id: removePrefix(direction['owl:sameAs']),
		title: direction['odpt:railDirectionTitle']
	};
});

railDirectionLookup = buildLookup(railDirectionRefData, 'id');

// Update rail direction lookup dictionary
railDirectionData.forEach(function(direction) {
	merge(railDirectionLookup[direction.id].title, direction.title);
});

trainTypeRefData = trainTypeRefData.map(function(type) {
	return {
		id: removePrefix(type['owl:sameAs']),
		title: type['odpt:trainTypeTitle']
	};
});

trainTypeLookup = buildLookup(trainTypeRefData, 'id');

// Update train type lookup dictionary
trainTypeData.map(function(type) {
	merge(trainTypeLookup[type.id].title, type.title);
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

	map.addLayer(new MapboxLayer({
		id: 'airways',
		type: GeoJsonLayer,
		data: filterFeatures(railwayFeatureCollection, function(p) {
			return p.type === 0 && p.altitude > 0;
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
		lineWidthScale: clamp(Math.pow(2, map.getZoom() - 12), .125, 1),
		lineJointRounded: true
	}), 'building-3d');

	// Workaround for deck.gl #3522
	map.__deck.props.getCursor = function() {
		return map.getCanvas().style.cursor;
	};

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

	map.getStyle().layers.filter(function(layer) {
		return layer.type === 'line' || layer.type.lastIndexOf('fill', 0) !== -1;
	}).forEach(function(layer) {
		opacityStore[layer.id] = map.getPaintProperty(layer.id, layer.type + '-opacity') || 1;
	});

	map.addControl(new mapboxgl.NavigationControl());

	control = new mapboxgl.FullscreenControl();
	control._updateTitle = function() {
		mapboxgl.FullscreenControl.prototype._updateTitle.apply(this, arguments);
		this._fullscreenButton.title = (this._isFullscreen() ? 'Exit' : 'Enter') + ' fullscreen';
	}
	map.addControl(control);

	map.addControl(new MapboxGLButtonControl({
		className: 'mapbox-ctrl-underground',
		title: 'Enter underground',
		eventHandler: function(event) {
			isUndergroundVisible = !isUndergroundVisible;
			this.title = (isUndergroundVisible ? 'Exit' : 'Enter') + ' underground';
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
				},
				duration: 300
			});
		}
	}), 'top-right');

	map.addControl(new MapboxGLButtonControl({
		className: 'mapbox-ctrl-export',
		title: 'Export',
		eventHandler: function() {
			exportJSON(turf.truncate(railwayFeatureCollection, {precision: 7}), 'features.json', 0);
			exportJSON(timetables.Weekday, 'timetable-weekday.json', 5000);
			exportJSON(timetables.SaturdayHoliday, 'timetable-holiday.json', 10000);
			exportJSON(stationRefData, 'stations.json', 15000);
			exportJSON(railwayRefData, 'railways.json', 20000);
			exportJSON(railDirectionRefData, 'rail-directions.json', 25000);
			exportJSON(trainTypeRefData, 'train-types.json', 30000);
		}
	}), 'top-right');

	map.on('click', function(e) {
		console.log(e.lngLat);
	});

	map.on('zoom', function() {
		var lineWidthScale = clamp(Math.pow(2, map.getZoom() - 12), .125, 1);

		setLayerProps(map, 'railways-ug-13', {lineWidthScale: lineWidthScale});
		setLayerProps(map, 'stations-ug-13', {lineWidthScale: lineWidthScale});
		setLayerProps(map, 'airways', {lineWidthScale: lineWidthScale});
	});

	repeat();
});

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

function getNearestPointProperties(line, point) {
	var nearestPoint = turf.nearestPointOnLine(line, point);
	var properties = nearestPoint.properties;
	var coords = turf.getCoords(line);
	var index = Math.min(properties.index, coords.length - 2);
	var lineBearing = turf.bearing(coords[index], coords[index + 1]);
	var bearing = turf.bearing(nearestPoint, point);
	var sign = getAngle(lineBearing, bearing) >= 0 ? 1 : -1;

	return {
		point: nearestPoint,
		bearing: bearing + (1 - sign) * 90,
		distance: properties.dist * sign
	}
}

function getLocationAlongLine(line, point) {
	var nearestPoint = turf.nearestPointOnLine(line, point);
	return nearestPoint.properties.location;
}

function getAngle(bearing1, bearing2) {
	var angle = bearing2 - bearing1;

	if (angle > 180) {
		angle -= 360;
	} else if (angle < -180) {
		angle += 360;
	}
	return angle;
}

// Better version of turf.lineOffset
function lineOffset(geojson, distance) {
	var coords = turf.getCoords(geojson);
	var coordsLen = coords.length;
	var start = coords[0];
	var startBearing = turf.bearing(start, coords[2] || coords[1]);
	var end = coords[coordsLen - 1];
	var endBearing = turf.bearing(coords[coordsLen - 3] || coords[coordsLen - 2], end);
	var bearingOffset = distance > 0 ? 90 : -90;

	// Converting meters to Mercator meters
	var dist = Math.abs(distance / Math.cos((start[1] + end[1]) * Math.PI / 360));
	var polygonLine = turf.polygonToLine(
		turf.buffer(geojson, dist, {step: coordsLen * 2 + 64})
	);
	var polygonLineCoords = turf.getCoords(polygonLine);
	var length = polygonLineCoords.length;
	var p0 = turf.nearestPointOnLine(polygonLine, turf.destination(start, dist, startBearing + 180));
	var tempCoords = [];
	var step = distance > 0 ? -1 : 1;
	var i;

	// First, rotate coordinates
	for (i = 0; i < length; i++) {
		tempCoords.push(polygonLineCoords[(p0.properties.index + i * step + length) % length]);
	}

	// Then, slice the line
	var p1 = turf.nearestPointOnLine(polygonLine, turf.destination(start, dist, startBearing + bearingOffset));
	var p2 = turf.nearestPointOnLine(polygonLine, turf.destination(end, dist, endBearing + bearingOffset));

	return turf.lineSlice(p1, p2, turf.lineString(tempCoords));
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
	requestAnimationFrame(repeat);
}

function startAnimation(options) {
	if (!options.duration) {
		options.duration = Infinity;
	}
	animations[animationID] = options;
	return animationID++;
}

function stopAnimation(id) {
	if (animations[id]) {
		delete animations[id];
	}
}

function easeInOutQuad(t) {
	if ((t /= 0.5) < 1) {
		return 0.5 * t * t;
	}
	return -0.5 * ((--t) * (t - 2) - 1);
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

function exportJSON(obj, fileName, delay) {
	setTimeout(function() {
		var link = document.createElement('a');
		link.download = fileName;
		link.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(obj));
		link.dispatchEvent(new MouseEvent('click'));
	}, delay);
}

function loadStationRefData() {
	return Promise.all([
		'JR-East', 'JR-Central', 'TWR', 'Izukyu', 'Tobu', 'Seibu', 'Tokyu',
		'SaitamaRailway', 'Minatomirai', 'Keio', 'TokyoMetro', 'Toei', 'Tobu',
		'ToyoRapid', 'Odakyu', 'Keikyu', 'Keisei', 'Hokuso', 'Shibayama'
	].map(function(operator) {
		return loadJSON(API_URL + 'odpt:Station?odpt:operator=odpt.Operator:' + operator + '&' + API_TOKEN);
	})).then(function(stationRefData) {
		return concat(stationRefData).map(function(station) {
			return {
				coord: [station['geo:long'], station['geo:lat']],
				id: removePrefix(station['owl:sameAs']),
				railway: removePrefix(station['odpt:railway']),
				title: station['odpt:stationTitle']
			};
		});
	});
}

function loadRailwayRefData() {
	return loadJSON(API_URL + 'odpt:Railway?odpt:operator=' + ['JR-East', 'TWR', 'TokyoMetro', 'Toei', 'Keio'].map(function(operator) {
		return 'odpt.Operator:' + operator;
	}).join(',') + '&' + API_TOKEN).then(function(railwayRefData) {
		return railwayRefData.map(function(railway) {
			return {
				id: removePrefix(railway['owl:sameAs']),
				title: railway['odpt:railwayTitle'],
				order: railway['odpt:stationOrder'].map(function(obj) {
					return {
						s: removePrefix(obj['odpt:station'])
					};
				}),
				ascending: removePrefix(railway['odpt:ascendingRailDirection'])
			};
		});
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
