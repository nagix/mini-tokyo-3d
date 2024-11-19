export default class {

    constructor(params) {
        const me = this;

        /**
         * Flight status ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * Flight status title.
         * @type {Object}
         */
        me.title = params.title;
    }

}
