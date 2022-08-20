import {WebMercatorViewport} from '@deck.gl/core';

export function getViewport(deck, map) {
    const {lng, lat} = map.getCenter();

    return new WebMercatorViewport({
        id: 'mapbox',
        x: 0,
        y: 0,
        width: deck.width,
        height: deck.height,
        longitude: ((lng + 540) % 360) - 180,
        latitude: lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        padding: map.getPadding(),
        repeat: map.getRenderWorldCopies(),
        nearZMultiplier: 0.02,
        farZMultiplier: 2
    });
}

export function pickObject(map, id, point) {
    const deck = map.__deck,
        {deckPicker, viewManager} = deck;

    if (!deckPicker) {
        return;
    }

    const viewports = viewManager._viewports,
        {x, y} = point;

    viewManager._viewports = [getViewport(deck, map)];

    const info = deck.pickObject({x, y, layerIds: [id]});

    viewManager._viewports = viewports;

    if (info) {
        return info.object;
    }
}
