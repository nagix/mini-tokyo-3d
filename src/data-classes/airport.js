export default class {

    constructor(params) {
        const me = this;

        /**
         * Airport ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * Multilingual airport title.
         * @type {Object}
         */
        me.title = params.title;

        /**
         * Airport direction from Tokyo. 'N' for north or 'S' for south.
         * @type {Object}
         */
        me.direction = params.direction;
    }

}
