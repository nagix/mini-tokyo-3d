import {getTimeOffset} from '../helpers/helpers';

class POI {

    constructor(params) {
        const me = this,
            {uptime, facilities} = params;

        /**
         * POI ID.
         * @type {string}
         */
        me.id = params.id;

        /**
         * POI coordinate. These coordinates use longitude, latitude coordinate order.
         * @type {Array<number>}
         */
        me.coord = params.coord;

        /**
         * Multilingual POI title.
         * @type {Object}
         */
        me.title = params.title;

        /**
         * Multilingual POI description.
         * @type {Object}
         */
        me.description = params.description;

        if (uptime) {
            /**
             * Hours and days when the facility is open.
             * @type {Object}
             */
            me.uptime = uptime.map(({open, close, calendar}) => {
                const item = {
                    open: getTimeOffset(open),
                    close: getTimeOffset(close)
                };

                if (calendar) {
                    item.calendar = calendar;
                }
                return item;
            });
        }

        if (facilities) {
            /**
             * Types of the facility. 'stairs', 'escalator', 'elevator' and 'ramp' are supported.
             * @type {Array<string>}
             */
            me.facilities = facilities;
        }
    }

}

export default class {

    constructor(data) {
        const lookup = this.lookup = new Map();

        for (const item of data) {
            const poi = new POI(item);

            lookup.set(poi.id, poi);
        }

    }

    get(id) {
        return this.lookup.get(id);
    }

}
