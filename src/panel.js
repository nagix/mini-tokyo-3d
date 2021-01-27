import * as helpers from './helpers';

const isWindows = helpers.includes(navigator.userAgent, 'Windows');

export default class {

    constructor(options) {
        this._options = Object.assign({
            modal: false
        }, options);
    }

    setTitle(title) {
        const me = this,
            container = me._container;

        me._title = title;
        if (container) {
            container.querySelector('#panel-title').innerHTML = title;
        }

        return me;
    }

    setHTML(html) {
        const me = this,
            container = me._container;

        me._html = html;
        if (container) {
            container.querySelector('#panel-content').innerHTML = html;
        }

        return me;
    }

    setButtons(buttons) {
        const me = this,
            container = me._container;

        me._buttons = buttons;
        if (container) {
            const buttonGroup = container.querySelector('#panel-button-group'),
                {children} = buttonGroup;

            for (let i = children.length - 1; i > 0; i--) {
                buttonGroup.removeChild(children[i]);
            }
            for (const button of buttons || []) {
                buttonGroup.appendChild(button);
            }
        }

        return me;
    }

    addTo(mt3d) {
        const me = this,
            options = me._options,
            container = me._container = document.createElement('div');

        me._mt3d = mt3d;

        if (options.modal) {
            const background = me._background = document.createElement('div');

            background.className = 'modal-panel-background closed';
            background.addEventListener('click', () => {
                me.remove();
            });
            mt3d.container.appendChild(background);
        }

        container.className = [
            'panel closed',
            ` ${options.className || ''}`
        ].join('');
        container.innerHTML = `
<div id="panel-header">
    <div id="panel-title"></div>
    <div id="panel-button-group" class="panel-button-group">
        <div id="panel-button" class="${options.modal ? 'close-button' : 'slide-button'}"></div>
    </div>
</div>
<div id="panel-body"${isWindows ? ' class="windows"' : ''}>
    <div id="panel-content"></div>
</div>`;

        mt3d.container.appendChild(container);

        if (me._title) {
            me.setTitle(me._title);
        }
        if (me._html) {
            me.setHTML(me._html);
        }
        if (me._buttons) {
            me.setButtons(me._buttons);
        }

        if (options.modal) {
            container.querySelector('#panel-button').addEventListener('click', () => {
                me.remove();
            });
        } else {
            container.querySelector('#panel-header').addEventListener('click', () => {
                const {classList} = container;

                if (classList.contains('collapsed')) {
                    classList.remove('collapsed');
                } else {
                    classList.add('collapsed');
                }
            });
            container.querySelector('#panel-header').style.cursor = 'pointer';
        }

        requestAnimationFrame(() => {
            if (options.modal) {
                me._background.classList.remove('closed');
                container.style.height =
                    `min(calc(100% - 10px), ${container.querySelector('#panel-content').offsetHeight + 50}px)`;
            }
            container.classList.remove('closed');
        });

        return me;
    }

    remove() {
        const me = this,
            options = me._options,
            background = me._background,
            container = me._container;

        if (options.modal) {
            background.classList.add('closed');
        }
        container.style.removeProperty('height');
        container.classList.add('closed');

        setTimeout(() => {
            if (options.modal) {
                background.parentNode.removeChild(background);
                delete me._background;
            }
            container.parentNode.removeChild(container);
            delete me._container;
            delete me._mt3d;
        }, 300);
    }

    isOpen() {
        return !!this._mt3d;
    }

}
