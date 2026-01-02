const STORAGE_KEY = "bubble_mindmap_data";

export function saveBubbles(bubblesData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bubblesData));
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
