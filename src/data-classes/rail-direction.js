export default class {

    constructor(params) {
        const me = this;

        /**
         * Rail direction ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * Multilingual Rail direction title.
         * @type {Object}
         */
        me.title = params.title;
    }

}
