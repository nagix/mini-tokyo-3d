import {Worker, workerData, parentPort} from 'worker_threads';
import along from '@turf/along';
import buffer from '@turf/buffer';
import turfDistance from '@turf/distance';
import {featureCollection, lineString, point} from '@turf/helpers';
import {getCoord, getCoords} from '@turf/invariant';
import turfLength from '@turf/length';
import {coordEach} from '@turf/meta';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import truncate from '@turf/truncate';
import union from '@turf/union';
import {destination, lineOffset, lineSlice, lineSliceAlong, nearestPointProps} from '../turf';
import {includes, valueOrDefault} from '../helpers/helpers';
import {loadJSON, saveJSON} from './helpers';

function setAltitude(geojson, altitude) {
    coordEach(geojson, coord => {
        coord[2] = altitude;
    });
}

function clearOpacity(geojson) {
    coordEach(geojson, coord => {
        if (coord[3] !== undefined) {
            coord.pop();
        }
    });
}

function getLocationAlongLine(line, point, options) {
    if (options && (options.first || options.last)) {
        const coords = getCoords(line),
            center = Math.floor(coords.length / 2),
            firstHalf = lineString(coords.slice(0, center + 1)),
            secondHalf = lineString(coords.slice(center)),
            startLocation = options.first ? 0 : turfLength(firstHalf),
            partialLine = options.first ? firstHalf : secondHalf,
            nearestPoint = nearestPointOnLine(partialLine, point);

        return startLocation + nearestPoint.properties.location;
    } else {
        const nearestPoint = nearestPointOnLine(line, point);

        return nearestPoint.properties.location;
    }
}

function alignDirection(feature, refCoords) {
    const coords = getCoords(feature),
        start = coords[0];

    // Rewind if the line string is in opposite direction
    if (turfDistance(refCoords[0], start) > turfDistance(refCoords[refCoords.length - 1], start)) {
        coords.reverse();
    }

    return coords;
}

function interpolateCoordinates(coords, start, end) {
    const feature = lineString(coords),
        length = turfLength(feature);

    if (start) {
        const interpolatedCoords = [];
        let i;

        for (let d = 0; d <= start; d += .05) {
            interpolatedCoords.push(getCoord(along(feature, Math.min(d, length))));
            if (d >= length) {
                break;
            }
        }
        for (i = 0; i < coords.length; i++) {
            if (getLocationAlongLine(feature, coords[i]) > start) {
                break;
            }
        }
        coords.splice(0, i, ...interpolatedCoords);
    }
    if (end) {
        const interpolatedCoords = [];
        let i;

        for (let d = length; d >= length - end; d -= .05) {
            interpolatedCoords.unshift(getCoord(along(feature, Math.max(d, 0))));
            if (d <= 0) {
                break;
            }
        }
        for (i = coords.length; i > 0; i--) {
            if (getLocationAlongLine(feature, coords[i - 1]) < length - end) {
                break;
            }
        }
        coords.splice(i, coords.length - i, ...interpolatedCoords);
    }
}

function easeInOutQuad(t) {
    if ((t /= .5) < 1) {
        return .5 * t * t;
    }
    return -.5 * ((--t) * (t - 2) - 1);
}

export default async function(railwayLookup, stationLookup) {

    const [stationGroupData, coordinateData] = await Promise.all([
        'data/station-groups.json',
        'data/coordinates.json'
    ].map(loadJSON));

    const transitStations = [].concat(...stationGroupData.map(
        group => [].concat(...group)
    ));

    for (const {id} of coordinateData.railways) {
        ((railwayLookup[id] || {}).stations || [])
            .filter(station => !includes(transitStations, station))
            .forEach(station => stationGroupData.push([[station]]));
    }

    const featureArray = [].concat(...await Promise.all([13, 14, 15, 16, 17, 18].map(zoom =>
        new Promise(resolve => {
            const worker = new Worker(__filename, {workerData: {
                type: 'features',
                zoom,
                railways: coordinateData.railways,
                railwayLookup,
                stationLookup,
                stationGroupData
            }});

            worker.on('message', resolve);
        })
    )));

    for (const {id, coords, color} of coordinateData.airways) {
        const airwayFeature = lineString(coords, {
            id,
            type: 0,
            color,
            width: 8,
            altitude: 1
        });

        airwayFeature.properties.length = turfLength(airwayFeature);

        featureArray.push(airwayFeature);
    }

    saveJSON('build/data/features.json.gz', truncate(featureCollection(featureArray), {precision: 7}));

    console.log('Feature data was loaded');
}

export function featureWorker() {

    const {zoom, railways, railwayLookup, stationLookup, stationGroupData} = workerData;

    const featureLookup = {};
    const featureArray = [];

    const unit = Math.pow(2, 14 - zoom) * .1;

    for (const {id, sublines, color, altitude, loop} of railways) {
        const railwayFeature = lineString([].concat(...sublines.map((subline, index) => {
            const {type, start, end, coords, opacity} = subline,
                sublineAltitude = valueOrDefault(subline.altitude, altitude) || 0,
                prevSubline = sublines[index - 1] || {},
                nextSubline = sublines[index + 1] || {};
            let coordinates;

            function smoothCoords(nextSubline, reverse) {
                const start = !reverse ? 0 : coordinates.length - 1,
                    end = !reverse ? coordinates.length - 1 : 0,
                    step = !reverse ? 1 : -1,
                    feature = featureLookup[nextSubline.railway],
                    nearest = nearestPointProps(feature, coordinates[start]),
                    baseOffset = nextSubline.offset * unit - nearest.distance,
                    baseFeature = lineString(coordinates),
                    baseLocation = getLocationAlongLine(baseFeature, coordinates[start]),
                    transition = Math.min(Math.abs(nextSubline.offset) * .75 + .75, turfLength(baseFeature)),
                    factors = [];

                for (let i = start; i !== end; i += step) {
                    const distance = Math.abs(getLocationAlongLine(baseFeature, coordinates[i]) - baseLocation);
                    if (distance > transition) {
                        break;
                    }
                    factors[i] = easeInOutQuad(1 - distance / transition);
                }
                for (let i = start; i !== end && factors[i] > 0; i += step) {
                    coordinates[i] = getCoord(destination(
                        coordinates[i], baseOffset * factors[i], nearest.bearing
                    ));
                }
            }

            function smoothAltitude(baseAltitude, reverse) {
                const start = !reverse ? 0 : coordinates.length - 1,
                    end = !reverse ? coordinates.length - 1 : 0,
                    step = !reverse ? 1 : -1,
                    baseFeature = lineString(coordinates),
                    baseLocation = getLocationAlongLine(baseFeature, coordinates[start]),
                    baseAltitudeMeter = baseAltitude * unit * 1000;

                for (let i = start; i !== end; i += step) {
                    const distance = Math.abs(getLocationAlongLine(baseFeature, coordinates[i]) - baseLocation);
                    if (distance > .4) {
                        break;
                    }
                    coordinates[i][2] = (baseAltitudeMeter + ((coordinates[i][2] || 0) - baseAltitudeMeter) * easeInOutQuad(distance / .4));
                }
            }

            if (type === 'main' || (type === 'hybrid' && zoom >= subline.zoom)) {
                coordinates = coords.map(d => d.slice());
                if (start && start.railway && !(zoom >= start.zoom)) {
                    smoothCoords(start);
                }
                if (end && end.railway && !(zoom >= end.zoom)) {
                    smoothCoords(end, true);
                }
            } else if (type === 'sub' || type === 'hybrid') {
                if (start.railway === end.railway && start.offset === end.offset) {
                    const feature = lineSlice(coords[0], coords[coords.length - 1], featureLookup[start.railway]),
                        offset = start.offset;

                    coordinates = alignDirection(offset ? lineOffset(feature, offset * unit) : feature, coords);
                } else {
                    const {interpolate} = subline;
                    let feature1 = lineSlice(coords[0], coords[coords.length - 1], featureLookup[start.railway]),
                        offset = start.offset;
                    if (offset) {
                        feature1 = lineOffset(feature1, offset * unit);
                    }
                    alignDirection(feature1, coords);
                    let feature2 = lineSlice(coords[0], coords[coords.length - 1], featureLookup[end.railway]);
                    offset = end.offset;
                    if (offset) {
                        feature2 = lineOffset(feature2, offset * unit);
                    }
                    alignDirection(feature2, coords);
                    const length1 = turfLength(feature1),
                        length2 = turfLength(feature2);
                    coordinates = [];
                    for (let i = 0; i <= interpolate; i++) {
                        const coord1 = getCoord(along(feature1, length1 * i / interpolate)),
                            coord2 = getCoord(along(feature2, length2 * i / interpolate)),
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
            if (sublineAltitude) {
                for (const coord of coordinates) {
                    coord[2] = sublineAltitude * unit * 1000;
                }
            }
            if (start && start.altitude !== undefined) {
                smoothAltitude(start.altitude);
            }
            if (end && end.altitude !== undefined) {
                smoothAltitude(end.altitude, true);
            }
            if (opacity !== undefined) {
                for (const coord of coordinates) {
                    coord[3] = opacity;
                }
            }
            if (prevSubline.type && opacity !== undefined && prevSubline.opacity === undefined) {
                coordinates.shift();
            }
            if (nextSubline.type && !(opacity === undefined && nextSubline.opacity !== undefined)) {
                coordinates.pop();
            }

            return coordinates;
        })), {
            id: `${id}.${zoom}`,
            type: 0,
            color,
            width: 8,
            zoom
        });

        featureLookup[id] = railwayFeature;
        if (id.startsWith('Base.')) {
            continue;
        }

        // Set station offsets
        const stationOffsets = railwayLookup[id].stations.map((station, i, stations) =>
            // If the line has a loop, the first and last offsets must be handled differently
            getLocationAlongLine(railwayFeature, stationLookup[station].coord, {
                first: loop && i === 0,
                last: loop && i === stations.length - 1
            })
        );
        railwayFeature.properties['station-offsets'] = stationOffsets;

        featureArray.unshift(railwayFeature);

        // Create railway sections
        const sectionFeatures = [];
        [0, ...stationOffsets, turfLength(railwayFeature)].reduce((start, stop) => {
            if (start < stop) {
                sectionFeatures.push(lineSliceAlong(railwayFeature, start, stop));
            } else {
                sectionFeatures.push(undefined);
            }
            return stop;
        });

        // Split sections into ground and underground parts
        sectionFeatures.forEach((sectionFeature, index) => {
            if (!sectionFeature) {
                return;
            }
            const sections = [{coords: []}];

            getCoords(sectionFeature).forEach((coord, i, coords) => {
                const section = sections[sections.length - 1];

                section.coords.push(coord);
                if ((!(coord[2] < 0) && ((i > 0 && coords[i - 1][2] < 0) || (i < coords.length - 1 && coords[i + 1][2] < 0))) ||
                    (coord[3] === undefined && ((i > 0 && coords[i - 1][3] !== undefined) || (i < coords.length - 1 && coords[i + 1][3] !== undefined)))) {
                    sections.push({
                        coords: [coord]
                    });
                }
                if (section.altitude === undefined && i < coords.length - 1) {
                    section.altitude = coords[i + 1][2] < 0 ? -unit * 1000 : 0;
                }
                if (section.opacity === undefined && i < coords.length - 1) {
                    section.opacity = coords[i + 1][3] !== undefined ? coords[i + 1][3] : 1;
                }
            });

            clearOpacity(sectionFeature);

            sections.forEach((section, i) => {
                if (section.coords.length >= 2) {
                    featureArray.unshift(lineString(section.coords, {
                        id: `${id}.${section.altitude < 0 ? 'ug' : 'og'}.${zoom}.${index}.${i}`,
                        type: section.opacity === 1 ? 0 : 2,
                        color,
                        width: 8,
                        zoom,
                        section: `${id}.${index}`,
                        altitude: section.altitude
                    }));
                }
            });
        });
    }

    for (const group of stationGroupData) {
        const ug = {features: [], connectionCoords: []},
            og = {features: [], connectionCoords: []},
            ids = [];

        for (const stations of group) {
            const altitude = stationLookup[stations[0]].altitude || 0,
                layer = altitude < 0 ? ug : og,
                coords = stations.map(id => {
                    const {railway, coord, hidden} = stationLookup[id],
                        feature = featureLookup[railway];

                    if (!hidden) {
                        layer.id = layer.id || id;
                        ids.push(id);
                    }
                    return getCoord(nearestPointOnLine(feature, coord));
                }),
                feature = coords.length === 1 ? point(coords[0]) : lineString(coords);

            layer.features.push(buffer(feature, unit));
            layer.connectionCoords.push(...coords);
            layer.altitude = altitude;
        }

        if (ug.features.length) {
            // If there are connections, add extra features
            if (ug.connectionCoords.length > 1) {
                ug.features.push(buffer(lineString(ug.connectionCoords), unit / 4));
            }

            const feature = union(...ug.features);

            setAltitude(feature, ug.altitude * unit * 1000);
            feature.properties = {
                id: `${ug.id}.ug.${zoom}`,
                type: 1,
                outlineColor: '#000000',
                width: 4,
                color: '#FFFFFF',
                zoom,
                group: `${ids[0]}.ug`,
                altitude: ug.altitude * unit * 1000,
                ids
            };
            featureArray.push(feature);
        }
        if (og.features.length) {
            // If there are connections, add extra features
            if (og.connectionCoords.length > 1) {
                og.features.push(buffer(lineString(og.connectionCoords), unit / 4));
            }

            const feature = union(...og.features);

            feature.properties = {
                id: `${og.id}.og.${zoom}`,
                type: 1,
                outlineColor: '#000000',
                width: 4,
                color: '#FFFFFF',
                zoom,
                group: `${ids[0]}.og`,
                altitude: 0,
                ids
            };
            featureArray.push(feature);
        }
    }

    parentPort.postMessage(featureArray);

}
