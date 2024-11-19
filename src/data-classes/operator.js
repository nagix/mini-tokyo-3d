export default class {

    constructor(params) {
        const me = this;

        /**
         * Operator ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * Operator title.
         * @type {Object}
         */
        me.title = params.title;

        /**
         * Aircraft body color.
         * @type {string}
         */
        me.color = params.color;

        /**
         * Aircraft tail wing color.
         * @type {string}
         */
        me.tailcolor = params.tailcolor;
    }

}
