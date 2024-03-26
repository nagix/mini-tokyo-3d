import {bindAll} from './helpers/helpers';
import {Evented, Marker} from 'mapbox-gl';

/**
 * Creates a marker component.
 */
export default class extends Evented {

    constructor(options) {
        super();

        const element = options.element;

        this._marker = new Marker({element});
        bindAll(['_onClick', '_onMouseEnter', '_onMouseLeave'], this);
    }

    /**
     * Attaches the Marker to a Map object.
     * @param {Map} map - The Mini Tokyo 3D map to add the marker to
     * @returns {Marker} Returns itself to allow for method chaining
     */
    addTo(map) {
        const me = this,
            marker = me._marker,
            element = marker.getElement();

        marker.addTo(map.map);
        element.addEventListener('click', me._onClick);
        element.addEventListener('mouseenter', me._onMouseEnter);
        element.addEventListener('mouseleave', me._onMouseLeave);
        element.addEventListener('mousemove', me._onMouseMove);
        return me;
    }

    /**
     * Removes the marker from a map.
     * @returns {Marker} Returns itself to allow for method chaining
     */
    remove() {
        const me = this,
            marker = me._marker,
            element = marker.getElement();

        element.removeEventListener('click', me._onClick);
        element.removeEventListener('mouseenter', me._onMouseEnter);
        element.removeEventListener('mouseleave', me._onMouseLeave);
        element.removeEventListener('mousemove', me._onMouseMove);
        marker.remove();
        return me;
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
        const classList = this._marker.getElement().classList;

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
