export default class {

    constructor(params) {
        const me = this;

        /**
         * Train type ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * Multilingual train type title.
         * @type {Object}
         */
        me.title = params.title;
    }

}
