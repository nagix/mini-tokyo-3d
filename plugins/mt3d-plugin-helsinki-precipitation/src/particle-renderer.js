import {advanceParticleState, createParticleState, writeParticlePositions} from './particle-state.js';
import {getParticleCount} from './options.js';

function createSnowTexture(THREE) {
    const canvas = document.createElement('canvas'),
        context = canvas.getContext('2d'),
        texture = new THREE.CanvasTexture(canvas);

    canvas.width = canvas.height = 32;
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);

    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    texture.needsUpdate = true;
    return texture;
}

export default class ParticleRenderer {

    constructor(THREE, options, map) {
        this.THREE = THREE;
        this.options = options;
        this.map = map;
        this.brightness = 0.5;
        this.lastTime = 0;
        this.width = 0;
        this.height = 0;
        this.reducedMotion = typeof matchMedia === 'function' &&
            matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.root = new THREE.Group();
        this.root.frustumCulled = false;
        this.localPoint = new THREE.Vector3();
        this.projectedPoint = new THREE.Vector3();
        this.volume = new THREE.Frustum();
        this.viewProjection = new THREE.Matrix4();
        this.previousViewProjection = new THREE.Matrix4();
        this.upstream = new THREE.Vector3();
        this.worldScale = map.getModelScale();
    }

    onAdd({scene}) {
        this.scene = scene;
        scene.add(this.root);
    }

    onRemove() {
        if (this.scene) {
            this.scene.remove(this.root);
        }
        this.disposeObject();
        this.scene = undefined;
    }

    render({renderer, scene, camera}) {
        const canvas = this.map.getMapboxMap().getCanvas(),
            width = canvas.clientWidth,
            height = canvas.clientHeight;

        if (width !== this.width || height !== this.height || !this.object) {
            this.rebuild(width, height);
        }

        const now = performance.now(),
            delta = this.lastTime ? Math.min((now - this.lastTime) / 1000, 1) : 0;

        this.lastTime = now;
        advanceParticleState(
            this.state,
            delta * (this.reducedMotion ? 0.45 : 1),
            this.options.settings,
            this.options.type,
            this.worldScale
        );
        this.keepParticlesVisible(camera);
        writeParticlePositions(
            this.state,
            this.positions,
            this.options.settings,
            this.options.type,
            this.worldScale
        );
        this.positionAttribute.needsUpdate = true;
        this.updateColor();
        renderer.render(scene, camera);
    }

    setBrightness(brightness) {
        this.brightness = brightness;
    }

    rebuild(width, height) {
        const {THREE, options} = this,
            settings = options.settings,
            count = getParticleCount(settings, width, height, this.reducedMotion);

        this.disposeObject();
        this.width = width;
        this.height = height;
        this.state = createParticleState(count, options.seed);
        this.positions = new Float32Array(count * (options.type === 'rain' ? 6 : 3));
        this.geometry = new THREE.BufferGeometry();
        this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
        this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
        this.geometry.setAttribute('position', this.positionAttribute);

        if (options.type === 'rain') {
            this.material = new THREE.LineBasicMaterial({
                color: settings.color,
                transparent: true,
                opacity: 0.6,
                depthTest: false,
                depthWrite: false
            });
            this.object = new THREE.LineSegments(this.geometry, this.material);
        } else {
            this.texture = createSnowTexture(THREE);
            this.material = new THREE.PointsMaterial({
                color: settings.color,
                map: this.texture,
                transparent: true,
                opacity: 0.85,
                size: settings.size,
                sizeAttenuation: false,
                depthTest: false,
                depthWrite: false
            });
            this.object = new THREE.Points(this.geometry, this.material);
        }
        this.object.frustumCulled = false;
        this.root.add(this.object);
    }

    keepParticlesVisible(camera) {
        const wasInitialized = this.particlesInitialized,
            near = Math.max(camera.near * 3, 1),
            far = Math.min(near * 20, camera.far * 0.8);

        this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        const cameraChanged = !this.viewProjection.equals(this.previousViewProjection);

        this.volume.setFromProjectionMatrix(this.viewProjection);
        // Limit depth as well as screen coverage so recycled flakes stay nearby.
        this.volume.planes[4].setComponents(0, 0, 1, far).applyMatrix4(camera.matrixWorld);
        this.volume.planes[5].setComponents(0, 0, -1, -near).applyMatrix4(camera.matrixWorld);
        this.previousViewProjection.copy(this.viewProjection);
        this.particlesInitialized = true;
        for (let i = 0; i < this.state.count; i++) {
            this.projectedPoint.set(this.state.x[i], this.state.y[i], this.state.z[i]);
            if (!wasInitialized ||
                !this.volume.containsPoint(this.projectedPoint)) {
                if (!wasInitialized || cameraChanged || !this.recycleParticle(i)) {
                    this.respawnParticle(i, camera);
                }
            }
        }
    }

    recycleParticle(index) {
        const state = this.state,
            settings = this.options.settings,
            sway = this.options.type === 'snow' ? Math.sin(state.phase[index]) * settings.wind * 0.35 : 0;

        this.upstream.set(-(settings.wind * state.drift[index] + sway), 0,
            settings.fallSpeed * state.drift[index]).normalize();
        let entry = -Infinity,
            exit = Infinity;

        // Intersect the reverse fall path with the current world-space volume.
        // Its upstream boundary is not necessarily the top of the screen.
        for (const plane of this.volume.planes) {
            const distance = plane.distanceToPoint(this.projectedPoint),
                slope = plane.normal.dot(this.upstream);

            if (Math.abs(slope) < 1e-10) {
                if (distance < 0) {
                    return false;
                }
            } else if (slope > 0) {
                entry = Math.max(entry, -distance / slope);
            } else {
                exit = Math.min(exit, -distance / slope);
            }
        }
        if (!Number.isFinite(exit) || exit <= Math.max(entry, 0)) {
            return false;
        }
        this.projectedPoint.addScaledVector(this.upstream, exit - (exit - entry) * 0.001);
        state.x[index] = this.projectedPoint.x;
        state.y[index] = this.projectedPoint.y;
        state.z[index] = this.projectedPoint.z;
        return true;
    }

    respawnParticle(index, camera) {
        const state = this.state,
            near = Math.max(camera.near * 3, 1),
            far = Math.min(near * 20, camera.far * 0.8),
            distance = near + (far - near) * state.depth[index];

        // Replenish the whole current view, not its screen-top edge: world-z
        // gravity need not point down the screen (especially when looking down).
        this.localPoint.set(0, 0, -distance).applyMatrix4(camera.projectionMatrix);
        this.localPoint.set(state.viewX[index], state.viewY[index], this.localPoint.z)
            .unproject(camera);
        state.x[index] = this.localPoint.x;
        state.y[index] = this.localPoint.y;
        state.z[index] = this.localPoint.z;
    }

    updateColor() {
        const base = this.options.settings.color,
            brightness = Math.max(0, Math.min(1, this.brightness)),
            multiplier = this.options.type === 'rain' ? 0.72 + brightness * 0.28 : 1;

        this.material.color.setHex(base).multiplyScalar(multiplier);
    }

    disposeObject() {
        if (this.object) {
            this.root.remove(this.object);
        }
        if (this.geometry) {
            this.geometry.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
        if (this.texture) {
            this.texture.dispose();
        }
        this.object = undefined;
        this.geometry = undefined;
        this.material = undefined;
        this.texture = undefined;
        this.positionAttribute = undefined;
        this.state = undefined;
        this.positions = undefined;
        this.particlesInitialized = false;
        this.lastTime = 0;
    }

}
