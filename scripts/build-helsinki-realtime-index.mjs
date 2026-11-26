import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';

const inputDir = path.resolve(process.argv[2] || 'helsinki/hsl');
const outputFile = path.resolve(process.argv[3] || 'build/data/hsl-realtime-index.json.gz');

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
    const input = fs.createReadStream(file, {encoding: 'utf8'});
    const reader = readline.createInterface({input, crlfDelay: Infinity});
    let headers;

    for await (const line of reader) {
        const values = parseCsvLine(line);

        if (!headers) {
            headers = values;
            headers[0] = headers[0].replace(/^\uFEFF/, '');
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
        throw new Error(`HSL realtime data is missing: ${file}`);
    }
}

for (const file of ['calendar.txt', 'calendar_dates.txt', 'trips.txt', 'stop_times.txt']) {
    requireInput(file);
}

async function main() {
    const trips = new Map();
    const services = new Map();
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    await readRows('calendar.txt', row => {
        services.set(row.service_id, {
            start: row.start_date,
            end: row.end_date,
            days: dayNames.map(name => (Number(row[name]) === 1 ? 1 : 0)),
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
    await readRows('trips.txt', row => {
        trips.set(row.trip_id, {
            routeId: row.route_id,
            serviceId: row.service_id,
            directionId: row.direction_id,
            shapeId: row.shape_id,
            firstSequence: Number.POSITIVE_INFINITY,
            startTime: undefined,
            stops: []
        });
    });

    let matchedStopTimes = 0;
    let timepointStops = 0;

    await readRows('stop_times.txt', row => {
        const trip = trips.get(row.trip_id);

        if (!trip) {
            return;
        }
        const sequence = Number(row.stop_sequence);

        if (Number.isFinite(sequence) && sequence < trip.firstSequence) {
            trip.firstSequence = sequence;
            trip.startTime = row.departure_time || row.arrival_time;
        }
        if (row.timepoint === '1') {
            trip.stops.push([sequence, row.stop_id]);
            timepointStops++;
        }
        matchedStopTimes++;
    });

    const patternLookup = new Map();
    const patterns = [];
    const tripLookup = {};
    let indexedTrips = 0;
    let missingStartTimes = 0;

    for (const trip of trips.values()) {
        if (!trip.startTime) {
            missingStartTimes++;
            continue;
        }
        const stops = trip.stops
            .sort((a, b) => a[0] - b[0])
            .map(([, stopId]) => stopId);
        const patternKey = JSON.stringify([
            trip.routeId,
            Number(trip.directionId),
            trip.shapeId,
            stops
        ]);
        let patternIndex = patternLookup.get(patternKey);

        if (patternIndex === undefined) {
            patternIndex = patterns.length;
            patternLookup.set(patternKey, patternIndex);
            patterns.push(JSON.parse(patternKey));
        }
        const key = `${trip.routeId}|${trip.startTime}|${trip.directionId}`;

        if (!tripLookup[key]) {
            tripLookup[key] = [];
        }
        tripLookup[key].push([trip.serviceId, patternIndex]);
        indexedTrips++;
    }

    const duplicateCandidates = new Set();

    for (const [key, candidates] of Object.entries(tripLookup)) {
        const unique = new Set(candidates.map(candidate => JSON.stringify(candidate)));

        if (unique.size !== candidates.length) {
            tripLookup[key] = [...unique].map(candidate => JSON.parse(candidate));
            duplicateCandidates.add(key);
        }
    }

    const index = {
        version: 1,
        timezone: 'Europe/Helsinki',
        services: Object.fromEntries(services),
        patterns,
        trips: tripLookup
    };
    const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(index)), {level: 9});

    fs.mkdirSync(path.dirname(outputFile), {recursive: true});
    fs.writeFileSync(outputFile, compressed);

    console.log(`Generated ${path.relative(process.cwd(), outputFile)}`);
    console.log(`Static trips: ${trips.size}`);
    console.log(`Indexed trips: ${indexedTrips}`);
    console.log(`Composite trip keys: ${Object.keys(tripLookup).length}`);
    console.log(`Patterns: ${patterns.length}`);
    console.log(`Services: ${services.size}`);
    console.log(`Matched stop times: ${matchedStopTimes}`);
    console.log(`Timepoint stops: ${timepointStops}`);
    console.log(`Trips missing start times: ${missingStartTimes}`);
    console.log(`Keys with duplicate service candidates removed: ${duplicateCandidates.size}`);
    console.log(`Compressed bytes: ${compressed.length}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
