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

var OPERATORS_FOR_RAILWAYS = [
	'JR-East',
	'TWR',
	'TokyoMetro',
	'Toei',
	'YokohamaMunicipal',
	'Keio',
	'Keikyu',
	'Keisei',
	'Hokuso',
	'Shibayama',
	'Tobu',
	'Seibu',
	'Odakyu',
	'Tokyu',
	'Minatomirai',
	'SaitamaRailway',
	'MIR',
	'ToyoRapid',
	'Yurikamome',
	'TokyoMonorail'
];

var OPERATORS_FOR_STATIONS = [
	'JR-East',
	'JR-Central',
	'JR-West',
	'JR-Shikoku',
	'TWR',
	'TokyoMetro',
	'Toei',
	'YokohamaMunicipal',
	'Keio',
	'Keikyu',
	'Keisei',
	'Hokuso',
	'Shibayama',
	'Tobu',
	'Aizu',
	'Seibu',
	'Chichibu',
	'Odakyu',
	'HakoneTozan',
	'Tokyu',
	'Minatomirai',
	'SaitamaRailway',
	'MIR',
	'ToyoRapid',
	'Yurikamome',
	'Izukyu',
	'IzuHakone',
	'Fujikyu'
];

var CALENDARS = [
	'Weekday',
	'SaturdayHoliday'
];

var OPERATORS_FOR_TRAINTIMETABLES = [
	'JR-East',
	'TWR',
	'TokyoMetro',
	'Toei',
	'YokohamaMunicipal',
	'Keio'
];

var OPERATORS_FOR_TRAINTYPES = [
	'JR-East',
	'TWR',
	'TokyoMetro',
	'Toei',
	'YokohamaMunicipal',
	'Keio',
	'Keikyu',
	'Keisei',
	'Tobu',
	'Seibu',
	'Odakyu',
	'Tokyu',
	'Yurikamome'
];

var RAILWAY_CHUOSOBULOCAL = 'JR-East.ChuoSobuLocal';
var RAILWAY_KEIYO = 'JR-East.Keiyo';
var RAILWAY_KEIYOKOYABRANCH = 'JR-East.KeiyoKoyaBranch';
var RAILWAY_KEIYOFUTAMATABRANCH = 'JR-East.KeiyoFutamataBranch';
var RAILWAY_OEDO = 'Toei.Oedo';

var RAILWAYS_FOR_SOBURAPID = [
	'JR-East.NaritaAirportBranch',
	'JR-East.Narita',
	'JR-East.Sobu'
];

var STATION_KEIYO_NISHIFUNABASHI = 'JR-East.Keiyo.NishiFunabashi';
var STATION_OEDO_TOCHOMAE = 'Toei.Oedo.Tochomae';
var STATION_OEDO_SHINJUKUNISHIGUCHI = 'Toei.Oedo.ShinjukuNishiguchi';

var TRAINTYPES_FOR_SOBURAPID = [
	'JR-East.Rapid',
	'JR-East.LimitedExpress'
];

var a = '';
var lang = getLang();
var timetables = {};
var isUndergroundVisible = false;
var styleOpacities = [];
var animations = {};
var featureLookup = {};
var animationID = 0;
var stationLookup, railwayLookup, timetableLookup, railDirectionLookup, trainTypeLookup, operatorLookup, airportLookup, flightStatusLookup;

// Replace MapboxLayer.render to support underground rendering
var render = deck.MapboxLayer.prototype.render;
deck.MapboxLayer.prototype.render = function(gl, matrix) {
	var _deck = this.deck;
	var map = this.map;
	var center = map.getCenter();

	if (!_deck.layerManager) {
		// Not yet initialized
		return;
	}

	if (!_deck.props.userData.currentViewport) {
		_deck.props.userData.currentViewport = new deck.WebMercatorViewport({
			x: 0,
			y: 0,
			width: _deck.width,
			height: _deck.height,
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

Promise.all([
	loadJSON('data-extra/coordinates.json'),
	loadJSON('data-extra/railways.json'),
	loadJSON('data-extra/stations.json'),
	loadJSON('data-extra/station-groups.json'),
	loadJSON('data-extra/timetable-weekday.json'),
	loadJSON('data-extra/timetable-holiday.json'),
	loadJSON('data-extra/rail-directions.json'),
	loadJSON('data-extra/train-types.json'),
	loadJSON('data-extra/operators.json'),
	loadJSON('data-extra/airports.json'),
	loadJSON('data-extra/flight-status.json'),
	loadRailwayRefData(),
	loadStationRefData(),
	loadTrainTimetableRefData(),
	loadRailDirectionRefData(),
	loadTrainTypeRefData(),
	loadOperatorRefData(),
	loadAirportRefData(),
	loadFlightStatusRefData()
]).then(function([
	coordinateData, railwayData, stationData, stationGroupData, timetableWeekdayData, timetableHolidayData, railDirectionData, trainTypeData, operatorData, airportData, flightStatusData,
	railwayRefData, stationRefData, trainTimetableRefData, railDirectionRefData, trainTypeRefData, operatorRefData, airportRefData, flightStatusRefData
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

// Build railway data
railwayLookup = buildLookup(railwayRefData);
railwayData.forEach(function(railway) {
	var id = railway.id;
	var stations = railway.stations;
	var ascending = railway.ascending;
	var railwayRef = railwayLookup[id];
	var insert;

	if (!railwayRef) {
		railwayRef = railwayLookup[id] = {
			id: id,
			title: {},
			stations: []
		};
		railwayRefData.push(railwayRef);
	}

	merge(railwayRef.title, railway.title);
	if (stations) {
		insert = stations.insert || [];
		Array.prototype.splice.apply(railwayRef.stations, [stations.index, stations.delete].concat(insert));
	}
	if (ascending !== undefined) {
		railwayRef.ascending = ascending;
	}
	railwayRef.color = railway.color;
	railwayRef.altitude = railway.altitude;
	railwayRef.carComposition = railway.carComposition;
});

// Build station data
stationLookup = buildLookup(stationRefData);
stationData.forEach(function(station) {
	var id = station.id;
	var coord = station.coord;
	var altitude = station.altitude;
	var stationRef = stationLookup[id];

	if (!stationRef) {
		stationRef = stationLookup[id] = {
			id: id,
			railway: station.railway,
			title: {}
		};
		stationRefData.push(stationRef);
	}
	if (coord) {
		stationRef.coord = coord;
	}
	merge(stationRef.title, station.title);
	if (altitude !== undefined) {
		stationRef.altitude = altitude;
	}
});

// Build station group data
var nonTransitStations = concat(railwayData.map(function(railway) {
	return railwayLookup[railway.id].stations;
}));
stationGroupData.forEach(function(group) {
	group.forEach(function(stations) {
		stations.forEach(function(station) {
			var index = nonTransitStations.indexOf(station);
			if (index !== -1) {
				delete nonTransitStations[index];
			}
		});
	});
});
stationGroupData = stationGroupData.concat(nonTransitStations.map(function(station) {
	return [[station]];
}));

var railwayFeatureArray = [];

[13, 14, 15, 16, 17, 18].forEach(function(zoom) {
	var unit = Math.pow(2, 14 - zoom) * .1;

	coordinateData.railways.forEach(function(railway) {
		var id = railway.id;
		var mixed = false;
		var railwayFeature = turf.lineString(concat(railway.sublines.map(function(subline) {
			var type = subline.type;
			var start = subline.start;
			var end = subline.end;
			var coords = subline.coords;
			var altitude = valueOrDefault(subline.altitude, railway.altitude) || 0;
			var opacity = subline.opacity;
			var coordinates, feature, offset, interpolate, feature1, feature2, length1, length2, i, coord1, coord2, f;

			function smoothCoords(nextSubline, reverse) {
				var start = !reverse ? 0 : coordinates.length - 1;
				var end = !reverse ? coordinates.length - 1 : 0;
				var step = !reverse ? 1 : -1;
				var feature = featureLookup[nextSubline.railway + '.' + zoom];
				var nearest = getNearestPointProperties(feature, coordinates[start]);
				var baseOffset = nextSubline.offset * unit - nearest.distance;
				var baseFeature = turf.lineString(coordinates);
				var baseLocation = getLocationAlongLine(baseFeature, coordinates[start]);
				var transition = Math.min(Math.abs(nextSubline.offset) * .75 + .75, turf.length(baseFeature));
				var factors = [];
				var i, distance;

				for (i = start; i !== end; i += step) {
					distance = Math.abs(getLocationAlongLine(baseFeature, coordinates[i]) - baseLocation);
					if (distance > transition) {
						break;
					}
					factors[i] = easeInOutQuad(1 - distance / transition);
				}
				for (i = start; i !== end && factors[i] > 0; i += step) {
					coordinates[i] = turf.getCoord(turf.destination(
						coordinates[i], baseOffset * factors[i], nearest.bearing
					));
				}
			}

			function smoothAltitude(baseAltitude, reverse) {
				var start = !reverse ? 0 : coordinates.length - 1;
				var end = !reverse ? coordinates.length - 1 : 0;
				var step = !reverse ? 1 : -1;
				var baseFeature = turf.lineString(coordinates);
				var baseLocation = getLocationAlongLine(baseFeature, coordinates[start]);
				var baseAltitudeMeter = baseAltitude * unit * 1000;
				var i, distance;

				for (i = start; i !== end; i += step) {
					distance = Math.abs(getLocationAlongLine(baseFeature, coordinates[i]) - baseLocation);
					if (distance > .4) {
						break;
					}
					coordinates[i][2] = (baseAltitudeMeter + ((coordinates[i][2] || 0) - baseAltitudeMeter) * easeInOutQuad(distance / .4));
				}
			}

			function alignDirection(feature, coords) {
				var coordinates = turf.getCoords(feature);
				var start = coordinates[0];

				// Rewind if the line string is in opposite direction
				if (turf.distance(coords[0], start) > turf.distance(coords[coords.length - 1], start)) {
					coordinates.reverse();
				}

				return coordinates;
			}

			if (type === 'main' || (type === 'hybrid' && zoom >= subline.zoom)) {
				coordinates = coords.map(function(d) { return d.slice(); });
				if (start && start.railway && !(zoom >= start.zoom)) {
					smoothCoords(start);
				}
				if (end && end.railway && !(zoom >= end.zoom)) {
					smoothCoords(end, true);
				}
			} else if (type === 'sub' || (type === 'hybrid' && zoom < subline.zoom)) {
				if (start.railway === end.railway && start.offset === end.offset) {
					feature = lineSlice(coords[0], coords[coords.length - 1], featureLookup[start.railway + '.' + zoom]);
					offset = start.offset;
					coordinates = alignDirection(offset ? lineOffset(feature, offset * unit) : feature, coords);
				} else {
					interpolate = subline.interpolate;
					coordinates = [];
					feature1 = lineOffset(lineSlice(
						coords[0],
						coords[coords.length - 1],
						featureLookup[start.railway + '.' + zoom]
					), start.offset * unit);
					alignDirection(feature1, coords);
					feature2 = lineOffset(lineSlice(
						coords[0],
						coords[coords.length - 1],
						featureLookup[end.railway + '.' + zoom]
					), end.offset * unit);
					alignDirection(feature2, coords);
					length1 = turf.length(feature1);
					length2 = turf.length(feature2);
					for (i = 1; i < interpolate; i++) {
						coord1 = turf.getCoord(turf.along(feature1, length1 * i / interpolate));
						coord2 = turf.getCoord(turf.along(feature2, length2 * i / interpolate));
						f = easeInOutQuad(i / interpolate);
						coordinates.push([
							coord1[0] * (1 - f) + coord2[0] * f,
							coord1[1] * (1 - f) + coord2[1] * f
						]);
					}
				}
			}
			interpolateCoordinates(coordinates,
				start && start.altitude !== undefined ? .4 : 0,
				end && end.altitude !== undefined ? .4 : 0);
			if (altitude) {
				coordinates.forEach(function(coord) {
					coord[2] = altitude * unit * 1000;
				});
			}
			if (start && start.altitude !== undefined) {
				smoothAltitude(start.altitude);
				mixed = true;
			}
			if (end && end.altitude !== undefined) {
				smoothAltitude(end.altitude, true);
				mixed = true;
			}
			if (opacity !== undefined) {
				coordinates.forEach(function(coord) {
					coord[3] = opacity;
				});
				mixed = true;
			}

			return coordinates;
		})), {
			id: id + '.' + zoom,
			type: 0,
			color: railway.color,
			width: 8,
			zoom: zoom
		});

		featureLookup[id + '.' + zoom] = railwayFeature;
		if (id.indexOf('Base.') === 0) {
			return;
		}

		railwayFeature.properties.altitude = mixed ? undefined : (railway.altitude || 0) * unit * 1000;

		// Set station offsets
		railwayFeature.properties['station-offsets'] = railwayLookup[id].stations.map(function(station, i, stations) {
			// If the line has a loop, the last offset must be set explicitly
			// Otherwise, the location of the last station goes wrong
			return railway.loop && i === stations.length - 1 ?
				turf.length(railwayFeature) :
				getLocationAlongLine(railwayFeature, stationLookup[station].coord);
		});

		railwayFeatureArray.push(railwayFeature);

		if (mixed) {
			var ugCoords = [[]];
			var ogCoords = [[]];

			turf.getCoords(railwayFeature).forEach(function(coord, i, coords) {
				if (coord[3] !== undefined) {
					coord.pop();
				} else {
					if (coord[2] < 0 || (coords[i - 1] && coords[i - 1][2] < 0) || (coords[i + 1] && coords[i + 1][2] < 0)) {
						ugCoords[ugCoords.length - 1].push(coord);
						if (!(coord[2] < 0) && (coords[i - 1] && coords[i - 1][2] < 0)) {
							ugCoords.push([]);
						}
					}
					if (!(coord[2] < 0)) {
						ogCoords[ogCoords.length - 1].push(coord);
						if (coords[i + 1] && coords[i + 1][2] < 0) {
							ogCoords.push([]);
						}
					}
				}
			});
			if (ugCoords[ugCoords.length - 1].length === 0) {
				ugCoords.pop();
			}
			if (ogCoords[ogCoords.length - 1].length === 0) {
				ogCoords.pop();
			}
			railwayFeatureArray.push(turf.multiLineString(ugCoords, {
				id: id + '.ug.' + zoom,
				type: 0,
				color: railway.color,
				width: 8,
				zoom: zoom,
				altitude: -unit * 1000
			}));
			railwayFeatureArray.push(turf.multiLineString(ogCoords, {
				id: id + '.og.' + zoom,
				type: 0,
				color: railway.color,
				width: 8,
				zoom: zoom,
				altitude: 0
			}));
		}
	});

	stationGroupData.forEach(function(group) {
		var altitude = stationLookup[group[0][0]].altitude;
		var features = [];
		var connectionCoords = [];
		var feature;

		group.forEach(function(stations) {
			var coords = stations.map(function(station) {
				var stationRef = stationLookup[station];
				var feature = featureLookup[stationRef.railway + '.' + zoom];
				return turf.getCoord(turf.nearestPointOnLine(feature, stationRef.coord));
			});
			var feature = coords.length === 1 ? turf.point(coords[0]) : turf.lineString(coords);

			features.push(turf.buffer(feature, unit));
			connectionCoords = connectionCoords.concat(coords);
		});

		// If there are connections, add extra features
		if (group.length > 1) {
			features.push(turf.buffer(turf.lineString(connectionCoords), unit / 4));
		}

		feature = turf.union.apply(this, features);

		if (altitude < 0) {
			setAltitude(feature, altitude * unit * 1000);
		}

		feature.properties = {
			type: 1,
			outlineColor: '#000000',
			width: 4,
			color: '#FFFFFF',
			zoom: zoom,
			altitude: (altitude || 0) * unit * 1000
		};

		railwayFeatureArray.push(feature);
	});
});

coordinateData.airways.forEach(function(airway) {
	var id = airway.id;
	var airwayFeature = turf.lineString(airway.coords, {
		id: id,
		type: 0,
		color: airway.color,
		width: 8,
		altitude: 1
	});

	airwayFeature.properties.length = turf.length(airwayFeature);

	railwayFeatureArray.push(airwayFeature);
	featureLookup[id] = airwayFeature;
});

var railwayFeatureCollection = turf.featureCollection(railwayFeatureArray);

// Build timetable data
timetableLookup = buildLookup(concat([trainTimetableRefData.weekday, trainTimetableRefData.holiday]));
[{
	data: timetableWeekdayData,
	refData: trainTimetableRefData.weekday
}, {
	data: timetableHolidayData,
	refData: trainTimetableRefData.holiday
}].forEach(function(tCalendar) {
	tCalendar.data.forEach(function(timetable) {
		var id = timetable.id;
		var pt = timetable.pt;
		var nt = timetable.nt;
		var timetableRef = timetableLookup[id];

		if (!timetableRef) {
			timetableLookup[id] = timetable;
			tCalendar.refData.push(timetable);
		} else {
			if (pt) {
				timetableRef.pt = pt;
			}
			if (nt) {
				timetableRef.nt = nt;
			}
		}
	});
});

// Modify SobuRapid, Sobu, Narita and Narita Airport branch timetables
Object.keys(trainTimetableRefData).forEach(function(key) {
	RAILWAYS_FOR_SOBURAPID.forEach(function(railwayID) {
		trainTimetableRefData[key].filter(function(table) {
			return table.r === railwayID && includes(TRAINTYPES_FOR_SOBURAPID, table.y);
		}).forEach(function(table) {
			var tt = table.tt;
			var nt = table.nt;
			var pt = table.pt;
			var nextTable, prevTable, r, ntt, ptt;

			if (nt) {
				nextTable = timetableLookup[nt[0]];
			}
			if (pt) {
				prevTable = timetableLookup[pt[0]];
			}
			if (nextTable || prevTable) {
				r = (nextTable || prevTable).r;
				tt.forEach(function(obj) {
					obj.s = obj.s.replace(railwayID, r);
				});
			}

			if (nextTable) {
				ntt = nextTable.tt;
				if (!tt[tt.length - 1].d && !ntt[0].a) {
					merge(ntt[0], tt.pop());
				}
				Array.prototype.splice.apply(ntt, [0, 0].concat(tt));
				delete nextTable.pt;
			} else if (prevTable) {
				ptt = prevTable.tt;
				if (!tt[0].a && !ptt[ptt.length - 1].d) {
					merge(ptt[ptt.length - 1], tt.shift());
				}
				Array.prototype.splice.apply(ptt, [ptt.length, 0].concat(tt));
				delete prevTable.nt;
			}
			trainTimetableRefData[key].splice(trainTimetableRefData[key].indexOf(table), 1);
			delete timetableLookup[table.id];
		});
	});
});

// Modify Keiyo branch timetables
Object.keys(trainTimetableRefData).forEach(function(key) {
	trainTimetableRefData[key].filter(function(table) {
		var tt = table.tt;
		return table.r === RAILWAY_KEIYO &&
			(tt[0].s === STATION_KEIYO_NISHIFUNABASHI ||
			tt[tt.length - 1].s === STATION_KEIYO_NISHIFUNABASHI);
	}).forEach(function(table) {
		var tt = table.tt;
		var startFromNishiFunabashi = tt[0].s === STATION_KEIYO_NISHIFUNABASHI;
		var direction = table.d;
		var railwayID = table.r = (startFromNishiFunabashi && direction === 'Outbound') ||
			(!startFromNishiFunabashi && direction === 'Inbound') ?
			RAILWAY_KEIYOKOYABRANCH : RAILWAY_KEIYOFUTAMATABRANCH;

		[table.os, table.ds].forEach(function(stations) {
			stations.forEach(function(station, i) {
				stations[i] = station.replace(RAILWAY_KEIYO, railwayID);
			});
		});
		tt.forEach(function(obj) {
			obj.s = obj.s.replace(RAILWAY_KEIYO, railwayID);
		});
	});
});

// Modify Toei Oedo timetables
Object.keys(trainTimetableRefData).forEach(function(key) {
	trainTimetableRefData[key].filter(function(table) {
		return table.r === RAILWAY_OEDO;
	}).forEach(function(table) {
		var tt = table.tt;

		tt.forEach(function(obj, i) {
			var prev = tt[i - 1] || {};
			var next = tt[i + 1] || {};

			if (obj.s === STATION_OEDO_TOCHOMAE &&
				prev.s !== STATION_OEDO_SHINJUKUNISHIGUCHI &&
				next.s !== STATION_OEDO_SHINJUKUNISHIGUCHI) {
				obj.s += '.1';
			}
		});
	});
});

// Build rail direction data
railDirectionLookup = buildLookup(railDirectionRefData);
railDirectionData.forEach(function(direction) {
	merge(railDirectionLookup[direction.id].title, direction.title);
});

// Build train type data
trainTypeLookup = buildLookup(trainTypeRefData);
trainTypeData.map(function(type) {
	var id = type.id;
	var trainTypeRef = trainTypeLookup[id];

	if (!trainTypeRef) {
		trainTypeRef = trainTypeLookup[id] = {
			id: id,
			title: {}
		};
		trainTypeRefData.push(trainTypeRef);
	}
	merge(trainTypeRef.title, type.title);
});

// Build operator data
operatorLookup = buildLookup(operatorRefData);
operatorData.forEach(function(operator) {
	var operatorRef = operatorLookup[operator.id];

	merge(operatorRef.title, operator.title);
	operatorRef.color = operator.color;
	operatorRef.tailcolor = operator.tailcolor;
});

// Build airport data
airportLookup = buildLookup(airportRefData);
airportData.forEach(function(airport) {
	var airportRef = airportLookup[airport.id];

	merge(airportRef.title, airport.title);
	airportRef.direction = airport.direction;
});

// Build flight status data
flightStatusLookup = buildLookup(flightStatusRefData);
flightStatusData.forEach(function(status) {
	merge(flightStatusLookup[status.id].title, status.title);
});

map.once('load', function () {
	document.getElementById('loader').style.display = 'none';
});

map.once('styledata', function () {
	map.setLayoutProperty('poi', 'text-field', '{name' + (lang === 'en' ? '_en}' : lang === 'ko' ? '_ko}' : '}'));

	[13, 14, 15, 16, 17, 18].forEach(function(zoom) {
		var minzoom = zoom <= 13 ? 0 : zoom;
		var maxzoom = zoom >= 18 ? 24 : zoom + 1;
		var lineWidthScale = zoom === 13 ? clamp(Math.pow(2, map.getZoom() - 12), .125, 1) : 1;

		map.addLayer(new deck.MapboxLayer({
			id: 'railways-ug-' + zoom,
			type: deck.GeoJsonLayer,
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
		map.addLayer(new deck.MapboxLayer({
			id: 'stations-ug-' + zoom,
			type: deck.GeoJsonLayer,
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
		return layer.type === 'line' || layer.type.indexOf('fill') === 0;
	}).forEach(function(layer) {
		var id = layer.id;
		var key = layer.type + '-opacity';

		styleOpacities.push({id: id, key: key, opacity: map.getPaintProperty(id, key) || 1});
	});

	map.addControl(new mapboxgl.NavigationControl());

	control = new mapboxgl.FullscreenControl();
	control._updateTitle = function() {
		mapboxgl.FullscreenControl.prototype._updateTitle.apply(this, arguments);
		this._fullscreenButton.title = (this._isFullscreen() ? 'Exit' : 'Enter') + ' fullscreen';
	};
	map.addControl(control);

	map.addControl(new MapboxGLButtonControl([{
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
			styleOpacities.forEach(function(item) {
				var id = item.id;
				var opacity = item.opacity;

				if (isUndergroundVisible) {
					opacity = scaleValues(opacity, includes(id, '-og-') ? .25 : .0625);
				}
				map.setPaintProperty(id, item.key, opacity);
			});

			startAnimation({
				callback: function(elapsed, duration) {
					var t = elapsed / duration;

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
	}]), 'top-right');

	map.addControl(new MapboxGLButtonControl([{
		className: 'mapbox-ctrl-export',
		title: 'Export',
		eventHandler: function() {
			exportJSON(turf.truncate(railwayFeatureCollection, {precision: 7}), 'features.json.gz', 0);
			exportJSON(trainTimetableRefData.weekday, 'timetable-weekday.json.gz', 5000);
			exportJSON(trainTimetableRefData.holiday, 'timetable-holiday.json.gz', 12000);
			exportJSON(stationRefData, 'stations.json.gz', 19000);
			exportJSON(railwayRefData, 'railways.json.gz', 19500);
			exportJSON(railDirectionRefData, 'rail-directions.json.gz', 20000);
			exportJSON(trainTypeRefData, 'train-types.json.gz', 20500);
			exportJSON(operatorRefData, 'operators.json.gz', 21000);
			exportJSON(airportRefData, 'airports.json.gz', 21500);
			exportJSON(flightStatusRefData, 'flight-status.json.gz', 22000);
		}
	}]), 'top-right');

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
	};
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

// Better version of turf.lineSlice
function lineSlice(startPt, stopPt, line) {
	var feature = turf.cleanCoords(turf.lineSlice(startPt, stopPt, line));
	var p1 = turf.nearestPointOnLine(line, startPt);
	var p2 = turf.nearestPointOnLine(line, stopPt);
	var start = turf.getCoords(line)[p1.properties.index];

	// Rewind if the line string is in opposite direction
	if (p1.properties.index === p2.properties.index && turf.distance(p1, start) > turf.distance(p2, start)) {
		turf.getCoords(feature).reverse();
	}

	return feature;
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

	return lineSlice(p1, p2, turf.lineString(tempCoords));
}

function filterFeatures(featureCollection, fn) {
	return turf.featureCollection(featureCollection.features.filter(function(feature) {
		return fn(feature.properties);
	}));
}

function interpolateCoordinates(coords, start, end) {
	var feature = turf.lineString(coords);
	var length = turf.length(feature);
	var interpolatedCoords, d, i;

	if (start) {
		interpolatedCoords = [];
		for (d = 0; d <= start; d += .05) {
			interpolatedCoords.push(turf.getCoord(turf.along(feature, Math.min(d, length))));
			if (d >= length) {
				break;
			}
		}
		for (i = 0; i < coords.length; i++) {
			if (getLocationAlongLine(feature, coords[i]) > start) {
				break;
			}
		}
		Array.prototype.splice.apply(coords, [0, i].concat(interpolatedCoords));
	}
	if (end) {
		interpolatedCoords = [];
		for (d = length; d >= length - end; d -= .05) {
			interpolatedCoords.unshift(turf.getCoord(turf.along(feature, Math.max(d, 0))));
			if (d <= 0) {
				break;
			}
		}
		for (i = coords.length; i > 0; i--) {
			if (getLocationAlongLine(feature, coords[i - 1]) < length - end) {
				break;
			}
		}
		Array.prototype.splice.apply(coords, [i, coords.length - i].concat(interpolatedCoords));
	}
}

function setLayerProps(map, id, props) {
	map.getLayer(id).implementation.setProps(props);
}

function repeat() {
	var ids = Object.keys(animations);
	var now = performance.now();
	var i, ilen, id, animation, nextFrame, start, duration, elapsed, callback;

	for (i = 0, ilen = ids.length; i < ilen; i++) {
		id = ids[i];
		animation = animations[id];
		if (animation) {
			nextFrame = animation.nextFrame;
			if (nextFrame > now) {
				continue;
			}
			start = animation.start = animation.start || now;
			duration = animation.duration;
			elapsed = now - start;
			callback = animation.callback;
			if (callback) {
				callback(Math.min(elapsed, duration), duration);
			}
			animation.nextFrame = Math.max((nextFrame || 0) + 1000 / (animation.frameRate || 120), now);
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

function startAnimation(options) {
	if (!options.duration) {
		options.duration = Infinity;
	}
	animations[animationID] = options;
	return animationID++;
}

function stopAnimation(id) {
	if (id in animations) {
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

function includes(array, value) {
	var i, ilen;

	if (!Array.isArray(value)) {
		return array.indexOf(value) !== -1;
	}
	for (i = 0, ilen = value.length; i < ilen; i++) {
		if (array.indexOf(value[i]) === -1) {
			return false;
		}
	}
	return true;
}

function valueOrDefault(value, defaultValue) {
	return value === undefined ? defaultValue : value;
}

function scaleValues(obj, value) {
	var result;

	if (!isNaN(obj)) {
		return obj * value;
	}

	result = {};
	Object.keys(obj).forEach(function(key) {
		if (key === 'stops') {
			result[key] = obj[key].map(function(element) {
				return [element[0], element[1] * value];
			});
		} else {
			result[key] = obj[key];
		}
	});
	return result;
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

function cleanKeys(obj) {
	Object.keys(obj).forEach(function(key) {
		if (obj[key] === undefined) {
			delete obj[key];
		}
	});
	return obj;
}

function loadJSON(url, delay) {
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
		};
		setTimeout(function() {
			request.send();
		}, delay || 0);
	});
}

function exportJSON(obj, fileName, delay) {
	setTimeout(function() {
		var link = document.createElement('a');
		link.download = fileName;
		link.href = 'data:application/gzip;base64,' + btoa(pako.gzip(JSON.stringify(obj), {level: 9, to: 'string'}));
		link.dispatchEvent(new MouseEvent('click'));
	}, delay);
}

function loadRailwayRefData() {
	return loadJSON(API_URL + 'odpt:Railway?odpt:operator=' + OPERATORS_FOR_RAILWAYS.map(function(operator) {
		return 'odpt.Operator:' + operator;
	}).join(',')).then(function(data) {
		return data.map(function(railway) {
			return {
				id: removePrefix(railway['owl:sameAs']),
				title: railway['odpt:railwayTitle'],
				stations: railway['odpt:stationOrder'].map(function(obj) {
					return removePrefix(obj['odpt:station'])
				}),
				ascending: removePrefix(railway['odpt:ascendingRailDirection'])
			};
		});
	});
}

function loadStationRefData() {
	return Promise.all(OPERATORS_FOR_STATIONS.map(function(operator) {
		return loadJSON(API_URL + 'odpt:Station?odpt:operator=odpt.Operator:' + operator);
	})).then(function(data) {
		return concat(data).map(function(station) {
			return {
				coord: [station['geo:long'], station['geo:lat']],
				id: removePrefix(station['owl:sameAs']),
				railway: removePrefix(station['odpt:railway']),
				title: station['odpt:stationTitle']
			};
		});
	});
}

function loadTrainTimetableRefData() {
	return loadJSON('data-extra/railways.json').then(function(railwayData) {
		return Promise.all(CALENDARS.map(function(calendar, i) {
			return Promise.all(railwayData.filter(function(railway) {
				return includes(OPERATORS_FOR_TRAINTIMETABLES, railway.id.replace(/\.\w+$/, ''));
			}).map(function(railway) {
				var id = railway.id;
				return loadJSON(API_URL + 'odpt:TrainTimetable?odpt:railway=odpt.Railway:' + id +
					(id === RAILWAY_CHUOSOBULOCAL ? '' : '&odpt:calendar=odpt.Calendar:' + calendar), i * 60000);
			})).then(function(data) {
				return concat(data).map(function(table) {
					return {
						t: removePrefix(table['odpt:train']),
						id: removePrefix(table['owl:sameAs']),
						r: removePrefix(table['odpt:railway']),
						y: removePrefix(table['odpt:trainType']),
						n: table['odpt:trainNumber'],
						os: removePrefix(table['odpt:originStation']),
						d: removePrefix(table['odpt:railDirection']),
						ds: removePrefix(table['odpt:destinationStation']),
						nt: removePrefix(table['odpt:nextTrainTimetable']),
						tt: table['odpt:trainTimetableObject'].map(function(obj) {
							var as = removePrefix(obj['odpt:arrivalStation']);
							var ds = removePrefix(obj['odpt:departureStation']);

							if (as && ds && as !== ds) {
								console.log('Error: ' + as + ' != ' + ds);
							}
							return cleanKeys({
								a: obj['odpt:arrivalTime'],
								d: obj['odpt:departureTime'],
								s: as || ds
							});
						}),
						pt: removePrefix(table['odpt:previousTrainTimetable'])
					};
				});
			});
		})).then(function(data) {
			return {
				weekday: data[0],
				holiday: data[1]
			};
		});
	});
}

function loadRailDirectionRefData() {
	return loadJSON(API_URL + 'odpt:RailDirection?').then(function(data) {
		return data.map(function(direction) {
			return {
				id: removePrefix(direction['owl:sameAs']),
				title: direction['odpt:railDirectionTitle']
			};
		});
	});
}

function loadTrainTypeRefData() {
	return loadJSON(API_URL + 'odpt:TrainType?odpt:operator=' + OPERATORS_FOR_TRAINTYPES.map(function(operator) {
		return 'odpt.Operator:' + operator;
	}).join(',')).then(function(data) {
		return data.map(function(type) {
			return {
				id: removePrefix(type['owl:sameAs']),
				title: type['odpt:trainTypeTitle']
			};
		});
	});
}

function loadOperatorRefData() {
	return loadJSON(API_URL + 'odpt:Operator?').then(function(data) {
		return data.map(function(operator) {
			return {
				id: removePrefix(operator['owl:sameAs']),
				title: operator['odpt:operatorTitle']
			};
		});
	});
}

function loadAirportRefData() {
	return loadJSON(API_URL + 'odpt:Airport?').then(function(data) {
		return data.map(function(airport) {
			return {
				id: removePrefix(airport['owl:sameAs']),
				title: airport['odpt:airportTitle']
			};
		});
	});
}

function loadFlightStatusRefData() {
	return loadJSON(API_URL + 'odpt:FlightStatus?').then(function(data) {
		return data.map(function(status) {
			return {
				id: removePrefix(status['owl:sameAs']),
				title: status['odpt:flightStatusTitle']
			};
		});
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
