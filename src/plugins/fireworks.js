import * as THREE from 'three';
import * as helpers from '../helpers';
import ThreeLayer from '../three-layer';
import Plugin from './plugin';
import fireworksSVG from './fireworks.svg';

const friction = 0.998;
const textureSize = 128.0;
const particleSize = 300;

const getOffsetXYZ = i => {
    const offset = 3;
    const index = i * offset;
    const x = index;
    const y = index + 1;
    const z = index + 2;

    return {x, y, z};
};

const getOffsetRGBA = i => {
    const offset = 4;
    const index = i * offset;
    const r = index;
    const g = index + 1;
    const b = index + 2;
    const a = index + 3;

    return {r, g, b, a};
};

const getRandomNum = (max = 0, min = 0) => Math.floor(Math.random() * (max + 1 - min)) + min;

const drawRadialGradation = (ctx, canvasRadius, canvasW, canvasH) => {
    ctx.save();
    const gradient = ctx.createRadialGradient(canvasRadius, canvasRadius, 0, canvasRadius, canvasRadius, canvasRadius);
    gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
};

const getTexture = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const diameter = textureSize;
    canvas.width = diameter;
    canvas.height = diameter;
    const canvasRadius = diameter / 2;

    /* gradation circle
    ------------------------ */
    drawRadialGradation(ctx, canvasRadius, canvas.width, canvas.height);
    const texture = new THREE.Texture(canvas);
    texture.type = THREE.FloatType;
    texture.needsUpdate = true;
    return texture;
};

const canvasTexture = getTexture();

const getPointMesh = (num, vels, type) => {
    // geometry
    const bufferGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const velocities = [];
    const colors = [];
    const adjustSizes = [];
    const masses = [];
    const colorType = Math.random() > 0.3 ? 'single' : 'multiple';
    const singleColor = getRandomNum(100, 20) * 0.01;
    const multipleColor = () => getRandomNum(100, 1) * 0.01;
    let rgbType;
    const rgbTypeDice = Math.random();

    if (rgbTypeDice > 0.66) {
        rgbType = 'red';
    } else if (rgbTypeDice > 0.33) {
        rgbType = 'green';
    } else {
        rgbType = 'blue';
    }
    for (let i = 0; i < num; i++) {
        const pos = new THREE.Vector3(0, 0, 0);

        vertices.push(pos.x, pos.y, pos.z);
        velocities.push(vels[i].x, vels[i].y, vels[i].z);
        if (type === 'seed') {
            let size;

            if (type === 'trail') {
                size = Math.random() * 0.1 + 0.1;
            } else {
                // size = Math.pow(vels[i].z, 2) * 0.04;
                size = Math.random() * 0.1 + 0.1;
            }
            if (i === 0) {
                size *= 1.1;
            }
            adjustSizes.push(size * 5);
            masses.push(size * 0.017);
            colors.push(1.0, 1.0, 1.0, 1.0);
        } else {
            const size = getRandomNum(particleSize, 10) * 0.001;

            adjustSizes.push(size * 5);
            masses.push(size * 0.017);
            if (colorType === 'multiple') {
                colors.push(multipleColor(), multipleColor(), multipleColor(), 1.0);
            } else {
                switch (rgbType) {
                case 'red':
                    colors.push(singleColor, 0.1, 0.1, 1.0);
                    break;
                case 'green':
                    colors.push(0.1, singleColor, 0.1, 1.0);
                    break;
                case 'blue':
                    colors.push(0.1, 0.1, singleColor, 1.0);
                    break;
                default:
                    colors.push(singleColor, 0.1, 0.1, 1.0);
                }
            }
        }
    }
    bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage));
    bufferGeometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3).setUsage(THREE.DynamicDrawUsage));
    bufferGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4).setUsage(THREE.DynamicDrawUsage));
    bufferGeometry.setAttribute('adjustSize', new THREE.Float32BufferAttribute(adjustSizes, 1).setUsage(THREE.DynamicDrawUsage));
    bufferGeometry.setAttribute('mass', new THREE.Float32BufferAttribute(masses, 1).setUsage(THREE.DynamicDrawUsage));

    // material
    const shaderMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            size: {
                type: 'f',
                value: textureSize
            },
            texture: {
                type: 't',
                value: canvasTexture
            }
        },
        transparent: true,
        // Display of "blending: THREE.AdditiveBlending" does not work properly if "depthWrite" property is set to true.
        // Therefore, it is necessary to make it false in the case of making the image transparent by blending.
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
            precision highp float;
            attribute vec3 position;
            uniform mat4 projectionMatrix;
            uniform mat4 modelViewMatrix;
            uniform float size;
            attribute float adjustSize;
            uniform vec3 cameraPosition;
            attribute vec3 velocity;
            attribute vec4 color;
            varying vec4 vColor;
            void main() {
                vColor = color;
                vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * adjustSize * (100.0 / length(modelViewPosition.xyz));
                gl_Position = projectionMatrix * modelViewPosition;
            }
        `,
        fragmentShader: `
            precision mediump float;
            uniform sampler2D texture;
            varying vec4 vColor;
            void main() {
                vec4 color = vec4(texture2D(texture, gl_PointCoord));
                gl_FragColor = color * vColor;
            }
        `
    });

    return new THREE.Points(bufferGeometry, shaderMaterial);
};

class ParticleMesh {

    constructor(scale, num, vels, type) {
        this.scale = scale;
        this.particleNum = num;
        this.timerStartFading = 10;
        this.mesh = getPointMesh(num, vels, type);
    }

    update(gravity) {
        if (this.timerStartFading > 0) {
            this.timerStartFading -= 0.3;
        }

        const {position, velocity, color, mass} = this.mesh.geometry.attributes;
        const decrementRandom = () => (Math.random() > 0.5 ? 0.98 : 0.96);
        const decrementByVel = v => (Math.random() > 0.5 ? 0 : (1 - v) * 0.1);

        for (let i = 0; i < this.particleNum; i++) {
            const {x, y, z} = getOffsetXYZ(i);

            velocity.array[z] += gravity.z - mass.array[i] * this.scale;
            velocity.array[x] *= friction;
            velocity.array[y] *= friction;
            velocity.array[z] *= friction;
            position.array[x] += velocity.array[x];
            position.array[y] += velocity.array[y];
            position.array[z] += velocity.array[z];

            const {a} = getOffsetRGBA(i);

            if (this.timerStartFading <= 0) {
                color.array[a] *= decrementRandom() - decrementByVel(color.array[a]);
                if (color.array[a] < 0.001) {
                    color.array[a] = 0;
                }
            }
        }
        position.needsUpdate = true;
        velocity.needsUpdate = true;
        color.needsUpdate = true;
    }

    disposeAll() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }

}

class ParticleSeedMesh extends ParticleMesh {

    constructor(scale, num, vels) {
        super(scale, num, vels, 'seed');
    }

    update(gravity) {
        const {position, velocity, color, mass} = this.mesh.geometry.attributes;
        const decrementRandom = () => (Math.random() > 0.3 ? 0.99 : 0.96);
        const decrementByVel = v => (Math.random() > 0.3 ? 0 : (1 - v) * 0.1);
        const shake = () => (Math.random() > 0.5 ? 0.05 : -0.05) * this.scale;
        const dice = () => Math.random() > 0.1;
        const _f = friction * 0.98;

        for (let i = 0; i < this.particleNum; i++) {
            const {x, y, z} = getOffsetXYZ(i);

            velocity.array[z] += gravity.z - mass.array[i] * this.scale;
            velocity.array[x] *= _f;
            velocity.array[y] *= _f;
            velocity.array[z] *= _f;
            position.array[x] += velocity.array[x];
            position.array[y] += velocity.array[y];
            position.array[z] += velocity.array[z];
            if (dice()) {
                position.array[x] += shake();
            }
            if (dice()) {
                position.array[y] += shake();
            }

            const {a} = getOffsetRGBA(i);

            color.array[a] *= decrementRandom() - decrementByVel(color.array[a]);
            if (color.array[a] < 0.001) {
                color.array[a] = 0;
            }
        }
        position.needsUpdate = true;
        velocity.needsUpdate = true;
        color.needsUpdate = true;
    }

}

class ParticleTailMesh extends ParticleMesh {

    constructor(scale, num, vels) {
        super(scale, num, vels, 'trail');
    }

    update(gravity) {
        const {position, velocity, color, mass} = this.mesh.geometry.attributes;
        const decrementRandom = () => (Math.random() > 0.3 ? 0.98 : 0.95);
        const shake = () => (Math.random() > 0.5 ? 0.05 : -0.05) * this.scale;
        const dice = () => Math.random() > 0.2;

        for (let i = 0; i < this.particleNum; i++) {
            const {x, y, z} = getOffsetXYZ(i);

            velocity.array[z] += gravity.z - mass.array[i] * this.scale;
            velocity.array[x] *= friction;
            velocity.array[y] *= friction;
            velocity.array[z] *= friction;
            position.array[x] += velocity.array[x];
            position.array[y] += velocity.array[y];
            position.array[z] += velocity.array[z];
            if (dice()) {
                position.array[x] += shake();
            }
            if (dice()) {
                position.array[y] += shake();
            }

            const {a} = getOffsetRGBA(i);

            color.array[a] *= decrementRandom();
            if (color.array[a] < 0.001) {
                color.array[a] = 0;
            }
        }
        position.needsUpdate = true;
        velocity.needsUpdate = true;
        color.needsUpdate = true;
    }

}

class BasicFireWorks {

    constructor(scale, position) {
        this.scale = scale;
        this.position = position;
        this.gravity = new THREE.Vector3(0, 0, -0.005 * scale);
        this.meshGroup = new THREE.Group();
        this.isExplode = false;
        const max = 400;
        const min = 150;
        this.petalsNum = getRandomNum(max, min);
        this.life = 150;
        this.seed = this.getSeed();
        this.meshGroup.add(this.seed.mesh);
        this.flowerSizeRate = THREE.Math.mapLinear(this.petalsNum, min, max, 0.4, 0.7);
    }

    getSeed() {
        const num = 40;
        const vels = [];

        for (let i = 0; i < num; i++) {
            const vx = 0;
            const vy = 0;
            const vz = (i === 0 ? Math.random() * 2.5 + 0.9 : Math.random() * 2.0 + 0.4) * this.scale;

            vels.push(new THREE.Vector3(vx, vy, vz));
        }

        const pm = new ParticleSeedMesh(this.scale, num, vels);
        const x = this.position.x;
        const y = this.position.y;
        const z = 0;

        pm.mesh.position.set(x, y, z);
        return pm;
    }

    explode(pos) {
        this.isExplode = true;
        this.flower = this.getFlower(pos);
        this.meshGroup.add(this.flower.mesh);
        this.meshGroup.remove(this.seed.mesh);
        this.seed.disposeAll();
    }

    getFlower(pos) {
        const num = this.petalsNum;
        const vels = [];
        let radius;
        const dice = Math.random();

        if (dice > 0.5) {
            for (let i = 0; i < num; i++) {
                radius = getRandomNum(120, 60) * 0.01 * this.scale;

                const theta = THREE.Math.degToRad(Math.random() * 180);
                const phi = THREE.Math.degToRad(Math.random() * 360);
                const vx = Math.sin(theta) * Math.cos(phi) * radius;
                const vy = Math.sin(theta) * Math.sin(phi) * radius;
                const vz = Math.cos(theta) * radius;
                const vel = new THREE.Vector3(vx, vy, vz);

                vel.multiplyScalar(this.flowerSizeRate);
                vels.push(vel);
            }
        } else {
            const zStep = 180 / num;
            const trad = (360 * (Math.random() * 20 + 1)) / num;
            const xStep = trad;
            const yStep = trad;

            radius = getRandomNum(120, 60) * 0.01 * this.scale;
            for (let i = 0; i < num; i++) {
                const sphereRate = Math.sin(THREE.Math.degToRad(zStep * i));
                const vz = Math.cos(THREE.Math.degToRad(zStep * i)) * radius;
                const vx = Math.cos(THREE.Math.degToRad(xStep * i)) * sphereRate * radius;
                const vy = Math.sin(THREE.Math.degToRad(yStep * i)) * sphereRate * radius;
                const vel = new THREE.Vector3(vx, vy, vz);
                vel.multiplyScalar(this.flowerSizeRate);
                vels.push(vel);
            }
        }

        const particleMesh = new ParticleMesh(this.scale, num, vels);

        particleMesh.mesh.position.set(pos.x, pos.y, pos.z);
        return particleMesh;
    }

    update() {
        if (!this.isExplode) {
            this.drawTail();
        } else {
            this.flower.update(this.gravity);
            if (this.life > 0) {
                this.life -= 1;
            }
        }
    }

    drawTail() {
        this.seed.update(this.gravity);
        const {position, velocity} = this.seed.mesh.geometry.attributes;
        let count = 0;
        let isComplete = true;

        // Check if the y-axis speed is down for all particles
        for (let i = 0, l = velocity.array.length; i < l; i++) {
            const v = velocity.array[i];
            const index = i % 3;

            if (index === 2 && v > 0) {
                count++;
            }
        }

        isComplete = count === 0;
        if (!isComplete) {
            return;
        }

        const {x, y, z} = this.seed.mesh.position;
        const flowerPos = new THREE.Vector3(x, y, z);
        let highestPos = 0;
        let offsetPos;

        for (let i = 0, l = position.array.length; i < l; i++) {
            const p = position.array[i];
            const index = i % 3;

            if (index === 2 && p > highestPos) {
                highestPos = p;
                offsetPos = new THREE.Vector3(position.array[i - 2], position.array[i - 1], p);
            }
        }
        flowerPos.add(offsetPos);
        this.explode(flowerPos);
    }

}

class RichFireWorks extends BasicFireWorks {

    constructor(scale, position) {
        super(scale, position);

        const max = 150;
        const min = 100;

        this.petalsNum = getRandomNum(max, min);
        this.flowerSizeRate = THREE.Math.mapLinear(this.petalsNum, min, max, 0.4, 0.7);
        this.tailMeshGroup = new THREE.Group();
        this.tails = [];
    }

    explode(pos) {
        this.isExplode = true;
        this.flower = this.getFlower(pos);
        this.tails = this.getTail();
        this.meshGroup.add(this.flower.mesh);
        this.meshGroup.add(this.tailMeshGroup);
    }

    getTail() {
        const tails = [];
        const num = 20;
        const {color: petalColor} = this.flower.mesh.geometry.attributes;

        for (let i = 0; i < this.petalsNum; i++) {
            const vels = [];

            for (let j = 0; j < num; j++) {
                const vx = 0;
                const vy = 0;
                const vz = 0;

                vels.push(new THREE.Vector3(vx, vy, vz));
            }

            const tail = new ParticleTailMesh(this.scale, num, vels);

            const {r, g, b, a} = getOffsetRGBA(i);

            const petalR = petalColor.array[r];
            const petalG = petalColor.array[g];
            const petalB = petalColor.array[b];
            const petalA = petalColor.array[a];

            const {position, color} = tail.mesh.geometry.attributes;

            for (let k = 0; k < position.count; k++) {
                const {r, g, b, a} = getOffsetRGBA(k);

                color.array[r] = petalR;
                color.array[g] = petalG;
                color.array[b] = petalB;
                color.array[a] = petalA;
            }

            const {x, y, z} = this.flower.mesh.position;

            tail.mesh.position.set(x, y, z);
            tails.push(tail);
            this.tailMeshGroup.add(tail.mesh);
        }
        return tails;
    }

    update() {
        if (!this.isExplode) {
            this.drawTail();
        } else {
            this.flower.update(this.gravity);

            const {position: flowerGeometory} = this.flower.mesh.geometry.attributes;

            for (let i = 0, l = this.tails.length; i < l; i++) {
                const tail = this.tails[i];
                tail.update(this.gravity);
                const {x, y, z} = getOffsetXYZ(i);
                const flowerPos = new THREE.Vector3(
                    flowerGeometory.array[x],
                    flowerGeometory.array[y],
                    flowerGeometory.array[z]
                );
                const {position, velocity} = tail.mesh.geometry.attributes;

                for (let k = 0; k < position.count; k++) {
                    const {x, y, z} = getOffsetXYZ(k);
                    const desiredVelocity = new THREE.Vector3();
                    const tailPos = new THREE.Vector3(position.array[x], position.array[y], position.array[z]);
                    const tailVel = new THREE.Vector3(velocity.array[x], velocity.array[y], velocity.array[z]);

                    desiredVelocity.subVectors(flowerPos, tailPos);

                    const steer = desiredVelocity.sub(tailVel);

                    steer.normalize();
                    steer.multiplyScalar(Math.random() * 0.0003 * this.life * this.scale);
                    velocity.array[x] += steer.x;
                    velocity.array[y] += steer.y;
                    velocity.array[z] += steer.z;
                }
                velocity.needsUpdate = true;
            }

            if (this.life > 0) {
                this.life -= 1.2;
            }
        }
    }

}

class FireworksLayer extends ThreeLayer {

    constructor(id) {
        super(id);

        this.fireworksInstances = {};
    }

    render(gl, matrix) {
        const {fireworksInstances, scene} = this;

        for (const key of Object.keys(fireworksInstances)) {
            const instances = fireworksInstances[key];
            const exploadedIndexList = [];

            for (let i = instances.length - 1; i >= 0; i--) {
                const instance = instances[i];

                instance.update();
                if (instance.isExplode) {
                    exploadedIndexList.push(i);
                }
            }

            for (let i = 0, l = exploadedIndexList.length; i < l; i++) {
                const index = exploadedIndexList[i];
                const instance = instances[index];

                if (!instance) {
                    return;
                }

                /*
                    Be careful because js heap size will continue to increase unless you do the following:
                    - Remove unuse mesh from scene
                    - Execute dispose method of Geometres and Materials in the Mesh
                */
                instance.meshGroup.remove(instance.seed.mesh);
                instance.seed.disposeAll();
                if (instance.life <= 0) {
                    scene.remove(instance.meshGroup);
                    if (instance.tailMeshGroup) {
                        instance.tails.forEach(v => {
                            v.disposeAll();
                        });
                    }
                    instance.flower.disposeAll();
                    instances.splice(index, 1);
                }
            }
        }

        super.render(gl, matrix);
    }

    launchFireWorks(key, lngLat) {
        const me = this;
        const {map, scene, fireworksInstances} = me;
        let instances = fireworksInstances[key];

        if (!instances) {
            instances = me.fireworksInstances[key] = [];
        }

        if (instances.length > 5) {
            return;
        }

        const modelPosition = me.getModelPosition(lngLat);
        const modelScale = me.getModelScale();
        const scale = Math.pow(2, 17 - helpers.clamp(map.getZoom(), 14, 16)) * modelScale;
        const position = {
            x: modelPosition.x + (Math.random() * 400 - 200) * modelScale,
            y: modelPosition.y + (Math.random() * 400 - 200) * modelScale
        };
        const fw = Math.random() > 0.5 ? new BasicFireWorks(scale, position) : new RichFireWorks(scale, position);

        instances.push(fw);
        scene.add(fw.meshGroup);
    }

}

class FireworksPlugin extends Plugin {

    constructor(options) {
        super(options);

        const me = this;

        me.id = 'fireworks';
        me.name = {
            en: 'Fireworks',
            ja: '花火',
            ko: '불꽃놀이',
            ne: 'आतिशबाजी',
            th: 'ดอกไม้ไฟ',
            'zh-Hans': '烟花',
            'zh-Hant': '煙花'
        };
        me.iconStyle = {
            backgroundSize: '32px',
            backgroundImage: `url("${fireworksSVG}")`
        };
        me._layer = new FireworksLayer(me.id);
        me._plans = [{
            // Sumidagawa 1 (2020-07-23 19:00 to 20:30)
            coord: [139.8061467, 35.7168468],
            start: 1595498400000,
            end: 1595503800000
        }, {
            // Sumidagawa 2 (2020-07-23 19:30 to 20:30)
            coord: [139.7957901, 35.7053016],
            start: 1595500200000,
            end: 1595503800000
        }, {
            // Adachi (2020-07-24 19:30 to 20:30)
            coord: [139.7960082, 35.7596802],
            start: 1595586600000,
            end: 1595590200000
        }, {
            // Makuhari (2020-07-25 19:10 to 20:20)
            coord: [140.0265839, 35.6429351],
            start: 1595671800000,
            end: 1595676000000
        }, {
            // Minatomirai (2020-07-26 19:30 to 19:55)
            coord: [139.6411158, 35.4606603],
            start: 1595759400000,
            end: 1595760900000
        }, {
            // Jingu (2020-08-08 19:30 to 20:30)
            coord: [139.7186873, 35.6765851],
            start: 1596882600000,
            end: 1596886200000
        }, {
            // Edogawa (2020-08-09 19:15 to 20:30)
            coord: [139.9028813, 35.7187124],
            start: 1596968100000,
            end: 1596972600000
        }, {
            // Itabashi (2020-08-10 19:00 to 20:30)
            coord: [139.6759402, 35.7988664],
            start: 1597053600000,
            end: 1597059000000
        }, {
            // Olympic Opening (2021-07-23 20:00 to 23:00)
            coord: [139.7161639, 35.6759322],
            start: 1627038000000,
            end: 1627048800000
        }, {
            // Olympic Closing (2021-08-08 20:00 to 23:00)
            coord: [139.7161639, 35.6759322],
            start: 1628420400000,
            end: 1628431200000
        }];
    }

    onAdd(mt3d) {
        mt3d.map.addLayer(this._layer, 'poi');
    }

    onRemove(mt3d) {
        mt3d.map.removeLayer(this._layer);
    }

    onEnabled() {
        const me = this;

        me._interval = setInterval(() => {
            const now = me._mt3d.clock.getTime();

            me._plans.forEach((plan, index) => {
                if (now >= plan.start && now < plan.end && Math.random() > 0.7) {
                    me._layer.launchFireWorks(index, plan.coord);
                }
            });
        }, 100);
    }

    onDisabled() {
        clearInterval(this._interval);
    }

    setVisibility(visible) {
        const me = this;

        me._mt3d.map.setLayoutProperty(me.id, 'visibility', visible ? 'visible' : 'none');
    }

}

export default function(options) {
    return new FireworksPlugin(options);
}
