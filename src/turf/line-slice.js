import cleanCoords from '@turf/clean-coords';
import distance from '@turf/distance';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import {getCoords} from '@turf/invariant';
import lineSlice from '@turf/line-slice';

// Better version of turf.lineSlice
export default function(startPt, stopPt, line) {
    const feature = cleanCoords(lineSlice(startPt, stopPt, line)),
        p1 = nearestPointOnLine(line, startPt),
        p2 = nearestPointOnLine(line, stopPt),
        start = getCoords(line)[p1.properties.index];

    // Rewind if the line string is in opposite direction
    if (p1.properties.index === p2.properties.index && distance(p1, start) > distance(p2, start)) {
        getCoords(feature).reverse();
    }

    return feature;
}
