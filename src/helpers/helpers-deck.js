import {AmbientLight, DirectionalLight, LightingEffect} from '@deck.gl/core';

/**
 * Returns the object picked at the given point in the specified layer.
 * @param {Deck} deck - deck.gl's Deck instance
 * @param {string} id - The ID of the layer to pick from
 * @param {Object} point - The screen point to pick at, with x and y in pixels
 * @param {number} [radius] - Extra pixels around the point to search, for a
 *     thin target (e.g. a railway line) that's otherwise hard to hit exactly
 * @returns {Object} The picked object, or undefined if nothing was picked
 */
export function pickObject(deck, id, point, radius) {
    if (deck.deckPicker) {
        const info = deck.pickObject({x: point.x, y: point.y, layerIds: [id], radius});

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

/**
 * Stops deck.gl's own automatic hover picking. Deck's EventManager runs a
 * full synchronous GPU pick on every pointermove/pointerleave to drive
 * onHover/getCursor - both unused here (picking is done explicitly via
 * pickObject() above, and the cursor via resetCursor()) - so left alone it
 * costs real frame time for no purpose.
 * @param {Deck} deck - deck.gl's Deck instance
 */
export function disableAutoHover(deck) {
    deck.eventManager.off('pointermove', deck._onPointerMove);
    deck.eventManager.off('pointerleave', deck._onPointerMove);
}
