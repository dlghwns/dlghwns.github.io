<<<<<<< HEAD
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
    this.loop();
  }

  createSVG() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";
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

  updateTransform() {
    this.contentArea.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
  }

  removeBubble(bubble) {
    this.bubbles = this.bubbles.filter(b => b !== bubble);

    this.lines = this.lines.filter(item => {
      const isConnected = item.parent === bubble || item.child === bubble;
      if (isConnected) {
        if (item.line.parentNode) {
          item.line.parentNode.removeChild(item.line);
        }
        return false;
      }
      return true;
    });

    if (bubble.el) {
      bubble.el.classList.add("pop");

      setTimeout(() => {
        if (bubble.el.parentNode) {
          bubble.el.parentNode.removeChild(bubble.el);
        }
      }, 300);
    }
  }

  loop() {
    const mouseVx = this.mouseX - this.prevMouseX;
    const mouseVy = this.mouseY - this.prevMouseY;
    const panVx = this.panX - this.prevPanX;
    const panVy = this.panY - this.prevPanY;

    const mouseWorldX = this.mouseX - this.panX;
    const mouseWorldY = this.mouseY - this.panY;

    const interaction = {
      mouse: {
        x: mouseWorldX,
        y: mouseWorldY,
        vx: mouseVx,
        vy: mouseVy
      },
      pan: {
        vx: panVx,
        vy: panVy
      }
    };

    this.bubbles.forEach(b => {
      if (b.tick) b.tick(interaction);
    });

    this.updateLines();

    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.prevPanX = this.panX;
    this.prevPanY = this.panY;

    requestAnimationFrame(() => this.loop());
  }
}

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
    this.loop();
  }

  createSVG() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";
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

  updateTransform() {
    this.contentArea.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
  }

  removeBubble(bubble) {
    this.bubbles = this.bubbles.filter(b => b !== bubble);

    this.lines = this.lines.filter(item => {
      const isConnected = item.parent === bubble || item.child === bubble;
      if (isConnected) {
        if (item.line.parentNode) {
          item.line.parentNode.removeChild(item.line);
        }
        return false;
      }
      return true;
    });

    if (bubble.el) {
      bubble.el.classList.add("pop");

      setTimeout(() => {
        if (bubble.el.parentNode) {
          bubble.el.parentNode.removeChild(bubble.el);
        }
      }, 300);
    }
  }

  loop() {
    const mouseVx = this.mouseX - this.prevMouseX;
    const mouseVy = this.mouseY - this.prevMouseY;
    const panVx = this.panX - this.prevPanX;
    const panVy = this.panY - this.prevPanY;

    const mouseWorldX = this.mouseX - this.panX;
    const mouseWorldY = this.mouseY - this.panY;

    const interaction = {
      mouse: {
        x: mouseWorldX,
        y: mouseWorldY,
        vx: mouseVx,
        vy: mouseVy
      },
      pan: {
        vx: panVx,
        vy: panVy
      }
    };

    this.bubbles.forEach(b => {
      if (b.tick) b.tick(interaction);
    });

    this.updateLines();

    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.prevPanX = this.panX;
    this.prevPanY = this.panY;

    requestAnimationFrame(() => this.loop());
  }
}
>>>>>>> c291a6500a94d08d1118821b5062e7857f8a9723
