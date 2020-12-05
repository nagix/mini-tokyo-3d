export default class {

    constructor(options) {
        this.enabled = options.enabled;
    }

    addTo(mt3d) {
        const me = this;

        me._mt3d = mt3d;
        me.onAdd(mt3d);
        if (me.enabled) {
            me.onEnabled();
        }

        return me;
    }

    remove() {
        const me = this;

        me.disable();
        me.onRemove(me._mt3d);
        delete me._mt3d;

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
