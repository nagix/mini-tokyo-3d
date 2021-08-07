import Panel from './panel';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({className: 'station-panel'}, options));
    }

    addTo(map) {
        const me = this,
            exitHTML = [],
            stations = me._options.object,
            titles = {},
            exits = [].concat(...stations.map(station => station.exit || []));

        for (const {id} of stations) {
            titles[map.getLocalizedStationTitle(id)] = true;
        }

        for (const id of exits) {
            exitHTML.push([
                '<div class="exit-row">',
                '<div class="exit-title-box">',
                map.getLocalizedPOIDescription(id),
                '</div>',
                '<div class="exit-share-button"></div>',
                '</div>'
            ].join(''));
        }

        super.addTo(map)
            .setTitle(Object.keys(titles).join(map.dict['and']))
            .setHTML(exitHTML.join(''));

        const {children} = me._container.querySelector('#panel-content');

        for (let i = 0, ilen = children.length; i < ilen; i++) {
            const child = children[i];

            child.addEventListener('mouseenter', () => {
                const element = map.container.querySelector(`#exit-${i}`);

                if (element) {
                    element.classList.add('highlighted');
                }
            });
            child.addEventListener('mouseleave', () => {
                const element = map.container.querySelector(`#exit-${i}`);

                if (element) {
                    element.classList.remove('highlighted');
                }
            });
        }

        return me;
    }

}
