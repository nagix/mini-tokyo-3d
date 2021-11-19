import Popup from 'mapbox-gl-animated-popup';

/**
 * A popup component.
 */
export default class {

    constructor() {
        this._popup = new Popup({
            className: 'popup-object',
            closeButton: false,
            closeOnClick: false,
            maxWidth: '300px',
            offset: {
                top: [0, 10],
                bottom: [0, -30]
            },
            openingAnimation: {
                duration: 300,
                easing: 'easeOutBack'
            }
        });
    }

    /**
     * Adds the popup to a map.
     * @param {Map} map - The Mini Tokyo 3D map to add the popup to
     * @returns {Popup} Returns itself to allow for method chaining
     */
    addTo(map) {
        this._popup.addTo(map.map);
        return this;
    }

    /**
     * Removes the popup from the map it has been added to.
     * @returns {Popup} Returns itself to allow for method chaining
     */
    remove() {
        this._popup.remove();
        return this;
    }

    /**
     * Sets the geographical location of the popup's anchor, and moves the popup to it.
     * @param {LngLatLike} lnglat - The geographical location to set as the popup's anchor
     * @returns {Popup} Returns itself to allow for method chaining
     */
    setLngLat(lnglat) {
        this._popup.setLngLat(lnglat);
        return this;
    }

    /**
     * Sets the popup's content to the HTML provided as a string.
     * @param {string} html - A string representing HTML content for the popup
     * @returns {Popup} Returns itself to allow for method chaining
     */
    setHTML(html) {
        this._popup.setHTML(html);
        return this;
    }

}
