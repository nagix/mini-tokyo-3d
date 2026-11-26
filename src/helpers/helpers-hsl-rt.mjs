function longToNumber(value) {
    if (value === undefined || value === null) {
        return undefined;
    }
    return Number(value);
}

export function getTranslatedText(value, lang = 'fi') {
    const translations = (value && value.translation) || [];
    const normalizedLang = lang.split('-')[0].toLowerCase();
    const candidates = [
        lang.toLowerCase(),
        normalizedLang,
        'fi',
        'en'
    ];

    for (const candidate of candidates) {
        const translation = translations.find(item =>
            (item.language || '').toLowerCase() === candidate
        );

        if (translation && translation.text) {
            return translation.text;
        }
    }
    return translations
        .map(item => item.text)
        .find(Boolean) || '';
}

export function isAlertActive(alert, timestamp = Date.now() / 1000) {
    const periods = alert.activePeriod || [];

    if (!periods.length) {
        return true;
    }
    return periods.some(period => {
        const start = longToNumber(period.start),
            end = longToNumber(period.end);

        return (start === undefined || timestamp >= start) &&
            (end === undefined || timestamp <= end);
    });
}

export function normalizeServiceAlerts(message, lang = 'fi', timestamp = Date.now() / 1000) {
    const alerts = [];

    for (const entity of message.entity || []) {
        if (!entity.alert || !isAlertActive(entity.alert, timestamp)) {
            continue;
        }
        const alert = entity.alert,
            selectors = (alert.informedEntity || []).map(selector => ({
                agencyId: selector.agencyId,
                routeId: selector.routeId,
                stopId: selector.stopId
            }));

        alerts.push({
            id: entity.id,
            header: getTranslatedText(alert.headerText, lang),
            description: getTranslatedText(alert.descriptionText, lang),
            url: getTranslatedText(alert.url, lang),
            cause: alert.cause,
            effect: alert.effect,
            selectors
        });
    }
    return alerts;
}

function isServiceActive(service, date) {
    if (!service) {
        return false;
    }
    if (service.add && service.add.includes(date)) {
        return true;
    }
    if (service.remove && service.remove.includes(date)) {
        return false;
    }
    if (date < service.start || date > service.end) {
        return false;
    }
    const year = Number(date.slice(0, 4)),
        month = Number(date.slice(4, 6)) - 1,
        day = Number(date.slice(6, 8)),
        weekday = new Date(Date.UTC(year, month, day)).getUTCDay();

    return service.days[(weekday + 6) % 7] === 1;
}

export function resolveHslTrip(index, tripDescriptor) {
    if (!index || !tripDescriptor) {
        return undefined;
    }
    const {routeId, startDate, startTime, directionId} = tripDescriptor;
    const routeIds = [routeId || ''];

    // HSL occasionally appends an operational letter to the realtime route ID.
    // Fall back only when the exact composite key is absent and a GTFS route
    // prefix has an exact start-time/direction match.
    let shortenedRouteId = routeIds[0];

    while (/[A-Z]$/i.test(shortenedRouteId)) {
        shortenedRouteId = shortenedRouteId.slice(0, -1);
        routeIds.push(shortenedRouteId);
    }
    if (!startDate) {
        return undefined;
    }
    for (const candidateRouteId of routeIds) {
        const key = `${candidateRouteId}|${startTime || ''}|${directionId === undefined ? '' : directionId}`,
            candidates = index.trips && index.trips[key];

        if (!candidates) {
            continue;
        }
        for (const [serviceId, patternIndex] of candidates) {
            if (isServiceActive(index.services && index.services[serviceId], startDate)) {
                const pattern = index.patterns && index.patterns[patternIndex];

                if (pattern) {
                    return {
                        routeId: pattern[0],
                        directionId: pattern[1],
                        shapeId: pattern[2],
                        stops: pattern[3] || []
                    };
                }
            }
        }
    }
}

export function normalizeVehiclePositions(message) {
    const result = [];

    for (const entity of message.entity || []) {
        const value = entity.vehicle,
            position = value && value.position,
            trip = value && value.trip;

        if (!position || !trip || !Number.isFinite(position.longitude) ||
            !Number.isFinite(position.latitude)) {
            continue;
        }
        result.push({
            id: entity.id,
            vehicleId: value.vehicle && value.vehicle.id,
            label: value.vehicle && value.vehicle.label,
            licensePlate: value.vehicle && value.vehicle.licensePlate,
            routeId: trip.routeId,
            startDate: trip.startDate,
            startTime: trip.startTime,
            directionId: trip.directionId,
            scheduleRelationship: trip.scheduleRelationship,
            longitude: position.longitude,
            latitude: position.latitude,
            bearing: Number.isFinite(position.bearing) ? position.bearing : 0,
            speed: position.speed,
            currentStopSequence: value.currentStopSequence,
            currentStatus: value.currentStatus,
            congestionLevel: value.congestionLevel,
            occupancyStatus: value.occupancyStatus,
            stopId: value.stopId,
            timestamp: longToNumber(value.timestamp)
        });
    }
    return result;
}

