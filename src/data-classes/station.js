export default class {

    constructor(params, refs) {
        if (params) {
            this.update(params, refs);
        }
    }

    update(params, refs) {
        const me = this,
            {railway, coord, utitle, thumbnail, exit, altitude, alternate, ascending, descending, group} = params;

        /**
         * Station ID.
         * @type {string}
         */
        me.id = params.id;

        if (railway) {
            /**
             * The railway of the station.
             * @type {Railway}
             */
            me.railway = refs.railways.get(railway);
        }

        if (coord) {
            /**
             * Station coordinate. These coordinates use longitude, latitude coordinate order.
             * @type {Array<number>}
             */
            me.coord = coord;
        }

        /**
         * Multilingual station title.
         * @type {Object}
         */
        me.title = params.title;

        /**
         * Multilingual unique station title, which is used for station search.
         * @type {Object}
         */
        if (utitle) {
            me.utitle = utitle;
        }

        if (thumbnail) {
            /**
             * Thumbnail image URL of the station.
             * @type {string}
             */
            me.thumbnail = thumbnail;
        }

        if (exit) {
            /**
             * POIs for station exits.
             * @type {Array<POI>}
             */
            me.exit = exit.map(id => refs.pois.get(id));
        }

        if (altitude) {
            /**
             * Station altitude.
             * @type {number}
             */
            me.altitude = altitude;
        }

        if (alternate) {
            /**
             * If exists, the station is hidden and this specifies the alternate station
             * used for popups and the departure board.
             * @type {Station}
             */
            me.alternate = refs.stations.getOrAdd(alternate);
        }

        if (ascending !== undefined) {
            /**
             * If exists, this ascending rail direction is used in the departure board
             * instead of railway's default. If null, it doesn't appear in the departure
             * board.
             * @type {Object}
             */
            me.ascending = ascending ? refs.railDirections.get(ascending) : null;
        }

        if (descending !== undefined) {
            /**
             * If exists, this descending rail direction is used in the departure board
             * instead of railway's default. If null, it doesn't appear in the departure
             * board.
             * @type {Object}
             */
            me.descending = descending ? refs.railDirections.get(descending) : null;
        }

        if (group) {
            /**
             * Station group ID.
             * @type {string}
             */
            me.group = group;
        }
    }

}
