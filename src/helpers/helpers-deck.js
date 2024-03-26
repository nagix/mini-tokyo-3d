export function pickObject(map, id, point) {
    const deck = map.__deck;

    if (deck.deckPicker) {
        const info = deck.pickObject({x: point.x, y: point.y, layerIds: [id]});

        if (info) {
            return info.object;
        }
    }
}
