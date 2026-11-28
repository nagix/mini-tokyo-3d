function createRandom(seed) {
    let value = seed >>> 0;

    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

export function createParticleState(count, seed) {
    const random = createRandom(seed),
        state = {
            count,
            x: new Float32Array(count),
            y: new Float32Array(count),
            z: new Float32Array(count),
            viewX: new Float32Array(count),
            viewY: new Float32Array(count),
            depth: new Float32Array(count),
            drift: new Float32Array(count),
            phase: new Float32Array(count)
        };

    for (let i = 0; i < count; i++) {
        state.viewX[i] = random() * 2 - 1;
        state.viewY[i] = random() * 2 - 1;
        state.depth[i] = random();
        state.drift[i] = 0.65 + random() * 0.7;
        state.phase[i] = random() * Math.PI * 2;
    }
    return state;
}

export function advanceParticleState(state, delta, settings, type, worldScale) {
    for (let i = 0; i < state.count; i++) {
        const speed = state.drift[i] * settings.fallSpeed * worldScale,
            wind = settings.wind * worldScale,
            sway = type === 'snow' ? Math.sin(state.phase[i]) * wind * 0.35 : 0;

        state.z[i] -= delta * speed;
        state.x[i] += delta * (wind * state.drift[i] + sway);
        state.phase[i] += delta * (0.7 + state.drift[i]);
    }
}

export function writeParticlePositions(state, positions, settings, type, worldScale) {
    for (let i = 0; i < state.count; i++) {
        const offset = type === 'rain' ? i * 6 : i * 3;

        positions[offset] = state.x[i];
        positions[offset + 1] = state.y[i];
        positions[offset + 2] = state.z[i];
        if (type === 'rain') {
            positions[offset + 3] = state.x[i] - settings.wind * worldScale * 0.06;
            positions[offset + 4] = state.y[i];
            positions[offset + 5] = state.z[i] +
                settings.streakLength * state.drift[i] * worldScale;
        }
    }
}
