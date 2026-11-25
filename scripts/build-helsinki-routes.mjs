import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const inputDir = path.resolve(process.argv[2] || 'helsinki/hsl');
const outputFile = path.resolve(process.argv[3] || 'build/data/hsl-routes.json');

// HSL design tokens from https://www.hsl.fi/_next/static/css/7619089ebd2dd7b1.css
const HSL_TRANSPORTATION_COLORS = Object.freeze({
    'color-transportation-bus-900': '#0063a2',
    'color-transportation-bus-500': '#0074bf',
    'color-transportation-bus-100': '#ebf6fd',
    'color-transportation-tram-900': '#008151',
    'color-transportation-tram-500': '#00985f',
    'color-transportation-tram-100': '#e5f5ef',
    'color-transportation-commuter-train-900': '#773c82',
    'color-transportation-commuter-train-500': '#8c4799',
    'color-transportation-commuter-train-100': '#f3edf5',
    'color-transportation-metro-900': '#ca4000',
    'color-transportation-metro-500': '#ff6319',
    'color-transportation-metro-100': '#ffefe8',
    'color-transportation-speedtram-900': '#007e79',
    'color-transportation-speedtram-500': '#00b2a9',
    'color-transportation-speedtram-100': '#e5f7f6',
    'color-transportation-ferry-900': '#007a97',
    'color-transportation-ferry-500': '#00b9e4',
    'color-transportation-ferry-100': '#bee4f8',
    'color-transportation-city-bike-900': '#d6a015',
    'color-transportation-city-bike-500': '#fcbc19',
    'color-transportation-city-bike-100': '#fff8e8',
    'color-transportation-replacement-900': '#bb0345',
    'color-transportation-replacement-500': '#dc0451',
    'color-transportation-replacement-100': '#fbe6ee',
    'color-transportation-external-900': '#55647d',
    'color-transportation-external-500': '#647693',
    'color-transportation-external-100': '#eff1f4'
});

const ROUTE_COLOR_TOKENS = {
    0: 'color-transportation-tram-500',
    1: 'color-transportation-metro-500',
    4: 'color-transportation-ferry-500',
    109: 'color-transportation-commuter-train-500',
    701: 'color-transportation-bus-500',
    702: 'color-transportation-bus-500',
    704: 'color-transportation-bus-500',
    900: 'color-transportation-speedtram-500'
};

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
    let rowNumber = 0;

    for await (const line of reader) {
        rowNumber++;
        const values = parseCsvLine(line);

        if (!headers) {
            headers = values;
            continue;
        }
        if (!line) {
            continue;
        }
        const row = Object.fromEntries(headers.map((header, index) => [
            header,
            values[index] === undefined ? '' : values[index]
        ]));

        onRow(row, rowNumber);
    }
}

function requireInput(fileName) {
    const file = path.join(inputDir, fileName);

    if (!fs.existsSync(file)) {
        throw new Error(`HSL route data is missing: ${file}`);
    }
}

for (const file of ['routes.txt', 'trips.txt', 'shapes.txt', 'stops.txt']) {
    requireInput(file);
}

async function main() {
    const routes = new Map();
    const shapeRoutes = new Map();
    const shapeCoordinates = new Map();
    let stopCount = 0;
    let duplicateRelations = 0;

    await readRows('routes.txt', row => {
        routes.set(row.route_id, {
            id: row.route_id,
            shortName: row.route_short_name,
            longName: row.route_long_name,
            type: Number(row.route_type),
            url: row.route_url
        });
    });

    await readRows('trips.txt', row => {
        if (!row.shape_id || !row.route_id) {
            return;
        }
        let routeIds = shapeRoutes.get(row.shape_id);

        if (!routeIds) {
            routeIds = new Set();
            shapeRoutes.set(row.shape_id, routeIds);
        }
        if (routeIds.has(row.route_id)) {
            duplicateRelations++;
        } else {
            routeIds.add(row.route_id);
        }
    });

    await readRows('shapes.txt', (row, rowNumber) => {
        if (!shapeRoutes.has(row.shape_id)) {
            return;
        }
        const longitude = Number(row.shape_pt_lon);
        const latitude = Number(row.shape_pt_lat);
        const sequence = Number(row.shape_pt_sequence);

        if (!Number.isFinite(longitude) || !Number.isFinite(latitude) ||
            longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90 ||
            !Number.isFinite(sequence)) {
            throw new Error(`Invalid coordinate in shapes.txt at line ${rowNumber}`);
        }
        let coordinates = shapeCoordinates.get(row.shape_id);

        if (!coordinates) {
            coordinates = [];
            shapeCoordinates.set(row.shape_id, coordinates);
        }
        coordinates.push({sequence, coordinate: [longitude, latitude]});
    });

    const features = [];
    const missingRoutes = new Set();
    const missingShapes = new Set();
    const shortShapes = new Set();

    for (const [shapeId, routeIds] of shapeRoutes) {
        const points = shapeCoordinates.get(shapeId);

        if (!points) {
            missingShapes.add(shapeId);
            continue;
        }
        points.sort((a, b) => a.sequence - b.sequence);
        if (points.length < 2) {
            shortShapes.add(shapeId);
            continue;
        }
        const coordinates = points.map(({coordinate}) => coordinate);

        for (const routeId of routeIds) {
            const route = routes.get(routeId);

            if (!route) {
                missingRoutes.add(routeId);
                continue;
            }
            const colorToken = ROUTE_COLOR_TOKENS[route.type];

            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates
                },
                properties: {
                    id: `${routeId}.${shapeId}`,
                    featureType: 'route',
                    routeId,
                    shapeId,
                    shortName: route.shortName,
                    longName: route.longName,
                    routeType: route.type,
                    colorToken,
                    color: HSL_TRANSPORTATION_COLORS[colorToken] ||
                        HSL_TRANSPORTATION_COLORS['color-transportation-external-500']
                }
            });
        }
    }

    await readRows('stops.txt', (row, rowNumber) => {
        const longitude = Number(row.stop_lon);
        const latitude = Number(row.stop_lat);

        if (!Number.isFinite(longitude) || !Number.isFinite(latitude) ||
            longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            throw new Error(`Invalid coordinate in stops.txt at line ${rowNumber}`);
        }
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [longitude, latitude]
            },
            properties: {
                id: `stop.${row.stop_id}`,
                featureType: 'stop',
                stopId: row.stop_id,
                stopCode: row.stop_code,
                name: row.stop_name,
                locationType: Number(row.location_type),
                vehicleType: Number(row.vehicle_type)
            }
        });
        stopCount++;
    });

    if (missingRoutes.size || missingShapes.size || shortShapes.size) {
        throw new Error([
            'HSL route validation failed.',
            `Missing routes: ${missingRoutes.size}`,
            `Missing shapes: ${missingShapes.size}`,
            `Shapes with fewer than two points: ${shortShapes.size}`
        ].join(' '));
    }

    const featureCollection = {
        type: 'FeatureCollection',
        features
    };

    fs.mkdirSync(path.dirname(outputFile), {recursive: true});
    fs.writeFileSync(outputFile, JSON.stringify(featureCollection));

    console.log(`Generated ${path.relative(process.cwd(), outputFile)}`);
    console.log(`Routes: ${routes.size}`);
    console.log(`Route/shape features: ${features.filter(feature => feature.geometry.type === 'LineString').length}`);
    console.log(`Stops: ${stopCount}`);
    console.log(`Unique shapes: ${shapeCoordinates.size}`);
    console.log(`Duplicate trip relationships ignored: ${duplicateRelations}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
