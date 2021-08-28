import {includes, valueOrDefault} from './helpers';

export default class {

    constructor(options = {}) {
        const me = this;

        me.enabled = valueOrDefault(options.enabled, true);
        me.clockModes = options.clockModes || ['realtime', 'playback'];
        me.viewModes = options.viewModes || ['ground', 'underground'];
        me.searchModes = options.searchModes || ['none'];
        me._onModeChanged = () => {
            me.setVisibility(true);
        };
    }

    addTo(map) {
        const me = this;

        me._map = map;
        me.onAdd(map);
        if (me.enabled) {
            me.enabled = false;
            me.enable();
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
        const me = this,
            map = me._map;

        if (!me.enabled) {
            me.enabled = true;
            map.on('clockmode', me._onModeChanged);
            map.on('viewmode', me._onModeChanged);
            me.onEnabled();
            me.setVisibility(true);
        }

        return me;
    }

    disable() {
        const me = this,
            map = me._map;

        if (me.enabled) {
            me.enabled = false;
            map.off('clockmode', me._onModeChanged);
            map.off('viewmode', me._onModeChanged);
            me.setVisibility(false);
            me.onDisabled();
        }

        return me;
    }

    setVisibility(visible) {
        const me = this,
            map = me._map;

        me.onVisibilityChanged(visible && me.enabled &&
            includes(me.clockModes, map.getClockMode()) &&
            includes(me.viewModes, map.getViewMode()) &&
            includes(me.searchModes, map.searchMode)
        );
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

    onVisibilityChanged() {
        // noop
    }

}
