import {bindAll} from './helpers/helpers';
import {Evented, Marker} from 'mapbox-gl';

/**
 * Creates a marker component.
 */
export default class extends Evented {

    constructor(options) {
        super();

        const me = this,
            element = document.createElement('div'),
            child = options.element;

        child.style.transition = 'opacity 300ms';

        me._element = element.appendChild(child);
        me._marker = new Marker({element});
        me._minZoom = options.minZoom || 0;
        me._visible = true;
        bindAll(['_onClick', '_onMouseEnter', '_onMouseLeave', '_onZoom'], me);
    }

    /**
     * Attaches the Marker to a Map object.
     * @param {Map} map - The Mini Tokyo 3D map to add the marker to
     * @returns {Marker} Returns itself to allow for method chaining
     */
    addTo(map) {
        const me = this,
            element = me._element;

        me._map = map;
        me._zoom = map.getZoom();
        me._setVisibility(me._zoom >= me._minZoom);

        me._marker.addTo(map.map);
        map.on('zoom', me._onZoom);
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
            element = me._element;

        element.removeEventListener('click', me._onClick);
        element.removeEventListener('mouseenter', me._onMouseEnter);
        element.removeEventListener('mouseleave', me._onMouseLeave);
        element.removeEventListener('mousemove', me._onMouseMove);
        me._map.off('zoom', me._onZoom);
        me._marker.remove();
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
        const classList = this._element.classList;

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
        const me = this,
            prevVisible = me._visible;

        me._visible = visible;
        if (me._zoom >= me._minZoom) {
            if (!prevVisible && visible) {
                me._setVisibility(true);
            } else if (prevVisible && !visible) {
                me._setVisibility(false);
            }
        }
        return me;
    }

    _setVisibility(visible) {
        const me = this,
            style = me._element.style;

        if (visible) {
            style.opacity = 1;
            style.pointerEvents = 'auto';
        } else {
            style.opacity = 0;
            style.pointerEvents = 'none';
            if (me._hover) {
                me._onMouseLeave();
            }
        }
    }

    _onClick(event) {
        this.fire({type: 'click'});
        event.stopPropagation();
    }

    _onMouseEnter() {
        this._hover = true;
        this.fire({type: 'mouseenter'});
    }

    _onMouseLeave() {
        delete this._hover;
        this.fire({type: 'mouseleave'});
    }

    _onMouseMove(event) {
        event.stopPropagation();
    }

    _onZoom() {
        const me = this,
            prevZoom = me._zoom,
            zoom = me._zoom = me._map.getZoom(),
            minZoom = me._minZoom;

        if (me._visible) {
            if (prevZoom < minZoom && zoom >= minZoom) {
                me._setVisibility(true);
            } else if (prevZoom >= minZoom && zoom < minZoom) {
                me._setVisibility(false);
            }
        }
    }

}
