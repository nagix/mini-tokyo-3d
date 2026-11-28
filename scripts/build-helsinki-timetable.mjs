import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';

const inputDir = path.resolve(process.argv[2] || 'helsinki/hsl');
const outputFile = path.resolve(process.argv[3] || 'build/data/hsl-timetable.json.gz');

function parseCsvLine(line) {
    const values = [''];
    let index = 0;
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
        const character = line[i];
        if (character === '"') {
            if (quoted && line[i + 1] === '"') {
                values[index] += '"';
                i++;
            } else {
                quoted = !quoted;
            }
        } else if (character === ',' && !quoted) {
            values[++index] = '';
        } else {
            values[index] += character;
        }
    }
    return values;
}

async function readRows(fileName, onRow) {
    const file = path.join(inputDir, fileName);
    const reader = readline.createInterface({
        input: fs.createReadStream(file, {encoding: 'utf8'}),
        crlfDelay: Infinity
    });
    let headers;

    for await (const line of reader) {
        const values = parseCsvLine(line);
        if (!headers) {
            headers = values.map(header => header.replace(/^\uFEFF/, '').trim());
            continue;
        }
        if (!line) {
            continue;
        }
        onRow(Object.fromEntries(headers.map((header, index) => [
            header,
            values[index] === undefined ? '' : values[index]
        ])));
    }
}

function requireInput(fileName) {
    const file = path.join(inputDir, fileName);
    if (!fs.existsSync(file)) {
        throw new Error(`HSL timetable data is missing: ${file}`);
    }
}

for (const file of [
    'routes.txt',
    'trips.txt',
    'stops.txt',
    'stop_areas.txt',
    'stop_times.txt',
    'calendar.txt',
    'calendar_dates.txt',
    'translations.txt'
]) {
    requireInput(file);
}

async function main() {
    const routes = new Map();
    const trips = new Map();
    const stops = new Map();
    const stopAreas = new Map();
    const stopNamesSv = new Map();
    const services = new Map();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    await readRows('routes.txt', row => {
        routes.set(row.route_id, {
            shortName: row.route_short_name,
            longName: row.route_long_name
        });
    });

    await readRows('trips.txt', row => {
        trips.set(row.trip_id, {
            routeId: row.route_id,
            serviceId: row.service_id,
            directionId: Number(row.direction_id),
            headsign: row.trip_headsign
        });
    });

    await readRows('stops.txt', row => {
        stops.set(row.stop_id, {
            id: row.stop_id,
            name: row.stop_name,
            nameSv: row.stop_name,
            parentStation: (row.parent_station || '').trim()
        });
    });

    await readRows('translations.txt', row => {
        if (row.table_name === 'stops' &&
            row.field_name === 'stop_name' &&
            row.language === 'sv') {
            stopNamesSv.set(row.field_value, row.translation);
        }
    });

    for (const stop of stops.values()) {
        stop.nameSv = stopNamesSv.get(stop.name) || stop.name;
    }

    await readRows('stop_areas.txt', row => {
        if (!row.area_id || !row.stop_id) {
            return;
        }
        if (!stopAreas.has(row.area_id)) {
            stopAreas.set(row.area_id, new Set());
        }
        stopAreas.get(row.area_id).add(row.stop_id);
    });

    const stopStationIds = new Map();
    for (const stop of stops.values()) {
        let stationId = stop.parentStation;
        if (!stationId) {
            for (const [areaId, stopIds] of stopAreas) {
                if (stopIds.has(stop.id)) {
                    stationId = `area:${areaId}`;
                    break;
                }
            }
        }
        stopStationIds.set(stop.id, stationId || `stop:${stop.id}`);
    }

    await readRows('calendar.txt', row => {
        services.set(row.service_id, {
            start: row.start_date,
            end: row.end_date,
            days: dayNames.map(name => Number(row[name]) === 1 ? 1 : 0),
            add: [],
            remove: []
        });
    });

    await readRows('calendar_dates.txt', row => {
        let service = services.get(row.service_id);
        if (!service) {
            service = {
                start: row.date,
                end: row.date,
                days: [0, 0, 0, 0, 0, 0, 0],
                add: [],
                remove: []
            };
            services.set(row.service_id, service);
        }
        if (row.exception_type === '1') {
            service.add.push(row.date);
        } else if (row.exception_type === '2') {
            service.remove.push(row.date);
        }
    });

    const stationLookup = new Map();
    for (const stop of stops.values()) {
        const stationId = stopStationIds.get(stop.id);
        if (!stationLookup.has(stationId)) {
            stationLookup.set(stationId, {
                id: stationId,
                name: stop.name,
                nameSv: stop.nameSv,
                stopIds: new Set(),
                routeIds: new Set(),
                departureKeys: new Map()
            });
        }
        stationLookup.get(stationId).stopIds.add(stop.id);
    }

    let stopTimeRows = 0;
    let matchedStopTimeRows = 0;

    await readRows('stop_times.txt', row => {
        stopTimeRows++;
        const trip = trips.get(row.trip_id);
        if (!trip) {
            return;
        }
        const stop = stops.get(row.stop_id);
        if (!stop) {
            return;
        }
        const stationId = stopStationIds.get(stop.id);
        const station = stationLookup.get(stationId);
        if (!station) {
            return;
        }
        matchedStopTimeRows++;
        station.routeIds.add(trip.routeId);
        const time = row.departure_time || row.arrival_time;
        if (!time) {
            return;
        }
        const route = routes.get(trip.routeId);
        const key = JSON.stringify([
            trip.routeId,
            trip.directionId,
            trip.headsign || '',
            time
        ]);
        let departure = station.departureKeys.get(key);
        if (!departure) {
            departure = {
                r: trip.routeId,
                rn: route ? route.shortName || route.longName || trip.routeId : trip.routeId,
                d: trip.directionId,
                h: trip.headsign || '',
                t: time,
                s: new Set()
            };
            station.departureKeys.set(key, departure);
        }
        departure.s.add(trip.serviceId);
    });

    const stationOutput = {};
    for (const station of stationLookup.values()) {
        const departures = [...station.departureKeys.values()]
            .map(departure => ({
                r: departure.r,
                rn: departure.rn,
                d: departure.d,
                h: departure.h,
                t: departure.t,
                s: [...departure.s].sort()
            }))
            .sort((a, b) => a.t.localeCompare(b.t) ||
                String(a.r).localeCompare(String(b.r)));

        if (!departures.length) {
            continue;
        }
        stationOutput[station.id] = {
            n: station.name,
            ns: station.nameSv,
            x: [...station.stopIds].sort(),
            p: [...station.routeIds].sort(),
            d: departures
        };
    }

    const index = {
        version: 1,
        timezone: 'Europe/Helsinki',
        services: Object.fromEntries(services),
        stations: stationOutput
    };
    const json = Buffer.from(JSON.stringify(index));
    const compressed = zlib.gzipSync(json, {level: 9});

    fs.mkdirSync(path.dirname(outputFile), {recursive: true});
    fs.writeFileSync(outputFile, compressed);

    console.log(`Generated ${path.relative(process.cwd(), outputFile)}`);
    console.log(`Stop time rows: ${stopTimeRows}`);
    console.log(`Matched stop time rows: ${matchedStopTimeRows}`);
    console.log(`Stations with departures: ${Object.keys(stationOutput).length}`);
    console.log(`Services: ${services.size}`);
    console.log(`Uncompressed bytes: ${json.length}`);
    console.log(`Compressed bytes: ${compressed.length}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
