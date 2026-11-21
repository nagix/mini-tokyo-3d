import configs from '../configs';
import Panel from './panel';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({
            className: 'about-panel',
            modal: true
        }, options));
    }

    addTo(map) {
        return super.addTo(map)
            .setTitle(map.dict['about'])
            .updateContent();
    }

    remove() {
        this._creditsOpen = false;
        return super.remove();
    }

    // Built lazily on the disclosure's first "toggle" and cached.
    _buildThumbnailCredits() {
        const me = this;

        if (!me._thumbnailCreditsHTML) {
            const map = me._map,
                groupsByThumbnail = new Map(),
                collect = (items, getTitle) => {
                    for (const item of items) {
                        if (item.thumbnailCredit) {
                            const group = groupsByThumbnail.get(item.thumbnail) ||
                                {credit: item.thumbnailCredit, titles: new Set()};

                            group.titles.add(getTitle(item));
                            groupsByThumbnail.set(item.thumbnail, group);
                        }
                    }
                };

            collect(map.stations.getAll(), station => map.getLocalizedStationTitle(station));
            collect(map.railways.getAll(), railway => map.getLocalizedRailwayTitle(railway));

            me._thumbnailCreditsHTML = [...groupsByThumbnail.values()].map(({credit: {artist, license, licenseUrl}, titles}) => {
                const title = [...titles].join(map.dict['and']),
                    credit = [
                        artist && (artist.url ? `<a href="${artist.url}" target="_blank">${artist.name}</a>` : artist.name),
                        license && (licenseUrl ? `<a href="${licenseUrl}" target="_blank">${license}</a>` : license)
                    ].filter(Boolean).join(', ');

                return {title, credit};
            })
                .sort((a, b) => a.title.localeCompare(b.title, map.lang))
                .map(({title, credit}) => `${title}: ${credit}`)
                .join('<br>');
        }

        return me._thumbnailCreditsHTML;
    }

    updateContent() {
        const me = this;

        if (me.isOpen()) {
            const {dict, gtfs, lastDynamicUpdate} = me._map,
                gtfsArray = [...gtfs.values()],
                creditsOpen = !!me._creditsOpen;

            me.setHTML([
                dict['description'].replace(/<h3>.*<\/h3>/, ''),
                `<p>${configs.copyright}</p>`,
                [
                    `<details class="acd-details"${creditsOpen ? ' open' : ''} id="thumbnail-credits">`,
                    `<summary class="card-title">${dict['photo-credits']}</summary>`,
                    `<div class="card-body">${creditsOpen ? me._buildThumbnailCredits() : ''}</div>`,
                    '</details>'
                ].join(''),
                `<div class="card-title">${dict['static-update']}</div>`,
                `<div class="card-body">${configs.lastStaticUpdate}</div>`,
                `<div class="card-title">${dict['dynamic-update']}</div>`,
                `<div class="card-body">${[
                    ...Object.entries(lastDynamicUpdate)
                        .filter(([key, date]) => date && dict[key.toLowerCase()])
                        .map(([key, date]) => `${date} (${dict[key.toLowerCase()]})`),
                    ...gtfsArray.filter(({date}) => date).map(({date, agency}) => `${date} (${agency})`)
                ].join('<br>')}</div>`,
                gtfsArray.length > 0 ? [
                    `<div class="card-title">${dict['gtfs-feed-version']}</div>`,
                    '<div class="card-body">',
                    gtfsArray.map(({version, agency}) => `${version} (${agency})`).join('<br>'),
                    '</div>'
                ].join('') : ''
            ].join(''));

            me._container.querySelector('#thumbnail-credits').addEventListener('toggle', ({target}) => {
                me._creditsOpen = target.open;
                if (target.open) {
                    target.querySelector('.card-body').innerHTML = me._buildThumbnailCredits();
                }
            });
        }

        return me;
    }

}
