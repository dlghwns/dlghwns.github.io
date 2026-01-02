import { Bubble } from "./bubble.js";
import { Canvas } from "./canvas.js";
import { saveBubbles, loadBubbles } from "./storage.js";

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
const branchMenuDivider = document.getElementById("rootMenuDivider");
const hexInput = document.getElementById("hexInput");

const undoStack = [];

function pushUndoState() {
    const bubblesData = canvas.bubbles.map(b => ({
        id: b.id,
        text: b.text,
        type: b.type,
        content: b.content,
        x: Math.round(b.x),
        y: Math.round(b.y),
        parentId: b.parent ? b.parent.id : null
    }));
    undoStack.push(JSON.stringify(bubblesData));
    if (undoStack.length > 50) undoStack.shift(); // Limit stack size
}

function undo() {
    if (undoStack.length === 0) return;
    const lastState = undoStack.pop();
    const data = JSON.parse(lastState);

    // Clear current
    const allBubbles = [...canvas.bubbles];
    allBubbles.forEach(b => canvas.removeBubble(b));

    // Restore
    initAppFromData(data);
    saveState();
}

window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
    }
});

function initTheme() {
    const savedTheme = localStorage.getItem("bubble_theme");
    if (savedTheme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    }
}

initTheme();

themeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark") {
        document.documentElement.removeAttribute("data-theme");
        localStorage.removeItem("bubble_theme");
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("bubble_theme", "dark");
    }
});

function playAnimation(element, animationName) {
    element.classList.remove("animate__animated", "animate__headShake", "animate__pulse");
    void element.offsetWidth;
    element.classList.add("animate__animated", animationName);
    element.addEventListener("animationend", () => {
        element.classList.remove("animate__animated", animationName);
    }, { once: true });
}

const canvas = new Canvas(canvasContainer);

clearBtn.addEventListener("click", () => {
    if (canvas.bubbles.length === 0) return;
    if (confirm("모든 버블을 삭제하시겠습니까?")) {
        pushUndoState();
        const allBubbles = [...canvas.bubbles];
        allBubbles.forEach(b => canvas.removeBubble(b));
        saveState();
        selectBubble(null);
    }
});

let activeBubble = null;
let targetBubbleForMenu = null;
let editingBubble = null;

const customSelect = document.getElementById("customSelect");
const selectSelected = customSelect.querySelector(".select-selected");
const selectItems = customSelect.querySelector(".select-items");
const options = selectItems.querySelectorAll("div");

selectSelected.addEventListener("click", (e) => {
    e.stopPropagation();
    selectItems.classList.toggle("select-hide");
});

options.forEach(option => {
    option.addEventListener("click", (e) => {
        e.stopPropagation();
        selectSelected.textContent = option.textContent;
        const searchTypeEl = document.getElementById("searchType");
        searchTypeEl.value = option.getAttribute("data-value");
        options.forEach(o => o.classList.remove("same-as-selected"));
        option.classList.add("same-as-selected");
        selectItems.classList.add("select-hide");
    });
});

window.addEventListener("click", (e) => {
    if (!customSelect.contains(e.target)) {
        selectItems.classList.add("select-hide");
    }
});

const searchType = document.getElementById("searchType");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const iconSearch = searchBtn.querySelector(".icon-search");
const iconClose = searchBtn.querySelector(".icon-close");

let searchMatches = [];
let searchIndex = 0;
let isSearchMode = false;

function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    const type = searchType.value;

    if (!query) {
        exitSearchMode();
        return;
    }

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

    searchMatches.sort((a, b) => {
        const distA = Math.hypot(a.x, a.y);
        const distB = Math.hypot(b.x, b.y);
        return distA - distB;
    });

    isSearchMode = true;
    searchIndex = 0;
    updateSearchUI();
    focusBubble(searchMatches[0]);
}

function focusBubble(bubble) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    canvas.panX = centerX - bubble.x;
    canvas.panY = centerY - bubble.y;
    canvas.updateTransform();

    selectBubble(bubble);
}

function updateSearchUI() {
    if (isSearchMode && searchMatches.length > 0) {
        iconSearch.style.display = "none";
        iconClose.style.display = "block";

        if (searchMatches.length > 1) {
            btnPrev.style.display = "flex";
            btnNext.style.display = "flex";
        } else {
            btnPrev.style.display = "none";
            btnNext.style.display = "none";
        }
    } else {
        iconSearch.style.display = "block";
        iconClose.style.display = "none";
        btnPrev.style.display = "none";
        btnNext.style.display = "none";
    }
}

function exitSearchMode() {
    isSearchMode = false;
    searchMatches = [];
    searchInput.value = "";
    updateSearchUI();
}

searchBtn.addEventListener("click", () => {
    if (isSearchMode) {
        exitSearchMode();
    } else {
        performSearch();
    }
});

searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        performSearch();
    }
});

btnPrev.addEventListener("click", () => {
    if (searchMatches.length === 0) return;
    searchIndex = (searchIndex - 1 + searchMatches.length) % searchMatches.length;
    focusBubble(searchMatches[searchIndex]);
});

btnNext.addEventListener("click", () => {
    if (searchMatches.length === 0) return;
    searchIndex = (searchIndex + 1) % searchMatches.length;
    focusBubble(searchMatches[searchIndex]);
});

function showContextMenu(x, y, bubble) {
    targetBubbleForMenu = bubble;

    const header = contextMenu.querySelector(".menu-header");
    const hasContent = !!bubble.content;

    if (hasContent && bubble.content.title) {
        header.textContent = bubble.content.title.length > 10
            ? bubble.content.title.slice(0, 10) + "..."
            : bubble.content.title;
    } else {
        if (bubble.type === "root") {
            const safeText = bubble.text.length > 10 ? bubble.text.slice(0, 10) + "..." : bubble.text;
            header.textContent = `메인버블 ${safeText}`;
        } else {
            // Find root parent to show its name
            let root = bubble;
            while (root.parent) {
                root = root.parent;
            }
            const rootName = root.text.length > 8 ? root.text.slice(0, 8) + "..." : root.text;
            header.textContent = `가지버블 - ${rootName}`;
        }
    }

    if (bubble.type === "root") {
        addContentBtn.textContent = "개요 작성";
        viewContentBtn.textContent = "개요 보기";
        deleteContentBtn.textContent = "개요 삭제";

        if (hasContent) {
            addContentBtn.style.display = "none";
            viewContentBtn.style.display = "block";
            deleteContentBtn.style.display = "block";
        } else {
            addContentBtn.style.display = "block";
            viewContentBtn.style.display = "none";
            deleteContentBtn.style.display = "none";
        }
    } else {
        addContentBtn.textContent = "내용 추가하기";
        viewContentBtn.textContent = "내용 보기";
        deleteContentBtn.textContent = "내용 삭제";

        if (hasContent) {
            addContentBtn.style.display = "none";
            viewContentBtn.style.display = "block";
            deleteContentBtn.style.display = "block";
        } else {
            addContentBtn.style.display = "block";
            viewContentBtn.style.display = "none";
            deleteContentBtn.style.display = "none";
        }
    }

    if (bubble.type === "root") {
        propertyBtn.style.display = "block";
        shareBubbleBtn.style.display = "block";
        sortCircularBtn.style.display = "block";
        sortTreeBtn.style.display = "block";
        branchMenuDivider.style.display = "block";
    } else {
        propertyBtn.style.display = "none";
        shareBubbleBtn.style.display = "none";
        sortCircularBtn.style.display = "none";
        sortTreeBtn.style.display = "none";
        branchMenuDivider.style.display = "none";
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

deleteBtn.addEventListener("click", () => {
    if (targetBubbleForMenu) {
        pushUndoState();
        deleteCascade(targetBubbleForMenu);
        hideContextMenu();
        selectBubble(null);
    }
});

sortCircularBtn.addEventListener("click", () => {
    if (targetBubbleForMenu) {
        sortBubblesMindMap(targetBubbleForMenu);
        hideContextMenu();
    }
});

sortTreeBtn.addEventListener("click", () => {
    if (targetBubbleForMenu) {
        sortBubblesTree(targetBubbleForMenu);
        hideContextMenu();
    }
});

shareBubbleBtn.addEventListener("click", async () => {
    if (targetBubbleForMenu) {
        const code = await generateShareCode(targetBubbleForMenu);
        shareCodeOutput.value = code;
        shareModal.classList.add("show");
        hideContextMenu();
    }
});

copyShareBtn.addEventListener("click", () => {
    shareCodeOutput.select();
    document.execCommand("copy");
    alert("코드가 클립보드에 복사되었습니다!");
});

closeShareModalBtn.addEventListener("click", () => {
    shareModal.classList.remove("show");
});

propertyBtn.addEventListener("click", () => {
    if (targetBubbleForMenu) {
        openPropertyModal(targetBubbleForMenu);
        hideContextMenu();
    }
});

function openPropertyModal(bubble) {
    editingBubble = bubble;
    sizeRange.value = Math.round(bubble.radius);
    sizeValue.textContent = Math.round(bubble.radius);

    // Select current color
    const options = colorPalette.querySelectorAll(".color-opt");
    let matched = false;
    options.forEach(opt => {
        const isMatch = opt.getAttribute("data-color") === bubble.color;
        opt.classList.toggle("selected", isMatch);
        if (isMatch) matched = true;
    });

    if (bubble.color !== 'default') {
        hexInput.value = bubble.color.startsWith('#') ? bubble.color : '';
    } else {
        hexInput.value = '';
    }

    propertyModal.classList.add("show");
}

closePropertyModalBtn.addEventListener("click", () => {
    propertyModal.classList.remove("show");
    editingBubble = null;
});

sizeRange.addEventListener("input", (e) => {
    if (editingBubble) {
        const val = parseInt(e.target.value);
        sizeValue.textContent = val;
        editingBubble.updateRadius(val);
        saveState();
    }
});

colorPalette.addEventListener("click", (e) => {
    const opt = e.target.closest(".color-opt");
    if (opt && editingBubble) {
        const color = opt.getAttribute("data-color");
        editingBubble.color = color;

        // Update UI
        colorPalette.querySelectorAll(".color-opt").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");

        if (color !== 'default' && color.startsWith('#')) {
            hexInput.value = color;
        }

        saveState();
    }
});

hexInput.addEventListener("input", (e) => {
    if (editingBubble) {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;

        if (/^#[0-9A-F]{6}$/i.test(val)) {
            editingBubble.color = val;
            colorPalette.querySelectorAll(".color-opt").forEach(o => o.classList.remove("selected"));
            saveState();
        }
    }
});

importBtn.addEventListener("click", () => {
    importCodeInput.value = "";
    importModal.classList.add("show");
});

cancelImportBtn.addEventListener("click", () => {
    importModal.classList.remove("show");
});

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

async function compressString(str) {
    const stream = new Blob([str]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const chunks = [];
    const reader = compressedStream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const blob = new Blob(chunks);
    const arrayBuffer = await blob.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
}

async function decompressToJSON(base64) {
    try {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const stream = new Blob([bytes]).stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(decompressedStream).text();
        return JSON.parse(text);
    } catch (e) {
        console.error("Decompression failed", e);
        return null;
    }
}

async function generateShareCode(root) {
    const allRelatedBubbles = [];
    const queue = [root];
    const visited = new Set();

    while (queue.length > 0) {
        const curr = queue.shift();
        if (visited.has(curr.id)) continue;
        visited.add(curr.id);

        allRelatedBubbles.push({
            i: curr.id,
            t: curr.text,
            type: curr.type,
            c: curr.content,
            x: Math.round(curr.x),
            y: Math.round(curr.y),
            p: curr.parent ? curr.parent.id : null,
            col: curr.color,
            r: curr.radius
        });

        if (curr.children) {
            queue.push(...curr.children);
        }
    }

    const payload = JSON.stringify(allRelatedBubbles);
    return await compressString(payload);
}

async function importBubblesByCode(code) {
    try {
        const data = await decompressToJSON(code);
        if (!data || !Array.isArray(data)) return false;

        const bubbleMap = new Map();
        const now = Date.now();
        const idMap = new Map(); // New IDs to avoid conflicts

        // First pass: Create bubbles
        data.forEach((item, index) => {
            const newId = now + index;
            idMap.set(item.i, newId);

            const bubble = new Bubble({
                id: newId,
                text: item.t,
                type: item.type,
                content: item.c,
                x: item.x + 50, // Slight offset to distinguish
                y: item.y + 50,
                color: item.col || 'default',
                userRadius: item.r || null,
                onUpdate: saveState,
                onDblClick: (e) => showContextMenu(e.clientX, e.clientY, bubble),
                onDragStart: () => pushUndoState()
            });

            canvas.addBubble(bubble);
            bindBubbleEvents(bubble);
            bubbleMap.set(newId, bubble);
        });

        // Second pass: Connect
        data.forEach(item => {
            if (item.p && idMap.has(item.p)) {
                const parent = bubbleMap.get(idMap.get(item.p));
                const child = bubbleMap.get(idMap.get(item.i));
                if (parent && child) {
                    child.parent = parent;
                    canvas.connect(parent, child);
                }
            }
        });

        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

function sortBubblesMindMap(root) {
    const children = root.children;
    if (!children || children.length === 0) return;

    const spacingX = 160;
    const spacingY = 100;

    const getSubtreeHeight = (node) => {
        if (!node.children || node.children.length === 0) return 80;
        let total = 0;
        node.children.forEach(child => {
            total += getSubtreeHeight(child);
        });
        return Math.max(total, 80);
    };

    const arrangeSide = (node, x, startY, direction) => {
        const children = node.children;
        if (!children || children.length === 0) return;

        let currentY = startY;
        children.forEach(child => {
            const h = getSubtreeHeight(child);
            child.targetX = x + spacingX * direction;
            child.targetY = currentY + h / 2;
            arrangeSide(child, child.targetX, currentY, direction);
            currentY += h;
        });
    };

    const half = Math.ceil(children.length / 2);
    const rightChildren = children.slice(0, half);
    const leftChildren = children.slice(half);

    // Right Side
    let rightTotalH = rightChildren.reduce((sum, c) => sum + getSubtreeHeight(c), 0);
    let currentYRight = root.y - rightTotalH / 2;
    rightChildren.forEach(child => {
        const h = getSubtreeHeight(child);
        child.targetX = root.x + spacingX;
        child.targetY = currentYRight + h / 2;
        arrangeSide(child, child.targetX, currentYRight, 1);
        currentYRight += h;
    });

    // Left Side
    let leftTotalH = leftChildren.reduce((sum, c) => sum + getSubtreeHeight(c), 0);
    let currentYLeft = root.y - leftTotalH / 2;
    leftChildren.forEach(child => {
        const h = getSubtreeHeight(child);
        child.targetX = root.x - spacingX;
        child.targetY = currentYLeft + h / 2;
        arrangeSide(child, child.targetX, currentYLeft, -1);
        currentYLeft += h;
    });

    saveState();
}

function sortBubblesTree(root) {
    const spacingX = 100; // More compact
    const spacingY = 140;

    const getSubtreeWidth = (node) => {
        if (!node.children || node.children.length === 0) return 80; // Compact width
        let total = 0;
        node.children.forEach(child => {
            total += getSubtreeWidth(child);
        });
        return Math.max(total, 80);
    };

    const arrange = (node, startX, y) => {
        const children = node.children;
        if (!children || children.length === 0) return;

        let currentX = startX;
        children.forEach(child => {
            const w = getSubtreeWidth(child);
            child.targetX = currentX + w / 2;
            child.targetY = y + spacingY;
            arrange(child, currentX, y + spacingY);
            currentX += w;
        });
    };

    const rootWidth = getSubtreeWidth(root);
    arrange(root, root.x - rootWidth / 2, root.y);
    saveState();
}

window.addEventListener("click", (e) => {
    if (contextMenu.classList.contains("show") && !contextMenu.contains(e.target)) {
        hideContextMenu();
    }
});

function openContentModal() {
    if (!targetBubbleForMenu) return;

    editingBubble = targetBubbleForMenu;

    if (!editingBubble.content) {
        editingBubble.content = { title: "", body: "" };
    }

    const content = editingBubble.content;
    modalTitle.value = content.title;
    modalBody.value = content.body;

    if (editingBubble.type === "root") {
        contentModalHeader.textContent = "프로젝트 설정";
        modalTitle.placeholder = "프로젝트 주제를 입력하세요";
        modalBody.placeholder = "설명을 입력하세요";
        modalBody.style.height = "120px";
    } else {
        contentModalHeader.textContent = "내용 편집";
        modalTitle.placeholder = "제목을 입력하세요";
        modalBody.placeholder = "내용을 입력하세요";
        modalBody.style.height = "300px";
    }

    contentModal.classList.add("show");

    hideContextMenu();
}

function closeContentModal() {
    contentModal.classList.remove("show");
    editingBubble = null;
    selectBubble(null);
}

addContentBtn.addEventListener("click", () => {
    if (targetBubbleForMenu) {
        targetBubbleForMenu.content = { title: "", body: "" };
        saveState();
        openContentModal();
    }
});

viewContentBtn.addEventListener("click", () => {
    openContentModal();
});

deleteContentBtn.addEventListener("click", () => {
    if (targetBubbleForMenu && confirm("내용을 삭제하시겠습니까?")) {
        targetBubbleForMenu.content = null;
        saveState();
        hideContextMenu();
    }
});

closeModalBtn.addEventListener("click", closeContentModal);

modalTitle.addEventListener("input", (e) => {
    if (editingBubble && editingBubble.content) {
        editingBubble.content.title = e.target.value;
        saveState();
    }
});

modalBody.addEventListener("input", (e) => {
    if (editingBubble && editingBubble.content) {
        editingBubble.content.body = e.target.value;
        saveState();
    }
});

async function deleteCascade(startBubble) {
    let currentLayer = [startBubble];

    while (currentLayer.length > 0) {
        const nextLayer = [];

        for (const bubble of currentLayer) {
            if (bubble.children && bubble.children.length > 0) {
                nextLayer.push(...bubble.children);
            }

            canvas.removeBubble(bubble);
        }

        saveState();

        if (nextLayer.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 80));
        }

        currentLayer = nextLayer;
    }
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
        radius: b.radius
    }));
    saveBubbles(bubblesData);
}

function initApp() {
    const data = loadBubbles();
    initAppFromData(data);
}

function initAppFromData(data) {
    if (data.length === 0) return;

    const bubbleMap = new Map();

    data.forEach(item => {
        const bubble = new Bubble({
            id: item.id,
            text: item.text,
            type: item.type,
            content: item.content,
            x: item.x,
            y: item.y,
            color: item.color || 'default',
            userRadius: item.radius || null,
            onUpdate: saveState,
            onDblClick: (e) => showContextMenu(e.clientX, e.clientY, bubble),
            onDragStart: () => pushUndoState()
        });

        canvas.addBubble(bubble);
        bindBubbleEvents(bubble);
        bubbleMap.set(item.id, bubble);
    });

    data.forEach(item => {
        if (item.parentId) {
            const parent = bubbleMap.get(item.parentId);
            const child = bubbleMap.get(item.id);
            if (parent && child) {
                child.parent = parent;
                canvas.connect(parent, child);
            }
        }
    });
}

function selectBubble(bubble) {
    canvas.bubbles.forEach(b => {
        if (b.setActive) b.setActive(false);
        if (b.setHighlighted) b.setHighlighted(false);
    });

    canvas.lines.forEach(({ line }) => {
        line.setAttribute("stroke", "#9ca3af");
        line.setAttribute("stroke-width", "2");
    });

    activeBubble = bubble;

    if (bubble) {
        bubble.setActive(true);

        const queue = [...bubble.children];
        const highlightedSet = new Set(queue);

        while (queue.length > 0) {
            const curr = queue.shift();
            curr.setHighlighted(true);

            if (curr.children && curr.children.length > 0) {
                curr.children.forEach(c => {
                    queue.push(c);
                    highlightedSet.add(c);
                });
            }
        }

        canvas.lines.forEach(({ line, parent, child }) => {
            if (child.isHighlighted) {
                line.setAttribute("stroke", "rgba(96, 165, 250, 0.8)");
                line.setAttribute("stroke-width", "3");
            }
        });
    }
}

function getRootPosition() {
    if (canvas.bubbles.length === 0) {
        return {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
    }
    const padding = 100;
    const x = padding + Math.random() * (window.innerWidth - padding * 2);
    const y = padding + Math.random() * (window.innerHeight - padding * 2);
    return { x, y };
}

function getBranchPosition(parent) {
    const MAX_TRY = 50;
    const minDist = 100;
    const maxDist = 200;

    for (let i = 0; i < MAX_TRY; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minDist + Math.random() * (maxDist - minDist);

        const x = parent.x + Math.cos(angle) * distance;
        const y = parent.y + Math.sin(angle) * distance;

        if (
            x < 50 || x > window.innerWidth - 50 ||
            y < 50 || y > window.innerHeight - 50
        ) {
            continue;
        }

        const overlap = canvas.bubbles.some(b => {
            const d = Math.hypot(b.x - x, b.y - y);
            return d < (b.radius + 50 + 20);
        });

        if (!overlap) {
            return { x, y };
        }
    }
    return { x: parent.x + 50, y: parent.y + 50 };
}

createBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const text = input.value.trim();

    if (!text) {
        playAnimation(chatContainer, "animate__headShake");
        input.focus();
        return;
    }

    if (!activeBubble) {
        createRootBubble(text);
    } else {
        createBranchBubble(activeBubble, text);
    }

    input.value = "";
    input.focus();
});

function createRootBubble(text) {
    pushUndoState();
    const pos = getRootPosition();

    const bubble = new Bubble({
        id: Date.now(),
        text,
        type: "root",
        x: pos.x,
        y: pos.y,
        onUpdate: saveState,
        onDblClick: (e) => showContextMenu(e.clientX, e.clientY, bubble),
        onDragStart: () => pushUndoState()
    });

    canvas.addBubble(bubble);
    bindBubbleEvents(bubble);
    selectBubble(bubble);

    saveState();
}

function createBranchBubble(parent, text) {
    const limit = (parent.type === "root") ? 10 : 5;

    if (parent.children.length >= limit) {
        playAnimation(chatContainer, "animate__headShake");
        alert(`이 버블에는 더 이상 가지를 만들 수 없습니다.\n(${parent.type === 'root' ? '메인' : '가지'} 버블 최대: ${limit}개)`);
        return;
    }

    pushUndoState();
    const pos = getBranchPosition(parent);

    const child = new Bubble({
        id: Date.now(),
        text,
        type: "branch",
        x: pos.x,
        y: pos.y,
        parent: parent,
        onUpdate: saveState,
        onDblClick: (e) => showContextMenu(e.clientX, e.clientY, child),
        onDragStart: () => pushUndoState()
    });

    canvas.addBubble(child);
    canvas.connect(parent, child);
    bindBubbleEvents(child);
    selectBubble(child);

    saveState();
}

function bindBubbleEvents(bubble) {
    bubble.el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectBubble(bubble);
    });
}

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        createBtn.click();
    }
});

input.addEventListener("click", (e) => {
    e.stopPropagation();
});

chatContainer.addEventListener("click", () => {
    playAnimation(chatContainer, "animate__pulse");
});

canvasContainer.addEventListener("click", (e) => {
    selectBubble(null);
    if (typeof isSearchMode !== 'undefined' && isSearchMode) {
        exitSearchMode();
    }
});

initApp();