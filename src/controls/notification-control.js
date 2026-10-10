import {createElement} from '../helpers/helpers';

const BOTTOM_MARGIN = 37;
const MIN_HEIGHT = 74;
// Fixed chrome around a module's own content, in the selected state:
// .notification-ctrl's own padding (10+9), the button row (39px icon + 4px
// margin + 11px label) plus .notification-buttons' own margin-bottom (9),
// and .notification-module's own padding (1+1) - see mini-tokyo-3d.css.
const CHROME_HEIGHT = 84;

// A row of module buttons (conforming to NotificationModuleInterface - see
// add() below). At most one module is expanded (selected) at a time, but
// this is local to the control, not coordinated with any other control
// through Map - it implements plain mapbox-gl IControl.
export default class {

    constructor(options) {
        const me = this;

        me._modules = new Map();
        me._ui = new Map();
        for (const module of (options && options.modules) || []) {
            me.add(module);
        }
    }

    getDefaultPosition() {
        return 'top-left';
    }

    // Registers a module conforming to NotificationModuleInterface:
    //   id, name, iconStyle, width, height, visible, count - plain
    //     properties. iconStyle is applied directly to the icon element's
    //     style, exactly like PluginInterface's own iconStyle.
    //     height, visible and count are set by the module itself inside
    //     refresh(). visible decides whether its button (and thus this
    //     control) is shown at all; count (optional) only controls the badge
    //     - a module can be visible with no badge, but not the reverse.
    //   onAdd(container) - called once, to build the module's own content
    //     into container (a persistent element - never recreated).
    //   refresh() - called on every NotificationControl#refresh(), to update
    //     the module's own content, height, visible and count.
    //   onSelect()/onDeselect() - optional, called when this module becomes
    //     (or stops being) the selected one.
    add(module) {
        const me = this;

        me._modules.set(module.id, module);
        if (me._container) {
            me._buildModule(module);
        }
        return me;
    }

    remove(id) {
        const me = this;

        if (me._selected === id) {
            me._deselect();
        }
        me._modules.delete(id);

        const ui = me._ui.get(id);

        if (ui) {
            ui.item.parentNode.removeChild(ui.item);
            ui.content.parentNode.removeChild(ui.content);
            me._ui.delete(id);
        }

        return me;
    }

    onAdd(map) {
        const me = this;

        me._map = map;
        me._container = createElement('div', {className: 'mapboxgl-ctrl ctrl-group'});
        me._container.style.display = 'none';

        me._element = createElement('div', {className: 'notification-ctrl'}, me._container);
        me._buttons = createElement('div', {className: 'notification-buttons'}, me._element);
        me._body = createElement('div', {className: 'notification-body'}, me._element);

        for (const module of me._modules.values()) {
            me._buildModule(module);
        }

        map.on('resize', () => {
            if (me._selected) {
                me._updateHeight();
            }
        });

        return me._container;
    }

    onRemove() {
        const me = this,
            container = me._container;

        if (me._resizeObserver) {
            me._resizeObserver.disconnect();
        }
        container.parentNode.removeChild(container);
        delete me._container;
    }

    _buildModule(module) {
        const me = this,
            item = createElement('div', {className: 'notification-item'}, me._buttons),
            button = createElement('button', {className: 'notification-button', type: 'button'}, item),
            icon = createElement('span', {className: 'notification-icon'}, button),
            badge = createElement('div', {className: 'notification-badge'}, button),
            content = createElement('div', {className: 'notification-module'}, me._body);

        Object.assign(icon.style, module.iconStyle);
        icon.setAttribute('aria-hidden', true);
        createElement('div', {className: 'notification-label', textContent: module.name}, item);
        content.style.display = 'none';

        button.addEventListener('click', () => {
            if (me._selected === module.id) {
                me._deselect();
            } else {
                me._select(module.id);
            }
        });

        me._ui.set(module.id, {item, button, badge, content});
        module.onAdd(content);
    }

    _select(id) {
        const me = this,
            module = me._modules.get(id);

        if (me._selected && me._selected !== id) {
            me._deselect();
        }
        me._selected = id;

        if (!me._resizeObserver) {
            // Deferred until the control is actually selected, since by
            // onAdd() time it hasn't been attached to its position
            // container yet. Watches the whole position container rather
            // than a specific sibling - any of them resizing (e.g.
            // ClockControl switching clock mode) can shift this control's
            // own top, so it needs to be re-clamped regardless of which
            // sibling (or how many) caused it, independent of add order.
            me._resizeObserver = new ResizeObserver(() => {
                if (me._selected) {
                    me._updateHeight();
                }
            });
            me._resizeObserver.observe(me._container.parentElement);
        }

        const {button, content} = me._ui.get(id);

        button.classList.add('notification-button-selected');
        content.style.display = 'block';
        me._element.classList.add('selected');
        me._element.style.width = `${module.width}px`;
        me._updateHeight();
        if (typeof module.onSelect === 'function') {
            module.onSelect();
        }
    }

    _deselect() {
        const me = this,
            id = me._selected;

        if (!id) {
            return;
        }

        const module = me._modules.get(id),
            {button, content} = me._ui.get(id);

        delete me._selected;
        button.classList.remove('notification-button-selected');
        content.style.display = 'none';
        me._element.classList.remove('selected');
        me._element.style.width = '';
        me._element.style.height = '';
        if (typeof module.onDeselect === 'function') {
            module.onDeselect();
        }
    }

    _updateHeight() {
        const me = this,
            module = me._modules.get(me._selected),
            mapRect = me._container.closest('.mapboxgl-map').getBoundingClientRect(),
            top = me._element.getBoundingClientRect().top,
            available = mapRect.bottom - BOTTOM_MARGIN - top,
            desired = module.height + CHROME_HEIGHT;

        me._element.style.height = `${Math.max(MIN_HEIGHT, Math.min(desired, available))}px`;
    }

    _refreshModule(module) {
        const me = this;

        module.refresh();

        const {item, badge} = me._ui.get(module.id);

        if (module.visible) {
            item.style.display = '';
            badge.style.display = module.count > 0 ? 'block' : 'none';
            badge.textContent = module.count;
        } else {
            item.style.display = 'none';
            if (me._selected === module.id) {
                me._deselect();
            }
        }
    }

    // id: the module whose own data changed. Omit to refresh every module.
    refresh(id) {
        const me = this;

        if (id) {
            const module = me._modules.get(id);

            if (!module) {
                return;
            }
            me._refreshModule(module);
        } else {
            for (const module of me._modules.values()) {
                me._refreshModule(module);
            }
        }

        const anyVisible = [...me._modules.values()].some(module => module.visible);

        me._container.style.display = anyVisible ? 'block' : 'none';
        if (me._selected) {
            me._updateHeight();
        }
    }

}
