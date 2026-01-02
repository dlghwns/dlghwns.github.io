import { Bubble } from "./bubble.js";
import { Canvas } from "./canvas.js";
import { saveBubbles, loadBubbles } from "./storage.js";

/* =========================
   DOM 요소
========================= */
const chatContainer = document.querySelector(".chat-container");
const input = document.getElementById("chatInput");
const createBtn = document.getElementById("createBtn");
const canvasContainer = document.getElementById("canvas");

// Context Menu (속성창)
const contextMenu = document.getElementById("contextMenu");
const deleteBtn = document.getElementById("deleteBtn");

// Theme Button
const themeBtn = document.getElementById("themeBtn");

// Context Menu Buttons
const addContentBtn = document.getElementById("addContentBtn");
const viewContentBtn = document.getElementById("viewContentBtn");
const deleteContentBtn = document.getElementById("deleteContentBtn");

// Modal Elements
const contentModal = document.getElementById("contentModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const closeModalBtn = document.getElementById("closeModalBtn");

/* =========================
   Theme Logic
========================= */
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

/* =========================
   전체 삭제 로직
========================= */
function playAnimation(element, animationName) {
    element.classList.remove("animate__animated", "animate__headShake", "animate__pulse");
    void element.offsetWidth; // reflow
    element.classList.add("animate__animated", animationName);

    element.addEventListener(
        "animationend",
        () => {
            element.classList.remove("animate__animated", animationName);
        },
        { once: true }
    );
}

/* =========================
   Canvas 초기화
========================= */
const canvas = new Canvas(canvasContainer);

/* =========================
   전체 삭제 로직
========================= */
clearBtn.addEventListener("click", () => {
    if (canvas.bubbles.length === 0) return;

    if (confirm("모든 버블을 삭제하시겠습니까?")) {
        // 배열 복사 후 순회 삭제 (removeBubble이 배열을 수정하므로)
        const allBubbles = [...canvas.bubbles];
        allBubbles.forEach(b => canvas.removeBubble(b));

        saveState(); // 빈 상태 저장
        selectBubble(null);
    }
});
// ... remainder of file ...


/* =========================
   Canvas 초기화
========================= */


/* =========================
   상태 관리
========================= */
let activeBubble = null; // 현재 선택된 버블
let targetBubbleForMenu = null; // Context Menu 대상
let editingBubble = null; // Modal 편집 대상

/* =========================
   속성창(Context Menu) 로직
========================= */
function showContextMenu(x, y, bubble) {
    targetBubbleForMenu = bubble; // 타겟 설정

    // 헤더 및 버튼 상태 업데이트
    const header = contextMenu.querySelector(".menu-header");
    const hasContent = !!bubble.content;

    // 1. 헤더 설정
    if (hasContent && bubble.content.title) {
        // 제목이 있으면 제목 표시
        header.textContent = bubble.content.title.length > 10
            ? bubble.content.title.slice(0, 10) + "..."
            : bubble.content.title;
    } else {
        // 기본 헤더
        if (bubble.type === "root") {
            const safeText = bubble.text.length > 10 ? bubble.text.slice(0, 10) + "..." : bubble.text;
            header.textContent = `메인버블 ${safeText}`;
        } else {
            header.textContent = "가지버블";
        }
    }

    // 2. 버튼 표시 여부
    if (hasContent) {
        addContentBtn.style.display = "none";
        viewContentBtn.style.display = "block";
        deleteContentBtn.style.display = "block";
    } else {
        addContentBtn.style.display = "block";
        viewContentBtn.style.display = "none";
        deleteContentBtn.style.display = "none";
    }

    // 메뉴 위치 설정
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.classList.add("show");

    // 애니메이션
    playAnimation(contextMenu, "animate__fadeIn");
}

function hideContextMenu() {
    contextMenu.classList.remove("show");
    targetBubbleForMenu = null;
}

// 삭제 버튼 클릭
deleteBtn.addEventListener("click", () => {
    if (targetBubbleForMenu) {
        deleteCascade(targetBubbleForMenu);
        hideContextMenu();
        selectBubble(null);
    }
});

// 외부 클릭 시 닫기
window.addEventListener("click", (e) => {
    // context menu 내부 클릭이 아니면 닫기
    if (contextMenu.classList.contains("show") && !contextMenu.contains(e.target)) {
        hideContextMenu();
    }
    // 모달 외부 클릭 시 닫기 (제거됨 - 닫기 버튼으로만 닫힘)
    /* if (e.target === contentModal) {
        closeContentModal();
    } */
});

/* =========================
   내용(Content) 관리 로직
========================= */
function openContentModal() {
    if (!targetBubbleForMenu) return;

    // 편집 대상 저장 (메뉴가 닫혀도 유지)
    editingBubble = targetBubbleForMenu;

    // 초기값 세팅 (없으면 생성)
    if (!editingBubble.content) {
        editingBubble.content = { title: "", body: "" };
    }

    // UI 업데이트
    const content = editingBubble.content;
    modalTitle.value = content.title;
    modalBody.value = content.body;

    // 모달 표시
    contentModal.classList.add("show");

    // 메뉴 닫기
    hideContextMenu();
}

function closeContentModal() {
    contentModal.classList.remove("show");
    editingBubble = null; // 리셋
    selectBubble(null);
}

// 버튼 핸들러
addContentBtn.addEventListener("click", () => {
    if (targetBubbleForMenu) {
        // Create initial obj ensures openContentModal sees it
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

// 실시간 저장 (editingBubble 사용)
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


/* =========================
   연쇄 삭제 로직
========================= */
async function deleteCascade(startBubble) {
    // 레이어 단위로 삭제 진행 (BFS와 유사)
    let currentLayer = [startBubble];

    while (currentLayer.length > 0) {
        const nextLayer = [];

        // 1. 현재 레이어 버블들 삭제
        for (const bubble of currentLayer) {
            // 다음 레이어(자식) 수집
            // 주의: 이미 removed 될 수 있으므로, children 참조만 복사
            if (bubble.children && bubble.children.length > 0) {
                nextLayer.push(...bubble.children);
            }

            // Canvas 및 데이터에서 제거
            canvas.removeBubble(bubble);
        }

        // 저장 (삭제 상태 반영)
        saveState();

        // 2. 딜레이 (0.2초)
        if (nextLayer.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 80));
        }

        // 3. 다음 레이어로 이동
        currentLayer = nextLayer;
    }
}

/* =========================
   저장/불러오기 헬퍼
========================= */
function saveState() {
    saveBubbles(canvas.bubbles);
}

function initApp() {
    const data = loadBubbles();
    if (data.length === 0) return;

    // 1. 버블 객체 먼저 생성 (부모 연결 없이)
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

    // 2. 부모-자식 연결 복원
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

    console.log(`Loaded ${data.length} bubbles.`);
}

/* =========================
   메서드: 버블 선택
========================= */
function selectBubble(bubble) {
    // 1. Reset all highlights
    canvas.bubbles.forEach(b => {
        if (b.setActive) b.setActive(false);
        if (b.setHighlighted) b.setHighlighted(false);
    });

    // Reset lines
    canvas.lines.forEach(({ line }) => {
        line.setAttribute("stroke", "#9ca3af");
        line.setAttribute("stroke-width", "2");
    });

    activeBubble = bubble;

    if (bubble) {
        // Set Active Level (Blue)
        bubble.setActive(true);

        // 2. Cascade Highlight (Light Blue)
        const queue = [...bubble.children];
        const highlightedSet = new Set(queue); // For quick lookup if needed

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

        // 3. Highlight Lines
        // If a line connects to a highlighted bubble, it should be highlighted.
        // (Since it's a tree down from the active bubble)
        canvas.lines.forEach(({ line, parent, child }) => {
            if (child.isHighlighted) {
                line.setAttribute("stroke", "rgba(96, 165, 250, 0.8)"); // Blue-400
                line.setAttribute("stroke-width", "3");
            }
        });
    }
}

/* =========================
   메서드: 위치 생성 알고리즘
========================= */
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

/* =========================
   이벤트: 생성 버튼 클릭
========================= */
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

/* =========================
   로직: 버블 생성
========================= */
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

    saveState(); // 저장
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

    saveState(); // 저장
}

/* =========================
   로직: 버블 공통 이벤트
========================= */
function bindBubbleEvents(bubble) {
    bubble.el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectBubble(bubble);
    });
}

/* =========================
   이벤트: 입력창 및 컨테이너
========================= */
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
    // 버블은 stopPropagation()이 걸려있으므로, 
    // 여기에 도달하는 클릭은 모두 빈 공간(배경) 클릭입니다.
    selectBubble(null);
});

/* =========================
   앱 초기화 실행
========================= */
initApp();
