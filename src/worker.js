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
            fileds = csvToArray(line);

        if (me.agencyNameIndex === undefined) {
            me.agencyNameIndex = fileds.indexOf('agency_name');
        } else {
            me.agencyName = fileds[me.agencyNameIndex];
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
            fileds = csvToArray(line);

        if (me.serviceIdIndex === undefined) {
            me.serviceIdIndex = fileds.indexOf('service_id');
            me.dayIndex = fileds.indexOf(me.day);
            me.startDateIndex = fileds.indexOf('start_date');
            me.endDateIndex = fileds.indexOf('end_date');
        } else {
            if (me.date >= fileds[me.startDateIndex] && me.date <= fileds[me.endDateIndex] && fileds[me.dayIndex] === '1') {
                me.services.add(fileds[me.serviceIdIndex]);
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
            fileds = csvToArray(line);

        if (me.serviceIdIndex === undefined) {
            me.serviceIdIndex = fileds.indexOf('service_id');
            me.dateIndex = fileds.indexOf('date');
            me.exceptionTypeIndex = fileds.indexOf('exception_type');
        } else {
            const id = fileds[me.serviceIdIndex];

            if (me.date === fileds[me.dateIndex]) {
                if (fileds[me.exceptionTypeIndex] === '1') {
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
            fileds = csvToArray(line);

        if (me.feedLangIndex === undefined) {
            me.feedLangIndex = fileds.indexOf('feed_lang');
            me.feedVersionIndex = fileds.indexOf('feed_version');
        } else {
            me.feedLang = fileds[me.feedLangIndex];
            me.feedVersion = fileds[me.feedVersionIndex];
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
        this.lookup = new Map();
    }

    read(line) {
        const me = this,
            fileds = csvToArray(line);

        if (me.routeIdIndex === undefined) {
            me.routeIdIndex = fileds.indexOf('route_id');
            me.routeShortNameIndex = fileds.indexOf('route_short_name');
            me.routeLongNameIndex = fileds.indexOf('route_long_name');
            me.routeColorIndex = fileds.indexOf('route_color');
            me.routeTextColorIndex = fileds.indexOf('route_text_color');
        } else {
            const color = fileds[me.routeColorIndex],
                textColor = fileds[me.routeTextColorIndex];

            me.lookup.set(fileds[me.routeIdIndex], {
                shortName: fileds[me.routeShortNameIndex],
                longName: fileds[me.routeLongNameIndex],
                color: color ? `#${color}` : undefined,
                textColor: textColor ? `#${textColor}` : undefined
            });
        }
    }

    get result() {
        return this.lookup;
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
            fileds = csvToArray(line),
            lookup = me.lookup;

        if (me.shapeIdIndex === undefined) {
            me.shapeIdIndex = fileds.indexOf('shape_id');
            me.shapePtLatIdIndex = fileds.indexOf('shape_pt_lat');
            me.shapePtLonIdIndex = fileds.indexOf('shape_pt_lon');
            me.shapePtSequenceIndex = fileds.indexOf('shape_pt_sequence');
        } else {
            const id = fileds[me.shapeIdIndex];
            let coords;

            if (lookup.has(id)) {
                coords = lookup.get(id);
            } else {
                coords = [];
                lookup.set(id, coords);
            }
            coords.push([
                +fileds[me.shapePtLonIdIndex],
                +fileds[me.shapePtLatIdIndex],
                +fileds[me.shapePtSequenceIndex]
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
            fileds = csvToArray(line);

        if (me.stopIdIndex === undefined) {
            me.stopIdIndex = fileds.indexOf('stop_id');
            me.stopNameIndex = fileds.indexOf('stop_name');
            me.stopLatIndex = fileds.indexOf('stop_lat');
            me.stopLonIndex = fileds.indexOf('stop_lon');
        } else {
            me.array.push({
                id: fileds[me.stopIdIndex],
                name: fileds[me.stopNameIndex],
                coord: [+fileds[me.stopLonIndex], +fileds[me.stopLatIndex]]
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
            fileds = csvToArray(line),
            lookup = me.lookup;

        if (me.tripIdIndex === undefined) {
            me.tripIdIndex = fileds.indexOf('trip_id');
            me.departureTimeIndex = fileds.indexOf('departure_time');
            me.stopIdIndex = fileds.indexOf('stop_id');
            me.stopSequenceIndex = fileds.indexOf('stop_sequence');
            me.stopHeadsignIndex = fileds.indexOf('stop_headsign');
        } else {
            const id = fileds[me.tripIdIndex];
            let stopTimes;

            if (lookup.has(id)) {
                stopTimes = lookup.get(id);
            } else {
                stopTimes = [];
                lookup.set(id, stopTimes);
            }
            stopTimes.push([
                getTimeOffset(fileds[me.departureTimeIndex]),
                fileds[me.stopIdIndex],
                +fileds[me.stopSequenceIndex],
                fileds[me.stopHeadsignIndex]
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
            fileds = csvToArray(line),
            lookup = me.lookup;

        if (me.tableNameIndex === undefined) {
            me.tableNameIndex = fileds.indexOf('table_name');
            me.fieldNameIndex = fileds.indexOf('field_name');
            me.recordIdIndex = fileds.indexOf('record_id');
            me.fieldValueIndex = fileds.indexOf('field_value');
            me.languageIndex = fileds.indexOf('language');
            me.translationIndex = fileds.indexOf('translation');
        } else {
            const lang = fileds[me.languageIndex];
            let subLookup;

            if (lookup.has(lang)) {
                subLookup = lookup.get(lang);
            } else {
                subLookup = new Map();
                lookup.set(lang, subLookup);
            }
            subLookup.set(`${fileds[me.tableNameIndex]}.${fileds[me.fieldNameIndex]}.${fileds[me.recordIdIndex] || fileds[me.fieldValueIndex]}`, fileds[me.translationIndex]);
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
            fileds = csvToArray(line);

        if (me.tripIdIndex === undefined) {
            me.tripIdIndex = fileds.indexOf('trip_id');
            me.serviceIdIndex = fileds.indexOf('service_id');
            me.routeIdIndex = fileds.indexOf('route_id');
            me.shapeIdIndex = fileds.indexOf('shape_id');
            me.headsignIndex = fileds.indexOf('trip_headsign');
        } else {
            me.array.push({
                id: fileds[me.tripIdIndex],
                service: fileds[me.serviceIdIndex],
                route: fileds[me.routeIdIndex],
                shape: fileds[me.shapeIdIndex],
                headsign: fileds[me.headsignIndex]
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

function getTrips(trips, services, serviceExceptions, routeLookup, stopTimeLookup, translations) {
    const serviceSet = (services || new Set()).union(serviceExceptions[0]).difference(serviceExceptions[1]),
        result = [];

    for (const {id, service, route, shape, headsign} of trips) {
        if (serviceSet.has(service)) {
            const {shortName, longName, color, textColor} = routeLookup.get(route),
                {departureTimes, stops, stopSequences, stopHeadsigns} = stopTimeLookup.get(id),
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
            } else {
                headsigns.push(translations ?
                    translations.get(`routes.route_long_name.${route}`) || translations.get(`routes.route_long_name.${longName}`) || longName :
                    longName
                );
            }

            result.push({
                id,
                shortName: translations ?
                    translations.get(`routes.route_short_name.${route}`) || translations.get(`routes.route_short_name.${shortName}`) || shortName ||
                    translations.get(`routes.route_long_name.${route}`) || translations.get(`routes.route_long_name.${longName}`) || longName :
                    shortName || longName,
                color,
                textColor,
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
    return new Promise((resolve, reject) => fetch(source.gtfsUrl).then(response => {
        const results = {},
            reader = response.body.getReader(),
            inflate = new Unzip(file => {
                const key = file.name.split('.')[0];

                if (includes(gtfsFiles, key)) {
                    let stringBuffer = '';
                    const gtfsReader = new gtfsReaders[key]({date, day, lang, color: source.color}),
                        utfDecode = new DecodeUTF8(async (data, final) => {
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
    })).then(results => {
        const translations = results.feed_info && results.feed_info.needTranslation && results.translations,
            featureCollection = getFeatureCollection(results.shapes, results.stops, translations),
            result = {
                agency: results.agency,
                version: results.feed_info ? results.feed_info.version : 'N/A',
                stops: getStops(results.stops, translations),
                trips: getTrips(results.trips, results.calendar, results.calendar_dates, results.routes, results.stop_times, translations)
            };

        return [geobuf.encode(featureCollection, new Pbf()), encode(result, new Pbf())];
    });
}

Comlink.expose({
    load: (source, date, day, lang, callback) => loadGtfs(source, date, day, lang).then(data =>
        callback(Comlink.transfer(data, data.map(({buffer}) => buffer)))
    )
});
