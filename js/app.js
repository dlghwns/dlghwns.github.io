import { Bubble } from "./bubble.js";
import { Canvas } from "./canvas.js";
import { saveBubbles, loadBubbles } from "./storage.js";
import { compressString, decompressToJSON, playAnimation } from "./utils.js";
import { sortBubblesMindMap, sortBubblesTree } from "./layout.js";

const chatContainer = document.querySelector(".chat-container");
const input = document.getElementById("chatInput");
const createBtn = document.getElementById("createBtn");
const canvasContainer = document.getElementById("canvas");
const contextMenu = document.getElementById("contextMenu");
const deleteBtn = document.getElementById("deleteBtn");
const themeBtn = document.getElementById("themeBtn");
const addContentBtn = document.getElementById("addContentBtn");
const viewContentBtn = document.getElementById("viewContentBtn");
const deleteContentBtn = document.getElementById("deleteContentBtn");
const contentModal = document.getElementById("contentModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const closeModalBtn = document.getElementById("closeModalBtn");
const contentModalHeader = document.getElementById("contentModalHeader");
const saveContentBtn = document.getElementById("saveContentBtn");
const toggleEditBtn = document.getElementById("toggleEditBtn");
const editArea = document.getElementById("editArea");
const viewArea = document.getElementById("viewArea");
const viewTitle = document.getElementById("viewTitle");
const viewBody = document.getElementById("viewBody");
const clearBtn = document.getElementById("clearBtn");
const sortCircularBtn = document.getElementById("sortCircularBtn");
const sortTreeBtn = document.getElementById("sortTreeBtn");
const shareBubbleBtn = document.getElementById("shareBubbleBtn");
const importBtn = document.getElementById("importBtn");
const importModal = document.getElementById("importModal");
const importCodeInput = document.getElementById("importCodeInput");
const doImportBtn = document.getElementById("doImportBtn");
const cancelImportBtn = document.getElementById("cancelImportBtn");
const shareModal = document.getElementById("shareModal");
const shareCodeOutput = document.getElementById("shareCodeOutput");
const copyShareBtn = document.getElementById("copyShareBtn");
const closeShareModalBtn = document.getElementById("closeShareModalBtn");
const propertyBtn = document.getElementById("propertyBtn");
const propertyModal = document.getElementById("propertyModal");
const closePropertyModalBtn = document.getElementById("closePropertyModalBtn");
const sizeRange = document.getElementById("sizeRange");
const sizeValue = document.getElementById("sizeValue");
const colorPalette = document.getElementById("colorPalette");
const hexInput = document.getElementById("hexInput");
const menuPropertyGroup = document.getElementById("menuPropertyGroup");
const menuSortGroup = document.getElementById("menuSortGroup");
const menuOverviewGroup = document.getElementById("menuOverviewGroup");
const menuLineGroup = document.getElementById("menuLineGroup");
const menuShareGroup = document.getElementById("menuShareGroup");
const changeLineBtn = document.getElementById("changeLineBtn");
const lineStyleModal = document.getElementById("lineStyleModal");
const closeLineModalBtn = document.getElementById("closeLineModalBtn");
const saveLineStyleBtn = document.getElementById("saveLineStyleBtn");
const lineColorPalette = document.getElementById("lineColorPalette");
const lineWidthRange = document.getElementById("lineWidthRange");
const lineWidthValue = document.getElementById("lineWidthValue");
const selectionOverlay = document.getElementById("selectionOverlay");
const exportAllBtn = document.getElementById("exportAllBtn");
const exportAllModal = document.getElementById("exportAllModal");
const exportAllCodeOutput = document.getElementById("exportAllCodeOutput");
const closeExportAllModalBtn = document.getElementById("closeExportAllModalBtn");
const copyExportAllBtn = document.getElementById("copyExportAllBtn");
const cancelSelectionBtn = document.getElementById("cancelSelectionBtn");
const lineHexInput = document.getElementById("lineHexInput");

const customSelect = document.getElementById("customSelect");
const selectSelected = customSelect.querySelector(".select-selected");
const selectItems = customSelect.querySelector(".select-items");
const searchOptions = selectItems.querySelectorAll("div");
const searchType = document.getElementById("searchType");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const iconSearch = searchBtn.querySelector(".icon-search");
const iconClose = searchBtn.querySelector(".icon-close");

let activeBubble = null;
let targetBubbleForMenu = null;
let editingBubble = null;
let searchMatches = [];
let searchIndex = 0;
let isSearchMode = false;
let isLineSelectionMode = false;
let lineSelectionStartBubble = null;
let currentSelectedPath = [];
let tempLineOptions = { color: '#9ca3af', width: 2, style: 'solid' };
const undoStack = [];

const canvas = new Canvas(canvasContainer);

function pushUndoState() {
    const bubblesData = canvas.bubbles.map(b => ({
        id: b.id,
        text: b.text,
        type: b.type,
        content: b.content,
        x: Math.round(b.x),
        y: Math.round(b.y),
        parentId: b.parent ? b.parent.id : null,
        color: b.color,
        radius: b.radius,
        lineOptions: b.lineOptions
    }));
    undoStack.push(JSON.stringify(bubblesData));
    if (undoStack.length > 50) undoStack.shift();
}

function undo() {
    if (undoStack.length === 0) return;
    const lastState = undoStack.pop();
    const data = JSON.parse(lastState);
    const allBubbles = [...canvas.bubbles];
    allBubbles.forEach(b => canvas.removeBubble(b));
    initAppFromData(data);
    saveState();
}

function saveState() {
    const bubblesData = canvas.bubbles.map(b => ({
        id: b.id,
        text: b.text,
        type: b.type,
        content: b.content,
        x: Math.round(b.x),
        y: Math.round(b.y),
        parentId: b.parent ? b.parent.id : null,
        color: b.color,
        radius: b.radius,
        lineOptions: b.lineOptions
    }));
    saveBubbles(bubblesData);
}

function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    const type = searchType.value;
    if (!query) { exitSearchMode(); return; }

    searchMatches = canvas.bubbles.filter(b => {
        const text = (b.text || "").toLowerCase();
        const contentTitle = (b.content && b.content.title) ? b.content.title.toLowerCase() : "";
        const contentBody = (b.content && b.content.body) ? b.content.body.toLowerCase() : "";
        if (type === "name") return text.includes(query);
        if (type === "title") return contentTitle.includes(query);
        if (type === "body") return contentBody.includes(query);
        return text.includes(query) || contentTitle.includes(query) || contentBody.includes(query);
    });

    if (searchMatches.length === 0) {
        alert("검색 결과가 없습니다.");
        exitSearchMode();
        return;
    }

    searchMatches.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
    isSearchMode = true;
    searchIndex = 0;
    updateSearchUI();
    focusBubble(searchMatches[0]);
}

function focusBubble(bubble) {
    canvas.panX = (window.innerWidth / 2) - bubble.x * canvas.scale;
    canvas.panY = (window.innerHeight / 2) - bubble.y * canvas.scale;
    canvas.updateTransform();
    selectBubble(bubble);
}

function updateSearchUI() {
    const hasMatches = isSearchMode && searchMatches.length > 0;
    iconSearch.style.display = hasMatches ? "none" : "block";
    iconClose.style.display = hasMatches ? "block" : "none";
    const multiple = hasMatches && searchMatches.length > 1;
    btnPrev.style.display = multiple ? "flex" : "none";
    btnNext.style.display = multiple ? "flex" : "none";
}

function exitSearchMode() {
    isSearchMode = false;
    searchMatches = [];
    searchInput.value = "";
    updateSearchUI();
}

function selectBubble(bubble) {
    if (activeBubble) activeBubble.setActive(false);
    canvas.bubbles.forEach(b => {
        b.setHighlighted(false);
        b.el.classList.remove("blur-out");
        b.el.classList.remove("selection-target");
    });
    activeBubble = bubble;
    if (bubble) {
        bubble.setActive(true);
        const sub = getAllSubtreeBubbles(bubble);
        sub.forEach(b => {
            if (b !== bubble) b.setHighlighted(true);
        });
    }
}

async function deleteCascade(startBubble) {
    let currentLayer = [startBubble];
    while (currentLayer.length > 0) {
        const nextLayer = [];
        for (const bubble of currentLayer) {
            if (bubble.children) nextLayer.push(...bubble.children);
            canvas.removeBubble(bubble);
        }
        saveState();
        if (nextLayer.length > 0) await new Promise(r => setTimeout(r, 80));
        currentLayer = nextLayer;
    }
}

function startLineSelectionMode(bubble) {
    isLineSelectionMode = true;
    lineSelectionStartBubble = bubble;
    currentSelectedPath = [];
    selectionOverlay.style.display = "flex";
    document.getElementById("selectionGuideText").textContent = `[${bubble.text}]에서 시작할 끝점을 선택하세요.`;

    const sub = getAllSubtreeBubbles(bubble);
    const subSet = new Set(sub);
    canvas.bubbles.forEach(b => {
        if (!subSet.has(b)) b.el.classList.add("blur-out");
        else if (b !== bubble) b.el.classList.add("selection-target");
    });
    playAnimation(selectionOverlay, "animate__fadeInDown");
}

function endLineSelectionMode() {
    isLineSelectionMode = false;
    lineSelectionStartBubble = null;
    selectionOverlay.style.display = "none";
    canvas.bubbles.forEach(b => {
        b.el.classList.remove("blur-out");
        b.el.classList.remove("selection-target");
    });
}

function handleBubbleClickInSelectionMode(targetBubble) {
    const sub = getAllSubtreeBubbles(lineSelectionStartBubble);
    if (!sub.includes(targetBubble) || targetBubble === lineSelectionStartBubble) {
        alert("⚠️ 시작점의 하위 가지 버블만 선택할 수 있습니다.");
        return;
    }
    const path = [];
    let curr = targetBubble;
    while (curr && curr !== lineSelectionStartBubble) {
        path.push(curr);
        curr = curr.parent;
    }
    currentSelectedPath = path;
    endLineSelectionMode();
    openLineStyleModal(path);
}

function getAllSubtreeBubbles(bubble) {
    const list = [bubble];
    const queue = [bubble];
    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.children) {
            curr.children.forEach(c => {
                list.push(c);
                queue.push(c);
            });
        }
    }
    return list;
}

function openContentModal(isViewMode = false) {
    if (!targetBubbleForMenu) return;
    editingBubble = targetBubbleForMenu;
    if (!editingBubble.content) editingBubble.content = { title: "", body: "" };

    modalTitle.value = editingBubble.content.title;
    modalBody.value = editingBubble.content.body;

    if (editingBubble.type === "root") {
        contentModalHeader.textContent = "📝 프로젝트 개요 작성";
        modalTitle.placeholder = "프로젝트의 핵심 주제를 입력하세요";
        modalBody.placeholder = "프로젝트에 대한 전체적인 설명을 마크다운으로 작성해 보세요.";
        modalBody.style.height = "120px";
    } else {
        contentModalHeader.textContent = "📄 세부 내용 편집";
        modalTitle.placeholder = "소주제의 제목을 입력하세요";
        modalBody.placeholder = "상세 내용을 마크다운으로 자유롭게 기록하세요.";
        modalBody.style.height = "300px";
    }

    if (isViewMode && editingBubble.content.body) showViewMode();
    else showEditMode();

    contentModal.classList.add("show");
    hideContextMenu();
}

function showViewMode() {
    const c = editingBubble.content;
    viewTitle.textContent = c.title || (editingBubble.type === 'root' ? '프로젝트 개요' : '내용');
    viewBody.innerHTML = marked.parse(c.body || '');
    viewArea.style.display = "block";
    editArea.style.display = "none";
    toggleEditBtn.style.display = "block";
    saveContentBtn.style.display = "none";
}

function showEditMode() {
    viewArea.style.display = "none";
    editArea.style.display = "block";
    toggleEditBtn.style.display = "none";
    saveContentBtn.style.display = "block";
}

function closeContentModal() {
    contentModal.classList.remove("show");
    editingBubble = null;
}

function openPropertyModal(bubble) {
    editingBubble = bubble;
    sizeRange.value = Math.round(bubble.radius);
    sizeValue.textContent = Math.round(bubble.radius);
    const opts = colorPalette.querySelectorAll(".color-opt");
    opts.forEach(opt => opt.classList.toggle("selected", opt.dataset.color === bubble.color));
    hexInput.value = (bubble.color !== 'default' && bubble.color.startsWith('#')) ? bubble.color : '';
    propertyModal.classList.add("show");
}

function openLineStyleModal(path) {
    if (path.length > 0) {
        tempLineOptions = { ...path[0].lineOptions };
        lineWidthRange.value = tempLineOptions.width;
        lineWidthValue.textContent = tempLineOptions.width;
        lineStyleModal.querySelectorAll(".style-btn").forEach(b => b.classList.toggle("selected", b.dataset.style === tempLineOptions.style));
        lineColorPalette.querySelectorAll(".color-opt").forEach(o => o.classList.toggle("selected", o.dataset.color === tempLineOptions.color));
        lineHexInput.value = tempLineOptions.color;
    }
    lineStyleModal.classList.add("show");
}

function showContextMenu(x, y, bubble) {
    targetBubbleForMenu = bubble;
    const header = contextMenu.querySelector(".menu-header");
    const hasContent = !!bubble.content;

    if (bubble.type === "root") {
        header.textContent = `📍 메인버블 설정`;
        menuPropertyGroup.style.display = "block";
        menuSortGroup.style.display = "block";
        menuShareGroup.style.display = "block";
        addContentBtn.textContent = "개요 작성";
        viewContentBtn.textContent = "개요 보기";
        deleteContentBtn.textContent = "개요 삭제";
    } else {
        header.textContent = `🌿 가지버블 관리`;
        menuPropertyGroup.style.display = "none";
        menuSortGroup.style.display = "none";
        menuShareGroup.style.display = "none";
        addContentBtn.textContent = "내용 추가하기";
        viewContentBtn.textContent = "내용 보기";
        deleteContentBtn.textContent = "내용 삭제";
    }

    if (hasContent) {
        addContentBtn.style.display = "none";
        viewContentBtn.style.display = "block";
        deleteContentBtn.style.display = "block";
    } else {
        addContentBtn.style.display = "block";
        viewContentBtn.style.display = "none";
        deleteContentBtn.style.display = "none";
    }

    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.classList.add("show");
    playAnimation(contextMenu, "animate__fadeIn");
}

function hideContextMenu() {
    contextMenu.classList.remove("show");
    targetBubbleForMenu = null;
}

async function generateShareCode(root) {
    const list = [];
    const queue = [root];
    const visited = new Set();
    while (queue.length > 0) {
        const curr = queue.shift();
        if (visited.has(curr.id)) continue;
        visited.add(curr.id);
        list.push({
            i: curr.id, t: curr.text, type: curr.type, c: curr.content,
            x: Math.round(curr.x), y: Math.round(curr.y),
            p: curr.parent ? curr.parent.id : null,
            col: curr.color, r: curr.radius, l: curr.lineOptions
        });
        if (curr.children) queue.push(...curr.children);
    }
    return await compressString(JSON.stringify(list));
}

async function importBubblesByCode(code) {
    try {
        const data = await decompressToJSON(code);
        if (!data) return false;
        const bubbleMap = new Map();
        const now = Date.now();
        const idMap = new Map();
        data.forEach((item, index) => {
            const newId = now + index * 10;
            idMap.set(item.i, newId);
            const b = new Bubble({
                id: newId, text: item.t, type: item.type, content: item.c,
                x: item.x + 50, y: item.y + 50, color: item.col || 'default',
                userRadius: item.r || null, onUpdate: saveState,
                onDblClick: (e) => showContextMenu(e.clientX, e.clientY, b),
                onDragStart: () => pushUndoState(),
                canvas: canvas
            });
            if (item.l) b.lineOptions = item.l;
            canvas.addBubble(b);
            bindBubbleEvents(b);
            bubbleMap.set(newId, b);
        });
        data.forEach(item => {
            if (item.p !== undefined && item.p !== null && idMap.has(item.p)) {
                const parent = bubbleMap.get(idMap.get(item.p));
                const child = bubbleMap.get(idMap.get(item.i));
                if (parent && child) { child.parent = parent; canvas.connect(parent, child); }
            }
        });
        return true;
    } catch (e) { console.error("Import failed", e); return false; }
}

function bindBubbleEvents(bubble) {
    bubble.el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isLineSelectionMode) handleBubbleClickInSelectionMode(bubble);
        else selectBubble(bubble);
    });
}

function createRootBubble(text) {
    pushUndoState();
    const x = 100 + Math.random() * (window.innerWidth - 200);
    const y = 100 + Math.random() * (window.innerHeight - 200);
    const b = new Bubble({
        id: Date.now(), text, type: "root", x, y,
        onUpdate: saveState,
        onDblClick: (e) => showContextMenu(e.clientX, e.clientY, b),
        onDragStart: () => pushUndoState(),
        canvas: canvas
    });
    canvas.addBubble(b);
    bindBubbleEvents(b);
    selectBubble(b);
    saveState();
}

function createBranchBubble(parent, text) {
    const limit = parent.type === "root" ? 10 : 5;
    if (parent.children.length >= limit) {
        playAnimation(chatContainer, "animate__headShake");
        alert(`가지는 최대 ${limit}개까지만 가능합니다.`);
        return;
    }
    pushUndoState();
    const b = new Bubble({
        id: Date.now(), text, type: "branch", parent,
        x: parent.x + 100, y: parent.y + 100,
        onUpdate: saveState,
        onDblClick: (e) => showContextMenu(e.clientX, e.clientY, b),
        onDragStart: () => pushUndoState(),
        canvas: canvas
    });
    canvas.addBubble(b);
    canvas.connect(parent, b);
    bindBubbleEvents(b);
    selectBubble(b);
    saveState();
}

function initAppFromData(data) {
    if (!data || data.length === 0) return;
    const bubbleMap = new Map();
    data.forEach(item => {
        const b = new Bubble({
            id: item.id, text: item.text, type: item.type, content: item.content,
            x: item.x, y: item.y, color: item.color || 'default',
            userRadius: item.radius || null, onUpdate: saveState,
            onDblClick: (e) => showContextMenu(e.clientX, e.clientY, b),
            onDragStart: () => pushUndoState(),
            canvas: canvas
        });
        canvas.addBubble(b);
        if (item.lineOptions) b.lineOptions = item.lineOptions;
        bindBubbleEvents(b);
        bubbleMap.set(item.id, b);
    });
    data.forEach(item => {
        if (item.parentId) {
            const p = bubbleMap.get(item.parentId);
            const c = bubbleMap.get(item.id);
            if (p && c) { c.parent = p; canvas.connect(p, c); }
        }
    });
}

createBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) { playAnimation(chatContainer, "animate__headShake"); input.focus(); return; }
    if (!activeBubble) createRootBubble(text);
    else createBranchBubble(activeBubble, text);
    input.value = ""; input.focus();
});
input.addEventListener("keydown", (e) => { if (e.key === "Enter") createBtn.click(); });
input.addEventListener("click", (e) => e.stopPropagation());

window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
});

themeBtn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) { document.documentElement.removeAttribute("data-theme"); localStorage.removeItem("bubble_theme"); }
    else { document.documentElement.setAttribute("data-theme", "dark"); localStorage.setItem("bubble_theme", "dark"); }
});

clearBtn.addEventListener("click", () => {
    if (canvas.bubbles.length > 0 && confirm("모든 버블을 삭제하시겠습니까?")) {
        pushUndoState();
        [...canvas.bubbles].forEach(b => canvas.removeBubble(b));
        saveState();
        selectBubble(null);
    }
});

searchBtn.addEventListener("click", () => isSearchMode ? exitSearchMode() : performSearch());
searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") performSearch(); });
btnPrev.addEventListener("click", () => { if (searchMatches.length) { searchIndex = (searchIndex - 1 + searchMatches.length) % searchMatches.length; focusBubble(searchMatches[searchIndex]); } });
btnNext.addEventListener("click", () => { if (searchMatches.length) { searchIndex = (searchIndex + 1) % searchMatches.length; focusBubble(searchMatches[searchIndex]); } });
selectSelected.addEventListener("click", (e) => { e.stopPropagation(); selectItems.classList.toggle("select-hide"); });
searchOptions.forEach(opt => opt.addEventListener("click", (e) => {
    e.stopPropagation();
    selectSelected.textContent = opt.textContent;
    searchType.value = opt.dataset.value;
    searchOptions.forEach(o => o.classList.remove("same-as-selected"));
    opt.classList.add("same-as-selected");
    selectItems.classList.add("select-hide");
}));

canvasContainer.addEventListener("click", () => {
    if (isLineSelectionMode) return;
    selectBubble(null);
    if (isSearchMode) exitSearchMode();
});
window.addEventListener("click", (e) => {
    if (!customSelect.contains(e.target)) selectItems.classList.add("select-hide");
    if (contextMenu.classList.contains("show") && !contextMenu.contains(e.target)) hideContextMenu();
});

deleteBtn.addEventListener("click", () => { if (targetBubbleForMenu) { pushUndoState(); deleteCascade(targetBubbleForMenu); hideContextMenu(); selectBubble(null); } });
sortCircularBtn.addEventListener("click", () => { if (targetBubbleForMenu) { sortBubblesMindMap(targetBubbleForMenu, saveState); hideContextMenu(); } });
sortTreeBtn.addEventListener("click", () => { if (targetBubbleForMenu) { sortBubblesTree(targetBubbleForMenu, saveState); hideContextMenu(); } });
shareBubbleBtn.addEventListener("click", async () => { if (targetBubbleForMenu) { shareCodeOutput.value = await generateShareCode(targetBubbleForMenu); shareModal.classList.add("show"); hideContextMenu(); } });
copyShareBtn.addEventListener("click", () => { shareCodeOutput.select(); document.execCommand("copy"); alert("복사되었습니다!"); });
closeShareModalBtn.addEventListener("click", () => shareModal.classList.remove("show"));

propertyBtn.addEventListener("click", () => { if (targetBubbleForMenu) { openPropertyModal(targetBubbleForMenu); hideContextMenu(); } });
closePropertyModalBtn.addEventListener("click", () => { propertyModal.classList.remove("show"); editingBubble = null; });
sizeRange.addEventListener("input", (e) => { if (editingBubble) { const v = parseInt(e.target.value); sizeValue.textContent = v; editingBubble.updateRadius(v); saveState(); } });
colorPalette.addEventListener("click", (e) => {
    const opt = e.target.closest(".color-opt");
    if (opt && editingBubble) {
        editingBubble.color = opt.dataset.color;
        colorPalette.querySelectorAll(".color-opt").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        if (editingBubble.color !== 'default') hexInput.value = editingBubble.color;
        saveState();
    }
});
hexInput.addEventListener("input", (e) => {
    if (editingBubble) {
        let v = e.target.value.trim();
        if (!v.startsWith('#')) v = '#' + v;
        if (/^#[0-9A-F]{6}$/i.test(v)) { editingBubble.color = v; colorPalette.querySelectorAll(".color-opt").forEach(o => o.classList.remove("selected")); saveState(); }
    }
});

changeLineBtn.addEventListener("click", () => {
    if (targetBubbleForMenu) { startLineSelectionMode(targetBubbleForMenu); hideContextMenu(); }
});
cancelSelectionBtn.addEventListener("click", (e) => { e.stopPropagation(); endLineSelectionMode(); });
closeLineModalBtn.addEventListener("click", () => lineStyleModal.classList.remove("show"));
saveLineStyleBtn.addEventListener("click", () => {
    if (currentSelectedPath.length > 0) {
        pushUndoState();
        currentSelectedPath.forEach(b => b.lineOptions = { ...tempLineOptions });
        saveState();
    }
    lineStyleModal.classList.remove("show");
});
lineWidthRange.addEventListener("input", (e) => {
    tempLineOptions.width = parseInt(e.target.value);
    lineWidthValue.textContent = tempLineOptions.width;
});
lineColorPalette.addEventListener("click", (e) => {
    const opt = e.target.closest(".color-opt");
    if (opt) {
        tempLineOptions.color = opt.dataset.color;
        lineColorPalette.querySelectorAll(".color-opt").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        lineHexInput.value = tempLineOptions.color;
    }
});
lineHexInput.addEventListener("input", (e) => {
    let v = e.target.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9A-F]{6}$/i.test(v)) {
        tempLineOptions.color = v;
        lineColorPalette.querySelectorAll(".color-opt").forEach(o => o.classList.remove("selected"));
    }
});
lineStyleModal.querySelectorAll(".style-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        tempLineOptions.style = btn.dataset.style;
        lineStyleModal.querySelectorAll(".style-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
    });
});

importBtn.addEventListener("click", () => {
    importCodeInput.value = "";
    importModal.classList.add("show");
});
cancelImportBtn.addEventListener("click", () => importModal.classList.remove("show"));
doImportBtn.addEventListener("click", async () => {
    const code = importCodeInput.value.trim();
    if (!code) return;
    const result = await importBubblesByCode(code);
    if (result) {
        importModal.classList.remove("show");
        saveState();
    } else {
        alert("잘못된 코드이거나 가져오기에 실패했습니다.");
    }
});

addContentBtn.addEventListener("click", () => openContentModal(false));
viewContentBtn.addEventListener("click", () => openContentModal(true));
saveContentBtn.addEventListener("click", () => {
    if (editingBubble && editingBubble.content) {
        editingBubble.content.title = modalTitle.value;
        editingBubble.content.body = modalBody.value;
        saveState();
        closeContentModal();
    }
});
toggleEditBtn.addEventListener("click", () => showEditMode());
closeModalBtn.addEventListener("click", closeContentModal);
modalTitle.addEventListener("input", (e) => { if (editingBubble && editingBubble.content) { editingBubble.content.title = e.target.value; saveState(); } });
modalBody.addEventListener("input", (e) => { if (editingBubble && editingBubble.content) { editingBubble.content.body = e.target.value; saveState(); } });
deleteContentBtn.addEventListener("click", () => {
    if (targetBubbleForMenu && confirm("개요를 삭제하시겠습니까?")) {
        pushUndoState();
        targetBubbleForMenu.content = null;
        saveState();
        hideContextMenu();
    }
});

exportAllBtn.addEventListener("click", async () => {
    if (canvas.bubbles.length === 0) {
        alert("내보낼 데이터가 없습니다.");
        return;
    }
    const bubblesData = canvas.bubbles.map(b => ({
        i: b.id, t: b.text, type: b.type, c: b.content,
        x: Math.round(b.x), y: Math.round(b.y),
        p: b.parent ? b.parent.id : null,
        col: b.color, r: b.radius, l: b.lineOptions
    }));
    exportAllCodeOutput.value = await compressString(JSON.stringify(bubblesData));
    exportAllModal.classList.add("show");
});

closeExportAllModalBtn.addEventListener("click", () => exportAllModal.classList.remove("show"));
copyExportAllBtn.addEventListener("click", () => {
    exportAllCodeOutput.select();
    document.execCommand("copy");
    alert("전체 데이터 코드가 복사되었습니다!");
});

(function init() {
    const theme = localStorage.getItem("bubble_theme");
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    initAppFromData(loadBubbles());
})();