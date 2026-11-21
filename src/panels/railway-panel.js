import {colorToRGBArray, luminance} from '../helpers/helpers';
import Panel from './panel';

// Layout of the #railway-mark columns (one per train type, left to right) -
// chosen to reproduce train-panel's own line-to-text gap.
const FIRST_COL_X = 12;
const COL_SPACING = 16;
const MARK_LEFT = 10;
const MARK_RIGHT_PAD = 5;
const TEXT_GAP = 3;

export default class extends Panel {

    constructor(options) {
        super(Object.assign({className: 'railway-panel'}, options));
    }

    addTo(map) {
        const me = this,
            railway = me._options.object,
            color = railway.color,
            trainTypes = railway.trainTypes,
            stations = railway.stoppingStations,
            svgWidth = FIRST_COL_X + (trainTypes.length - 1) * COL_SPACING + MARK_RIGHT_PAD,
            textPaddingLeft = MARK_LEFT + svgWidth + TEXT_GAP,
            trainTypeHTML = trainTypes.map(({id, color}) => {
                const [r, g, b] = colorToRGBArray(color),
                    textColor = luminance({r, g, b}) / 255 < .5 ? '#ffffff' : '#333333';

                return `<span class="train-type-label" style="background-color: ${color}; color: ${textColor};">${map.getLocalizedTrainTypeTitle(map.trainTypes.get(id))}</span>`;
            }),
            stationHTML = stations.map(station => [
                '<div class="station-row">',
                `<div class="station-title-box" style="padding-left: ${textPaddingLeft}px;">`,
                map.getLocalizedStationTitle(station),
                '</div>',
                '</div>'
            ].join(''));

        super.addTo(map)
            .setTitle([
                '<div class="desc-header">',
                Array.isArray(color) ? [
                    '<div>',
                    ...color.slice(0, 3).map(c => `<div class="line-strip-long" style="background-color: ${c};"></div>`),
                    '</div>'
                ].join('') : `<div style="background-color: ${color};"></div>`,
                `<div class="desc-first-row">${map.getLocalizedRailwayTitle(railway)}</div>`,
                '</div>'
            ].join(''))
            .setHTML([
                '<div id="railway-status"></div>',
                '<div id="railway-traintypes">',
                ...trainTypeHTML,
                '</div>',
                '<div id="railway-stops">',
                ...stationHTML,
                '</div>',
                `<svg id="railway-mark" style="width: ${svgWidth}px;"></svg>`
            ].join(''));

        me._stations = stations;
        me._trainTypes = trainTypes;

        // Must run before _updateMark reads #railway-stops' offsets, since the
        // status card's height shifts them.
        me.updateContent();

        return me;
    }

    // Realtime status/text is only ever delivered in Japanese (same
    // limitation as the train popup's status line), so it's hidden in other languages.
    updateContent() {
        const me = this,
            map = me._map,
            {lang} = map,
            railway = me._options.object,
            {status, text, ranges} = railway,
            showStatus = status && lang === 'ja';

        if (!me.isOpen()) {
            return;
        }

        if (showStatus) {
            const hasRanges = ranges && ranges.length > 0,
                suspended = hasRanges && ranges.some(range => range.kind === 'suspended'),
                iconType = hasRanges ? (suspended ? 'suspended' : 'delay') : 'info';

            me._container.querySelector('#railway-status').innerHTML = [
                '<div class="railway-status-item">',
                `<div class="railway-status-icon railway-status-icon-${iconType}"></div>`,
                '<div class="railway-status-label">',
                `<div class="railway-status-title">${status}</div>`,
                `<div class="railway-status-text">${text}</div>`,
                '</div>',
                '</div>'
            ].join('');
        } else {
            me._container.querySelector('#railway-status').innerHTML = '';
        }

        me._updateMark();
    }

    // Redrawn from #railway-stops' current offsets rather than once in
    // addTo(), so it stays aligned when #railway-status' height changes.
    // Circles mark only `stops`; `through` stations extend a type's line
    // without getting a circle of their own.
    _updateMark() {
        const me = this,
            container = me._container,
            stations = me._stations,
            offsets = [];

        for (const child of container.querySelector('#railway-stops').children) {
            offsets.push(child.offsetTop + child.getBoundingClientRect().height / 2);
        }

        const marks = [];

        me._trainTypes.forEach(({color, stops, through}, i) => {
            const x = FIRST_COL_X + i * COL_SPACING,
                ownOffsets = stations
                    .map((station, index) => stops.includes(station) ? offsets[index] : undefined)
                    .filter(offset => offset !== undefined),
                servedOffsets = stations
                    .map((station, index) => (stops.includes(station) || through.includes(station)) ? offsets[index] : undefined)
                    .filter(offset => offset !== undefined);

            if (!servedOffsets.length) {
                return;
            }

            marks.push(`<line stroke="${color}" stroke-width="10" x1="${x}" y1="${servedOffsets[0]}" x2="${x}" y2="${servedOffsets[servedOffsets.length - 1]}" stroke-linecap="round" />`);
            for (const offset of ownOffsets) {
                marks.push(`<circle cx="${x}" cy="${offset}" r="3" fill="#ffffff" />`);
            }
        });

        container.querySelector('#railway-mark').innerHTML = marks.join('');
    }

    reset() {
    }

}
