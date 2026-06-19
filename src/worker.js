import buffer from '@turf/buffer';
import {featureCollection, lineString, point} from '@turf/helpers';
import union from '@turf/union';
import * as Comlink from 'comlink';
import {DecodeUTF8, Unzip, UnzipInflate} from 'fflate';
import geobuf from 'geobuf';
import Pbf from 'pbf';
import {includes, mergeMaps, normalizeLang} from './helpers/helpers';
import {updateDistances} from './helpers/helpers-geojson';
import {encode} from './helpers/helpers-gtfs';

function csvToArray(text) {
    const result = [''];
    let i = 0, previous = '', state = true;

    for (const letter of text) {
        if (letter === '"') {
            if (state && letter === previous) {
                result[i] += letter;
            }
            state = !state;
        } else if (letter === ',' && state) {
            result[++i] = '';
        } else {
            result[i] += letter;
        }
        previous = letter;
    }
    return result;
}

function getTimeOffset(string) {
    const timeStrings = string.split(':'),
        hours = +timeStrings[0],
        minutes = +timeStrings[1],
        seconds = +timeStrings[2];

    return (((hours - 3) * 60 + minutes) * 60 + seconds) * 1000;
}

class AgencyReader {

    read(line) {
        const me = this,
            fields = csvToArray(line);

        if (me.agencyNameIndex === undefined) {
            me.agencyNameIndex = fields.indexOf('agency_name');
        } else {
            me.agencyName = fields[me.agencyNameIndex];
        }
    }

    get result() {
        return this.agencyName;
    }

}

class CalendarReader {

    constructor({date, day}) {
        const me = this;

        me.date = date;
        me.day = day;
        me.services = new Set();
    }

    read(line) {
        const me = this,
            fields = csvToArray(line);

        if (me.serviceIdIndex === undefined) {
            me.serviceIdIndex = fields.indexOf('service_id');
            me.dayIndex = fields.indexOf(me.day);
            me.startDateIndex = fields.indexOf('start_date');
            me.endDateIndex = fields.indexOf('end_date');
        } else {
            if (me.date >= fields[me.startDateIndex] && me.date <= fields[me.endDateIndex] && fields[me.dayIndex] === '1') {
                me.services.add(fields[me.serviceIdIndex]);
            }
        }
    }

    get result() {
        return this.services;
    }

}

class CalendarDateReader {

    constructor({date}) {
        const me = this;

        me.date = date;
        me.additions = new Set();
        me.deletions = new Set();
    }

    read(line) {
        const me = this,
            fields = csvToArray(line);

        if (me.serviceIdIndex === undefined) {
            me.serviceIdIndex = fields.indexOf('service_id');
            me.dateIndex = fields.indexOf('date');
            me.exceptionTypeIndex = fields.indexOf('exception_type');
        } else {
            const id = fields[me.serviceIdIndex];

            if (me.date === fields[me.dateIndex]) {
                if (fields[me.exceptionTypeIndex] === '1') {
                    me.additions.add(id);
                } else {
                    me.deletions.add(id);
                }
            }
        }
    }

    get result() {
        return [this.additions, this.deletions];
    }

}

class FeedInfoReader {

    constructor({lang}) {
        this.lang = lang;
    }

    read(line) {
        const me = this,
            fields = csvToArray(line);

        if (me.feedLangIndex === undefined) {
            me.feedLangIndex = fields.indexOf('feed_lang');
            me.feedVersionIndex = fields.indexOf('feed_version');
        } else {
            me.feedLang = fields[me.feedLangIndex];
            me.feedVersion = fields[me.feedVersionIndex];
        }
    }

    get result() {
        const me = this;

        return {
            needTranslation: normalizeLang(me.feedLang) !== me.lang,
            version: me.feedVersion
        };
    }

}

class RouteReader {

    constructor() {
        this.array = [];
    }

    read(line) {
        const me = this,
            fields = csvToArray(line);

        if (me.routeIdIndex === undefined) {
            me.routeIdIndex = fields.indexOf('route_id');
            me.routeShortNameIndex = fields.indexOf('route_short_name');
            me.routeLongNameIndex = fields.indexOf('route_long_name');
            me.routeColorIndex = fields.indexOf('route_color');
            me.routeTextColorIndex = fields.indexOf('route_text_color');
        } else {
            const color = fields[me.routeColorIndex],
                textColor = fields[me.routeTextColorIndex];

            me.array.push({
                id: fields[me.routeIdIndex],
                shortName: fields[me.routeShortNameIndex],
                longName: fields[me.routeLongNameIndex],
                color: color ? `#${color}` : undefined,
                textColor: textColor ? `#${textColor}` : undefined
            });
        }
    }

    get result() {
        return this.array;
    }

}

class ShapeReader {

    constructor({color}) {
        const me = this;

        me.color = color;
        me.lookup = new Map();
    }

    read(line) {
        const me = this,
            fields = csvToArray(line),
            lookup = me.lookup;

        if (me.shapeIdIndex === undefined) {
            me.shapeIdIndex = fields.indexOf('shape_id');
            me.shapePtLatIdIndex = fields.indexOf('shape_pt_lat');
            me.shapePtLonIdIndex = fields.indexOf('shape_pt_lon');
            me.shapePtSequenceIndex = fields.indexOf('shape_pt_sequence');
        // Some GTFS have empty lines
        } else if (fields.length > 1) {
            const id = fields[me.shapeIdIndex];
            let coords;

            if (lookup.has(id)) {
                coords = lookup.get(id);
            } else {
                coords = [];
                lookup.set(id, coords);
            }
            coords.push([
                +fields[me.shapePtLonIdIndex],
                +fields[me.shapePtLatIdIndex],
                +fields[me.shapePtSequenceIndex]
            ]);
        }
    }

    get result() {
        const me = this,
            features = [];

        for (const [id, coords] of me.lookup.entries()) {
            const feature = lineString(coords.sort((a, b) => a[2] - b[2]), {
                id,
                type: 0,
                color: me.color,
                width: 2
            });

            for (const coord of coords) {
                coord.pop();
            }
            updateDistances(feature);
            features.push(feature);
        }
        return features;
    }

}

class StopReader {

    constructor() {
        this.array = [];
    }

    read(line) {
        const me = this,
            fields = csvToArray(line);

        if (me.stopIdIndex === undefined) {
            me.stopIdIndex = fields.indexOf('stop_id');
            me.stopNameIndex = fields.indexOf('stop_name');
            me.stopLatIndex = fields.indexOf('stop_lat');
            me.stopLonIndex = fields.indexOf('stop_lon');
        } else {
            me.array.push({
                id: fields[me.stopIdIndex],
                name: fields[me.stopNameIndex],
                coord: [+fields[me.stopLonIndex], +fields[me.stopLatIndex]]
            });
        }
    }

    get result() {
        return this.array;
    }

}

class StopTimeReader {

    constructor() {
        this.lookup = new Map();
    }

    read(line) {
        const me = this,
            fields = csvToArray(line),
            lookup = me.lookup;

        if (me.tripIdIndex === undefined) {
            me.tripIdIndex = fields.indexOf('trip_id');
            me.departureTimeIndex = fields.indexOf('departure_time');
            me.stopIdIndex = fields.indexOf('stop_id');
            me.stopSequenceIndex = fields.indexOf('stop_sequence');
            me.stopHeadsignIndex = fields.indexOf('stop_headsign');
        } else {
            const departureOffset = getTimeOffset(fields[me.departureTimeIndex]);
            if (!Number.isFinite(departureOffset)) return;

            const id = fields[me.tripIdIndex];
            let stopTimes;

            if (lookup.has(id)) {
                stopTimes = lookup.get(id);
            } else {
                stopTimes = [];
                lookup.set(id, stopTimes);
            }
            stopTimes.push([
                departureOffset,
                fields[me.stopIdIndex],
                +fields[me.stopSequenceIndex],
                fields[me.stopHeadsignIndex]
            ]);
        }
    }

    get result() {
        const lookup = new Map();

        for (const [id, stopTimes] of this.lookup.entries()) {
            stopTimes.sort((a, b) => a[2] - b[2]);
            lookup.set(id, {
                departureTimes: stopTimes.map(v => v[0]),
                stops: stopTimes.map(v => v[1]),
                stopSequences: stopTimes.map(v => v[2]),
                stopHeadsigns: stopTimes.map(v => v[3])
            });
        }
        return lookup;
    }

}

class TranslationReader {

    constructor({lang}) {
        const me = this;

        me.lang = lang;
        me.lookup = new Map();
    }

    read(line) {
        const me = this,
            fields = csvToArray(line),
            lookup = me.lookup;

        if (me.tableNameIndex === undefined) {
            me.tableNameIndex = fields.indexOf('table_name');
            me.fieldNameIndex = fields.indexOf('field_name');
            me.recordIdIndex = fields.indexOf('record_id');
            me.fieldValueIndex = fields.indexOf('field_value');
            me.languageIndex = fields.indexOf('language');
            me.translationIndex = fields.indexOf('translation');
        } else {
            const lang = fields[me.languageIndex];
            let subLookup;

            if (lookup.has(lang)) {
                subLookup = lookup.get(lang);
            } else {
                subLookup = new Map();
                lookup.set(lang, subLookup);
            }
            subLookup.set(`${fields[me.tableNameIndex]}.${fields[me.fieldNameIndex]}.${fields[me.recordIdIndex] || fields[me.fieldValueIndex]}`, fields[me.translationIndex]);
        }
    }

    get result() {
        const me = this,
            lookup = me.lookup,
            defaultLookup = lookup.get('en') || new Map();

        if (me.lang === 'en') {
            return defaultLookup;
        }
        if (lookup.has(me.lang)) {
            return mergeMaps(defaultLookup, lookup.get(me.lang));
        }
        for (const [lang, subLookup] of lookup) {
            const normalizedLang = normalizeLang(lang);

            if (normalizedLang === me.lang || (normalizedLang === 'zh-Hans' && me.lang === 'zh-Hant')) {
                return mergeMaps(defaultLookup, subLookup);
            }
        }
        return defaultLookup;
    }

}

class TripReader {

    constructor() {
        this.array = [];
    }

    read(line) {
        const me = this,
            fields = csvToArray(line);

        if (me.tripIdIndex === undefined) {
            me.tripIdIndex = fields.indexOf('trip_id');
            me.serviceIdIndex = fields.indexOf('service_id');
            me.routeIdIndex = fields.indexOf('route_id');
            me.shapeIdIndex = fields.indexOf('shape_id');
            me.headsignIndex = fields.indexOf('trip_headsign');
        } else {
            me.array.push({
                id: fields[me.tripIdIndex],
                service: fields[me.serviceIdIndex],
                route: fields[me.routeIdIndex],
                shape: fields[me.shapeIdIndex],
                headsign: fields[me.headsignIndex]
            });
        }
    }

    get result() {
        return this.array;
    }

}

const gtfsReaders = {
    'agency': AgencyReader,
    'calendar': CalendarReader,
    'calendar_dates': CalendarDateReader,
    'feed_info': FeedInfoReader,
    'routes': RouteReader,
    'shapes': ShapeReader,
    'stops': StopReader,
    'stop_times': StopTimeReader,
    'translations': TranslationReader,
    'trips': TripReader
};

const gtfsFiles = Object.keys(gtfsReaders);

function getFeatureCollection(shapes, stops, translations) {
    const features = shapes,
        stopGroups = new Map();

    for (const {id, name, coord} of stops) {
        features.push(point(coord, {
            type: 2,
            name: translations ?
                translations.get(`stops.stop_name.${id}`) || translations.get(`stops.stop_name.${name}`) || name :
                name
        }));

        if (stopGroups.has(name)) {
            stopGroups.get(name).push(coord);
        } else {
            stopGroups.set(name, [coord]);
        }
    }

    for (const zoom of [14, 15, 16, 17, 18]) {
        const unit = Math.pow(2, 14 - zoom) * .1;

        for (const item of stopGroups.values()) {
            const feature = union(...item.map(coord => buffer(point(coord), unit / 4)));

            feature.properties = {
                type: 1,
                outlineColor: '#000000',
                width: 2,
                color: '#FFFFFF',
                zoom
            };
            features.push(feature);
        }
    }

    return featureCollection(features);
}

function getStops(stops, translations) {
    return stops.map(({id, name, coord}) => ({
        id,
        name: translations ?
            translations.get(`stops.stop_name.${id}`) || translations.get(`stops.stop_name.${name}`) || name :
            name,
        coord
    }));
}

function getRoutes(routes, trips, translations) {
    const shapes = new Map();

    for (const {route, shape} of trips) {
        if (shapes.has(route)) {
            shapes.get(route).add(shape);
        } else {
            shapes.set(route, new Set([shape]));
        }
    }

    return routes.map(({id, shortName, longName, color, textColor}) => ({
        id,
        shortName: translations ?
            translations.get(`routes.route_short_name.${id}`) || translations.get(`routes.route_short_name.${shortName}`) || shortName :
            shortName,
        longName: translations ?
            translations.get(`routes.route_long_name.${id}`) || translations.get(`routes.route_long_name.${longName}`) || longName :
            longName,
        color,
        textColor,
        shapes: Array.from((shapes.get(id) || new Set()).values())
    }));
}

function getTrips(trips, services = new Set(), serviceExceptions = [new Set(), new Set()], stopTimeLookup, translations) {
    const serviceSet = services.union(serviceExceptions[0]).difference(serviceExceptions[1]),
        result = [];

    for (const {id, service, route, shape, headsign} of trips) {
        if (serviceSet.has(service)) {
            const {departureTimes, stops, stopSequences, stopHeadsigns} = stopTimeLookup.get(id),
                headsigns = [];

            if (new Set(stopHeadsigns).size > 1) {
                for (const stopHeadsign of stopHeadsigns) {
                    headsigns.push(translations ?
                        translations.get(`stop_times.stop_headsign.${stopHeadsign}`) || stopHeadsign :
                        stopHeadsign
                    );
                }
            } else if (headsign) {
                headsigns.push(translations ?
                    translations.get(`trips.trip_headsign.${id}`) || translations.get(`trips.trip_headsign.${headsign}`) || headsign :
                    headsign
                );
            } else if (stopHeadsigns[0]) {
                headsigns.push(translations ?
                    translations.get(`stop_times.stop_headsign.${stopHeadsigns[0]}`) || stopHeadsigns[0] :
                    stopHeadsigns[0]
                );
            }

            result.push({
                id,
                route,
                shape,
                departureTimes,
                stops,
                stopSequences,
                headsigns
            });
        }
    }

    return result;
}

function loadGtfs(source, date, day, lang) {
    return new Promise((resolve, reject) => {
        fetch(source.gtfsUrl).then(response => {
            const results = {},
                reader = response.body.getReader(),
                inflate = new Unzip(file => {
                    const key = file.name.split('.')[0];

                    if (includes(gtfsFiles, key)) {
                        let stringBuffer = '';
                        const gtfsReader = new gtfsReaders[key]({date, day, lang, color: source.color}),
                            utfDecode = new DecodeUTF8((data, final) => {
                                const lines = data.split(/\r?\n/);

                                if (lines.length > 1) {
                                    gtfsReader.read(stringBuffer + lines[0]);
                                    stringBuffer = '';
                                }
                                for (let i = 1; i < lines.length - 1; i++) {
                                    gtfsReader.read(lines[i]);
                                }
                                stringBuffer += lines[lines.length - 1];
                                if (final) {
                                    if (stringBuffer) {
                                        gtfsReader.read(stringBuffer);
                                    }
                                    results[key] = gtfsReader.result;
                                }
                            });

                        file.ondata = (err, data, final) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            try {
                                utfDecode.push(data, final);
                            } catch (err) {
                                reject(err);
                            }
                        };
                        file.start();
                    }
                });

            inflate.register(UnzipInflate);
            return reader.read().then(function pump({done, value}) {
                if (done) {
                    inflate.push(new Uint8Array(0), true);
                    resolve(results);
                    return;
                }
                inflate.push(value);
                reader.read().then(pump);
            });
        });
    }).then(results => {
        const translations = results.feed_info && results.feed_info.needTranslation && results.translations,
            featureCollection = getFeatureCollection(results.shapes, results.stops, translations),
            result = {
                agency: results.agency,
                version: results.feed_info ? results.feed_info.version : 'N/A',
                stops: getStops(results.stops, translations),
                routes: getRoutes(results.routes, results.trips, translations),
                trips: getTrips(results.trips, results.calendar, results.calendar_dates, results.stop_times, translations)
            };

        return [geobuf.encode(featureCollection, new Pbf()), encode(result, new Pbf())];
    });
}

Comlink.expose({
    load: (source, date, day, lang, callback) => loadGtfs(source, date, day, lang).then(data =>
        callback(Comlink.transfer(data, data.map(({buffer}) => buffer)))
    )
});
