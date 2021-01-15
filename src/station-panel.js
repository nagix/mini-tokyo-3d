import Panel from './panel';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({className: 'station-panel'}, options));
    }

    addTo(mt3d) {
        const me = this,
            exitHTML = [],
            stations = me._options.object,
            titles = {},
            exits = [].concat(...stations.map(station => station.exit || []));

        for (const {id} of stations) {
            titles[mt3d.getLocalizedStationTitle(id)] = true;
        }

        for (const id of exits) {
            exitHTML.push([
                '<div class="exit-row">',
                '<div class="exit-title-box">',
                mt3d.getLocalizedPOIDescription(id),
                '</div>',
                '<div class="exit-share-button"></div>',
                '</div>'
            ].join(''));
        }

        super.addTo(mt3d)
            .setTitle(Object.keys(titles).join(mt3d.dict['and']))
            .setHTML(exitHTML.join(''));

        const {children} = me._container.querySelector('#panel-content');

        for (let i = 0, ilen = children.length; i < ilen; i++) {
            const child = children[i];

            child.addEventListener('mouseenter', () => {
                const element = mt3d.container.querySelector(`#exit-${i}`);

                if (element) {
                    element.classList.add('highlighted');
                }
            });
            child.addEventListener('mouseleave', () => {
                const element = mt3d.container.querySelector(`#exit-${i}`);

                if (element) {
                    element.classList.remove('highlighted');
                }
            });
        }

        return me;
    }

}
