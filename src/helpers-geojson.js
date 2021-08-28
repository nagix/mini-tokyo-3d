import turfBearing from '@turf/bearing';
import centerOfMass from '@turf/center-of-mass';
import turfDistance from '@turf/distance';
import {featureCollection} from '@turf/helpers';
import {getCoord, getCoords} from '@turf/invariant';
import {featureEach} from '@turf/meta';
import destination from './turf/destination';

/**
 * Filter GeoJSON object using a filter function.
 * @param {object} geojson - GeoJSON object
 * @param {function} fn - Filter function that takes feature properties and returns
 *     a boolean value
 * @returns {object} Filtered FeatureCollection
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
 * @param {object} line - LineString of the railway/airway
 */
export function updateDistances(line) {
    const coords = getCoords(line),
        distances = [];
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
    line.properties.distances = distances;
}

/**
 * Returns coordinates, altitude, bearing and pitch of the object from its distance.
 * @param {object} line - LineString of the railway/airway
 * @param {number} distance - Distance from the beginning of the LineString
 * @param {number} composition - Number of cars
 * @param {number} unit - Unit of car length
 * @returns {Array} Array of coord, altitude, bearing and pitch for cars
 */
export function getCoordAndBearing(line, distance, composition, unit) {
    const coords = line.geometry.coordinates,
        distances = line.properties.distances,
        length = coords.length,
        result = [];
    let start = 0,
        end = length - 1;

    distance -= unit * (composition - 1) / 2;

    while (start !== end - 1) {
        const center = Math.floor((start + end) / 2);

        if (distance < distances[center][0]) {
            end = center;
        } else {
            start = center;
        }
    }

    let index = start;

    for (let i = 0; i < composition; distance += unit, i++) {
        while (distance > distances[index + 1][0] && index < length - 2) {
            index++;
        }

        const [baseDistance, bearing, slope, pitch] = distances[index],
            coord = coords[index],
            overshot = distance - baseDistance;

        result.push({
            coord: destination(coord, overshot, bearing),
            altitude: (coord[2] || 0) + slope * overshot,
            bearing,
            pitch
        });
    }
    return result;
}

/**
 * Takes GeoJSON object and returns IDs in the properties.
 * @param {object} geojson - GeoJSON object
 * @returns {Array} IDs
 */
export function getIds(geojson) {
    const ids = geojson.properties.ids;

    return typeof ids === 'string' ? JSON.parse(ids) : ids;
}

/**
 * Takes GeoJSON object and returns the altitude of the first point.
 * @param {object} geojson - GeoJSON object
 * @returns {number} Altitude of the first point
 */
export function getAltitude(geojson) {
    return getCoords(geojson)[0][0][2];
}

/**
 * Takes GeoJSON object and returns the coordinates of its center of mass.
 * @param {object} geojson - GeoJSON object
 * @returns {Array} Coordinates of the center of mass
 */
export function getCenterCoord(geojson) {
    return getCoord(centerOfMass(geojson));
}

export function emptyFeatureCollection() {
    return featureCollection([]);
}

export function isFeature(object) {
    return object && object.type === 'Feature' && object.geometry;
}
