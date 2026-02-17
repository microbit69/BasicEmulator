window.App = window.App || {};

/**
 * Apple II+ Display — canvas-based 280×192 monochrome amber
 *
 * Everything (text AND graphics) is rendered onto a single <canvas>.
 * Two off-screen pages are kept in memory for page-flipping.
 *
 * Modes
 *  TEXT      – 40×24 character text (default)
 *  GR        – Lo-Res 40×40 mixed (+ 4 text rows at bottom)
 *  GR FULL   – Lo-Res 40×48 full-screen graphics
 *  HGR/HGR2 – Hi-Res 280×160 mixed (+ 4 text rows at bottom)
 *  HGR FULL  – Hi-Res 280×192 full-screen graphics
 *
 * The mixed-mode bottom 4 text rows always occupy scanlines 160–191
 * (rows 20–23 of the 24-row text grid).
 */

class Display {
  constructor(canvasElement) {
    // --- Canvas setup ---
    this.canvas = canvasElement;
    this.canvas.width = 280;
    this.canvas.height = 192;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // --- Text dimensions ---
    this.width = 40;   // columns
    this.height = 24;  // rows

    // Character cell: 7px wide × 8px tall → 40×24 = 280×192
    this.charW = 7;
    this.charH = 8;

    // --- Colors ---
    this.amberHex = '#ffb000';
    this.amberR = 255;
    this.amberG = 176;
    this.amberB = 0;

    // --- Cursor ---
    this.cursorX = 0;
    this.cursorY = 0;
    this.cursorVisible = true;
    this._cursorBlinkOn = true;
    this._cursorTimer = setInterval(() => {
      this._cursorBlinkOn = !this._cursorBlinkOn;
      this._renderCursor();
    }, 500);

    // --- Text attributes ---
    this.displayMode = 0; // 0=normal, 1=inverse, 2=flash

    // --- Screen mode ---
    //  'text' | 'gr' | 'gr_full' | 'hgr' | 'hgr_full'
    this.screenMode = 'text';
    this.mixedMode = true;    // true = bottom 4 rows are text
    this.activePage = 0;      // 0 = page 1, 1 = page 2
    this.displayPage = 0;     // which page is shown

    // --- Two pages of text buffer (40×24 each) ---
    this.textPages = [
      this._createTextPage(),
      this._createTextPage()
    ];

    // --- Two pages of Lo-Res pixel data (40×48 each, color indices 0-15) ---
    this.loResPages = [
      this._createLoResPage(),
      this._createLoResPage()
    ];

    // --- Two pages of Hi-Res pixel data (280×192 booleans — on/off amber) ---
    this.hiResPages = [
      this._createHiResPage(),
      this._createHiResPage()
    ];

    // --- Scroll ---
    this.scrollTop = 0;
    this.scrollBottom = 24;
    this.textWidth = 40;

    // --- Build font bitmap ---
    this._buildFont();

    // Initial clear
    this.clear();
  }

  // ===== PAGE HELPERS =====

  _createTextPage() {
    const chars = [];
    const attrs = [];
    for (let y = 0; y < 24; y++) {
      chars.push(new Array(40).fill(' '));
      attrs.push(new Array(40).fill(0)); // 0=normal, 1=inverse, 2=flash
    }
    return { chars, attrs };
  }

  _createLoResPage() {
    const data = [];
    for (let y = 0; y < 48; y++) {
      data.push(new Array(40).fill(0));
    }
    return data;
  }

  _createHiResPage() {
    return new Uint8Array(280 * 192); // 0=off, 1=on (amber)
  }

  // Shorthand: current text page
  get _tp() { return this.textPages[this.activePage]; }
  get _tpDisp() { return this.textPages[this.displayPage]; }
  get screenBuffer() { return this._tp.chars; }
  get attrBuffer() { return this._tp.attrs; }

  // ===== 5×7 BITMAP FONT =====

  _buildFont() {
    // 5×7 pixel glyphs for ASCII 32–127, stored as 7 bytes per char
    // Each byte represents one row, bits 4..0 = pixels left-to-right
    this._fontData = {};

    const F = (ch, rows) => { this._fontData[ch] = rows; };

    // Printable ASCII (space through tilde)
    F(32, [0x00,0x00,0x00,0x00,0x00,0x00,0x00]); // space
    F(33, [0x04,0x04,0x04,0x04,0x04,0x00,0x04]); // !
    F(34, [0x0A,0x0A,0x00,0x00,0x00,0x00,0x00]); // "
    F(35, [0x0A,0x1F,0x0A,0x0A,0x1F,0x0A,0x00]); // #
    F(36, [0x04,0x0F,0x14,0x0E,0x05,0x1E,0x04]); // $
    F(37, [0x18,0x19,0x02,0x04,0x08,0x13,0x03]); // %
    F(38, [0x08,0x14,0x14,0x08,0x15,0x12,0x0D]); // &
    F(39, [0x04,0x04,0x00,0x00,0x00,0x00,0x00]); // '
    F(40, [0x02,0x04,0x08,0x08,0x08,0x04,0x02]); // (
    F(41, [0x08,0x04,0x02,0x02,0x02,0x04,0x08]); // )
    F(42, [0x00,0x04,0x15,0x0E,0x15,0x04,0x00]); // *
    F(43, [0x00,0x04,0x04,0x1F,0x04,0x04,0x00]); // +
    F(44, [0x00,0x00,0x00,0x00,0x00,0x04,0x08]); // ,
    F(45, [0x00,0x00,0x00,0x1F,0x00,0x00,0x00]); // -
    F(46, [0x00,0x00,0x00,0x00,0x00,0x00,0x04]); // .
    F(47, [0x01,0x01,0x02,0x04,0x08,0x10,0x10]); // /
    F(48, [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E]); // 0
    F(49, [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E]); // 1
    F(50, [0x0E,0x11,0x01,0x06,0x08,0x10,0x1F]); // 2
    F(51, [0x0E,0x11,0x01,0x06,0x01,0x11,0x0E]); // 3
    F(52, [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02]); // 4
    F(53, [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E]); // 5
    F(54, [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E]); // 6
    F(55, [0x1F,0x01,0x02,0x04,0x08,0x08,0x08]); // 7
    F(56, [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E]); // 8
    F(57, [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C]); // 9
    F(58, [0x00,0x00,0x04,0x00,0x00,0x04,0x00]); // :
    F(59, [0x00,0x00,0x04,0x00,0x00,0x04,0x08]); // ;
    F(60, [0x02,0x04,0x08,0x10,0x08,0x04,0x02]); // <
    F(61, [0x00,0x00,0x1F,0x00,0x1F,0x00,0x00]); // =
    F(62, [0x08,0x04,0x02,0x01,0x02,0x04,0x08]); // >
    F(63, [0x0E,0x11,0x01,0x02,0x04,0x00,0x04]); // ?
    F(64, [0x0E,0x11,0x17,0x15,0x17,0x10,0x0E]); // @
    F(65, [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11]); // A
    F(66, [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E]); // B
    F(67, [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E]); // C
    F(68, [0x1C,0x12,0x11,0x11,0x11,0x12,0x1C]); // D
    F(69, [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F]); // E
    F(70, [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10]); // F
    F(71, [0x0E,0x11,0x10,0x17,0x11,0x11,0x0F]); // G
    F(72, [0x11,0x11,0x11,0x1F,0x11,0x11,0x11]); // H
    F(73, [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E]); // I
    F(74, [0x07,0x02,0x02,0x02,0x02,0x12,0x0C]); // J
    F(75, [0x11,0x12,0x14,0x18,0x14,0x12,0x11]); // K
    F(76, [0x10,0x10,0x10,0x10,0x10,0x10,0x1F]); // L
    F(77, [0x11,0x1B,0x15,0x15,0x11,0x11,0x11]); // M
    F(78, [0x11,0x19,0x15,0x13,0x11,0x11,0x11]); // N
    F(79, [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E]); // O
    F(80, [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10]); // P
    F(81, [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D]); // Q
    F(82, [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11]); // R
    F(83, [0x0E,0x11,0x10,0x0E,0x01,0x11,0x0E]); // S
    F(84, [0x1F,0x04,0x04,0x04,0x04,0x04,0x04]); // T
    F(85, [0x11,0x11,0x11,0x11,0x11,0x11,0x0E]); // U
    F(86, [0x11,0x11,0x11,0x11,0x0A,0x0A,0x04]); // V
    F(87, [0x11,0x11,0x11,0x15,0x15,0x15,0x0A]); // W
    F(88, [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11]); // X
    F(89, [0x11,0x11,0x0A,0x04,0x04,0x04,0x04]); // Y
    F(90, [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F]); // Z
    F(91, [0x0E,0x08,0x08,0x08,0x08,0x08,0x0E]); // [
    F(92, [0x10,0x10,0x08,0x04,0x02,0x01,0x01]); // backslash
    F(93, [0x0E,0x02,0x02,0x02,0x02,0x02,0x0E]); // ]
    F(94, [0x04,0x0A,0x11,0x00,0x00,0x00,0x00]); // ^
    F(95, [0x00,0x00,0x00,0x00,0x00,0x00,0x1F]); // _
    F(96, [0x08,0x04,0x00,0x00,0x00,0x00,0x00]); // `
    // Lower-case mapped to upper-case on Apple II+ (no lower case)
    // We still store them for completeness but Apple II shows uppercase
    F(97, [0x00,0x00,0x0E,0x01,0x0F,0x11,0x0F]);  // a
    F(98, [0x10,0x10,0x1E,0x11,0x11,0x11,0x1E]);  // b
    F(99, [0x00,0x00,0x0E,0x11,0x10,0x11,0x0E]);  // c
    F(100,[0x01,0x01,0x0F,0x11,0x11,0x11,0x0F]);  // d
    F(101,[0x00,0x00,0x0E,0x11,0x1F,0x10,0x0E]);  // e
    F(102,[0x06,0x08,0x1E,0x08,0x08,0x08,0x08]);  // f
    F(103,[0x00,0x00,0x0F,0x11,0x0F,0x01,0x0E]);  // g
    F(104,[0x10,0x10,0x1E,0x11,0x11,0x11,0x11]);  // h
    F(105,[0x04,0x00,0x0C,0x04,0x04,0x04,0x0E]);  // i
    F(106,[0x02,0x00,0x06,0x02,0x02,0x12,0x0C]);  // j
    F(107,[0x10,0x10,0x12,0x14,0x18,0x14,0x12]);  // k
    F(108,[0x0C,0x04,0x04,0x04,0x04,0x04,0x0E]);  // l
    F(109,[0x00,0x00,0x1A,0x15,0x15,0x11,0x11]);  // m
    F(110,[0x00,0x00,0x1E,0x11,0x11,0x11,0x11]);  // n
    F(111,[0x00,0x00,0x0E,0x11,0x11,0x11,0x0E]);  // o
    F(112,[0x00,0x00,0x1E,0x11,0x1E,0x10,0x10]);  // p
    F(113,[0x00,0x00,0x0F,0x11,0x0F,0x01,0x01]);  // q
    F(114,[0x00,0x00,0x16,0x19,0x10,0x10,0x10]);  // r
    F(115,[0x00,0x00,0x0F,0x10,0x0E,0x01,0x1E]);  // s
    F(116,[0x08,0x08,0x1E,0x08,0x08,0x09,0x06]);  // t
    F(117,[0x00,0x00,0x11,0x11,0x11,0x13,0x0D]);  // u
    F(118,[0x00,0x00,0x11,0x11,0x11,0x0A,0x04]);  // v
    F(119,[0x00,0x00,0x11,0x11,0x15,0x15,0x0A]);  // w
    F(120,[0x00,0x00,0x11,0x0A,0x04,0x0A,0x11]);  // x
    F(121,[0x00,0x00,0x11,0x11,0x0F,0x01,0x0E]);  // y
    F(122,[0x00,0x00,0x1F,0x02,0x04,0x08,0x1F]);  // z
    F(123,[0x02,0x04,0x04,0x08,0x04,0x04,0x02]);  // {
    F(124,[0x04,0x04,0x04,0x04,0x04,0x04,0x04]);  // |
    F(125,[0x08,0x04,0x04,0x02,0x04,0x04,0x08]);  // }
    F(126,[0x00,0x00,0x08,0x15,0x02,0x00,0x00]);  // ~
  }

  // Draw a single character at text cell (col, row)
  _drawChar(col, row, ch, attr) {
    const px = col * this.charW;
    const py = row * this.charH;
    const code = ch.charCodeAt(0);
    const glyph = this._fontData[code] || this._fontData[32];

    const isInverse = (attr === 1);
    const isFlash = (attr === 2);
    const showInverse = isInverse || (isFlash && this._cursorBlinkOn);

    if (showInverse) {
      // Fill cell with amber, draw black pixels for glyph
      this._fillRect(px, py, this.charW, this.charH, this.amberR, this.amberG, this.amberB);
      for (let gy = 0; gy < 7; gy++) {
        const row_bits = glyph[gy];
        for (let gx = 0; gx < 5; gx++) {
          if (row_bits & (0x10 >> gx)) {
            this._setPixel(px + gx + 1, py + gy, 0, 0, 0);
          }
        }
      }
    } else {
      // Clear cell to black, draw amber pixels for glyph
      this._fillRect(px, py, this.charW, this.charH, 0, 0, 0);
      for (let gy = 0; gy < 7; gy++) {
        const row_bits = glyph[gy];
        for (let gx = 0; gx < 5; gx++) {
          if (row_bits & (0x10 >> gx)) {
            this._setPixel(px + gx + 1, py + gy, this.amberR, this.amberG, this.amberB);
          }
        }
      }
    }
  }

  // ===== LOW-LEVEL PIXEL OPS (work on the visible canvas) =====

  _setPixel(x, y, r, g, b) {
    if (x < 0 || x >= 280 || y < 0 || y >= 192) return;
    if (!this._imgData) {
      this._imgData = this.ctx.getImageData(0, 0, 280, 192);
    }
    const i = (y * 280 + x) * 4;
    this._imgData.data[i] = r;
    this._imgData.data[i+1] = g;
    this._imgData.data[i+2] = b;
    this._imgData.data[i+3] = (r === 0 && g === 0 && b === 0) ? 0 : 255;
  }

  _fillRect(x, y, w, h, r, g, b) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this._setPixel(x + dx, y + dy, r, g, b);
      }
    }
  }

  _flush() {
    if (this._imgData) {
      this.ctx.putImageData(this._imgData, 0, 0);
      this._imgData = null;
    }
  }

  // ===== FULL RENDER =====

  render() {
    this._imgData = this.ctx.getImageData(0, 0, 280, 192);
    const page = this.displayPage;

    if (this.screenMode === 'text') {
      this._renderTextFull(page, 0, 24);
    } else if (this.screenMode === 'gr' || this.screenMode === 'gr_full') {
      this._renderLoRes(page);
      if (this.screenMode === 'gr') {
        // Mixed mode: text rows 20-23 (scanlines 160-191)
        this._renderTextFull(page, 20, 24);
      }
    } else if (this.screenMode === 'hgr' || this.screenMode === 'hgr_full') {
      this._renderHiRes(page);
      if (this.screenMode === 'hgr') {
        // Mixed mode: text rows 20-23 (scanlines 160-191)
        this._renderTextFull(page, 20, 24);
      }
    }

    // Draw cursor
    this._renderCursorInline();

    this._flush();
  }

  _renderTextFull(page, startRow, endRow) {
    const tp = this.textPages[page];
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < 40; col++) {
        this._drawChar(col, row, tp.chars[row][col], tp.attrs[row][col]);
      }
    }
  }

  _renderLoRes(page) {
    const lores = this.loResPages[page];
    // Each lo-res pixel = 7px wide × 4px tall in 280×192
    // 40 columns × 7 = 280, rows depend on mode
    const maxRow = (this.screenMode === 'gr') ? 40 : 48;
    for (let ly = 0; ly < maxRow; ly++) {
      for (let lx = 0; lx < 40; lx++) {
        const colorIdx = lores[ly][lx];
        const rgb = this._loResColorToAmber(colorIdx);
        const px = lx * 7;
        const py = ly * 4;
        this._fillRect(px, py, 7, 4, rgb[0], rgb[1], rgb[2]);
      }
    }
  }

  _renderHiRes(page) {
    const hires = this.hiResPages[page];
    const maxY = (this.screenMode === 'hgr') ? 160 : 192;
    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x < 280; x++) {
        const on = hires[y * 280 + x];
        if (on) {
          this._setPixel(x, y, this.amberR, this.amberG, this.amberB);
        } else {
          this._setPixel(x, y, 0, 0, 0);
        }
      }
    }
  }

  // Convert lo-res color index (0-15) to monochrome amber brightness
  _loResColorToAmber(colorIdx) {
    // Map Apple II colors to brightness levels (0.0 - 1.0)
    const brightness = [
      0.00, // 0  Black
      0.25, // 1  Magenta
      0.15, // 2  Dark Blue
      0.35, // 3  Purple
      0.20, // 4  Dark Green
      0.40, // 5  Grey 1
      0.35, // 6  Medium Blue
      0.55, // 7  Light Blue
      0.30, // 8  Brown
      0.50, // 9  Orange
      0.60, // 10 Grey 2
      0.65, // 11 Pink
      0.50, // 12 Light Green
      0.80, // 13 Yellow
      0.65, // 14 Aqua
      1.00, // 15 White
    ];
    const b = brightness[colorIdx & 15];
    return [
      Math.round(this.amberR * b),
      Math.round(this.amberG * b),
      Math.round(this.amberB * b)
    ];
  }

  _renderCursorInline() {
    if (!this.cursorVisible || !this._cursorBlinkOn) return;
    // Only render cursor in text area
    const row = this.cursorY;
    const col = this.cursorX;
    if (col < 0 || col >= 40 || row < 0 || row >= 24) return;

    // In graphics modes, only draw cursor in text rows
    if (this.screenMode === 'gr' && row < 20) return;
    if (this.screenMode === 'hgr' && row < 20) return;
    if (this.screenMode === 'gr_full' || this.screenMode === 'hgr_full') return;

    // Draw a solid amber block for cursor
    const px = col * this.charW;
    const py = row * this.charH;
    this._fillRect(px, py, this.charW, this.charH, this.amberR, this.amberG, this.amberB);

    // Draw the character under cursor in black
    const tp = this.textPages[this.displayPage];
    const ch = tp.chars[row][col];
    const glyph = this._fontData[ch.charCodeAt(0)] || this._fontData[32];
    for (let gy = 0; gy < 7; gy++) {
      const row_bits = glyph[gy];
      for (let gx = 0; gx < 5; gx++) {
        if (row_bits & (0x10 >> gx)) {
          this._setPixel(px + gx + 1, py + gy, 0, 0, 0);
        }
      }
    }
  }

  _renderCursor() {
    // Called by the blink timer — just re-render fully
    this.render();
  }

  // ===== TEXT OUTPUT API (same interface as before) =====

  clear() {
    const tp = this._tp;
    for (let y = 0; y < 24; y++) {
      tp.chars[y].fill(' ');
      tp.attrs[y].fill(0);
    }
    this.cursorX = 0;
    this.cursorY = 0;
    this.render();
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
      if (typeof App.beep === 'function') App.beep();
      return;
    }

    if (ch === '\x08') { // Backspace
      if (this.cursorX > 0) {
        this.cursorX--;
        this._tp.chars[this.cursorY][this.cursorX] = ' ';
        this._tp.attrs[this.cursorY][this.cursorX] = 0;
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

    this._tp.chars[this.cursorY][this.cursorX] = ch;
    this._tp.attrs[this.cursorY][this.cursorX] = this.displayMode;
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
    const tp = this._tp;
    // Determine which rows scroll based on mode
    const top = 0;
    const bottom = this.height;
    tp.chars.splice(top, 1);
    tp.chars.splice(bottom - 1, 0, new Array(40).fill(' '));
    tp.attrs.splice(top, 1);
    tp.attrs.splice(bottom - 1, 0, new Array(40).fill(0));
  }

  clearToEnd() {
    const tp = this._tp;
    for (let x = this.cursorX; x < this.width; x++) {
      tp.chars[this.cursorY][x] = ' ';
      tp.attrs[this.cursorY][x] = 0;
    }
    for (let y = this.cursorY + 1; y < this.height; y++) {
      tp.chars[y].fill(' ');
      tp.attrs[y].fill(0);
    }
    this.render();
  }

  clearToEndOfLine() {
    const tp = this._tp;
    for (let x = this.cursorX; x < this.width; x++) {
      tp.chars[this.cursorY][x] = ' ';
      tp.attrs[this.cursorY][x] = 0;
    }
    this.render();
  }

  htab(col) {
    this.cursorX = Math.max(0, Math.min(this.width - 1, col - 1));
  }

  vtab(row) {
    this.cursorY = Math.max(0, Math.min(this.height - 1, row - 1));
  }

  setInputMode(active) { this.inputMode = active; }
  setGetMode(active) { this.getMode = active; }

  // ===== GRAPHICS MODE SWITCHING =====

  initLoRes() {
    this.screenMode = 'gr';
    this.mixedMode = true;

    // Clear lo-res graphics area
    const lores = this.loResPages[this.activePage];
    for (let y = 0; y < 48; y++) {
      lores[y].fill(0);
    }

    // Set cursor to text window (rows 20-23)
    this.cursorX = 0;
    this.cursorY = 20;

    // Clear text rows 20-23
    const tp = this._tp;
    for (let y = 20; y < 24; y++) {
      tp.chars[y].fill(' ');
      tp.attrs[y].fill(0);
    }
    this.render();
  }

  initLoResFull() {
    this.screenMode = 'gr_full';
    this.mixedMode = false;
    const lores = this.loResPages[this.activePage];
    for (let y = 0; y < 48; y++) {
      lores[y].fill(0);
    }
    this.render();
  }

  initHiRes(page) {
    const p = (page === 2) ? 1 : 0;
    this.activePage = p;
    this.displayPage = p;
    this.screenMode = 'hgr';
    this.mixedMode = true;

    // Clear hi-res page
    this.hiResPages[p].fill(0);

    // Set cursor to text window (rows 20-23)
    this.cursorX = 0;
    this.cursorY = 20;

    // Clear text rows 20-23
    const tp = this._tp;
    for (let y = 20; y < 24; y++) {
      tp.chars[y].fill(' ');
      tp.attrs[y].fill(0);
    }
    this.render();
  }

  initHiResFull(page) {
    const p = (page === 2) ? 1 : 0;
    this.activePage = p;
    this.displayPage = p;
    this.screenMode = 'hgr_full';
    this.mixedMode = false;
    this.hiResPages[p].fill(0);
    this.render();
  }

  showTextMode() {
    this.screenMode = 'text';
    this.mixedMode = false;
    this.clear();
  }

  // ===== PAGE FLIPPING =====

  setActivePage(page) {
    this.activePage = (page === 2) ? 1 : 0;
  }

  setDisplayPage(page) {
    this.displayPage = (page === 2) ? 1 : 0;
    this.render();
  }

  // ===== LO-RES GRAPHICS DRAWING =====

  drawLoResPixel(x, y, color) {
    if (x < 0 || x >= 40) return;
    const maxY = (this.screenMode === 'gr') ? 40 : 48;
    if (y < 0 || y >= maxY) return;
    this.loResPages[this.activePage][y][x] = color & 15;

    // Draw immediately to canvas
    const rgb = this._loResColorToAmber(color & 15);
    const px = x * 7;
    const py = y * 4;
    this.ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    this.ctx.fillRect(px, py, 7, 4);
  }

  getLoResPixel(x, y) {
    if (x < 0 || x >= 40 || y < 0 || y >= 48) return 0;
    return this.loResPages[this.activePage][y][x];
  }

  // ===== HI-RES GRAPHICS DRAWING =====

  drawHiResPixel(x, y, colorOn) {
    if (x < 0 || x >= 280) return;
    const maxY = (this.screenMode === 'hgr') ? 160 : 192;
    if (y < 0 || y >= maxY) return;
    const hires = this.hiResPages[this.activePage];
    hires[y * 280 + x] = colorOn ? 1 : 0;

    // Draw via imageData for consistent rendering
    this._setPixel(x, y,
      colorOn ? this.amberR : 0,
      colorOn ? this.amberG : 0,
      colorOn ? this.amberB : 0);
    this._flush();
  }

  drawHiResLine(x1, y1, x2, y2, colorOn) {
    const r = colorOn ? this.amberR : 0;
    const g = colorOn ? this.amberG : 0;
    const b = colorOn ? this.amberB : 0;
    const maxY = (this.screenMode === 'hgr') ? 160 : 192;
    const hires = this.hiResPages[this.activePage];

    // Bresenham line algorithm — batched via imageData
    let dx = Math.abs(x2 - x1);
    let dy = Math.abs(y2 - y1);
    let sx = x1 < x2 ? 1 : -1;
    let sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x1 >= 0 && x1 < 280 && y1 >= 0 && y1 < maxY) {
        hires[y1 * 280 + x1] = colorOn ? 1 : 0;
        this._setPixel(x1, y1, r, g, b);
      }
      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x1 += sx; }
      if (e2 < dx) { err += dx; y1 += sy; }
    }
    this._flush();
  }

  clearHiRes(colorOn) {
    const hires = this.hiResPages[this.activePage];
    const maxY = (this.screenMode === 'hgr') ? 160 : 192;
    const val = colorOn ? 1 : 0;
    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x < 280; x++) {
        hires[y * 280 + x] = val;
      }
    }
    this.render();
  }

  // ===== CLEANUP =====

  destroy() {
    if (this._cursorTimer) {
      clearInterval(this._cursorTimer);
      this._cursorTimer = null;
    }
  }
}

App.Display = Display;
