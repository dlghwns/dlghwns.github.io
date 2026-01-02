export class Bubble {
  constructor({ id, text, type, content = null, x, y, parent = null, onUpdate, onDblClick }) {
    this.id = id;
    this.text = text;
    this.type = type; // root | branch
    this.content = content; // { title, body }
    this.parent = parent;
    this.children = [];
    this.onUpdate = onUpdate;
    this.onDblClick = onDblClick;

    this.radius = this.calcRadius();

    // 물리 시뮬레이션을 위한 속성
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.targetX = x;
    this.targetY = y;
    this.isDragging = false;

    // 렌더링을 위한 랜덤 시드 (모든 버블이 똑같이 움직이지 않도록)
    this.noiseSeed = Math.random() * 1000;

    // 외곽선 변형 바이어스 (마우스/팬 이동 방향)
    this.biasX = 0;
    this.biasY = 0;

    // Highlight state (descendants)
    this.isHighlighted = false;

    this.el = this.createElement();
    this.updateStyle();
    this.initDrag();
    this.initEvents();
  }

  calcRadius() {
    const min = 30;
    const max = 80;
    return Math.min(max, Math.max(min, min + this.text.length * 6));
  }

  createElement() {
    const el = document.createElement("div");
    el.className = `bubble ${this.type}`;

    // Canvas 생성 (비눗방울 그리기용)
    const canvas = document.createElement("canvas");
    this.ctx = canvas.getContext("2d");

    // 고해상도 처리를 위해 dpr 적용
    const dpr = window.devicePixelRatio || 1;
    const size = this.radius * 2;
    // 여유 공간을 둬서 찌그러질 때 잘리지 않게 함 (1.5배)
    const padding = 30; // 변형이 커질 수 있으므로 여유 공간 확대
    const canvasSize = (size + padding * 2);

    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    canvas.style.position = "absolute";
    // 캔버스를 중앙에 배치
    canvas.style.left = `-${padding}px`;
    canvas.style.top = `-${padding}px`;
    canvas.style.zIndex = "0";

    this.ctx.scale(dpr, dpr);
    this.canvas = canvas;
    el.appendChild(canvas);

    // 텍스트 (Canvas 위에 표시)
    const span = document.createElement("span");
    span.textContent = this.text;
    span.style.position = "relative";
    span.style.zIndex = "1";
    span.style.pointerEvents = "none"; // 클릭은 부모 div가 받음
    el.appendChild(span);

    // div 크기는 물리적 충돌 영역 기준 (원형)
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;

    return el;
  }

  // 물리 및 렌더링 업데이트 (Canvas loop에서 호출)
  tick(interaction) {
    // 1. Physics (Spring)
    if (this.isDragging) {
      const k = 0.15;
      const damp = 0.8;

      const ax = (this.targetX - this.x) * k;
      const ay = (this.targetY - this.y) * k;

      this.vx += ax;
      this.vy += ay;
      this.vx *= damp;
      this.vy *= damp;

      this.x += this.vx;
      this.y += this.vy;
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
      this.x += this.vx;
      this.y += this.vy;

      if (Math.abs(this.vx) < 0.01) this.vx = 0;
      if (Math.abs(this.vy) < 0.01) this.vy = 0;
    }

    // 2. Interaction Deformation (Bias)
    // 부드러운 변형을 위해 계수를 크게 낮춤 (쫀득거림 방지)
    let targetBiasX = 0;
    let targetBiasY = 0;

    if (interaction) {
      // (A) Canvas Pan Influence
      // Pan 속도. 계수를 높여서 확실히 쏠리도록 함
      if (interaction.pan) {
        targetBiasX += interaction.pan.vx * 0.6;
        targetBiasY += interaction.pan.vy * 0.6;
      }

      // (B) Mouse Influence
      if (interaction.mouse) {
        const mx = interaction.mouse.x;
        const my = interaction.mouse.y;
        const dist = Math.hypot(mx - this.x, my - this.y);
        const threshold = this.radius + 120;

        if (dist < threshold) {
          // 거리에 따른 가중치 (멀어지면 급격히 약해지도록 제곱)
          const relativeDist = dist / threshold;
          const factor = Math.pow(1 - relativeDist, 2);

          // 마우스 속도 기반 변형. 계수를 대폭 상향
          targetBiasX += interaction.mouse.vx * factor * 0.8;
          targetBiasY += interaction.mouse.vy * factor * 0.8;
        }
      }

      // 최대 변형 제한을 늘려서 더 많이 휘어지게 함
      const maxDeformation = 40;
      const biasMag = Math.hypot(targetBiasX, targetBiasY);
      if (biasMag > maxDeformation) {
        const scale = maxDeformation / biasMag;
        targetBiasX *= scale;
        targetBiasY *= scale;
      }
    }

    // Lerp for smooth transition (Elastic effect)
    // 0.8은 너무 뻣뻣하므로, 반응성은 좋되 탄성이 느껴지는 0.12 정도로 조정
    this.biasX += (targetBiasX - this.biasX) * 0.12;
    this.biasY += (targetBiasY - this.biasY) * 0.12;


    this.updateStyle();
    this.draw();
  }

  draw() {
    if (!this.ctx) return;

    const time = Date.now() / 1000;
    const r = this.radius;
    // 캔버스 중심 좌표 (padding 고려) - createElement에서 padding=30으로 줌
    const cx = r + 30;
    const cy = r + 30;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 버블 외곽선 그리기 (노이즈 + 바이어스 적용)
    this.ctx.beginPath();

    const segments = 60;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;

      // 1. 기본 노이즈 (울렁임)
      const noise =
        Math.sin(theta * 3 + time * 2 + this.noiseSeed) * 2 +
        Math.sin(theta * 5 - time * 1.5 + this.noiseSeed) * 1.5 +
        Math.sin(theta * 2 + time * 3) * 1;

      const breathing = Math.sin(time + this.noiseSeed) * 2;

      // 2. 방향성 바이어스 (Directional Bias)
      // 현재 버텍스의 방향 벡터 (cos, sin)
      const dirX = Math.cos(theta);
      const dirY = Math.sin(theta);

      // 내적(Dot Product)을 통해 바이어스 방향과 버텍스 방향의 일치도 계산
      // 일치하면 양수(=돌출), 반대면 음수(=함몰) -> 찌그러짐 효과
      const biasStrength = (dirX * this.biasX) + (dirY * this.biasY);

      // 최종 반지름
      const currentR = r + noise + breathing + biasStrength;

      const x = cx + dirX * currentR;
      const y = cy + dirY * currentR;

      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();

    // 그라데이션 및 스타일링
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    // Background Radial Gradient
    const gradient = this.ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);

    if (this.type === 'root') {
      if (isDark) {
        gradient.addColorStop(0, "rgba(56, 189, 248, 0.5)");
        gradient.addColorStop(1, "rgba(56, 189, 248, 0.1)");
      } else {
        gradient.addColorStop(0, "rgba(224, 242, 254, 0.6)");
        gradient.addColorStop(0.5, "rgba(224, 242, 254, 0.2)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
      }
    } else {
      if (isDark) {
        // Dark Mode: 조금 더 투명하고 은은한 흰색/푸른빛
        gradient.addColorStop(0.1, "rgba(255, 255, 255, 0.15)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.02)");
      } else {
        gradient.addColorStop(0.1, "rgba(255, 255, 255, 0.4)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.1)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.05)");
      }
    }

    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Border & Active Glow
    if (this.isActive) {
      if (isDark) {
        // Dark Mode Active: Neon Cyan/Sky
        this.ctx.strokeStyle = "rgba(103, 232, 249, 1)"; // Cyan-300
        this.ctx.shadowColor = "rgba(103, 232, 249, 0.6)";
      } else {
        // Light Mode Active: Blue
        this.ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
        this.ctx.shadowColor = "rgba(59, 130, 246, 0.5)";
      }
      this.ctx.lineWidth = 3;
      this.ctx.shadowBlur = 10;

    } else if (this.isHighlighted) {
      if (isDark) {
        // Dark Mode Highlight: Soft Teal/Emerald
        this.ctx.strokeStyle = "rgba(52, 211, 153, 1)"; // Emerald-400
        this.ctx.shadowColor = "rgba(52, 211, 153, 0.5)";
      } else {
        // Light Mode Highlight: Blue-400
        this.ctx.strokeStyle = "rgba(96, 165, 250, 1)";
        this.ctx.shadowColor = "rgba(96, 165, 250, 0.6)";
      }
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowBlur = 12;

    } else {
      // Normal Border
      if (isDark) {
        // Dark Mode: 밝은 회색 (배경이 어두우므로)
        this.ctx.strokeStyle = "rgba(209, 213, 219, 0.5)";
      } else {
        // Light Mode: 진한 회색 (배경이 밝으므로)
        this.ctx.strokeStyle = "rgba(60, 60, 60, 0.4)";
      }
      this.ctx.lineWidth = 1.5;
      this.ctx.shadowBlur = 0;
    }
    this.ctx.stroke();

    // Reset shadow
    this.ctx.shadowBlur = 0;

    // Highlight (광택)
    this.ctx.beginPath();
    const highlightR = r * 0.7;
    const hx = cx - r * 0.3;
    const hy = cy - r * 0.3;

    this.ctx.ellipse(hx, hy, r * 0.2, r * 0.1, -Math.PI / 4, 0, Math.PI * 2);
    const hGrad = this.ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.2);

    // 광택도 다크모드에선 좀 덜 쨍하게
    if (isDark) {
      hGrad.addColorStop(0, "rgba(255, 255, 255, 0.5)");
      hGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    } else {
      hGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      hGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    }

    this.ctx.fillStyle = hGrad;
    this.ctx.fill();
  }

  updateStyle() {
    this.el.style.left = `${this.x - this.radius}px`;
    this.el.style.top = `${this.y - this.radius}px`;

    // Active 상태 처리 (테두리 등) -> Canvas에서 그려야 완벽하지만 
    // 일단 CSS active 클래스가 border를 주면 안되므로 (모양이 다르니)
    // Active 표시는 text color나 단순 glow로 대체하는 게 자연스러움.
    // 기존 CSS의 .active가 box-shadow를 썼는데, div는 원형이고 canvas는 쭈글이라
    // div에 box-shadow를 주면 쭈글한 모양과 안 맞음.
    // 여기서는 일단 무시하거나, draw()에서 active 상태를 체크해야 함.
    if (this.el.classList.contains("active")) {
      // draw() 내에서 처리하기 위해 flag 저장하거나 직접 확인
      this.isActive = true;
    } else {
      this.isActive = false;
    }
  }

  setActive(on) {
    this.el.classList.toggle("active", on);
    this.isActive = on; // draw Loop에서 사용 가능
  }

  setHighlighted(on) {
    this.isHighlighted = on;
  }

  initEvents() {
    this.el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      if (this.onDblClick) this.onDblClick(e);
    });

    this.el.addEventListener("click", () => {
      // 클릭 애니메이션 로직... canvas로 하려면 복잡하니
      // 간단히 scale 효과만 유지 (CSS transition transform)
      this.el.style.transform = "scale(0.95)";
      setTimeout(() => this.el.style.transform = "scale(1)", 100);
    });
  }

  initDrag() {
    let ox, oy;

    // Spawn animation handled by CSS transform currently on div, usually fine.
    this.el.classList.add("spawn");

    this.el.addEventListener("mousedown", e => {
      this.isDragging = true;
      this.el.classList.add("dragging");
      ox = e.clientX - this.x;
      oy = e.clientY - this.y;
      this.targetX = this.x;
      this.targetY = this.y;
      e.stopPropagation();
    });

    window.addEventListener("mousemove", e => {
      if (!this.isDragging) return;
      this.targetX = e.clientX - ox;
      this.targetY = e.clientY - oy;
      if (this.onUpdate) this.onUpdate();
    });

    window.addEventListener("mouseup", () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.el.classList.remove("dragging");
        if (this.onUpdate) this.onUpdate();
      }
    });
  }
}
