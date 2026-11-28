export function isHslServiceActive(service, date) {
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

export function parseHslTime(time) {
    const parts = String(time).split(':');
    const hours = Number(parts[0]);
    const minutes = Number(parts[1] || 0);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return undefined;
    }
    return hours * 60 + minutes;
}

export function getHslDepartures(data, stationId, date, limit = 30, nowMinutes) {
    if (!data || !stationId) {
        return [];
    }
    const station = data.stations[stationId];

    if (!station) {
        return [];
    }
    const compactDate = date.replace(/-/g, '');
    const previousDate = new Date(
        Date.UTC(
            Number(compactDate.slice(0, 4)),
            Number(compactDate.slice(4, 6)) - 1,
            Number(compactDate.slice(6, 8)) - 1
        )
    );
    const previousCompactDate = [
        previousDate.getUTCFullYear(),
        `0${previousDate.getUTCMonth() + 1}`.slice(-2),
        `0${previousDate.getUTCDate()}`.slice(-2)
    ].join('');
    const departures = [];

    for (const departure of station.d) {
        const rawMinutes = parseHslTime(departure.t);

        if (rawMinutes === undefined) {
            continue;
        }
        const hours = Math.floor(rawMinutes / 60);
        const serviceDate = hours >= 24 ? previousCompactDate : compactDate;
        const active = (departure.s || []).some(serviceId =>
            isHslServiceActive(data.services[serviceId], serviceDate)
        );

        if (!active) {
            continue;
        }
        const displayMinutes = rawMinutes % 1440;
        departures.push({
            ...departure,
            displayTime: [
                `0${Math.floor(displayMinutes / 60)}`.slice(-2),
                `0${displayMinutes % 60}`.slice(-2)
            ].join(':'),
            sortTime: rawMinutes >= 1440 ? rawMinutes - 1440 : rawMinutes
        });
    }
    return departures
        .sort((a, b) => a.sortTime - b.sortTime ||
            String(a.r).localeCompare(String(b.r)))
        .filter(departure =>
            nowMinutes === undefined || departure.sortTime >= nowMinutes - 10
        )
        .slice(0, limit);
}
