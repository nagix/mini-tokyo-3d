export function pickObject(map, id, point) {
    const deck = map.__deck;

    if (!deck.deckPicker) {
        return;
    }

    const {x, y} = point,
        info = deck.pickObject({x, y, layerIds: [id]});

    if (info) {
        return info.object;
    }
}
