import bearing from '@turf/bearing';
import destination from '@turf/destination';
import distance from '@turf/distance';
import {lineString} from '@turf/helpers';

// Better version of turf.lineSliceAlong
export default function(line, startDist, stopDist, options) {
    // Optional parameters
    options = options || {};

    let coords;
    const slice = [];

    // Validation
    if (line.type === 'Feature') {
        coords = line.geometry.coordinates;
    } else if (line.type === 'LineString') {
        coords = line.coordinates;
    } else {
        throw new Error('input must be a LineString Feature or Geometry');
    }

    const origCoordsLength = coords.length;
    let travelled = 0;
    let travelledPrev = 0;
    let overshot, direction, interpolated, slope;

    for (let i = 0; i < coords.length; i++) {
        if (startDist >= travelled && i === coords.length - 1) break;
        else if (travelled > startDist && slice.length === 0) {
            overshot = startDist - travelled;
            if (!overshot) {
                slice.push(coords[i]);
                return lineString(slice);
            }
            direction = bearing(coords[i], coords[i - 1]) - 180;
            interpolated = destination(coords[i], overshot, direction, options);
            if (coords[i][2] || coords[i - 1][2]) {
                slope = ((coords[i - 1][2] || 0) - (coords[i][2] - 0)) / (travelled - travelledPrev);
                interpolated.geometry.coordinates[2] = coords[i][2] - slope * overshot;
            }
            if (coords[i][3] !== undefined) {
                interpolated.geometry.coordinates[3] = coords[i][3];
            }
            slice.push(interpolated.geometry.coordinates);
        }

        if (travelled >= stopDist) {
            overshot = stopDist - travelled;
            if (!overshot) {
                slice.push(coords[i]);
                return lineString(slice);
            }
            direction = bearing(coords[i], coords[i - 1]) - 180;
            interpolated = destination(coords[i], overshot, direction, options);
            if (coords[i][2] || coords[i - 1][2]) {
                slope = ((coords[i - 1][2] || 0) - (coords[i][2] || 0)) / (travelled - travelledPrev);
                interpolated.geometry.coordinates[2] = coords[i][2] - slope * overshot;
            }
            if (coords[i][3] !== undefined) {
                interpolated.geometry.coordinates[3] = coords[i][3];
            }
            slice.push(interpolated.geometry.coordinates);
            return lineString(slice);
        }

        if (travelled >= startDist) {
            slice.push(coords[i]);
        }

        if (i === coords.length - 1) {
            return lineString(slice);
        }

        travelledPrev = travelled;
        travelled += distance(coords[i], coords[i + 1], options);
    }

    if (travelled < startDist && coords.length === origCoordsLength) {
        throw new Error('Start position is beyond line');
    }
    return lineString(coords[coords.length - 1]);
}
