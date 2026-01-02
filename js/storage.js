export const STORAGE_KEY = "bubble_mindmap_data";

// 버블 데이터를 로컬 스토리지에 저장
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
    console.log("Bubbles saved:", data.length);
}

// 로컬 스토리지에서 버블 데이터 불러오기
export function loadBubbles() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    try {
        return JSON.parse(json);
    } catch (e) {
        console.error("Failed to load bubbles", e);
        return [];
    }
}
