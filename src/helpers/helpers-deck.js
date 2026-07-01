import {AmbientLight, DirectionalLight, LightingEffect} from '@deck.gl/core';

/**
 * Returns the object picked at the given point in the specified layer.
 * @param {Deck} deck - deck.gl's Deck instance
 * @param {string} id - The ID of the layer to pick from
 * @param {Object} point - The screen point to pick at, with x and y in pixels
 * @returns {Object} The picked object, or undefined if nothing was picked
 */
export function pickObject(deck, id, point) {
    if (deck.deckPicker) {
        const info = deck.pickObject({x: point.x, y: point.y, layerIds: [id]});

        if (info) {
            return info.object;
        }
    }
}

/**
 * Sets the ambient and directional lights on the deck.gl instance.
 * @param {Deck} deck - deck.gl's Deck instance
 * @param {Object} ambient - The properties of the AmbientLight (color, intensity)
 * @param {Object} directional - The properties of the DirectionalLight (color,
 *     intensity, direction)
 */
export function setLights(deck, ambient, directional) {
    const ambientLight = new AmbientLight(ambient),
        directionalLight = new DirectionalLight(directional);

    deck.setProps({effects: [new LightingEffect({ambientLight, directionalLight})]});
}

/**
 * Resets the map cursor to inherit from the container. Workaround for deck.gl #3522.
 * @param {Deck} deck - deck.gl's Deck instance
 */
export function resetCursor(deck) {
    deck.setProps({getCursor: () => 'inherit'});
}
