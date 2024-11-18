export default class {

    constructor(DataClass, data, refs) {
        const me = this;

        me.DataClass = DataClass;
        me.lookup = new Map();

        if (data) {
            for (const params of data) {
                me.lookup.set(params.id, new DataClass(params, refs));
            }
        }
    }

    load(data, refs) {
        const me = this,
            lookup = me.lookup;

        for (const params of data) {
            const id = params.id;

            if (lookup.has(id)) {
                lookup.get(id).update(params, refs);
            } else {
                lookup.set(id, new me.DataClass(params, refs));
            }
        }
    }

    get(id) {
        return this.lookup.get(id);
    }

    getOrAdd(id) {
        const me = this,
            lookup = me.lookup;

        if (lookup.has(id)) {
            return lookup.get(id);
        }

        const item = new me.DataClass();

        lookup.set(id, item);
        return item;
    }

    getAll() {
        return this.lookup.values();
    }

}
