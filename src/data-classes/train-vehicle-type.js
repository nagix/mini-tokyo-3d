export default class {

    constructor(params) {
        const me = this;

        /**
         * Train vechicle ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * Train vechicle color. If it is an array, the elements indicate the side upper,
         * side middle, side lower, and front/back in order.
         * @type {string | Array<string>}
         */
        me.color = params.color;
    }

}
