const PRESETS = {
    rain: {
        light: {
            particles: 700,
            fallSpeed: 60,
            wind: 0.5,
            streakLength: 4,
            color: 0xa9bddd
        },
        heavy: {
            particles: 1600,
            fallSpeed: 85,
            wind: 1.1,
            streakLength: 6,
            color: 0xa1b8dc
        }
    },
    snow: {
        light: {
            particles: 300,
            fallSpeed: 18,
            wind: 0.8,
            size: 6,
            color: 0xffffff
        },
        heavy: {
            particles: 750,
            fallSpeed: 26,
            wind: 1.3,
            size: 8,
            color: 0xffffff
        }
    }
};

export function resolveOptions(options = {}, search = '') {
    const params = new URLSearchParams(search),
        type = options.type || params.get('precipitation') || 'rain',
        preset = options.preset || params.get('precipitation-preset') || 'light',
        typePresets = PRESETS[type];

    if (!typePresets) {
        throw new TypeError(`Unknown precipitation type "${type}"`);
    }
    if (!typePresets[preset]) {
        throw new TypeError(`Unknown ${type} precipitation preset "${preset}"`);
    }

    return {
        type,
        preset,
        seed: Number.isFinite(options.seed) ? options.seed : 20261128,
        enabled: options.enabled !== false,
        settings: Object.assign({}, typePresets[preset])
    };
}

export function getParticleCount(settings, width, height, reducedMotion) {
    const areaScale = Math.min(1.35, Math.max(0.3, width * height / 720000));

    return Math.max(80, Math.round(settings.particles * areaScale * (reducedMotion ? 0.35 : 1)));
}

export {PRESETS};
