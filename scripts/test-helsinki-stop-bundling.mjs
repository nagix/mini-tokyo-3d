import assert from 'node:assert/strict';
import test from 'node:test';

import {getStopBundleKey, getStopMunicipality} from '../src/helpers/helpers-gtfs.js';

test('same stop name in different HSL areas uses separate bundle keys', () => {
    const hanasaariHelsinki = getStopBundleKey({
        id: '1100102',
        name: 'Hanasaari',
        areaId: '110219'
    });
    const hanasaariEspoo = getStopBundleKey({
        id: '2222205',
        name: 'Hanasaari',
        areaId: '210365'
    });

    assert.notEqual(hanasaariHelsinki, hanasaariEspoo);
});

test('same stop name in separate Pilvijärventie areas uses separate bundle keys', () => {
    assert.notEqual(
        getStopBundleKey({id: '6070205', name: 'Pilvijärventie', areaId: '610163'}),
        getStopBundleKey({id: '9208201', name: 'Pilvijärventie', areaId: '910168'})
    );
});

test('stops in the same area retain a shared bundle key', () => {
    const first = getStopBundleKey({id: '1010107', name: 'Meritullinkatu', areaId: '110007'});
    const second = getStopBundleKey({id: '1010108', name: 'Meritullinkatu', areaId: '110007'});

    assert.equal(first, second);
});

test('route-mode and area scope distinguish identical names', () => {
    assert.notEqual(
        getStopBundleKey({id: 'a', name: 'Helsinki', routeMode: 'bus', areaId: '1'}),
        getStopBundleKey({id: 'b', name: 'Helsinki', routeMode: 'rail', areaId: '1'})
    );
});

test('HSL stop IDs provide municipality labels for duplicate stop names', () => {
    assert.deepEqual(getStopMunicipality('1100102'), {fi: 'Helsinki', sv: 'Helsingfors'});
    assert.deepEqual(getStopMunicipality('2222205'), {fi: 'Espoo', sv: 'Esbo'});
    assert.deepEqual(getStopMunicipality('1020457'), {fi: 'Helsinki', sv: 'Helsingfors'});
    assert.deepEqual(getStopMunicipality('4210201'), {fi: 'Vantaa', sv: 'Vanda'});
    assert.deepEqual(getStopMunicipality('9050232', 'Ke0532'), {fi: 'Kerava', sv: 'Kervo'});
    assert.deepEqual(getStopMunicipality('6010203', 'Ki0133'), {fi: 'Kirkkonummi', sv: 'Kyrkslätt'});
});
