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
const clearBtn = document.getElementById("clearBtn");
const sortCircularBtn = document.getElementById("sortCircularBtn");
const sortTreeBtn = document.getElementById("sortTreeBtn");

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
            header.textContent = "가지버블";
        }
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

    if (bubble.type === "root" && bubble.children && bubble.children.length > 0) {
        sortCircularBtn.style.display = "block";
        sortTreeBtn.style.display = "block";
        if (contextMenu.querySelector(".menu-divider")) {
            contextMenu.querySelector(".menu-divider").style.display = "block";
        }
    } else {
        sortCircularBtn.style.display = "none";
        sortTreeBtn.style.display = "none";
        if (contextMenu.querySelector(".menu-divider")) {
            contextMenu.querySelector(".menu-divider").style.display = "none";
        }
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
        deleteCascade(targetBubbleForMenu);
        hideContextMenu();
        selectBubble(null);
    }
});

sortCircularBtn.addEventListener("click", () => {
    if (targetBubbleForMenu) {
        sortBubblesCircular(targetBubbleForMenu);
        hideContextMenu();
    }
});

sortTreeBtn.addEventListener("click", () => {
    if (targetBubbleForMenu) {
        sortBubblesTree(targetBubbleForMenu);
        hideContextMenu();
    }
});

function sortBubblesCircular(root) {
    const arrangeLayer = (parent, startAngle, endAngle, depth) => {
        const children = parent.children;
        if (!children || children.length === 0) return;

        const radius = depth * 180;
        const angleStep = (endAngle - startAngle) / children.length;

        children.forEach((child, i) => {
            const angle = startAngle + angleStep * (i + 0.5);
            child.targetX = root.x + Math.cos(angle) * radius;
            child.targetY = root.y + Math.sin(angle) * radius;

            arrangeLayer(child, angle - angleStep / 2, angle + angleStep / 2, depth + 1);
        });
    };

    arrangeLayer(root, 0, Math.PI * 2, 1);
    saveState();
}

function sortBubblesTree(root) {
    const spacingX = 140;
    const spacingY = 160;

    const getSubtreeWidth = (node) => {
        if (!node.children || node.children.length === 0) return spacingX;
        let total = 0;
        node.children.forEach(child => {
            total += getSubtreeWidth(child);
        });
        return total;
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
    saveBubbles(canvas.bubbles);
}

function initApp() {
    const data = loadBubbles();
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
            onUpdate: saveState,
            onDblClick: (e) => showContextMenu(e.clientX, e.clientY, bubble)
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
    const pos = getRootPosition();

    const bubble = new Bubble({
        id: Date.now(),
        text,
        type: "root",
        x: pos.x,
        y: pos.y,
        onUpdate: saveState,
        onDblClick: (e) => showContextMenu(e.clientX, e.clientY, bubble)
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

    const pos = getBranchPosition(parent);

    const child = new Bubble({
        id: Date.now(),
        text,
        type: "branch",
        x: pos.x,
        y: pos.y,
        parent: parent,
        onUpdate: saveState,
        onDblClick: (e) => showContextMenu(e.clientX, e.clientY, child)
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