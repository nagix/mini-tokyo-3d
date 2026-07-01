import {AmbientLight, DirectionalLight, LightingEffect} from '@deck.gl/core';

export function pickObject(map, id, point) {
    const deck = map.__deck;

    if (deck.deckPicker) {
        const info = deck.pickObject({x: point.x, y: point.y, layerIds: [id]});

        if (info) {
            return info.object;
        }
    }
}

export function setLights(deck, ambient, directional) {
    const ambientLight = new AmbientLight(ambient),
        directionalLight = new DirectionalLight(directional);

    deck.setProps({effects: [new LightingEffect({ambientLight, directionalLight})]});
}
