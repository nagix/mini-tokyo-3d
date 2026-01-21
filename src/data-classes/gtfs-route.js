export default class {

    constructor(params) {
        const me = this,
            {shortName, longName, color, textColor} = params;

        /**
         * Route ID.
         * @type {string}
         */
        me.id = params.id;

        if (shortName) {
            /**
             * Route short name.
             * @type {string}
             */
            me.shortName = shortName;
        }

        if (longName) {
            /**
             * Route long name.
             * @type {string}
             */
            me.longName = longName;
        }

        if (color) {
            /**
             * Route color.
             * @type {string}
             */
            me.color = color;
        }

        if (textColor) {
            /**
             * Route text color.
             * @type {string}
             */
            me.textColor = textColor;
        }

        /**
         * Route shape IDs.
         * @type {Array<string>}
         */
        me.shapes = params.shapes;
    }

}
