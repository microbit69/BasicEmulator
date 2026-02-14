import { SCREEN_WIDTH, SCREEN_HEIGHT, LORES_WIDTH, LORES_GRAPHICS_ROWS, LORES_COLORS } from './constants.js';
import { beep } from './audio.js';

export class Display {
  constructor(element, canvasElement) {
    this.element = element;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.width = SCREEN_WIDTH;
    this.height = SCREEN_HEIGHT;
    this.cursorX = 0;
    this.cursorY = 0;
    this.screenBuffer = [];
    this.clear();
  }

  clear() {
    this.screenBuffer = [];
    for (let y = 0; y < this.height; y++) {
      this.screenBuffer.push(new Array(this.width).fill(' '));
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
        if (y === this.cursorY && x === this.cursorX) {
          line += `<span class="cursor">${this.escapeHtml(ch)}</span>`;
        } else {
          line += this.escapeHtml(ch);
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
      beep();
      return;
    }

    if (ch === '\x08') { // Backspace
      if (this.cursorX > 0) {
        this.cursorX--;
        this.screenBuffer[this.cursorY][this.cursorX] = ' ';
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
    this.canvas.width = LORES_WIDTH * 7;
    this.canvas.height = LORES_GRAPHICS_ROWS * 4;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.cursorX = 0;
    this.cursorY = 20;
    for (let y = 20; y < this.height; y++) {
      this.screenBuffer[y] = new Array(this.width).fill(' ');
    }
    this.render();
  }

  drawLoResPixel(x, y, color) {
    const pixW = 7;
    const pixH = 4;
    this.ctx.fillStyle = LORES_COLORS[color & 15];
    this.ctx.fillRect(x * pixW, y * pixH, pixW, pixH);
  }

  showTextMode() {
    this.canvas.style.display = 'none';
    this.clear();
  }
}
