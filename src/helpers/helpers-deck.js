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
 * Makes the deck.gl canvas follow the map cursor. Workaround for deck.gl #3522.
 * Instead of returning a static 'inherit' as suggested in #3522, it reads the
 * current cursor style from the deck canvas so that cursor shapes changed
 * dynamically (e.g. while hovering over an object) are reflected; 'inherit'
 * cannot pick up those dynamic changes.
 * @param {Deck} deck - deck.gl's Deck instance
 */
export function resetCursor(deck) {
    deck.setProps({getCursor: () => deck.getCanvas().style.cursor});
}
