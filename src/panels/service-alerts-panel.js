import {escapeHTML} from '../helpers/helpers';
import Panel from './panel';

const SELECTOR_LABELS = {
    agencyId: 'Kaikki HSL-liikenne',
    routeId: 'Linja',
    stopId: 'Pysäkki'
};

export default class extends Panel {

    constructor(options) {
        super(Object.assign({
            className: 'service-alerts-panel',
            modal: true
        }, options));
    }

    addTo(map) {
        super.addTo(map);
        this.updateContent();
        return this;
    }

    updateContent() {
        const me = this,
            map = me._map;

        if (!map || !me.isOpen()) {
            return me;
        }
        const alerts = [...map.serviceAlerts.values()],
            feedEntry = [...map.realtimeFeeds.entries()]
                .find(([key]) => key.endsWith(':service-alerts')),
            feed = feedEntry && feedEntry[1],
            stale = feed && feed.stale;

        me.setTitle([
            map.dict['service-alerts'],
            ` (${alerts.length})`,
            stale ? ` · ${map.dict['stale-data']}` : ''
        ].join(''));
        me.setHTML(alerts.length ? alerts.map(alert => {
            const selectors = [...new Set(alert.selectors.map(selector => {
                if (selector.agencyId) {
                    return SELECTOR_LABELS.agencyId;
                }
                if (selector.routeId) {
                    return `${SELECTOR_LABELS.routeId} ${selector.routeId}`;
                }
                if (selector.stopId) {
                    return `${SELECTOR_LABELS.stopId} ${selector.stopId}`;
                }
                return '';
            }).filter(Boolean))].join(' · ');

            return [
                '<article class="service-alert">',
                `<h4>${escapeHTML(alert.header || map.dict['service-alert'])}</h4>`,
                alert.description ? `<p>${escapeHTML(alert.description)}</p>` : '',
                selectors ? `<div class="service-alert-scope">${escapeHTML(selectors)}</div>` : '',
                alert.url ? `<a href="${escapeHTML(alert.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(map.dict['more-information'])}</a>` : '',
                '</article>'
            ].join('');
        }).join('') : `<p>${escapeHTML(map.dict['no-service-alerts'])}</p>`);
        return me;
    }

}
