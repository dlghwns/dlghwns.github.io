export class Bubble {
  constructor({ id, text, type, content = null, x, y, parent = null, onUpdate, onDblClick, onDragStart, onDragEnd }) {
    this.id = id;
    this.text = text;
    this.type = type;
    this.content = content;
    this.parent = parent;
    this.children = [];
    this.onUpdate = onUpdate;
    this.onDblClick = onDblClick;
    this.onDragStart = onDragStart;
    this.onDragEnd = onDragEnd;

    this.radius = this.calcRadius();

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.targetX = x;
    this.targetY = y;
    this.isDragging = false;

    this.noiseSeed = Math.random() * 1000;

    this.biasX = 0;
    this.biasY = 0;

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

    const canvas = document.createElement("canvas");
    this.ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const size = this.radius * 2;
    const padding = 30;
    const canvasSize = (size + padding * 2);

    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    canvas.style.position = "absolute";
    canvas.style.left = `-${padding}px`;
    canvas.style.top = `-${padding}px`;
    canvas.style.zIndex = "0";

    this.ctx.scale(dpr, dpr);
    this.canvas = canvas;
    el.appendChild(canvas);

    const span = document.createElement("span");
    span.textContent = this.text;
    span.style.position = "relative";
    span.style.zIndex = "1";
    span.style.pointerEvents = "none";
    el.appendChild(span);

    el.style.width = `${size}px`;
    el.style.height = `${size}px`;

    return el;
  }

  tick(interaction) {
    const k = 0.15;
    const damp = 0.8;

    if (this.isDragging) {
      const ax = (this.targetX - this.x) * k;
      const ay = (this.targetY - this.y) * k;

      this.vx += ax;
      this.vy += ay;
      this.vx *= damp;
      this.vy *= damp;
    } else {
      const ax = (this.targetX - this.x) * 0.08;
      const ay = (this.targetY - this.y) * 0.08;

      this.vx += ax;
      this.vy += ay;
      this.vx *= 0.8;
      this.vy *= 0.8;

      if (Math.abs(this.vx) < 0.01 && Math.abs(this.targetX - this.x) < 0.5) {
        this.vx = 0;
        this.x = this.targetX;
      }
      if (Math.abs(this.vy) < 0.01 && Math.abs(this.targetY - this.y) < 0.5) {
        this.vy = 0;
        this.y = this.targetY;
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    let targetBiasX = 0;
    let targetBiasY = 0;

    if (interaction) {
      if (interaction.pan) {
        targetBiasX += interaction.pan.vx * 0.6;
        targetBiasY += interaction.pan.vy * 0.6;
      }

      if (interaction.mouse) {
        const mx = interaction.mouse.x;
        const my = interaction.mouse.y;
        const dist = Math.hypot(mx - this.x, my - this.y);
        const threshold = this.radius + 120;

        if (dist < threshold) {
          const relativeDist = dist / threshold;
          const factor = Math.pow(1 - relativeDist, 2);

          targetBiasX += interaction.mouse.vx * factor * 0.8;
          targetBiasY += interaction.mouse.vy * factor * 0.8;
        }
      }

      const maxDeformation = 40;
      const biasMag = Math.hypot(targetBiasX, targetBiasY);
      if (biasMag > maxDeformation) {
        const scale = maxDeformation / biasMag;
        targetBiasX *= scale;
        targetBiasY *= scale;
      }
    }

    this.biasX += (targetBiasX - this.biasX) * 0.12;
    this.biasY += (targetBiasY - this.biasY) * 0.12;

    this.updateStyle();
    this.draw();
  }

  draw() {
    if (!this.ctx) return;

    const time = Date.now() / 1000;
    const r = this.radius;
    const cx = r + 30;
    const cy = r + 30;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.beginPath();

    const segments = 60;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const noise =
        Math.sin(theta * 3 + time * 2 + this.noiseSeed) * 2 +
        Math.sin(theta * 5 - time * 1.5 + this.noiseSeed) * 1.5 +
        Math.sin(theta * 2 + time * 3) * 1;

      const breathing = Math.sin(time + this.noiseSeed) * 2;
      const dirX = Math.cos(theta);
      const dirY = Math.sin(theta);
      const biasStrength = (dirX * this.biasX) + (dirY * this.biasY);
      const currentR = r + noise + breathing + biasStrength;

      const x = cx + dirX * currentR;
      const y = cy + dirY * currentR;

      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
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

    if (this.isActive) {
      if (isDark) {
        this.ctx.strokeStyle = "rgba(103, 232, 249, 1)";
        this.ctx.shadowColor = "rgba(103, 232, 249, 0.6)";
      } else {
        this.ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
        this.ctx.shadowColor = "rgba(59, 130, 246, 0.5)";
      }
      this.ctx.lineWidth = 3;
      this.ctx.shadowBlur = 10;
    } else if (this.isHighlighted) {
      this.ctx.strokeStyle = "rgba(52, 211, 153, 0.7)";
      this.ctx.shadowColor = "rgba(52, 211, 153, 0.3)";
      this.ctx.lineWidth = 2.2;
      this.ctx.shadowBlur = 8;
    } else {
      if (isDark) {
        this.ctx.strokeStyle = "rgba(209, 213, 219, 0.5)";
      } else {
        this.ctx.strokeStyle = "rgba(60, 60, 60, 0.4)";
      }
      this.ctx.lineWidth = 1.5;
      this.ctx.shadowBlur = 0;
    }
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.beginPath();
    const hx = cx - r * 0.3;
    const hy = cy - r * 0.3;
    this.ctx.ellipse(hx, hy, r * 0.2, r * 0.1, -Math.PI / 4, 0, Math.PI * 2);
    const hGrad = this.ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.2);
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
    this.isActive = this.el.classList.contains("active");
  }

  setActive(on) {
    this.el.classList.toggle("active", on);
    this.isActive = on;
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
      this.el.style.transform = "scale(0.95)";
      setTimeout(() => this.el.style.transform = "scale(1)", 100);
    });
  }

  initDrag() {
    let ox, oy;
    let isMovingGroup = false;

    this.el.classList.add("spawn");

    this.el.addEventListener("mousedown", e => {
      this.isDragging = true;
      isMovingGroup = e.ctrlKey;
      this.el.classList.add("dragging");
      ox = e.clientX - this.x;
      oy = e.clientY - this.y;

      if (this.onDragStart) this.onDragStart();

      this.targetX = this.x;
      this.targetY = this.y;
      e.stopPropagation();
    });

    window.addEventListener("mousemove", e => {
      if (!this.isDragging) return;

      const newX = e.clientX - ox;
      const newY = e.clientY - oy;
      const dx = newX - this.x;
      const dy = newY - this.y;

      this.targetX = newX;
      this.targetY = newY;

      if (isMovingGroup) {
        const moveDescendants = (bubble) => {
          bubble.children.forEach(child => {
            child.x += dx;
            child.y += dy;
            child.targetX += dx;
            child.targetY += dy;
            moveDescendants(child);
          });
        };
        moveDescendants(this);
      }
      if (this.onUpdate) this.onUpdate();
    });

    window.addEventListener("mouseup", () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.el.classList.remove("dragging");
        if (this.onDragEnd) this.onDragEnd();
        if (this.onUpdate) this.onUpdate();
      }
    });
  }
}
