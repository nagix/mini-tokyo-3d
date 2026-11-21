export default class {

    /*
        Other properties:

        status;
        text;
        suspended;
        ranges;
    */

    constructor(params, refs) {
        const me = this,
            {dynamic, altitude, thumbnail, thumbnailCredit} = params;

        /**
         * Railway ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * Multilingual railway title.
         * @type {Object}
         */
        me.title = params.title;

        /**
         * Railway stations.
         * @type {Array<Station>}
         */
        me.stations = params.stations.map(id => refs.stations.getOrAdd(id));

        /**
         * Train types operating on this railway: id, color (falls back to
         * the railway's own color if omitted), stops (stations it stops at)
         * and through (stations it passes without stopping) - both subsets
         * of me.stations.
         * @type {Array<Object>}
         */
        me.trainTypes = params.trainTypes.map(({id, color, stops, through}) => ({
            id,
            color: color || params.color,
            stops: stops.map(sid => refs.stations.getOrAdd(sid)),
            through: (through || []).map(sid => refs.stations.getOrAdd(sid))
        }));

        /**
         * Subset of me.stations that at least one train type stops at.
         * @type {Array<Station>}
         */
        me.stoppingStations = me.stations.filter(station =>
            me.trainTypes.some(({stops}) => stops.includes(station)));

        /**
         * Ascending rail direction.
         * @type {RailDirection}
         */
        me.ascending = refs.railDirections.get(params.ascending);

        /**
         * Descending rail direction.
         * @type {RailDirection}
         */
        me.descending = refs.railDirections.get(params.descending);

        if (altitude) {
            /**
             * Railway altitude.
             * @type {number}
             */
            me.altitude = altitude;
        }

        /**
         * Railway color.
         * @type {string}
         */
        me.color = params.color;

        /**
         * Railway car composition.
         * @type {number}
         */
        me.carComposition = params.carComposition;

        if (dynamic) {
            /**
             * If true, trains appear and disappear dynamically based on train information.
             * @type {boolean}
             */
            me.dynamic = dynamic;
        }

        if (thumbnail) {
            /**
             * Thumbnail image URL of the railway.
             * @type {string}
             */
            me.thumbnail = thumbnail;
        }

        if (thumbnailCredit) {
            /**
             * Credit for the thumbnail image: the artist's name (and profile URL,
             * if any) and the license name and URL.
             * @type {Object}
             */
            me.thumbnailCredit = thumbnailCredit;
        }
    }

}
