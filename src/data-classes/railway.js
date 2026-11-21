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
