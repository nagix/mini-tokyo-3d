import configs from './configs';
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

        // The marker starts hidden; addTo() fades it in and remove() fades it out.
        child.style.transition = `opacity ${configs.transitionDuration}ms`;
        child.style.opacity = 0;
        child.style.pointerEvents = 'none';
        element.style.pointerEvents = 'none';

        me._element = element.appendChild(child);
        me._marker = new Marker({element, offset: options.offset});
        me._minZoom = options.minZoom || 0;
        me._visible = false;
        me._added = false;
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

        // Cancel a pending fade-out removal, if the marker is re-added mid-fade.
        if (me._removeTimer) {
            clearTimeout(me._removeTimer);
            delete me._removeTimer;
        }
        if (!me._added) {
            me._added = true;
            me._map = map;
            me._zoom = map.getZoom();
            me._marker.addTo(map.map);
            map.on('zoom', me._onZoom);
            element.addEventListener('click', me._onClick);
            element.addEventListener('mouseenter', me._onMouseEnter);
            element.addEventListener('mouseleave', me._onMouseLeave);
            element.addEventListener('mousemove', me._onMouseMove);
            // Commit the hidden start state so the fade-in transition runs.
            element.getBoundingClientRect();
        }
        me._visible = true;
        me._setVisibility(me._zoom >= me._minZoom);
        return me;
    }

    /**
     * Removes the marker from a map.
     * @returns {Marker} Returns itself to allow for method chaining
     */
    remove() {
        const me = this;

        if (!me._added) {
            return me;
        }
        // Fade out, then detach after the transition completes.
        me._visible = false;
        me._setVisibility(false);
        if (me._removeTimer) {
            clearTimeout(me._removeTimer);
        }
        me._removeTimer = setTimeout(() => {
            const element = me._element;

            element.removeEventListener('click', me._onClick);
            element.removeEventListener('mouseenter', me._onMouseEnter);
            element.removeEventListener('mouseleave', me._onMouseLeave);
            element.removeEventListener('mousemove', me._onMouseMove);
            me._map.off('zoom', me._onZoom);
            me._marker.remove();
            me._added = false;
            delete me._removeTimer;
        }, configs.transitionDuration);
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
            style = me._element.style,
            containerStyle = me._marker.getElement().style;

        if (visible) {
            style.opacity = 1;
            style.pointerEvents = 'auto';
            containerStyle.pointerEvents = 'auto';
        } else {
            style.opacity = 0;
            style.pointerEvents = 'none';
            containerStyle.pointerEvents = 'none';
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
