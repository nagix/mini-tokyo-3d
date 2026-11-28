import assert from 'node:assert/strict';
import test from 'node:test';
import {
    isAlertActive,
    normalizeServiceAlerts,
    normalizeVehiclePositions,
    resolveHslTrip
} from '../src/helpers/helpers-hsl-rt.mjs';
import {
    getStopTransitMode,
    getTransitMinZoom,
    getRouteMinZoom,
    getRealtimeVehicleMinZoom,
    getTransitMode
} from '../src/helpers/helpers-transit.mjs';
import {
    getHslDepartures,
    isHslServiceActive,
    parseHslTime
} from '../src/helpers/helpers-hsl-timetable.mjs';

test('service alerts prefer Finnish and only return active entities', () => {
    const message = {
        entity: [{
            id: 'active',
            alert: {
                activePeriod: [{start: '100', end: '200'}],
                informedEntity: [{routeId: '1001'}],
                headerText: {
                    translation: [
                        {language: 'en', text: 'Disruption'},
                        {language: 'fi', text: 'Häiriö'}
                    ]
                },
                descriptionText: {
                    translation: [{language: 'en', text: 'Details'}]
                }
            }
        }, {
            id: 'future',
            alert: {
                activePeriod: [{start: '300'}],
                informedEntity: [{agencyId: 'HSL'}],
                headerText: {}
            }
        }]
    };
    const alerts = normalizeServiceAlerts(message, 'fi-FI', 150);

    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].id, 'active');
    assert.equal(alerts[0].header, 'Häiriö');
    assert.equal(alerts[0].description, 'Details');
    assert.equal(isAlertActive({activePeriod: [{end: '149'}]}, 150), false);
});

test('HSL composite keys honor service dates, direction, and aliases', () => {
    const index = {
        services: {
            weekday: {
                start: '20261123',
                end: '20261127',
                days: [1, 1, 1, 1, 1, 0, 0],
                add: ['20261128'],
                remove: ['20261126']
            }
        },
        patterns: [['100H', 1, 'shape-h', ['stop-1']]],
        trips: {
            '100H|02:15:00|1': [['weekday', 0]]
        }
    };

    assert.equal(resolveHslTrip(index, {
        routeId: '100HE',
        startDate: '20261125',
        startTime: '02:15:00',
        directionId: 1
    }).shapeId, 'shape-h');
    assert.equal(resolveHslTrip(index, {
        routeId: '100H',
        startDate: '20261128',
        startTime: '02:15:00',
        directionId: 1
    }).shapeId, 'shape-h');
    assert.equal(resolveHslTrip(index, {
        routeId: '100H',
        startDate: '20261126',
        startTime: '02:15:00',
        directionId: 1
    }), undefined);
});

test('vehicle entities keep distinct scheduled and added vehicles', () => {
    const entity = (id, relationship) => ({
        id,
        vehicle: {
            trip: {
                routeId: '1001',
                startDate: '20261126',
                startTime: '10:00:00',
                directionId: 0,
                scheduleRelationship: relationship
            },
            position: {
                longitude: 24.94,
                latitude: 60.17,
                bearing: 90
            },
            vehicle: {id},
            timestamp: '100'
        }
    });
    const vehicles = normalizeVehiclePositions({
        entity: [
            entity('vehicle-1', 'SCHEDULED'),
            entity('vehicle-2', 'ADDED'),
            {id: 'missing-position', vehicle: {trip: {routeId: '1001'}}}
        ]
    });

    assert.equal(vehicles.length, 2);
    assert.equal(new Set(vehicles.map(vehicle => vehicle.id)).size, 2);
    assert.deepEqual(vehicles.map(vehicle => vehicle.scheduleRelationship),
        ['SCHEDULED', 'ADDED']);
});

test('transit modes use a shared zoom policy', () => {
    const thresholds = {
        rail: 7.5,
        metro: 8,
        ferry: 9.5,
        tram: 11,
        bus: 12
    };

    assert.equal(getTransitMode(1), 'metro');
    assert.equal(getTransitMode(109), 'rail');
    assert.equal(getTransitMode(701), 'bus');
    assert.equal(getTransitMode(900), 'tram');
    assert.equal(getStopTransitMode(109), 'rail');
    assert.equal(getTransitMinZoom(1, thresholds), 8);
    assert.equal(getTransitMinZoom(701, thresholds), 12);
    assert.equal(getTransitMinZoom(109, thresholds, true), 7.5);
    assert.equal(getRouteMinZoom(701, thresholds), 10);
    assert.equal(getTransitMinZoom(701, thresholds, true), 12);
    assert.equal(getRouteMinZoom(109, thresholds), 7.5);
    assert.equal(getRealtimeVehicleMinZoom(701, thresholds), 11.5);
    assert.equal(getRealtimeVehicleMinZoom(109, thresholds), 7.5);
});

test('HSL timetable calendar and after-midnight departures are resolved', () => {
    const weekday = {
        start: '20261124',
        end: '20261220',
        days: [1, 1, 1, 1, 1, 0, 0],
        add: ['20261128'],
        remove: ['20261126']
    };

    assert.equal(isHslServiceActive(weekday, '20261125'), true);
    assert.equal(isHslServiceActive(weekday, '20261126'), false);
    assert.equal(isHslServiceActive(weekday, '20261128'), true);
    assert.equal(parseHslTime('25:05'), 1505);

    const data = {
        services: {weekday},
        stations: {
            'area:1': {
                d: [
                    {r: '1001', rn: '1', d: 0, h: 'Käpylä', t: '05:37:00', s: ['weekday']},
                    {r: '1001', rn: '1', d: 0, h: 'Käpylä', t: '25:05:00', s: ['weekday']}
                ]
            }
        }
    };
    const departures = getHslDepartures(data, 'area:1', '2026-11-25');

    assert.deepEqual(departures.map(({displayTime}) => displayTime),
        ['01:05', '05:37']);
});

test('HSL timetable starts 10 minutes before the selected time and limits rows', () => {
    const weekday = {
        start: '20261124',
        end: '20261220',
        days: [1, 1, 1, 1, 1, 1, 1],
        add: [],
        remove: []
    };
    const times = Array.from({length: 45}, (_, index) =>
        `${`0${Math.floor((599 + index) / 60)}`.slice(-2)}:${`0${(599 + index) % 60}`.slice(-2)}:00`
    );
    const data = {
        services: {weekday},
        stations: {
            'area:1': {
                d: times.map((time, index) => ({
                    r: String(index),
                    rn: String(index),
                    d: 0,
                    h: '',
                    t: time,
                    s: ['weekday']
                }))
            }
        }
    };

    const departures = getHslDepartures(data, 'area:1', '2026-11-25', 40, 10 * 60);

    assert.equal(departures.length, 40);
    assert.equal(departures[0].displayTime, '09:59');
    assert.equal(departures[39].displayTime, '10:38');
});
