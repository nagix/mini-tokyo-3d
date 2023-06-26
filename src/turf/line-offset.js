import bearing from '@turf/bearing';
import buffer from '@turf/buffer';
import cleanCoords from '@turf/clean-coords';
import distance from '@turf/distance';
import {lineString} from '@turf/helpers';
import {getCoords} from '@turf/invariant';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import polygonToLine from '@turf/polygon-to-line';
import destination from './destination';

function nearestIndex(lines, coords, pt) {
    const p = nearestPointOnLine(lines, pt),
        index = p.properties.index,
        c1 = coords[index],
        c2 = coords[index + 1] || c1;

    return distance(p, c1) <= distance(p, c2) ? index : index + 1;
}

// Better version of turf.lineOffset
export default function(geojson, distance) {
    const coords = getCoords(geojson),
        coordsLen = coords.length,
        start = coords[0],
        startBearing = bearing(start, coords[1]),
        end = coords[coordsLen - 1],
        endBearing = bearing(coords[coordsLen - 2], end),
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
        index1 = nearestIndex(polygonLine, polygonLineCoords, destination(start, dist, startBearing + bearingOffset)),
        index2 = nearestIndex(polygonLine, polygonLineCoords, destination(end, dist, endBearing + bearingOffset)),
        tempCoords = [],
        step = distance > 0 ? -1 : 1;

    for (let i = 0; i < length; i++) {
        const index = (index1 + i * step + length) % length;

        tempCoords.push(polygonLineCoords[index]);
        if (index === index2) {
            break;
        }
    }

    return cleanCoords(lineString(tempCoords));
}
