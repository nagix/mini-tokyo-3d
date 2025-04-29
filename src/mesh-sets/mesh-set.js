export default class {

    constructor(parameters) {
        this.uniforms = {
            zoom: {value: parameters.zoom},
            cameraZ: {value: parameters.cameraZ},
            modelScale: {value: parameters.modelScale}
        };
    }

    getUniforms() {
        const uniforms = this.uniforms;

        return {
            zoom: uniforms.zoom,
            cameraZ: uniforms.cameraZ,
            modelScale: uniforms.modelScale
        };
    }

    getMesh() {
        return this.mesh;
    }

    getPickingMesh() {
        return this.pickingMesh;
    }

    getOutlineMesh() {
        return this.outlineMesh;
    }

    addInstance(attributes) {
        this.geometry.addInstance(attributes);
    }

    removeInstance(index) {
        this.geometry.removeInstance(index);
    }

    setInstanceAttributes(index, attributes) {
        this.geometry.setInstanceAttributes(index, attributes);
    }

    getInstanceAttributes(index) {
        return this.geometry.getInstanceAttributes(index);
    }

    setOpacity(opacity) {
        this.material.opacity = opacity;
    }

    getOpacity() {
        return this.material.opacity;
    }

    refreshCameraParams(params) {
        const uniforms = this.uniforms;

        uniforms.zoom.value = params.zoom;
        uniforms.cameraZ.value = params.cameraZ;
    }

}
