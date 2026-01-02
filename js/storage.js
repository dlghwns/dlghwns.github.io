export const STORAGE_KEY = "bubble_mindmap_data";

export function saveBubbles(bubbles) {
    const data = bubbles.map(b => ({
        id: b.id,
        text: b.text,
        type: b.type,
        content: b.content || null,
        x: b.x,
        y: b.y,
        parentId: b.parent ? b.parent.id : null
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadBubbles() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    try {
        return JSON.parse(json);
    } catch (e) {
        return [];
    }
}
