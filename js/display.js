window.App = window.App || {};

class Display {
  constructor(element, canvasElement) {
    this.element = element;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.width = App.SCREEN_WIDTH;
    this.height = App.SCREEN_HEIGHT;
    this.cursorX = 0;
    this.cursorY = 0;
    this.screenBuffer = [];
    this.attrBuffer = [];  // text attributes: 0=normal, 1=inverse, 2=flash
    this.displayMode = 0;  // 0=normal, 1=inverse, 2=flash
    this.textWidth = 40;
    this.scrollTop = 0;
    this.scrollBottom = 24;
    this.clear();
  }

  clear() {
    this.screenBuffer = [];
    this.attrBuffer = [];
    for (let y = 0; y < this.height; y++) {
      this.screenBuffer.push(new Array(this.width).fill(' '));
      this.attrBuffer.push(new Array(this.width).fill(0));
    }
    this.cursorX = 0;
    this.cursorY = 0;
    this.render();
  }

  render() {
    let html = '';
    for (let y = 0; y < this.height; y++) {
      let line = '';
      for (let x = 0; x < this.width; x++) {
        const ch = this.screenBuffer[y][x];
        const attr = this.attrBuffer[y][x];
        const escaped = this.escapeHtml(ch);
        if (y === this.cursorY && x === this.cursorX) {
          line += `<span class="cursor">${escaped}</span>`;
        } else if (attr === 1) {
          line += `<span class="inverse">${escaped}</span>`;
        } else if (attr === 2) {
          line += `<span class="flash">${escaped}</span>`;
        } else {
          line += escaped;
        }
      }
      html += line;
      if (y < this.height - 1) html += '\n';
    }
    this.element.innerHTML = html;
  }

  escapeHtml(ch) {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return ch;
    }
  }

  printChar(ch) {
    if (ch === '\n') {
      this.cursorX = 0;
      this.cursorY++;
      if (this.cursorY >= this.height) {
        this.scrollUp();
        this.cursorY = this.height - 1;
      }
      return;
    }

    if (ch === '\r') {
      this.cursorX = 0;
      return;
    }

    if (ch === '\x07') {
      App.beep();
      return;
    }

    if (ch === '\x08') { // Backspace
      if (this.cursorX > 0) {
        this.cursorX--;
        this.screenBuffer[this.cursorY][this.cursorX] = ' ';
        this.attrBuffer[this.cursorY][this.cursorX] = 0;
      }
      return;
    }

    if (this.cursorX >= this.width) {
      this.cursorX = 0;
      this.cursorY++;
      if (this.cursorY >= this.height) {
        this.scrollUp();
        this.cursorY = this.height - 1;
      }
    }

    this.screenBuffer[this.cursorY][this.cursorX] = ch;
    this.attrBuffer[this.cursorY][this.cursorX] = this.displayMode;
    this.cursorX++;
  }

  printString(str) {
    for (const ch of str) {
      this.printChar(ch);
    }
    this.render();
  }

  printLine(str) {
    this.printString(str + '\n');
  }

  scrollUp() {
    this.screenBuffer.shift();
    this.screenBuffer.push(new Array(this.width).fill(' '));
    this.attrBuffer.shift();
    this.attrBuffer.push(new Array(this.width).fill(0));
  }

  // Clear from cursor to end of screen
  clearToEnd() {
    // Clear rest of current line
    for (let x = this.cursorX; x < this.width; x++) {
      this.screenBuffer[this.cursorY][x] = ' ';
      this.attrBuffer[this.cursorY][x] = 0;
    }
    // Clear all lines below
    for (let y = this.cursorY + 1; y < this.height; y++) {
      this.screenBuffer[y] = new Array(this.width).fill(' ');
      this.attrBuffer[y] = new Array(this.width).fill(0);
    }
    this.render();
  }

  // Clear from cursor to end of line
  clearToEndOfLine() {
    for (let x = this.cursorX; x < this.width; x++) {
      this.screenBuffer[this.cursorY][x] = ' ';
      this.attrBuffer[this.cursorY][x] = 0;
    }
    this.render();
  }

  htab(col) {
    this.cursorX = Math.max(0, Math.min(this.width - 1, col - 1));
  }

  vtab(row) {
    this.cursorY = Math.max(0, Math.min(this.height - 1, row - 1));
  }

  setInputMode(active) {
    this.inputMode = active;
  }

  setGetMode(active) {
    this.getMode = active;
  }

  // Lo-Res graphics
  initLoRes() {
    this.canvas.style.display = 'block';
    this.canvas.width = App.LORES_WIDTH * 7;
    this.canvas.height = App.LORES_GRAPHICS_ROWS * 4;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.cursorX = 0;
    this.cursorY = 20;
    for (let y = 20; y < this.height; y++) {
      this.screenBuffer[y] = new Array(this.width).fill(' ');
      this.attrBuffer[y] = new Array(this.width).fill(0);
    }
    this.render();
  }

  drawLoResPixel(x, y, color) {
    const pixW = 7;
    const pixH = 4;
    this.ctx.fillStyle = App.LORES_COLORS[color & 15];
    this.ctx.fillRect(x * pixW, y * pixH, pixW, pixH);
  }

  showTextMode() {
    this.canvas.style.display = 'none';
    this.clear();
  }

  // Hi-Res graphics
  initHiRes() {
    this.canvas.style.display = 'block';
    this.canvas.width = App.HIRES_WIDTH;
    this.canvas.height = App.HIRES_HEIGHT;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.cursorX = 0;
    this.cursorY = 20;
    for (let y = 20; y < this.height; y++) {
      this.screenBuffer[y] = new Array(this.width).fill(' ');
      this.attrBuffer[y] = new Array(this.width).fill(0);
    }
    this.render();
  }

  drawHiResPixel(x, y, color) {
    this.ctx.fillStyle = App.HIRES_COLORS[color & 7];
    this.ctx.fillRect(x, y, 1, 1);
  }

  drawHiResLine(x1, y1, x2, y2, color) {
    this.ctx.strokeStyle = App.HIRES_COLORS[color & 7];
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x1 + 0.5, y1 + 0.5);
    this.ctx.lineTo(x2 + 0.5, y2 + 0.5);
    this.ctx.stroke();
  }
}

App.Display = Display;
