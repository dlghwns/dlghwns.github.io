export class Bubble {
  constructor({ id, text, type, content = null, x, y, parent = null, onUpdate, onContextMenu, onDragStart, onDragEnd, color = 'default', userRadius = null, canvas = null }) {
    this.id = id;
    this.text = text;
    this.type = type;
    this.content = content;
    this.parent = parent;
    this.children = [];
    this.onUpdate = onUpdate;
    this.onContextMenu = onContextMenu;
    this.onDragStart = onDragStart;
    this.onDragEnd = onDragEnd;
    this.color = color;
    this.userRadius = userRadius;
    this.mainCanvas = canvas; // Reference to the main Canvas controller

    this.lineOptions = {
      color: '#9ca3af',
      width: 2,
      style: 'solid'
    };
    this.hyperlink = {
      type: 'none', // 'none', 'url', 'bubble'
      target: ''
    };
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
    if (this.type === 'textbox') return 50; // Textbox uses width/height instead of radius
    if (this.userRadius) return this.userRadius;
    const min = 30;
    const max = 80;
    return Math.min(max, Math.max(min, min + (this.text || "").length * 6));
  }

  updateRadius(r) {
    this.userRadius = r;
    this.radius = r;
    const size = this.radius * 2;
    this.el.style.width = `${size}px`;
    this.el.style.height = `${size}px`;
    if (this.type === 'textbox' && this.textarea) {
      this.textarea.style.fontSize = `${r * 0.4}px`;
    }
    if (this.type !== 'textbox') {
      const dpr = window.devicePixelRatio || 1;
      const padding = 30;
      const canvasSize = (size + padding * 2);
      this.canvas.width = canvasSize * dpr;
      this.canvas.height = canvasSize * dpr;
      this.canvas.style.width = `${canvasSize}px`;
      this.canvas.style.height = `${canvasSize}px`;
      this.canvas.style.left = `-${padding}px`;
      this.canvas.style.top = `-${padding}px`;
      this.ctx.scale(dpr, dpr);
    }
    this.updateStyle();
  }

  createElement() {
    const el = document.createElement("div");
    el.className = `bubble ${this.type}`;

    if (this.type === 'textbox') {
      const textarea = document.createElement("textarea");
      this.textarea = textarea;
      textarea.value = this.text || "";
      textarea.placeholder = "내용을 입력하세요...";
      textarea.style.fontSize = `${(this.userRadius || 75) * 0.4}px`;
      textarea.style.color = (this.color && this.color !== 'default') ? this.color : 'inherit';
      textarea.addEventListener("input", (e) => {
        this.text = e.target.value;
        if (this.onUpdate) this.onUpdate();
      });
      el.appendChild(textarea);

      const handle = document.createElement("div");
      handle.className = "resize-handle";
      el.appendChild(handle);
      this.initResize(handle);

      const size = this.userRadius ? this.userRadius * 2 : 150;
      el.style.width = `${size}px`;
      el.style.height = `${size / 2}px`;

    } else {
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
    }
    return el;
  }

  updateText(text) {
    this.text = text;
    if (this.type === 'textbox') {
      if (this.textarea) this.textarea.value = text;
    } else {
      const span = this.el.querySelector("span");
      if (span) span.textContent = text;
      // Re-calculate radius if needed (optional, but let's keep it simple for now)
      // this.updateRadius(this.calcRadius()); 
    }
  }

  initResize(handle) {
    let startX, startY, startW, startH;
    const onMouseMove = (e) => {
      const scale = (this.mainCanvas && this.mainCanvas.scale) || 1;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      this.el.style.width = `${startW + dx}px`;
      this.el.style.height = `${startH + dy}px`;
      this.userRadius = (startW + dx) / 2; // Roughly use width for "radius" logic
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (this.onUpdate) this.onUpdate();
    };
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      startW = parseInt(document.defaultView.getComputedStyle(this.el).width, 10);
      startH = parseInt(document.defaultView.getComputedStyle(this.el).height, 10);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
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
    if (this.type === 'textbox') {
      this.updateStyle();
      return;
    }
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
    let bubbleColor = this.color;
    if (bubbleColor === 'default') {
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
    } else {
      gradient.addColorStop(0, `${bubbleColor}88`);
      gradient.addColorStop(1, `${bubbleColor}22`);
    }
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    if (this.isActive) {
      if (isDark) {
        this.ctx.strokeStyle = "rgba(165, 243, 252, 1)";
        this.ctx.shadowColor = "rgba(103, 232, 249, 0.8)";
      } else {
        this.ctx.strokeStyle = "rgba(37, 99, 235, 1)";
        this.ctx.shadowColor = "rgba(37, 99, 235, 0.8)";
      }
      this.ctx.lineWidth = 4.5;
      this.ctx.shadowBlur = 18;
    } else if (this.isHighlighted) {
      this.ctx.strokeStyle = "rgba(52, 211, 153, 0.7)";
      this.ctx.shadowColor = "rgba(52, 211, 153, 0.3)";
      this.ctx.lineWidth = 2.2;
      this.ctx.shadowBlur = 8;
    } else {
      if (isDark) this.ctx.strokeStyle = "rgba(209, 213, 219, 0.5)";
      else this.ctx.strokeStyle = "rgba(60, 60, 60, 0.4)";
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
    const w = parseInt(this.el.style.width) || (this.radius * 2);
    const h = parseInt(this.el.style.height) || (this.radius * 2);
    this.el.style.left = `${this.x - w / 2}px`;
    this.el.style.top = `${this.y - h / 2}px`;
    if (this.type === 'textbox' && this.textarea) {
      this.textarea.style.color = (this.color && this.color !== 'default') ? this.color : 'inherit';
    }
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
    this.el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onContextMenu) this.onContextMenu(e);
    });
    this.el.addEventListener("click", (e) => {
      if (this.type === 'hyper' && this.hyperlink.type !== 'none') {
        // Hyperlink logic is handled in app.js via click event on el
      }
      this.el.style.transform = "scale(0.95)";
      setTimeout(() => this.el.style.transform = "scale(1)", 100);
    });
  }

  initDrag() {
    let ox, oy;
    let isMovingGroup = false;
    let isRightDragging = false;
    this.el.classList.add("spawn");
    this.el.addEventListener("contextmenu", e => e.preventDefault());
    this.el.addEventListener("mousedown", e => {
      this.isDragging = true;
      isMovingGroup = e.ctrlKey;
      isRightDragging = (e.button === 2);
      this.el.classList.add("dragging");

      ox = e.clientX;
      oy = e.clientY;
      this.startX = this.x;
      this.startY = this.y;

      if (this.onDragStart) this.onDragStart();
      this.targetX = this.x;
      this.targetY = this.y;
      e.stopPropagation();
    });
    window.addEventListener("mousemove", e => {
      if (!this.isDragging) return;

      const scale = (this.mainCanvas && this.mainCanvas.scale) || 1;
      let dx = (e.clientX - ox) / scale;
      let dy = (e.clientY - oy) / scale;

      let newX = this.startX + dx;
      let newY = this.startY + dy;

      if (isRightDragging && this.parent) {
        const pdx = newX - this.parent.x;
        const pdy = newY - this.parent.y;
        const dist = Math.hypot(pdx, pdy);
        let angle = Math.atan2(pdy, pdx);
        const angleDeg = (angle * 180) / Math.PI;
        const snapGrid = 15;
        const snappedDeg = Math.round(angleDeg / snapGrid) * snapGrid;
        if (Math.abs(angleDeg - snappedDeg) < 6) {
          const snappedRad = (snappedDeg * Math.PI) / 180;
          newX = this.parent.x + Math.cos(snappedRad) * dist;
          newY = this.parent.y + Math.sin(snappedRad) * dist;
        }
      }
      const dtx = newX - this.targetX;
      const dty = newY - this.targetY;
      this.targetX = newX;
      this.targetY = newY;
      if (isMovingGroup) {
        const moveDescendants = (node, dx, dy) => {
          node.children.forEach(child => {
            child.targetX += dx;
            child.targetY += dy;
            child.x += dx;
            child.y += dy;
            moveDescendants(child, dx, dy);
          });
        };
        moveDescendants(this, dtx, dty);
      }
      if (this.onUpdate) this.onUpdate();
    });
    window.addEventListener("mouseup", () => {
      if (this.isDragging) {
        this.isDragging = false;
        isRightDragging = false;
        this.el.classList.remove("dragging");
        if (this.onDragEnd) this.onDragEnd();
        if (this.onUpdate) this.onUpdate();
      }
    });
  }
}
