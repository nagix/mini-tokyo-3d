import * as THREE from 'three';
import * as helpers from './helpers';

/**
 * Returns a group object.
 * @param {...object} objects - Objects to be added to the group
 * @returns {Group} Group object
 */
export function createGroup(...objects) {
    const group = new THREE.Group();

    group.add(...objects);
    group.rotation.order = 'ZYX';
    group.matrixAutoUpdate = false;

    return group;
}

/**
 * Returns a cube mesh object.
 * @param {object} options - Options
 * @param {object} options.dimension - Dimension of the cube
 * @param {number} options.dimension.x - Length of the edges parallel to the X axis
 * @param {number} options.dimension.y - Length of the edges parallel to the Y axis
 * @param {number} options.dimension.z - Length of the edges parallel to the Z axis
 * @param {object} options.translate - Transform offset values
 * @param {number} options.translate.x - Offset in X axis direction
 * @param {number} options.translate.y - Offset in Y axis direction
 * @param {number} options.translate.z - Offset in Z axis direction
 * @param {string|Array} options.color - Cube color. If it is an array, the first three colors
 *     will be used on the side surface, the fourth color will be used on the front surface
 * @returns {Mesh} Cube mesh object
 */
export function createCube(options) {
    const {dimension, translate, color} = options,
        materialParams = {
            transparent: true,
            polygonOffset: true,
            polygonOffsetFactor: Math.random()
        };
    let geometry, material;

    if (Array.isArray(color)) {
        const hasFaceColor = color.length > 3;

        geometry = new THREE.BoxBufferGeometry(dimension.x, dimension.y, dimension.z, 1, 1, 3);
        geometry.clearGroups();
        [0, 1, 2, 2, 1, 0, 2, 1, 0, 0, 1, 2, 0, 2].forEach((index, i) => {
            geometry.addGroup(i * 6, 6, i >= 6 && i < 12 && hasFaceColor ? 3 : index);
        });
        material = color.map(c =>
            new THREE.MeshLambertMaterial(Object.assign({
                color: c
            }, materialParams))
        );
    } else {
        geometry = new THREE.BoxBufferGeometry(dimension.x, dimension.y, dimension.z);
        material = new THREE.MeshLambertMaterial(Object.assign({color}, materialParams));
    }

    if (translate) {
        geometry.translate(translate.x, translate.y, translate.z);
        geometry.userData.translate = translate;
    }

    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = 'cube';
    mesh.matrixAutoUpdate = false;

    return mesh;
}

/**
 * Sets the opacity of an object and its descendants.
 * @param {Object3D} object - Target object
 * @param {number} opacity - Float in the range of 0.0 - 1.0 indicating how
 *     transparent the material is
 * @param {number} factor - Float in the range of 0.0 - 1.0 indicating the
 *     factor of the opacity when fading in or out
 */
export function setOpacity(object, opacity, factor) {
    object.traverse(({material: materials, name}) => {
        const value = (name === 'outline-marked' ? 1 : opacity) * helpers.valueOrDefault(factor, 1);

        if (materials && name !== 'outline-tracked') {
            const uniforms = materials.uniforms;

            if (uniforms) {
                uniforms.opacity.value = value;
            } else if (Array.isArray(materials)) {
                for (const material of materials) {
                    material.opacity = value;
                }
            } else {
                materials.opacity = value;
            }
        }
    });
}

export function resetPolygonOffsetFactor(object) {
    object.traverse(({material}) => {
        if (material) {
            material.polygonOffsetFactor = 0;
        }
    });
}

/**
 * Add a delay marker to the object.
 * @param {Object3D} object - Object to which a delay marker is added
 * @param {boolean} dark - true if the map background is dark
 */
export function addDelayMarker(object, dark) {
    if (object.getObjectByName('marker')) {
        return;
    }

    const geometry = new THREE.SphereBufferGeometry(1.8, 32, 32),
        material = new THREE.ShaderMaterial({
            uniforms: {
                glowColor: {type: 'c', value: new THREE.Color(0xff9900)},
                base: {type: 'f', value: dark ? 0 : 1},
                opacity: {type: 'f'}
            },
            vertexShader: `
                varying float intensity;

                void main() {
                    vec3 vNormal = normalize( normalMatrix * normal );
                    vec3 vNormel = normalize( vec3( modelViewMatrix * vec4( position, 1.0 ) ) );
                    intensity = -dot( vNormal, vNormel );

                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                uniform float base;
                uniform float opacity;
                varying float intensity;

                void main() {
                    float r = base - ( base - glowColor.r ) * ( 1.0 - intensity ) * opacity;
                    float g = base - ( base - glowColor.g ) * ( 1.0 - intensity ) * opacity;
                    float b = base - ( base - glowColor.b ) * ( 1.0 - intensity ) * opacity;
                    gl_FragColor = vec4( r, g, b, 1.0 );
                }
            `,
            blending: dark ? THREE.AdditiveBlending : THREE.MultiplyBlending,
            depthWrite: false
        }),
        mesh = new THREE.Mesh(geometry, material);

    mesh.name = 'marker';
    mesh.matrixAutoUpdate = false;
    object.add(mesh);
}

export function refreshDelayMarker(object, dark) {
    const delayMarker = object.getObjectByName('marker');

    if (delayMarker) {
        const {material} = delayMarker;

        material.uniforms.base.value = dark ? 0 : 1;
        material.blending = dark ? THREE.AdditiveBlending : THREE.MultiplyBlending;
    }
}

export function isObject3D(object) {
    return object instanceof THREE.Object3D;
}

export function addOutline(object, name) {
    if (object.getObjectByName(name)) {
        return;
    }

    object.traverse(descendant => {
        if (descendant.name === 'cube') {
            const {width, height, depth} = descendant.geometry.parameters,
                {translate} = descendant.geometry.userData,
                outline = new THREE.Mesh(
                    new THREE.BoxBufferGeometry(width + .2, height + .2, depth + .2),
                    new THREE.MeshBasicMaterial({
                        color: '#FFFFFF',
                        side: THREE.BackSide,
                        transparent: true
                    })
                );

            outline.name = name;
            if (translate) {
                outline.geometry.translate(translate.x, translate.y, translate.z);
            }
            outline.matrixAutoUpdate = false;
            descendant.add(outline);
        }
    });
}

export function removeOutline(object, name) {
    let outline;

    while ((outline = object.getObjectByName(name))) {
        outline.parent.remove(outline);
    }
}

export function refreshOutline(object) {
    const p = performance.now() % 1500 / 1500 * 2;

    object.traverse(descendant => {
        if (descendant.name === 'outline-tracked') {
            descendant.material.opacity = p < 1 ? p : 2 - p;
        }
    });
}
