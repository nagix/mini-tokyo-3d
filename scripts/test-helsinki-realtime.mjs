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
    getTransitMode
} from '../src/helpers/helpers-transit.mjs';

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
});
