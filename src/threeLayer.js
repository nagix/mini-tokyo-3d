import * as THREE from 'three';

const SQRT3 = Math.sqrt(3);

export default class {

    constructor(id, modelOrigin, underground = false, semitransparent = false) {
        const me = this;

        me.id = id;
        me.type = 'custom';
        me.renderingMode = '3d';
        me.modelOrigin = modelOrigin;
        me.underground = underground;
        me.semitransparent = semitransparent;
    }

    setSemitransparent(semitransparent) {
        this.semitransparent = semitransparent;
    }

    onAdd(map, gl) {
        const me = this,
            renderer = me.renderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl
            }),
            scene = me.scene = new THREE.Scene(),
            light = me.light = new THREE.DirectionalLight(0xffffff, .8);

        renderer.autoClear = false;

        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, .4));

        // This is needed to avoid a black screen with empty scene
        scene.add(new THREE.Mesh());

        me.map = map;
        me.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(map.transform._fov), window.innerWidth / window.innerHeight);
        me.raycaster = new THREE.Raycaster();
    }

    render(gl, matrix) {
        const {modelOrigin, underground, semitransparent, map, renderer, camera, light, scene} = this,
            transform = map.transform,
            halfFov = transform._fov / 2,
            cameraToCenterDistance = transform.cameraToCenterDistance,
            angle = Math.PI / 2 - transform._pitch,
            topHalfSurfaceDistance = Math.sin(halfFov) * cameraToCenterDistance / Math.sin(angle - halfFov),
            furthestDistance = Math.cos(angle) * topHalfSurfaceDistance + cameraToCenterDistance,
            nearZ = transform.height / 50,
            halfHeight = Math.tan(halfFov) * nearZ,
            halfWidth = halfHeight * transform.width / transform.height,

            m = new THREE.Matrix4().fromArray(matrix),
            l = new THREE.Matrix4()
                .makeTranslation(modelOrigin.x, modelOrigin.y, 0)
                .scale(new THREE.Vector3(1, -1, 1)),

            projectionMatrixI = new THREE.Matrix4();

        camera.projectionMatrix = new THREE.Matrix4().makePerspective(
            -halfWidth, halfWidth, halfHeight, -halfHeight, nearZ, furthestDistance * 1.01);
        projectionMatrixI.getInverse(camera.projectionMatrix);
        camera.matrix.getInverse(projectionMatrixI.multiply(m).multiply(l));
        camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

        if (underground && !semitransparent) {
            // Recalculate the projection matrix to replace the far plane
            camera.projectionMatrix = new THREE.Matrix4().makePerspective(
                -halfWidth, halfWidth, halfHeight, -halfHeight, nearZ, furthestDistance * 2.5);
        }

        const rad = THREE.MathUtils.degToRad(map.getBearing() + 30);
        light.position.set(-Math.sin(rad), -Math.cos(rad), SQRT3).normalize();

        renderer.state.reset();
        renderer.render(scene, camera);
        map.triggerRepaint();
    }

    onResize(event) {
        const {camera} = this,
            {transform} = event.target;

        camera.aspect = transform.width / transform.height;
        camera.updateProjectionMatrix();
    }

    pickObject(point) {
        const {raycaster, camera, scene} = this,
            mouse = new THREE.Vector2(
                (point.x / window.innerWidth) * 2 - 1,
                -(point.y / window.innerHeight) * 2 + 1
            );

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(scene.children);

        for (let i = 0, ilen = intersects.length; i < ilen; i++) {
            const {object} = intersects[i];

            if (object.userData.coord) {
                return object;
            }
        }
    }

}
