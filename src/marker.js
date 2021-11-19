import {bindAll} from './helpers';
import {Evented, Marker} from 'mapbox-gl';

/**
 * Creates a marker component.
 */
export default class extends Evented {

    constructor(options) {
        super();

        const {element} = options;

        this._marker = new Marker({element});
        bindAll(['_onClick', '_onMouseEnter', '_onMouseLeave'], this);
    }

    /**
     * Attaches the Marker to a Map object.
     * @param {Map} map - The Mini Tokyo 3D map to add the marker to
     * @returns {Marker} Returns itself to allow for method chaining
     */
    addTo(map) {
        const marker = this._marker,
            element = marker.getElement();

        marker.addTo(map.map);
        element.addEventListener('click', this._onClick);
        element.addEventListener('mouseenter', this._onMouseEnter);
        element.addEventListener('mouseleave', this._onMouseLeave);
        element.addEventListener('mousemove', this._onMouseMove);
        return this;
    }

    /**
     * Removes the marker from a map.
     * @returns {Marker} Returns itself to allow for method chaining
     */
    remove() {
        const marker = this._marker,
            element = marker.getElement();

        element.removeEventListener('click', this._onClick);
        element.removeEventListener('mouseenter', this._onMouseEnter);
        element.removeEventListener('mouseleave', this._onMouseLeave);
        element.removeEventListener('mousemove', this._onMouseMove);
        marker.remove();
        return this;
    }

    /**
     * Sets the marker's geographical position and move the marker to it.
     * @param {LngLatLike} lnglat - The geographical location describing where
     *     the marker should be located
     * @returns {Marker} Returns itself to allow for method chaining
     */
    setLngLat(lnglat) {
        this._marker.setLngLat(lnglat);
        return this;
    }

    /**
     * Sets the marker's activity state. Active status refers to the state where
     * the marker is selected and highlighted.
     * @param {boolean} active - If true, the marker is active
     * @returns {Marker} Returns itself to allow for method chaining
     */
    setActivity(active) {
        const {classList} = this._marker.getElement();

        if (active) {
            classList.add('active');
        } else {
            classList.remove('active');
        }
        return this;
    }

    /**
     * Sets the marker's visibility state.
     * @param {boolean} visible - If true, the marker is visible
     * @returns {Marker} Returns itself to allow for method chaining
     */
    setVisibility(visible) {
        this._marker.getElement().style.visibility = visible ? 'visible' : 'hidden';
        return this;
    }

    _onClick(event) {
        this.fire({type: 'click'});
        event.stopPropagation();
    }

    _onMouseEnter() {
        this.fire({type: 'mouseenter'});
    }

    _onMouseLeave() {
        this.fire({type: 'mouseleave'});
    }

    _onMouseMove(event) {
        event.stopPropagation();
    }

}
