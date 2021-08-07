import {valueOrDefault} from '../helpers';

export default class {

    constructor(options = {}) {
        this.enabled = valueOrDefault(options.enabled, true);
    }

    addTo(map) {
        const me = this;

        me._map = map;
        me.onAdd(map);
        if (me.enabled) {
            me.onEnabled();
        }

        return me;
    }

    remove() {
        const me = this;

        me.disable();
        me.onRemove(me._map);
        delete me._map;

        return me;
    }

    enable() {
        const me = this;

        if (!me.enabled) {
            me.enabled = true;
            me.onEnabled();
        }

        return me;
    }

    disable() {
        const me = this;

        if (me.enabled) {
            me.enabled = false;
            me.onDisabled();
        }

        return me;
    }

    onAdd() {
        // noop
    }

    onRemove() {
        // noop
    }

    onEnabled() {
        // noop
    }

    onDisabled() {
        // noop
    }

    setVisibility(/*visible*/) {
        // noop
    }

}
