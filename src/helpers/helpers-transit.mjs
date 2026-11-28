const ROUTE_TYPE_MODES = new Map([
    [0, 'tram'],
    [1, 'metro'],
    [2, 'rail'],
    [3, 'bus'],
    [4, 'ferry'],
    [5, 'tram'],
    [109, 'rail'],
    [400, 'metro'],
    [700, 'bus'],
    [701, 'bus'],
    [702, 'bus'],
    [704, 'bus'],
    [900, 'tram']
]);

const STOP_TYPE_MODES = new Map([
    [0, 'tram'],
    [1, 'metro'],
    [3, 'bus'],
    [4, 'ferry'],
    [109, 'rail']
]);

export function getTransitMode(routeType) {
    const type = Number(routeType);

    if (ROUTE_TYPE_MODES.has(type)) {
        return ROUTE_TYPE_MODES.get(type);
    }
    if (type >= 100 && type < 200) {
        return 'rail';
    }
    if (type >= 200 && type < 500) {
        return 'bus';
    }
    if (type >= 700 && type < 800) {
        return 'bus';
    }
    if (type >= 800 && type < 1000) {
        return 'tram';
    }
    return 'bus';
}

export function getStopTransitMode(vehicleType) {
    return STOP_TYPE_MODES.get(Number(vehicleType)) || getTransitMode(vehicleType);
}

export function getTransitMinZoom(routeType, thresholds, stop = false) {
    const mode = stop ? getStopTransitMode(routeType) : getTransitMode(routeType);

    return thresholds && thresholds[mode] !== undefined ? thresholds[mode] : 0;
}

export function getRouteMinZoom(routeType, thresholds) {
    const mode = getTransitMode(routeType);
    const minZoom = thresholds && thresholds[mode] !== undefined ? thresholds[mode] : 0;

    return mode === 'bus' ? Math.max(0, minZoom - 2) : minZoom;
}

export function getRealtimeVehicleMinZoom(routeType, thresholds) {
    const mode = getTransitMode(routeType);

    if (mode === 'bus') {
        return 11.5;
    }
    return thresholds && thresholds[mode] !== undefined ? thresholds[mode] : 0;
}
