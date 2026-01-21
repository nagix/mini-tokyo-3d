import turfBearing from '@turf/bearing';
import centerOfMass from '@turf/center-of-mass';
import turfDistance from '@turf/distance';
import {featureCollection} from '@turf/helpers';
import {getCoord, getCoords} from '@turf/invariant';
import {featureEach} from '@turf/meta';

/**
 * Filter GeoJSON object using a filter function.
 * @param {Object} geojson - GeoJSON object
 * @param {Function} fn - Filter function that takes feature properties and returns
 *     a boolean value
 * @returns {Object} Filtered FeatureCollection
 */
export function featureFilter(geojson, fn) {
    const features = [];

    featureEach(geojson, feature => {
        if (fn(feature.properties)) {
            features.push(feature);
        }
    });
    return featureCollection(features);
}

/**
 * Takes LineString and update distances property.
 * @param {Object} line - LineString of the railway/airway
 */
export function updateDistances(line) {
    const coords = getCoords(line),
        distances = line.properties.distances = [];
    let travelled = 0,
        nextCoord = coords[0],
        bearing, slope, pitch;

    for (let i = 0, ilen = coords.length; i < ilen - 1; i++) {
        const currCoord = nextCoord;

        nextCoord = coords[i + 1];

        const distance = turfDistance(currCoord, nextCoord);

        bearing = turfBearing(currCoord, nextCoord);
        slope = ((nextCoord[2] || 0) - (currCoord[2] || 0)) / distance;
        pitch = Math.atan(slope / 1000);

        distances.push([travelled, bearing, slope, pitch]);
        travelled += distance;
    }

    distances.push([travelled, bearing, slope, pitch]);
}

/**
 * Takes GeoJSON object and returns the altitude of the first point.
 * @param {Object} geojson - GeoJSON object
 * @returns {number} Altitude of the first point
 */
export function getAltitude(geojson) {
    return getCoords(geojson)[0][0][2];
}

/**
 * Takes GeoJSON object and returns the coordinates of its center of mass.
 * @param {Object} geojson - GeoJSON object
 * @returns {Array} Coordinates of the center of mass
 */
export function getCenterCoord(geojson) {
    return getCoord(centerOfMass(geojson));
}

export function emptyFeatureCollection() {
    return featureCollection([]);
}
