import {featureCollection} from '@turf/helpers';
import {featureEach} from '@turf/meta';

export default function(geojson, fn) {
    const features = [];

    featureEach(geojson, feature => {
        if (fn(feature.properties)) {
            features.push(feature);
        }
    });
    return featureCollection(features);
}
