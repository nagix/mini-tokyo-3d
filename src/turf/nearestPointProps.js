import bearing from '@turf/bearing';
import {getCoords} from '@turf/invariant';
import nearestPointOnLine from '@turf/nearest-point-on-line';

function getAngle(bearing1, bearing2) {
    let angle = bearing2 - bearing1;

    if (angle > 180) {
        angle -= 360;
    } else if (angle < -180) {
        angle += 360;
    }
    return angle;
}

export default function(line, point) {
    const nearestPoint = nearestPointOnLine(line, point),
        properties = nearestPoint.properties,
        coords = getCoords(line),
        index = Math.min(properties.index, coords.length - 2),
        lineBearing = bearing(coords[index], coords[index + 1]),
        pointBearing = bearing(nearestPoint, point),
        sign = getAngle(lineBearing, pointBearing) >= 0 ? 1 : -1;

    return {
        point: nearestPoint,
        bearing: pointBearing + (1 - sign) * 90,
        distance: properties.dist * sign
    };
}
