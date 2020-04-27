import {getCoord} from '@turf/invariant';

const DOUBLE_PI = Math.PI * 2,
    DEGREE_TO_RADIAN = Math.PI / 180,
    MEAN_EARTH_RADIUS = 6371.0088;

// Better version of turf.destination
export default function(origin, distance, bearing) {
    const coordinates1 = getCoord(origin),
        longitude1 = coordinates1[0] * DEGREE_TO_RADIAN,
        latitude1 = coordinates1[1] * DEGREE_TO_RADIAN,
        bearingRad = bearing * DEGREE_TO_RADIAN,
        radians = distance / MEAN_EARTH_RADIUS,

        sinLatitude1 = Math.sin(latitude1),
        cosLatitude1 = Math.cos(latitude1),
        sinRadians = Math.sin(radians),
        cosRadians = Math.cos(radians),
        sinBearingRad = Math.sin(bearingRad),
        cosBearingRad = Math.cos(bearingRad),

        latitude2 = Math.asin(sinLatitude1 * cosRadians + cosLatitude1 * sinRadians * cosBearingRad),
        longitude2 = longitude1 + Math.atan2(
            sinBearingRad * sinRadians * cosLatitude1,
            cosRadians - sinLatitude1 * Math.sin(latitude2)
        );

    return [
        longitude2 % DOUBLE_PI / DEGREE_TO_RADIAN,
        latitude2 % DOUBLE_PI / DEGREE_TO_RADIAN
    ];
}
