function heapPush(heap, item) {
    heap.push(item);
    let i = heap.length - 1;

    while (i > 0) {
        const parent = (i - 1) >> 1;

        if (heap[parent].deadline <= heap[i].deadline) {
            break;
        }
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        i = parent;
    }
}

function heapPop(heap) {
    const top = heap[0],
        last = heap.pop();

    if (heap.length) {
        heap[0] = last;

        const n = heap.length;
        let i = 0;

        for (;;) {
            const left = i * 2 + 1,
                right = left + 1;
            let smallest = i;

            if (left < n && heap[left].deadline < heap[smallest].deadline) {
                smallest = left;
            }
            if (right < n && heap[right].deadline < heap[smallest].deadline) {
                smallest = right;
            }
            if (smallest === i) {
                break;
            }
            [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
            i = smallest;
        }
    }
    return top;
}

/**
 * A Map-like registry of active objects (trains, flights, buses) that also
 * schedules a one-shot callback for when each object's current section ends,
 * without polling every active object on every frame.
 *
 * Entries carry a generation counter bumped on every schedule() call. Heap
 * items snapshot the generation they were pushed with, so a stale item left
 * behind by a reschedule or a delete() is detected (map entry gone, or its
 * generation has moved on) and silently dropped at pop time instead of
 * requiring an O(log n) arbitrary-removal heap.
 */
export default class ActiveObjectLookup {

    constructor() {
        this._map = new Map();
        this._heap = [];
        this._nextGeneration = 0;
    }

    get(id) {
        const entry = this._map.get(id);

        return entry && entry.object;
    }

    has(id) {
        return this._map.has(id);
    }

    set(id, object) {
        this._map.set(id, {object, generation: 0, callback: undefined});
    }

    delete(id) {
        this._map.delete(id);
    }

    *values() {
        for (const {object} of this._map.values()) {
            yield object;
        }
    }

    /**
     * Schedules callback to fire once this object's clock-scaled high-res
     * time (Clock#getHighResTime()) reaches deadline. Replaces any
     * previously scheduled callback for the same id.
     * @param {string|number} id - Object id, as passed to set()
     * @param {number} deadline - Target Clock#getHighResTime() value
     * @param {Function} callback - Called once when the deadline passes
     */
    schedule(id, deadline, callback) {
        const entry = this._map.get(id);

        if (!entry) {
            return;
        }

        const generation = ++this._nextGeneration;

        entry.generation = generation;
        entry.callback = callback;
        heapPush(this._heap, {id, generation, deadline});
    }

    /**
     * Fires the callback of every scheduled entry whose deadline has passed,
     * in deadline order. Call once per frame with the current high-res time.
     * @param {number} now - Current Clock#getHighResTime() value
     */
    processDue(now) {
        const heap = this._heap;

        while (heap.length && heap[0].deadline <= now) {
            const {id, generation} = heapPop(heap),
                entry = this._map.get(id);

            if (entry && entry.generation === generation) {
                const callback = entry.callback;

                entry.callback = undefined;
                callback();
            }
        }
    }

}
