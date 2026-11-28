import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveOptions} from '../src/options.js';
import * as THREE from 'three';
import ParticleRenderer from '../src/particle-renderer.js';
import {advanceParticleState, createParticleState, writeParticlePositions} from '../src/particle-state.js';

test('resolves fixed rain and snow demo presets', () => {
    assert.equal(resolveOptions({}, '?precipitation=rain&precipitation-preset=light').type, 'rain');
    assert.equal(resolveOptions({type: 'snow', preset: 'heavy'}).settings.particles, 750);
});

test('rejects unknown demo configuration explicitly', () => {
    assert.throws(() => resolveOptions({type: 'hail'}), /Unknown precipitation type/);
    assert.throws(() => resolveOptions({type: 'rain', preset: 'extreme'}), /Unknown rain precipitation preset/);
});

test('creates deterministic particle state', () => {
    const first = createParticleState(10, 42),
        second = createParticleState(10, 42);

    assert.deepEqual(first.x, second.x);
    assert.deepEqual(first.y, second.y);
    assert.deepEqual(first.viewX, second.viewX);
    assert.deepEqual(first.viewY, second.viewY);
    assert.deepEqual(first.depth, second.depth);
});

test('advances gravity along the world vertical axis', () => {
    const options = resolveOptions({type: 'rain', preset: 'light'}),
        state = createParticleState(20, 7),
        worldScale = 0.000001;

    state.x[0] = 1;
    state.y[0] = 2;
    state.z[0] = 3;
    advanceParticleState(state, 0.1, options.settings, options.type, worldScale);
    assert.ok(state.z[0] < 3);
    assert.equal(state.y[0], 2);
    assert.ok(state.x[0] > 1);
});

function createCamera({pitch = 20, bearing = 0, zoom = 11.5, x = 0, y = 0} = {}) {
    const camera = new THREE.PerspectiveCamera(36.87, 16 / 9, 21.6, 100000),
        worldSize = 512 * 2 ** zoom,
        rotation = new THREE.Matrix4().makeRotationZ(-bearing * Math.PI / 180)
            .multiply(new THREE.Matrix4().makeRotationX(pitch * Math.PI / 180));

    camera.matrixWorldAutoUpdate = false;
    camera.matrixWorld.copy(new THREE.Matrix4().makeTranslation(x, y, 0))
        .multiply(rotation)
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, 1620 / worldSize))
        .multiply(new THREE.Matrix4().makeScale(1 / worldSize, 1 / worldSize, 1 / worldSize));
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    return camera;
}

function visibleQuadrants(renderer, camera) {
    const result = [0, 0, 0, 0],
        point = new THREE.Vector3(),
        state = renderer.state;

    for (let i = 0; i < state.count; i++) {
        point.set(state.x[i], state.y[i], state.z[i]).project(camera);
        if (Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && Math.abs(point.z) <= 1) {
            result[(point.x > 0 ? 1 : 0) + (point.y > 0 ? 2 : 0)]++;
        }
    }
    return result;
}

test('replenishes the current viewport after pan, zoom, bearing and pitch changes', () => {
    for (const type of ['rain', 'snow']) {
        const options = resolveOptions({type, preset: 'heavy'}),
            renderer = new ParticleRenderer(THREE, options, {getModelScale: () => 5.022e-8});

        renderer.state = createParticleState(1000, options.seed);
        for (const view of [
            {}, {x: 0.01, y: -0.01}, {zoom: 16, x: 0.01, y: -0.01},
            {zoom: 16, pitch: 60, bearing: 180, x: 0.01, y: -0.01},
            {pitch: 0}, {zoom: 9, pitch: 75, bearing: -90}
        ]) {
            const camera = createCamera(view);

            renderer.keepParticlesVisible(camera);
            const quadrants = visibleQuadrants(renderer, camera);

            assert.ok(quadrants.reduce((sum, count) => sum + count, 0) >= 990, JSON.stringify(view));
            assert.ok(quadrants.every(count => count >= 150), JSON.stringify({view, quadrants}));
        }
    }
});

test('camera changes never translate surviving particles in world space', () => {
    const options = resolveOptions({type: 'snow'}),
        renderer = new ParticleRenderer(THREE, options, {getModelScale: () => 5.022e-8});

    renderer.state = createParticleState(1000, options.seed);
    renderer.keepParticlesVisible(createCamera());
    const before = {
            x: renderer.state.x.slice(),
            y: renderer.state.y.slice(),
            z: renderer.state.z.slice()
        },
        movedCamera = createCamera({pitch: 21, bearing: 1, x: 0.000001}),
        point = new THREE.Vector3();
    let survivors = 0;

    renderer.keepParticlesVisible(movedCamera);
    for (let i = 0; i < renderer.state.count; i++) {
        point.set(before.x[i], before.y[i], before.z[i]);
        if (renderer.volume.containsPoint(point)) {
            survivors++;
            assert.equal(renderer.state.x[i], before.x[i]);
            assert.equal(renderer.state.y[i], before.y[i]);
            assert.equal(renderer.state.z[i], before.z[i]);
        }
    }
    assert.ok(survivors > 900);
});

test('snow moves visibly and stays populated for a minute at multiple views', () => {
    for (const pitch of [0, 20, 60]) {
        const options = resolveOptions({type: 'snow', preset: 'heavy'}),
            renderer = new ParticleRenderer(THREE, options, {getModelScale: () => 5.022e-8}),
            camera = createCamera({pitch}),
            before = new THREE.Vector3(),
            after = new THREE.Vector3(),
            motions = [];

        renderer.state = createParticleState(1000, options.seed);
        renderer.keepParticlesVisible(camera);
        for (let i = 0; i < renderer.state.count; i++) {
            before.set(renderer.state.x[i], renderer.state.y[i], renderer.state.z[i]).project(camera);
            after.set(renderer.state.x[i], renderer.state.y[i],
                renderer.state.z[i] - options.settings.fallSpeed * renderer.state.drift[i] * renderer.worldScale)
                .project(camera);
            motions.push(Math.hypot((before.x - after.x) * 960, (before.y - after.y) * 540));
        }
        motions.sort((a, b) => a - b);
        assert.ok(motions[500] > 1, `No visible projected motion at pitch ${pitch}`);
        for (let frame = 0; frame < 600; frame++) {
            advanceParticleState(renderer.state, 0.1, options.settings, options.type, renderer.worldScale);
            renderer.keepParticlesVisible(camera);
        }
        const quadrants = visibleQuadrants(renderer, camera);

        assert.ok(quadrants.every(count => count >= 150), JSON.stringify({pitch, quadrants}));
    }
});

test('render uses elapsed time at low frame rates and recreates resources on resize/removal', t => {
    const options = resolveOptions({type: 'rain'}),
        canvas = {clientWidth: 1280, clientHeight: 720},
        renderer = new ParticleRenderer(THREE, options, {
            getModelScale: () => 5.022e-8,
            getMapboxMap: () => ({getCanvas: () => canvas})
        }),
        scene = new THREE.Scene(),
        camera = createCamera(),
        context = {scene, camera, renderer: {render() {}}};
    let now = 1000;

    t.mock.method(performance, 'now', () => now);
    renderer.onAdd(context);
    renderer.render(context);
    const initialZ = renderer.state.z.slice(),
        drift = renderer.state.drift.slice(),
        oldGeometry = renderer.geometry;
    let disposed = false;

    oldGeometry.addEventListener('dispose', () => {
        disposed = true;
    });
    now += 200;
    renderer.render(context);
    let moving = 0;

    for (let i = 0; i < renderer.state.count; i++) {
        const expected = initialZ[i] - 0.2 * drift[i] * options.settings.fallSpeed * renderer.worldScale;

        if (Math.abs(renderer.state.z[i] - expected) < 1e-10) {
            moving++;
        }
    }
    assert.ok(moving > renderer.state.count * 0.95);
    canvas.clientWidth = 800;
    renderer.render(context);
    assert.equal(disposed, true);
    assert.notEqual(renderer.geometry, oldGeometry);
    renderer.onRemove();
    assert.equal(scene.children.includes(renderer.root), false);
    assert.equal(renderer.state, undefined);
    assert.equal(renderer.root.children.length, 0);
    renderer.onAdd(context);
    renderer.render(context);
    assert.equal(renderer.root.children.length, 1);
    assert.ok(visibleQuadrants(renderer, camera).every(count => count > 0));
    renderer.onRemove();
});

test('writes rain streaks against world gravity without camera input', () => {
    const options = resolveOptions({type: 'rain', preset: 'light'}),
        state = createParticleState(12, 9),
        positions = new Float32Array(state.count * 6),
        worldScale = 0.000001;

    state.x[0] = 1;
    state.y[0] = 2;
    state.z[0] = 3;
    writeParticlePositions(state, positions, options.settings, options.type, worldScale);
    assert.equal(positions.length, 72);
    assert.ok(positions.every(Number.isFinite));
    assert.deepEqual(positions.slice(0, 3), new Float32Array([1, 2, 3]));
    assert.ok(positions[5] > positions[2]);
    assert.equal(positions[4], positions[1]);
});
