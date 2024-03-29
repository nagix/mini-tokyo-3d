import {includes, valueOrDefault} from './helpers/helpers';

export default class {

    constructor(implementation) {
        const me = this;

        me.implementation = implementation;

        me.enabled = false;
        me.clockModes = implementation.clockModes || ['realtime', 'playback'];
        me.viewModes = implementation.viewModes || ['ground', 'underground'];
        me.searchModes = implementation.searchModes || ['none'];
        me._onModeChanged = () => {
            me.setVisibility(true);
        };
    }

    addTo(map) {
        const me = this,
            implementation = me.implementation;

        me.map = map;
        if (implementation.onAdd) {
            implementation.onAdd(map);
        }
        if (valueOrDefault(implementation.enabled, true)) {
            me.enable();
        }

        return me;
    }

    remove() {
        const me = this,
            implementation = me.implementation;

        me.disable();
        if (implementation.onRemove) {
            implementation.onRemove(me.map);
        }
        delete me.map;

        return me;
    }

    enable() {
        const me = this,
            {map, _onModeChanged, implementation} = me;

        if (!me.enabled) {
            me.enabled = true;
            map.on('clockmode', _onModeChanged);
            map.on('viewmode', _onModeChanged);
            if (implementation.onEnabled) {
                implementation.onEnabled();
            }
            me.setVisibility(true);
        }

        return me;
    }

    disable() {
        const me = this,
            {map, _onModeChanged, implementation} = me;

        if (me.enabled) {
            me.enabled = false;
            map.off('clockmode', _onModeChanged);
            map.off('viewmode', _onModeChanged);
            me.setVisibility(false);
            if (implementation.onDisabled) {
                implementation.onDisabled();
            }
        }

        return me;
    }

    setVisibility(visible) {
        const me = this,
            {map, implementation} = me;

        if (implementation.onVisibilityChanged) {
            implementation.onVisibilityChanged(visible && me.enabled &&
                includes(me.clockModes, map.getClockMode()) &&
                includes(me.viewModes, map.getViewMode()) &&
                includes(me.searchModes, map.searchMode)
            );
        }
    }

    getId() {
        return this.implementation.id;
    }

    getName(lang) {
        const name = this.implementation.name;

        return name[lang] || name.en;
    }

    getIconStyle() {
        return this.implementation.iconStyle;
    }

    isEnabled() {
        return this.enabled;
    }

}
