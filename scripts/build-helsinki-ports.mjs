import fs from 'node:fs';
import path from 'node:path';

const endpoint = process.env.DIGITRAFFIC_PORTS_URL ||
    'https://meri.digitraffic.fi/api/port-call/v2/ports/FIHEL';
const outputFile = path.resolve(process.argv[2] || 'build/data/helsinki-ports.json');

async function main() {
    const response = await fetch(endpoint);

    if (!response.ok) {
        throw new Error(`Digitraffic port request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const areas = (data.portAreas && data.portAreas.features) || [];
    const berths = (data.berths && data.berths.berths) || [];
    const berthLookup = new Map();

    for (const berth of berths) {
        if (!berth.berthCode ||
            /POISTETTU|Ei tiedossa/i.test(berth.berthName)) {
            continue;
        }
        const key = `${berth.locode}.${berth.portAreaCode}`;
        const areaBerths = berthLookup.get(key) || [];

        areaBerths.push({
            code: berth.berthCode,
            name: berth.berthName
        });
        berthLookup.set(key, areaBerths);
    }
    const features = areas.filter(({geometry, locode}) =>
        locode === 'FIHEL' &&
        geometry &&
        geometry.type === 'Point' &&
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length === 2
    ).map(area => {
        const [longitude, latitude] = area.geometry.coordinates.map(Number);

        if (!Number.isFinite(longitude) || !Number.isFinite(latitude) ||
            longitude < 24 || longitude > 25.5 ||
            latitude < 59.8 || latitude > 60.5) {
            throw new Error(`Invalid Helsinki port coordinate for ${area.portAreaCode}`);
        }
        const areaBerths = berthLookup.get(`${area.locode}.${area.portAreaCode}`) || [];
        const revealZoom = areaBerths.length > 20 ? 10.5 :
            areaBerths.length > 5 ? 11.5 :
            areaBerths.length > 0 ? 12.5 : 13.5;

        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [longitude, latitude]
            },
            properties: {
                id: `port.${area.locode}.${area.portAreaCode}`,
                featureType: 'port',
                locode: area.locode,
                portAreaCode: area.portAreaCode,
                name: area.properties.portAreaName,
                berthCount: areaBerths.length,
                revealZoom,
                berths: areaBerths.map(({code, name}) => `${code}: ${name}`).join('|')
            }
        };
    }).sort((a, b) => a.properties.portAreaCode.localeCompare(b.properties.portAreaCode));

    if (!features.length) {
        throw new Error('Digitraffic returned no Helsinki port areas with coordinates.');
    }

    const result = {
        type: 'FeatureCollection',
        metadata: {
            source: endpoint,
            dataUpdatedTime: data.dataUpdatedTime,
            generatedAt: new Date().toISOString()
        },
        features
    };

    fs.mkdirSync(path.dirname(outputFile), {recursive: true});
    fs.writeFileSync(outputFile, JSON.stringify(result));
    console.log(`Generated ${path.relative(process.cwd(), outputFile)}`);
    console.log(`Helsinki port areas: ${features.length}`);
    console.log(`Active berths: ${features.reduce((sum, feature) => sum + feature.properties.berthCount, 0)}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
