export class Canvas {
  constructor(el) {
    this.el = el;
    this.bubbles = [];
    this.lines = [];
    this.panX = 0;
    this.panY = 0;
    this.prevPanX = 0;
    this.prevPanY = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.scale = 1;
    this.minScale = 0.2;
    this.maxScale = 3.0;

    this.contentArea = document.createElement("div");
    this.contentArea.style.position = "absolute";
    this.contentArea.style.width = "100%";
    this.contentArea.style.height = "100%";
    this.contentArea.style.top = "0";
    this.contentArea.style.left = "0";
    this.contentArea.style.transformOrigin = "0 0";
    this.el.appendChild(this.contentArea);

    this.svg = this.createSVG();
    this.contentArea.appendChild(this.svg);

    this.initGrab();
    this.initZoom();
    this.onRenderCallbacks = [];
    this.loop();
  }

  onRender(callback) {
    this.onRenderCallbacks.push(callback);
  }

  createSVG() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";
    svg.style.zIndex = "5";
    return svg;
  }

  addBubble(b) {
    this.bubbles.push(b);
    this.contentArea.appendChild(b.el);
  }

  connect(parent, child) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("stroke", "#9ca3af");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    this.svg.appendChild(line);
    parent.children.push(child);
    this.lines.push({ line, parent, child });
  }

  updateLines() {
    this.lines.forEach(({ line, parent, child }) => {
      line.setAttribute("x1", parent.x);
      line.setAttribute("y1", parent.y);
      line.setAttribute("x2", child.x);
      line.setAttribute("y2", child.y);
      const opts = child.lineOptions || { color: '#9ca3af', width: 2, style: 'solid' };
      if (child.isHighlighted) {
        line.setAttribute("stroke", "rgba(96, 165, 250, 0.8)");
        line.setAttribute("stroke-width", Math.max(3, opts.width + 1));
      } else {
        line.setAttribute("stroke", opts.color);
        line.setAttribute("stroke-width", opts.width);
      }
      if (opts.style === 'dashed') {
        line.setAttribute("stroke-dasharray", "8, 6");
      } else if (opts.style === 'dotted') {
        line.setAttribute("stroke-dasharray", "2, 4");
      } else {
        line.removeAttribute("stroke-dasharray");
      }
    });
  }

  initGrab() {
    let dragging = false, ox, oy;
    this.el.addEventListener("mousedown", e => {
      if (e.target !== this.el && e.target !== this.contentArea) return;
      dragging = true;
      ox = e.clientX;
      oy = e.clientY;
      this.el.style.cursor = "grabbing";
    });
    window.addEventListener("mousemove", e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (!dragging) return;
      const dx = e.clientX - ox;
      const dy = e.clientY - oy;
      this.panX += dx;
      this.panY += dy;
      this.updateTransform();
      ox = e.clientX;
      oy = e.clientY;
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
      this.el.style.cursor = "";
    });
  }

  initZoom() {
    this.el.addEventListener("wheel", e => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * zoomFactor));

      if (newScale === this.scale) return;

      const rect = this.el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;

      this.updateTransform();
    }, { passive: false });
  }

  updateTransform() {
    this.contentArea.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  removeBubble(bubble) {
    this.bubbles = this.bubbles.filter(b => b !== bubble);
    this.lines = this.lines.filter(item => {
      const isConnected = item.parent === bubble || item.child === bubble;
      if (isConnected) {
        if (item.line.parentNode) item.line.parentNode.removeChild(item.line);
        return false;
      }
      return true;
    });
    if (bubble.el) {
      bubble.el.classList.add("pop");
      setTimeout(() => {
        if (bubble.el.parentNode) bubble.el.parentNode.removeChild(bubble.el);
      }, 300);
    }
  }

  getMouseWorldCoords() {
    return {
      x: (this.mouseX - this.panX) / this.scale,
      y: (this.mouseY - this.panY) / this.scale
    };
  }

  loop() {
    const mouseVx = this.mouseX - this.prevMouseX;
    const mouseVy = this.mouseY - this.prevMouseY;
    const panVx = this.panX - this.prevPanX;
    const panVy = this.panY - this.prevPanY;

    const { x: mouseWorldX, y: mouseWorldY } = this.getMouseWorldCoords();

    const interaction = {
      mouse: { x: mouseWorldX, y: mouseWorldY, vx: mouseVx / this.scale, vy: mouseVy / this.scale },
      pan: { vx: panVx / this.scale, vy: panVy / this.scale }
    };

    this.bubbles.forEach(b => b.tick?.(interaction));

    this.updateLines();
    this.onRenderCallbacks.forEach(cb => cb());

    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.prevPanX = this.panX;
    this.prevPanY = this.panY;

    requestAnimationFrame(() => this.loop());
  }
}
