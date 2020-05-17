import bearing from '@turf/bearing';
import buffer from '@turf/buffer';
import {lineString} from '@turf/helpers';
import {getCoords} from '@turf/invariant';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import polygonToLine from '@turf/polygon-to-line';
import destination from './destination';
import lineSlice from './line-slice';

// Better version of turf.lineOffset
export default function(geojson, distance) {
    const coords = getCoords(geojson),
        coordsLen = coords.length,
        start = coords[0],
        startBearing = bearing(start, coords[2] || coords[1]),
        end = coords[coordsLen - 1],
        endBearing = bearing(coords[coordsLen - 3] || coords[coordsLen - 2], end),
        bearingOffset = distance > 0 ? 90 : -90,

        // Converting meters to Mercator meters
        dist = Math.abs(distance / Math.cos((start[1] + end[1]) * Math.PI / 360)),

        polygonLine = polygonToLine(
            buffer(geojson, dist, {step: coordsLen * 2 + 64})
        );

    // If MultiLineString is generated, pick the first LineString
    if (polygonLine.geometry.type === 'MultiLineString') {
        polygonLine.geometry.type = 'LineString';
        polygonLine.geometry.coordinates = polygonLine.geometry.coordinates[0];
    }

    const polygonLineCoords = getCoords(polygonLine),
        length = polygonLineCoords.length,
        p0 = nearestPointOnLine(polygonLine, destination(start, dist, startBearing + 180)),
        tempCoords = [],
        step = distance > 0 ? -1 : 1;

    // First, rotate coordinates
    for (let i = 0; i < length; i++) {
        tempCoords.push(polygonLineCoords[(p0.properties.index + i * step + length) % length]);
    }

    // Then, slice the line
    const p1 = nearestPointOnLine(polygonLine, destination(start, dist, startBearing + bearingOffset)),
        p2 = nearestPointOnLine(polygonLine, destination(end, dist, endBearing + bearingOffset));

    return lineSlice(p1, p2, lineString(tempCoords));
}
