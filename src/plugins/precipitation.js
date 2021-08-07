import * as THREE from 'three';
import SPE from '../spe/SPE';
import {clamp, loadJSON} from '../helpers';
import ThreeLayer from '../three-layer';
import Plugin from './plugin';
import raindrop from './raindrop.png';
import precipitationSVG from '../../node_modules/@fortawesome/fontawesome-free/svgs/solid/cloud-showers-heavy.svg';

// Nowcasts URL
const NOWCASTS_URL = 'https://mini-tokyo.appspot.com/nowcast';

// Interval of refreshing precipitation information in milliseconds
const NOWCASTS_REFRESH_INTERVAL = 60000;

const rainTexture = new THREE.TextureLoader().load(raindrop);

class PrecipitationLayer extends ThreeLayer {

    constructor(id) {
        super(id);

        const me = this;

        me.emitterBounds = {};
        me.emitterQueue = [];
    }

    updateEmitterQueue(nowCastData) {
        const me = this,
            {map, emitterBounds} = me,
            bounds = map.getBounds(),
            ne = me.getModelPosition(bounds.getNorthEast()),
            sw = me.getModelPosition(bounds.getSouthWest()),
            modelScale = me.getModelScale(),
            resolution = clamp(Math.pow(2, Math.floor(17 - map.getZoom())), 0, 1) * 1088,
            currBounds = {
                left: Math.floor(clamp(sw.x / modelScale + 50000, 0, 108800) / resolution) * resolution,
                right: Math.ceil(clamp(ne.x / modelScale + 50000, 0, 108800) / resolution) * resolution,
                top: Math.floor(clamp(-ne.y / modelScale + 42500 + 0, 0, 78336) / resolution) * resolution,
                bottom: Math.ceil(clamp(-sw.y / modelScale + 42500 + 0, 0, 78336) / resolution) * resolution
            };

        if (nowCastData) {
            me.nowCastData = nowCastData;
        }

        if (nowCastData || currBounds.left !== emitterBounds.left ||
            currBounds.right !== emitterBounds.right ||
            currBounds.top !== emitterBounds.top ||
            currBounds.bottom !== emitterBounds.bottom) {
            me.bgGroup = new SPE.Group({
                texture: {
                    value: rainTexture
                },
                blending: THREE.NormalBlending,
                transparent: true,
                maxParticleCount: 500000
            });
            me.emitterQueue = [];
            for (let y = currBounds.top; y < currBounds.bottom; y += resolution) {
                for (let x = currBounds.left; x < currBounds.right; x += resolution) {
                    me.emitterQueue.push({
                        index: {
                            x: Math.floor(x / 1088),
                            y: Math.floor(y / 1088)
                        },
                        rect: {
                            x,
                            y,
                            w: resolution,
                            h: resolution
                        }
                    });
                }
            }
        }
        me.emitterBounds = currBounds;
    }

    refreshEmitter() {
        const me = this,
            {map, nowCastData, emitterQueue, fgGroup, bgGroup} = me,
            modelScale = me.getModelScale();

        if (bgGroup) {
            const zoom = map.getZoom(),
                n = zoom >= 17 ? 20 : clamp(Math.floor(Math.pow(3, zoom - 13)), 3, 10000000),
                h = clamp(Math.pow(2, 14 - zoom), 0, 1) * 1000,
                v = clamp(Math.pow(1.7, 14 - zoom), 0, 1) * 2000,
                s = clamp(Math.pow(1.2, zoom - 14.5) * map.transform.cameraToCenterDistance / 800, 0, 1);
            let emitterCount = 30;

            while (emitterCount > 0) {
                const e = emitterQueue.shift();

                if (!e) {
                    me.imGroup = bgGroup;
                    delete me.bgGroup;
                    setTimeout(me.finalizeEmitterRefresh(), 500);
                    break;
                }
                if (!nowCastData || !nowCastData[e.index.y][e.index.x]) {
                    continue;
                }
                bgGroup.addEmitter(new SPE.Emitter({
                    maxAge: {
                        value: h / v
                    },
                    position: {
                        value: new THREE.Vector3((e.rect.x - 50000 + e.rect.w / 2) * modelScale, (42500 - e.rect.h / 2 - e.rect.y) * modelScale, h * modelScale),
                        spread: new THREE.Vector3(e.rect.w * modelScale, e.rect.h * modelScale, 0)
                    },
                    acceleration: {
                        value: new THREE.Vector3(0, 0, 0),
                        spread: new THREE.Vector3(v / 20 * modelScale, 0, 0)
                    },
                    velocity: {
                        value: new THREE.Vector3(0, 0, -v * modelScale),
                        spread: new THREE.Vector3(v / 200 * modelScale, v / 200 * modelScale)
                    },
                    color: {
                        value: new THREE.Color('blue')
                    },
                    size: {
                        value: 1e-6 / modelScale * s
                    },
                    particleCount: Math.pow(nowCastData[e.index.y][e.index.x], 2) * n
                }));
                emitterCount--;
            }
        }
        if (fgGroup) {
            fgGroup.tick();
        }
        if (me.imGroup) {
            me.imGroup.tick();
        }
    }

    finalizeEmitterRefresh() {
        const me = this,
            {scene, imGroup} = me;

        if (imGroup) {
            me.clear();
            me.fgGroup = imGroup;
            scene.add(imGroup.mesh);
        }
    }

    clear() {
        const me = this,
            {scene, fgGroup} = me;

        if (fgGroup) {
            scene.remove(fgGroup.mesh);
            // fgGroup.dispose();
        }
        delete me.imGroup;
    }

}

class PrecipitationPlugin extends Plugin {

    constructor(options) {
        super(options);

        const me = this;

        me.id = 'precipitation';
        me.name = {
            en: 'Precipitation',
            ja: '降水',
            ko: '강수',
            ne: 'वर्षा',
            th: 'ฝน',
            'zh-Hans': '降水',
            'zh-Hant': '降水'
        };
        me.iconStyle = {
            backgroundSize: '32px',
            backgroundImage: `url("${precipitationSVG.replace('%3e', ' fill=\'white\'%3e')}")`
        };
        me._layer = new PrecipitationLayer(me.id);
        me._moveEventListener = () => {
            if (me._map.getClockMode() === 'realtime') {
                me._layer.updateEmitterQueue();
            }
        };
    }

    onAdd(map) {
        map.map.addLayer(this._layer, 'poi');
    }

    onRemove(map) {
        map.map.removeLayer(this._layer);
    }

    onEnabled() {
        const me = this;
        let clockMode = me._map.getClockMode();

        delete me._lastWeatherRefresh;
        me._map.on('move', me._moveEventListener);

        const repeat = () => {
            const now = Date.now(),
                currentClockMode = me._map.getClockMode();

            if (clockMode !== currentClockMode) {
                if (currentClockMode === 'realtime') {
                    delete me._lastWeatherRefresh;
                } else {
                    me._layer.clear();
                }
                clockMode = currentClockMode;
            }

            if (me.enabled) {
                if (clockMode === 'realtime' && now - (me._lastWeatherRefresh || 0) >= NOWCASTS_REFRESH_INTERVAL) {
                    loadJSON(NOWCASTS_URL).then(data => {
                        me._layer.updateEmitterQueue(data);
                    });
                    me._lastWeatherRefresh = now;
                }
                me._layer.refreshEmitter();
                requestAnimationFrame(repeat);
            }

        };

        repeat();
    }

    onDisabled() {
        const me = this;

        me._layer.clear();
        me._map.off('move', me._moveEventListener);
    }

    setVisibility(visible) {
        const me = this;

        me._map.map.setLayoutProperty(me.id, 'visibility', visible ? 'visible' : 'none');
    }

}

export default function(options) {
    return new PrecipitationPlugin(options);
}
