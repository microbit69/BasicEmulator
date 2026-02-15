#!/bin/bash
echo "================================="
echo " Applesoft BASIC OS - Installer"
echo "================================="
echo ""
DIR="AppleSoftBASIC"
echo "Creating directories..."
mkdir -p "$DIR/css"
mkdir -p "$DIR/js"
echo ""
echo "Writing index.html (1/14)..."
cat > "$DIR/index.html" << 'EOF_INDEX_HTML'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Applesoft BASIC Interpreter</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>

<div id="monitor">
  <div id="screen-container">
    <div id="screen">
      <canvas id="lores-canvas" width="280" height="192"></canvas>
      <div id="text-display"></div>
    </div>
  </div>
  <div style="display: flex; align-items: center; gap: 12px; margin-top: 12px;">
    <div id="power-led"></div>
    <span style="color: #555; font-family: 'Courier New', monospace; font-size: 11px;">APPLE ][</span>
  </div>
</div>

<input type="file" id="file-upload" accept=".bas,.txt,.BAS,.TXT" multiple>

<!-- Scripts loaded in dependency order (no ES modules for file:// compatibility) -->
<script src="js/constants.js"></script>
<script src="js/audio.js"></script>
<script src="js/tokenizer.js"></script>
<script src="js/parser.js"></script>
<script src="js/filesystem.js"></script>
<script src="js/samples.js"></script>
<script src="js/tutorial.js"></script>
<script src="js/display.js"></script>
<script src="js/claude.js"></script>
<script src="js/interpreter.js"></script>
<script src="js/emulator.js"></script>
<script src="js/main.js"></script>

</body>
</html>
EOF_INDEX_HTML

echo "Writing css/style.css (2/14)..."
cat > "$DIR/css/style.css" << 'EOF_STYLE_CSS'
/* ===== RESET & BASE ===== */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #111;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: monospace;
  overflow: hidden;
}

/* ===== MONITOR FRAME ===== */
#monitor {
  background: #1a1a1a;
  border-radius: 24px;
  padding: 32px;
  box-shadow:
    0 0 60px rgba(255, 176, 0, 0.05),
    inset 0 0 80px rgba(0, 0, 0, 0.8),
    0 4px 20px rgba(0, 0, 0, 0.6);
  position: relative;
}

#monitor::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 24px;
  border: 2px solid #333;
  pointer-events: none;
}

/* ===== SCREEN ===== */
#screen-container {
  background: #080400;
  border-radius: 12px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

/* CRT scanline effect */
#screen-container::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  border-radius: 12px;
  z-index: 10;
}

/* CRT vignette */
#screen-container::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(0, 0, 0, 0.4) 100%
  );
  pointer-events: none;
  border-radius: 12px;
  z-index: 11;
}

#screen {
  position: relative;
  z-index: 1;
}

/* ===== TEXT DISPLAY ===== */
#text-display {
  font-family: 'Courier New', 'Lucida Console', monospace;
  font-size: 20px;
  line-height: 1.25;
  color: #ffb000;
  white-space: pre;
  letter-spacing: 1px;
  text-shadow: 0 0 5px rgba(255, 176, 0, 0.5), 0 0 10px rgba(255, 176, 0, 0.2);
  min-height: 600px;
  width: 660px;
  user-select: none;
  position: relative;
}

/* ===== CURSOR ===== */
.cursor {
  display: inline;
  animation: blink 1s step-end infinite;
  background-color: #ffb000;
  color: #080400;
  text-shadow: none;
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.inverse {
  background-color: #ffb000;
  color: #080400;
  text-shadow: none;
}

.flash {
  animation: flash-text 0.5s step-end infinite;
  background-color: #ffb000;
  color: #080400;
  text-shadow: none;
}

@keyframes flash-text {
  0%, 49% { background-color: #ffb000; color: #080400; }
  50%, 100% { background-color: transparent; color: #ffb000; }
}

/* ===== LO-RES GRAPHICS CANVAS ===== */
#lores-canvas {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 2;
  display: none;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* ===== HIDDEN FILE UPLOAD ===== */
#file-upload {
  display: none;
}

/* ===== POWER LED ===== */
#power-led {
  width: 8px;
  height: 8px;
  background: #ffb000;
  border-radius: 50%;
  box-shadow: 0 0 6px #ffb000;
  margin-top: 12px;
  animation: led-glow 2s ease-in-out infinite alternate;
}

@keyframes led-glow {
  0% { box-shadow: 0 0 4px #ffb000; }
  100% { box-shadow: 0 0 10px #ffb000, 0 0 20px rgba(255, 176, 0, 0.3); }
}

/* ===== RESPONSIVE ===== */
@media (max-width: 740px) {
  #monitor { padding: 16px; border-radius: 16px; }
  #text-display { font-size: 14px; width: 460px; min-height: 420px; letter-spacing: 0.5px; }
  #screen-container { padding: 10px; }
}
EOF_STYLE_CSS

echo "Writing js/constants.js (3/14)..."
cat > "$DIR/js/constants.js" << 'EOF_CONSTANTS_JS'
window.App = window.App || {};

// Screen dimensions
App.SCREEN_WIDTH = 40;
App.SCREEN_HEIGHT = 24;

// Lo-Res graphics
App.LORES_WIDTH = 40;
App.LORES_HEIGHT = 48;
App.LORES_GRAPHICS_ROWS = 40;

// Apple II Lo-Res color palette
App.LORES_COLORS = [
  '#000000', // 0  Black
  '#dd0033', // 1  Magenta/Red
  '#000099', // 2  Dark Blue
  '#dd22dd', // 3  Purple
  '#007722', // 4  Dark Green
  '#555555', // 5  Grey 1
  '#2222ff', // 6  Medium Blue
  '#6666ff', // 7  Light Blue
  '#885500', // 8  Brown
  '#ff6600', // 9  Orange
  '#aaaaaa', // 10 Grey 2
  '#ff9988', // 11 Pink
  '#11dd00', // 12 Light Green
  '#ffff00', // 13 Yellow
  '#44ff99', // 14 Aqua
  '#ffffff', // 15 White
];

// Hi-Res graphics
App.HIRES_WIDTH = 280;
App.HIRES_HEIGHT = 192;

// Apple II Hi-Res color palette (HCOLOR= 0-7)
App.HIRES_COLORS = [
  '#000000', // 0  Black
  '#11dd00', // 1  Green
  '#dd22dd', // 2  Violet/Purple
  '#ffffff', // 3  White
  '#000000', // 4  Black
  '#ff6600', // 5  Orange
  '#2222ff', // 6  Blue
  '#ffffff', // 7  White
];
EOF_CONSTANTS_JS

echo "Writing js/audio.js (4/14)..."
cat > "$DIR/js/audio.js" << 'EOF_AUDIO_JS'
window.App = window.App || {};

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

App.beep = function(duration, frequency) {
  if (duration === undefined) duration = 200;
  if (frequency === undefined) frequency = 800;
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.1;
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (e) { /* Audio not available */ }
};
EOF_AUDIO_JS

echo "Writing js/tokenizer.js (5/14)..."
cat > "$DIR/js/tokenizer.js" << 'EOF_TOKENIZER_JS'
window.App = window.App || {};

const KEYWORDS = [
  'PRINT','GOTO','GOSUB','RETURN','IF','THEN','ELSE','FOR','TO','STEP',
  'NEXT','LET','INPUT','DIM','READ','DATA','RESTORE','DEF','FN',
  'REM','END','STOP','CONT','ON','AND','OR','NOT','TAB','SPC','HTAB','VTAB',
  'HOME','CLEAR','CLR','RUN','LIST','NEW','LOAD','SAVE',
  'GR','COLOR','PLOT','HLIN','VLIN','TEXT','HGR','HGR2','HCOLOR','HPLOT',
  'DRAW','XDRAW','ROT','SCALE',
  'POKE','PEEK','CALL','SPEED','NORMAL','INVERSE','FLASH',
  'POP','ONERR','RESUME','GET','AT','WAIT','USR',
  'TRACE','NOTRACE','STORE','RECALL'
];

class Tokenizer {
  constructor(line) {
    this.line = line;
    this.pos = 0;
    this.tokens = [];
    this.tokenize();
  }

  peek() {
    return this.pos < this.line.length ? this.line[this.pos] : null;
  }

  advance() {
    return this.line[this.pos++];
  }

  skipWhitespace() {
    while (this.pos < this.line.length && this.line[this.pos] === ' ') {
      this.pos++;
    }
  }

  tokenize() {
    while (this.pos < this.line.length) {
      this.skipWhitespace();
      if (this.pos >= this.line.length) break;

      const ch = this.peek();

      // Numbers
      if (ch >= '0' && ch <= '9' || (ch === '.' && this.pos + 1 < this.line.length && this.line[this.pos+1] >= '0' && this.line[this.pos+1] <= '9')) {
        this.readNumber();
        continue;
      }

      // Strings
      if (ch === '"') {
        this.readString();
        continue;
      }

      // Identifiers and keywords
      if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')) {
        this.readIdentifier();
        continue;
      }

      // Operators and punctuation
      if (ch === '<' || ch === '>' || ch === '=') {
        this.readComparison();
        continue;
      }

      // Single character tokens
      const singleChars = '+-*/^(),;:';
      if (singleChars.includes(ch)) {
        this.tokens.push({ type: 'OPERATOR', value: this.advance() });
        continue;
      }

      // Skip unknown characters
      this.advance();
    }
  }

  readNumber() {
    let num = '';
    let hasDot = false;
    while (this.pos < this.line.length) {
      const ch = this.peek();
      if (ch >= '0' && ch <= '9') {
        num += this.advance();
      } else if (ch === '.' && !hasDot) {
        hasDot = true;
        num += this.advance();
      } else if (ch === 'E' || ch === 'e') {
        num += this.advance();
        if (this.peek() === '+' || this.peek() === '-') num += this.advance();
      } else {
        break;
      }
    }
    this.tokens.push({ type: 'NUMBER', value: parseFloat(num) });
  }

  readString() {
    this.advance(); // skip opening quote
    let str = '';
    while (this.pos < this.line.length && this.peek() !== '"') {
      str += this.advance();
    }
    if (this.pos < this.line.length) this.advance(); // skip closing quote
    this.tokens.push({ type: 'STRING', value: str });
  }

  readIdentifier() {
    let id = '';
    while (this.pos < this.line.length) {
      const ch = this.peek();
      if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) {
        id += this.advance();
      } else if (ch === '$') {
        id += this.advance();
        break;
      } else if (ch === '%') {
        id += this.advance();
        break;
      } else {
        break;
      }
    }
    id = id.toUpperCase();

    if (KEYWORDS.includes(id)) {
      this.tokens.push({ type: 'KEYWORD', value: id });
    } else {
      this.tokens.push({ type: 'IDENTIFIER', value: id });
    }
  }

  readComparison() {
    let op = this.advance();
    if (this.peek() === '=' || this.peek() === '>' || this.peek() === '<') {
      op += this.advance();
    }
    this.tokens.push({ type: 'OPERATOR', value: op });
  }
}

App.Tokenizer = Tokenizer;
EOF_TOKENIZER_JS

echo "Writing js/parser.js (6/14)..."
cat > "$DIR/js/parser.js" << 'EOF_PARSER_JS'
window.App = window.App || {};

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  advance() {
    return this.tokens[this.pos++];
  }

  expect(type, value) {
    const token = this.advance();
    if (!token || token.type !== type || (value !== undefined && token.value !== value)) {
      throw new Error(`EXPECTED ${value || type}`);
    }
    return token;
  }

  match(type, value) {
    const token = this.peek();
    if (token && token.type === type && (value === undefined || token.value === value)) {
      return this.advance();
    }
    return null;
  }

  // Expression parsing (lowest to highest precedence)

  parseExpression() {
    return this.parseOr();
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.match('KEYWORD', 'OR')) {
      const right = this.parseAnd();
      left = { type: 'binary', op: 'OR', left, right };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.match('KEYWORD', 'AND')) {
      const right = this.parseNot();
      left = { type: 'binary', op: 'AND', left, right };
    }
    return left;
  }

  parseNot() {
    if (this.match('KEYWORD', 'NOT')) {
      const expr = this.parseNot();
      return { type: 'unary', op: 'NOT', expr };
    }
    return this.parseComparison();
  }

  parseComparison() {
    let left = this.parseAddSub();
    const ops = ['=', '<', '>', '<=', '>=', '<>', '><', '=>', '=<'];
    while (this.peek() && this.peek().type === 'OPERATOR' && ops.includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseAddSub();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  parseAddSub() {
    let left = this.parseMulDiv();
    while (this.peek() && this.peek().type === 'OPERATOR' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value;
      const right = this.parseMulDiv();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  parseMulDiv() {
    let left = this.parsePower();
    while (this.peek() && this.peek().type === 'OPERATOR' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.advance().value;
      const right = this.parsePower();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  parsePower() {
    let left = this.parseUnary();
    if (this.peek() && this.peek().type === 'OPERATOR' && this.peek().value === '^') {
      this.advance();
      const right = this.parsePower(); // right-associative
      return { type: 'binary', op: '^', left, right };
    }
    return left;
  }

  parseUnary() {
    if (this.peek() && this.peek().type === 'OPERATOR' && this.peek().value === '-') {
      this.advance();
      const expr = this.parseUnary();
      return { type: 'unary', op: '-', expr };
    }
    if (this.peek() && this.peek().type === 'OPERATOR' && this.peek().value === '+') {
      this.advance();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.peek();
    if (!token) throw new Error('?SYNTAX ERROR');

    // Number literal
    if (token.type === 'NUMBER') {
      this.advance();
      return { type: 'number', value: token.value };
    }

    // String literal
    if (token.type === 'STRING') {
      this.advance();
      return { type: 'string', value: token.value };
    }

    // Parenthesized expression
    if (token.type === 'OPERATOR' && token.value === '(') {
      this.advance();
      const expr = this.parseExpression();
      this.expect('OPERATOR', ')');
      return expr;
    }

    // NOT keyword
    if (token.type === 'KEYWORD' && token.value === 'NOT') {
      this.advance();
      const expr = this.parseNot();
      return { type: 'unary', op: 'NOT', expr };
    }

    // FN call (user-defined functions)
    if (token.type === 'KEYWORD' && token.value === 'FN') {
      this.advance();
      const name = this.expect('IDENTIFIER').value;
      this.expect('OPERATOR', '(');
      const arg = this.parseExpression();
      this.expect('OPERATOR', ')');
      return { type: 'fn_call', name, arg };
    }

    // PEEK function
    if (token.type === 'KEYWORD' && token.value === 'PEEK') {
      this.advance();
      this.expect('OPERATOR', '(');
      const arg = this.parseExpression();
      this.expect('OPERATOR', ')');
      return { type: 'builtin_call', name: 'PEEK', args: [arg] };
    }

    // USR function
    if (token.type === 'KEYWORD' && token.value === 'USR') {
      this.advance();
      this.expect('OPERATOR', '(');
      const arg = this.parseExpression();
      this.expect('OPERATOR', ')');
      return { type: 'builtin_call', name: 'USR', args: [arg] };
    }

    // Built-in functions
    if (token.type === 'IDENTIFIER') {
      const builtins = [
        'RND','INT','ABS','SGN','SQR','SIN','COS','TAN','ATN','EXP','LOG',
        'LEN','LEFT$','RIGHT$','MID$','CHR$','ASC','VAL','STR$',
        'POS','SCRN','PDL','FRE'
      ];
      const funcName = token.value;
      if (builtins.includes(funcName)) {
        this.advance();
        this.expect('OPERATOR', '(');
        const args = [this.parseExpression()];
        while (this.match('OPERATOR', ',')) {
          args.push(this.parseExpression());
        }
        this.expect('OPERATOR', ')');
        return { type: 'builtin_call', name: funcName, args };
      }

      // Variable or array access
      this.advance();
      if (this.match('OPERATOR', '(')) {
        const indices = [this.parseExpression()];
        while (this.match('OPERATOR', ',')) {
          indices.push(this.parseExpression());
        }
        this.expect('OPERATOR', ')');
        return { type: 'array_access', name: funcName, indices };
      }
      return { type: 'variable', name: funcName };
    }

    throw new Error('?SYNTAX ERROR');
  }
}

App.Parser = Parser;
EOF_PARSER_JS

echo "Writing js/filesystem.js (7/14)..."
cat > "$DIR/js/filesystem.js" << 'EOF_FILESYSTEM_JS'
window.App = window.App || {};

class VirtualFileSystem {
  constructor() {
    this.root = { type: 'dir', name: '/', children: {} };
    this.cwd = '/';
    this.volumeNumber = 254;
    this.volumeName = 'APPLESOFT';
    // Sequential file I/O state
    this.openFiles = {};
    this.maxFiles = 3;
  }

  resolve(path) {
    let p = path.replace(/\\/g, '/');
    if (!p.startsWith('/')) {
      p = this.cwd + (this.cwd.endsWith('/') ? '' : '/') + p;
    }
    const parts = p.split('/').filter(s => s.length > 0);
    const normalized = [];
    for (const part of parts) {
      if (part === '..') { normalized.pop(); }
      else if (part !== '.') { normalized.push(part.toUpperCase()); }
    }
    return '/' + normalized.join('/');
  }

  getNode(path) {
    const abs = this.resolve(path);
    if (abs === '/') return this.root;
    const parts = abs.split('/').filter(s => s.length > 0);
    let node = this.root;
    for (const part of parts) {
      if (!node.children || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  getParentAndName(path) {
    const abs = this.resolve(path);
    const parts = abs.split('/').filter(s => s.length > 0);
    const name = parts.pop();
    const parentPath = '/' + parts.join('/');
    const parent = this.getNode(parentPath || '/');
    return { parent, name };
  }

  // Determine file type from name/content
  static guessFileType(name, content) {
    if (!name) return 'T';
    const upper = name.toUpperCase();
    if (upper.endsWith('.BAS')) return 'A';  // Applesoft
    if (upper.endsWith('.INT')) return 'I';  // Integer BASIC
    if (upper.endsWith('.BIN')) return 'B';  // Binary
    if (upper.endsWith('.TXT')) return 'T';  // Text
    // Check content for line numbers (Applesoft program)
    if (content) {
      const lines = content.split('\n');
      const hasLineNums = lines.length > 0 && lines.every(l => !l.trim() || /^\d+\s/.test(l.trim()));
      if (hasLineNums) return 'A';
    }
    return 'T';
  }

  // Calculate "sectors" from content (like DOS 3.3: ~256 bytes per sector)
  static calcSectors(content) {
    if (!content) return 1;
    return Math.max(1, Math.ceil(content.length / 256));
  }

  mkdir(path) {
    const { parent, name } = this.getParentAndName(path);
    if (!parent || parent.type !== 'dir') return 'PATH NOT FOUND';
    if (!name) return 'SYNTAX ERROR';
    if (parent.children[name]) return 'FILE EXISTS';
    parent.children[name] = { type: 'dir', name, children: {} };
    return null;
  }

  rmdir(path) {
    const { parent, name } = this.getParentAndName(path);
    if (!parent || !name) return 'PATH NOT FOUND';
    const node = parent.children[name];
    if (!node) return 'FILE NOT FOUND';
    if (node.type !== 'dir') return 'NOT A DIRECTORY';
    if (Object.keys(node.children).length > 0) return 'DIRECTORY NOT EMPTY';
    delete parent.children[name];
    return null;
  }

  writeFile(path, content, fileType) {
    const { parent, name } = this.getParentAndName(path);
    if (!parent || parent.type !== 'dir') return 'PATH NOT FOUND';
    if (!name) return 'SYNTAX ERROR';
    const existing = parent.children[name];
    if (existing && existing.type === 'dir') return 'IS A DIRECTORY';
    if (existing && existing.locked) return 'FILE LOCKED';
    const ftype = fileType || VirtualFileSystem.guessFileType(name, content);
    parent.children[name] = {
      type: 'file',
      name,
      content,
      fileType: ftype,
      locked: false,
      sectors: VirtualFileSystem.calcSectors(content)
    };
    return null;
  }

  readFile(path) {
    const node = this.getNode(path);
    if (!node) return { error: 'FILE NOT FOUND' };
    if (node.type !== 'file') return { error: 'NOT A FILE' };
    return { content: node.content, fileType: node.fileType || 'T' };
  }

  deleteFile(path) {
    const { parent, name } = this.getParentAndName(path);
    if (!parent || !name) return 'PATH NOT FOUND';
    if (!parent.children[name]) return 'FILE NOT FOUND';
    if (parent.children[name].type === 'dir') return 'IS A DIRECTORY';
    if (parent.children[name].locked) return 'FILE LOCKED';
    delete parent.children[name];
    return null;
  }

  lockFile(path) {
    const node = this.getNode(path);
    if (!node) return 'FILE NOT FOUND';
    if (node.type !== 'file') return 'NOT A FILE';
    node.locked = true;
    return null;
  }

  unlockFile(path) {
    const node = this.getNode(path);
    if (!node) return 'FILE NOT FOUND';
    if (node.type !== 'file') return 'NOT A FILE';
    node.locked = false;
    return null;
  }

  verifyFile(path) {
    const node = this.getNode(path);
    if (!node) return 'FILE NOT FOUND';
    if (node.type !== 'file') return 'NOT A FILE';
    return null; // File is valid
  }

  rename(oldPath, newPath) {
    const { parent: op, name: on } = this.getParentAndName(oldPath);
    const { parent: np, name: nn } = this.getParentAndName(newPath);
    if (!op || !op.children[on]) return 'FILE NOT FOUND';
    if (op.children[on].locked) return 'FILE LOCKED';
    if (!np || np.type !== 'dir') return 'PATH NOT FOUND';
    np.children[nn] = op.children[on];
    np.children[nn].name = nn;
    if (op !== np || on !== nn) delete op.children[on];
    return null;
  }

  listDir(path) {
    const node = this.getNode(path || this.cwd);
    if (!node) return { error: 'PATH NOT FOUND' };
    if (node.type !== 'dir') return { error: 'NOT A DIRECTORY' };
    return { entries: Object.values(node.children) };
  }

  cd(path) {
    const abs = this.resolve(path);
    const node = this.getNode(abs);
    if (!node) return 'PATH NOT FOUND';
    if (node.type !== 'dir') return 'NOT A DIRECTORY';
    this.cwd = abs || '/';
    return null;
  }

  // === Sequential File I/O (DOS 3.3 style) ===

  openFile(path, mode) {
    if (Object.keys(this.openFiles).length >= this.maxFiles) return 'TOO MANY FILES OPEN';
    const upperPath = this.resolve(path);
    if (this.openFiles[upperPath]) return null; // Already open
    if (mode === 'READ' || mode === 'APPEND') {
      const node = this.getNode(upperPath);
      if (!node) return 'FILE NOT FOUND';
      if (node.type !== 'file') return 'NOT A FILE';
      this.openFiles[upperPath] = {
        path: upperPath,
        mode,
        content: node.content || '',
        position: mode === 'APPEND' ? (node.content || '').length : 0,
        buffer: ''
      };
    } else {
      // WRITE - create or overwrite
      const { parent, name } = this.getParentAndName(upperPath);
      if (!parent || parent.type !== 'dir') return 'PATH NOT FOUND';
      const existing = parent.children[name];
      if (existing && existing.locked) return 'FILE LOCKED';
      this.openFiles[upperPath] = {
        path: upperPath,
        mode: 'WRITE',
        content: '',
        position: 0,
        buffer: ''
      };
    }
    return null;
  }

  closeFile(path) {
    if (!path) {
      // Close all open files
      for (const key of Object.keys(this.openFiles)) {
        this.flushAndClose(key);
      }
      return null;
    }
    const upperPath = this.resolve(path);
    if (!this.openFiles[upperPath]) return null; // Not open - not an error
    this.flushAndClose(upperPath);
    return null;
  }

  flushAndClose(upperPath) {
    const fh = this.openFiles[upperPath];
    if (fh && (fh.mode === 'WRITE' || fh.mode === 'APPEND')) {
      // Write content back to filesystem
      const { parent, name } = this.getParentAndName(fh.path);
      if (parent && parent.type === 'dir') {
        const ftype = VirtualFileSystem.guessFileType(name, fh.content);
        parent.children[name] = {
          type: 'file',
          name,
          content: fh.content,
          fileType: ftype,
          locked: false,
          sectors: VirtualFileSystem.calcSectors(fh.content)
        };
      }
    }
    delete this.openFiles[upperPath];
  }

  writeLine(path, text) {
    const upperPath = this.resolve(path);
    const fh = this.openFiles[upperPath];
    if (!fh) return 'FILE NOT OPEN';
    if (fh.mode === 'READ') return 'NOT OUTPUT FILE';
    fh.content += text + '\n';
    fh.position = fh.content.length;
    return null;
  }

  readLine(path) {
    const upperPath = this.resolve(path);
    const fh = this.openFiles[upperPath];
    if (!fh) return { error: 'FILE NOT OPEN' };
    if (fh.mode === 'WRITE') return { error: 'NOT INPUT FILE' };
    if (fh.position >= fh.content.length) return { error: 'END OF DATA' };
    const nlPos = fh.content.indexOf('\n', fh.position);
    let line;
    if (nlPos === -1) {
      line = fh.content.substring(fh.position);
      fh.position = fh.content.length;
    } else {
      line = fh.content.substring(fh.position, nlPos);
      fh.position = nlPos + 1;
    }
    return { line };
  }

  positionFile(path, record) {
    const upperPath = this.resolve(path);
    const fh = this.openFiles[upperPath];
    if (!fh) return 'FILE NOT OPEN';
    fh.position = Math.max(0, record * 256); // 256 bytes per record
    return null;
  }

  initDisk() {
    // Clear all files (format disk)
    this.root.children = {};
    this.openFiles = {};
    return null;
  }

  // Serialize program to text for saving
  static programToText(program) {
    const lines = Object.keys(program).map(Number).sort((a, b) => a - b);
    return lines.map(n => `${n} ${program[n]}`).join('\n');
  }

  // Parse text back into program lines
  static textToProgram(text) {
    const program = {};
    const lines = text.split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^(\d+)\s+(.*)/);
      if (match) {
        program[parseInt(match[1])] = match[2];
      }
    }
    return program;
  }
}

App.VirtualFileSystem = VirtualFileSystem;
EOF_FILESYSTEM_JS

echo "Writing js/samples.js (8/14)..."
cat > "$DIR/js/samples.js" << 'EOF_SAMPLES_JS'
window.App = window.App || {};

App.getSamples = function() {
  return {
    hello: `
10 REM HELLO WORLD
20 HOME
30 PRINT "HELLO, WORLD!"
40 PRINT
50 PRINT "WELCOME TO APPLESOFT BASIC"
60 PRINT "ON THE APPLE ]["
70 PRINT
80 FOR I = 1 TO 5
90 PRINT "* ";
100 NEXT I
110 PRINT
120 END`,

    fibonacci: `
10 REM FIBONACCI SEQUENCE
20 HOME
30 PRINT "FIBONACCI SEQUENCE"
40 PRINT "=================="
50 PRINT
60 A = 0
70 B = 1
80 FOR I = 1 TO 20
90 PRINT A,
100 C = A + B
110 A = B
120 B = C
130 NEXT I
140 PRINT
150 END`,

    guessing: `
10 REM GUESSING GAME
20 HOME
30 PRINT "NUMBER GUESSING GAME"
40 PRINT "===================="
50 PRINT
60 N = INT(RND(1) * 100) + 1
70 T = 0
80 PRINT "I'M THINKING OF A NUMBER"
90 PRINT "BETWEEN 1 AND 100."
100 PRINT
110 T = T + 1
120 INPUT "YOUR GUESS? ";G
130 IF G < N THEN PRINT "TOO LOW!": GOTO 110
140 IF G > N THEN PRINT "TOO HIGH!": GOTO 110
150 PRINT
160 PRINT "CORRECT! YOU GOT IT IN ";T;" TRIES!"
170 PRINT
180 INPUT "PLAY AGAIN (Y/N)? ";A$
190 IF A$ = "Y" THEN GOTO 20
200 PRINT "THANKS FOR PLAYING!"
210 END`,

    sine: `
10 REM SINE WAVE
20 HOME
30 PRINT "SINE WAVE DISPLAY"
40 PRINT
50 FOR Y = 0 TO 22
60 X = INT(SIN(Y / 3.5) * 18 + 20)
70 FOR I = 1 TO X
80 PRINT " ";
90 NEXT I
100 PRINT "*"
110 NEXT Y
120 END`,

    mandelbrot: `
10 REM MANDELBROT SET
20 HOME
30 PRINT "MANDELBROT SET"
40 PRINT
50 FOR Y = -12 TO 12
60 FOR X = -39 TO 19
70 CA = X * 0.0458
80 CB = Y * 0.08333
90 A = CA : B = CB
100 FOR I = 0 TO 15
110 T = A * A - B * B + CA
120 B = 2 * A * B + CB
130 A = T
140 IF A * A + B * B > 4 THEN GOTO 170
150 NEXT I
160 PRINT "*";: GOTO 180
170 PRINT " ";
180 NEXT X
190 PRINT
200 NEXT Y
210 END`,

    lores_demo: `
10 REM LO-RES GRAPHICS DEMO
20 GR
30 REM DRAW COLOR BARS
40 FOR C = 0 TO 15
50 COLOR= C
60 VLIN 0,39 AT C * 2
70 VLIN 0,39 AT C * 2 + 1
80 NEXT C
90 REM DRAW A BOX
100 COLOR= 15
110 HLIN 5,34 AT 5
120 HLIN 5,34 AT 34
130 VLIN 5,34 AT 5
140 VLIN 5,34 AT 34
150 REM DIAGONAL
160 FOR I = 0 TO 29
170 COLOR= INT(RND(1) * 16)
180 PLOT I + 6,I + 6
190 NEXT I
200 VTAB 22
210 PRINT "LO-RES GRAPHICS DEMO"
220 PRINT "PRESS ANY KEY..."
230 GET A$
240 TEXT
250 END`,

    starfield: `
10 REM STARFIELD ANIMATION
20 HOME
30 DIM X(50),Y(50),S(50)
40 FOR I = 1 TO 50
50 X(I) = INT(RND(1) * 40)
60 Y(I) = INT(RND(1) * 23)
70 S(I) = INT(RND(1) * 3) + 1
80 NEXT I
90 HOME
100 FOR F = 1 TO 100
110 FOR I = 1 TO 50
120 VTAB Y(I) + 1 : HTAB X(I) + 1
130 PRINT " ";
140 X(I) = X(I) + S(I)
150 IF X(I) > 39 THEN X(I) = 0 : Y(I) = INT(RND(1) * 23)
160 VTAB Y(I) + 1 : HTAB X(I) + 1
170 IF S(I) = 1 THEN PRINT ".";
180 IF S(I) = 2 THEN PRINT "+";
190 IF S(I) = 3 THEN PRINT "*";
200 NEXT I
210 NEXT F
220 HOME
230 PRINT "STARFIELD COMPLETE"
240 END`,

    sorting: `
10 REM BUBBLE SORT DEMO
20 HOME
30 PRINT "BUBBLE SORT DEMONSTRATION"
40 PRINT "========================="
50 PRINT
60 N = 15
70 DIM A(15)
80 PRINT "UNSORTED ARRAY:"
90 FOR I = 1 TO N
100 A(I) = INT(RND(1) * 100)
110 PRINT A(I);" ";
120 NEXT I
130 PRINT : PRINT
140 REM BUBBLE SORT
150 FOR I = 1 TO N - 1
160 FOR J = 1 TO N - I
170 IF A(J) > A(J + 1) THEN T = A(J) : A(J) = A(J + 1) : A(J + 1) = T
180 NEXT J
190 NEXT I
200 PRINT "SORTED ARRAY:"
210 FOR I = 1 TO N
220 PRINT A(I);" ";
230 NEXT I
240 PRINT
250 END`,

    '99bottles': `
10 REM 99 BOTTLES OF BEER
20 HOME
30 FOR I = 99 TO 1 STEP -1
40 PRINT I;" BOTTLE";
50 IF I > 1 THEN PRINT "S";
60 PRINT " OF BEER ON THE WALL,"
70 PRINT I;" BOTTLE";
80 IF I > 1 THEN PRINT "S";
90 PRINT " OF BEER."
100 PRINT "TAKE ONE DOWN, PASS IT"
110 PRINT "AROUND,"
120 IF I - 1 > 0 THEN PRINT I - 1;" BOTTLE"; : IF I - 1 > 1 THEN PRINT "S";
130 IF I - 1 = 0 THEN PRINT "NO MORE BOTTLE";: PRINT "S";
140 PRINT " OF BEER ON THE WALL."
150 PRINT
160 NEXT I
170 END`,

    primes: `
10 REM SIEVE OF ERATOSTHENES
20 HOME
30 PRINT "PRIME NUMBER SIEVE"
40 PRINT "=================="
50 PRINT
60 N = 200
70 DIM P(200)
80 FOR I = 2 TO N
90 P(I) = 1
100 NEXT I
110 FOR I = 2 TO SQR(N)
120 IF P(I) = 0 THEN GOTO 160
130 FOR J = I * I TO N STEP I
140 P(J) = 0
150 NEXT J
160 NEXT I
170 PRINT "PRIMES UP TO ";N;":"
180 PRINT
190 C = 0
200 FOR I = 2 TO N
210 IF P(I) = 0 THEN GOTO 250
220 PRINT I;" ";
230 C = C + 1
240 IF C / 10 = INT(C / 10) THEN PRINT
250 NEXT I
260 PRINT
270 PRINT
280 PRINT C;" PRIMES FOUND."
290 END`
  };
};
EOF_SAMPLES_JS

echo "Writing js/tutorial.js (9/14)..."
cat > "$DIR/js/tutorial.js" << 'EOF_TUTORIAL_JS'
window.App = window.App || {};

App.getTutorialPages = function() {
  return [
    // Page 1: Getting Started
    [
      '--- GETTING STARTED ---',
      '',
      'THIS IS AN APPLESOFT BASIC',
      'INTERPRETER WITH A BUILT-IN',
      'VIRTUAL FILE SYSTEM.',
      '',
      'JUST TYPE COMMANDS AT THE ]',
      'PROMPT AND PRESS ENTER.',
      '',
      'TRY TYPING:',
      '  PRINT "HELLO WORLD"',
      '',
      'YOU CAN ALSO DO MATH:',
      '  PRINT 2 + 3 * 4',
      '',
      'TYPE HELP FOR ALL COMMANDS.',
    ],
    // Page 2: Writing Programs
    [
      '--- WRITING PROGRAMS ---',
      '',
      'TO WRITE A PROGRAM, TYPE',
      'EACH LINE WITH A NUMBER:',
      '',
      '  10 HOME',
      '  20 PRINT "HI THERE!"',
      '  30 PRINT "HOW ARE YOU?"',
      '  40 END',
      '',
      'TYPE RUN TO EXECUTE IT.',
      'TYPE LIST TO SEE IT.',
      'TYPE NEW TO CLEAR IT.',
      '',
      'LINES RUN IN NUMBER ORDER.',
      'USE GAPS (10,20,30...) SO',
      'YOU CAN INSERT LINES LATER.',
    ],
    // Page 3: Variables & Input
    [
      '--- VARIABLES & INPUT ---',
      '',
      'VARIABLES STORE VALUES:',
      '  10 A = 5',
      '  20 B$ = "HELLO"',
      '  30 PRINT A',
      '  40 PRINT B$',
      '',
      'USE $ FOR TEXT VARIABLES.',
      '',
      'GET USER INPUT:',
      '  10 INPUT "NAME? ";N$',
      '  20 PRINT "HI, ";N$',
      '',
      'FOR SINGLE KEY:',
      '  10 GET A$',
      '  20 PRINT "YOU TYPED: ";A$',
    ],
    // Page 4: Loops & Conditions
    [
      '--- LOOPS & CONDITIONS ---',
      '',
      'FOR/NEXT LOOP:',
      '  10 FOR I = 1 TO 10',
      '  20 PRINT I;" ";',
      '  30 NEXT I',
      '',
      'IF/THEN:',
      '  10 INPUT "NUMBER? ";N',
      '  20 IF N > 5 THEN PRINT "BIG"',
      '  30 IF N <= 5 THEN PRINT "SMALL"',
      '',
      'GOTO (JUMP TO LINE):',
      '  10 PRINT "LOOP!"',
      '  20 GOTO 10',
      '',
      'CTRL+C TO STOP A LOOP!',
    ],
    // Page 5: Subroutines
    [
      '--- SUBROUTINES ---',
      '',
      'GOSUB CALLS A SUBROUTINE,',
      'RETURN COMES BACK:',
      '',
      '  10 PRINT "START"',
      '  20 GOSUB 100',
      '  30 PRINT "BACK"',
      '  40 END',
      '  100 PRINT "IN SUBROUTINE"',
      '  110 RETURN',
      '',
      'USE ON..GOTO FOR MENUS:',
      '  10 INPUT "CHOICE(1-3)? ";C',
      '  20 ON C GOTO 100,200,300',
    ],
    // Page 6: String Functions
    [
      '--- STRING FUNCTIONS ---',
      '',
      'LEN(A$)      STRING LENGTH',
      'LEFT$(A$,N)  LEFT N CHARS',
      'RIGHT$(A$,N) RIGHT N CHARS',
      'MID$(A$,S,N) MIDDLE CHARS',
      'ASC(A$)      ASCII CODE',
      'CHR$(N)      CODE TO CHAR',
      'VAL(A$)      STRING TO NUM',
      'STR$(N)      NUM TO STRING',
      '',
      'EXAMPLE:',
      '  10 A$ = "HELLO WORLD"',
      '  20 PRINT LEN(A$)',
      '  30 PRINT LEFT$(A$,5)',
      '  40 PRINT MID$(A$,7,5)',
    ],
    // Page 7: Math Functions
    [
      '--- MATH FUNCTIONS ---',
      '',
      'INT(X)  INTEGER PART',
      'ABS(X)  ABSOLUTE VALUE',
      'SGN(X)  SIGN (-1,0,1)',
      'SQR(X)  SQUARE ROOT',
      'RND(X)  RANDOM (0-1)',
      'SIN(X)  SINE',
      'COS(X)  COSINE',
      'TAN(X)  TANGENT',
      'ATN(X)  ARCTANGENT',
      'EXP(X)  E TO THE X',
      'LOG(X)  NATURAL LOG',
      '',
      'RANDOM NUMBER 1-6:',
      '  PRINT INT(RND(1)*6)+1',
    ],
    // Page 8: Graphics
    [
      '--- LO-RES GRAPHICS ---',
      '',
      'GR          GRAPHICS MODE',
      'COLOR= N    SET COLOR (0-15)',
      'PLOT X,Y    DRAW PIXEL',
      'HLIN X1,X2 AT Y  HORIZ LINE',
      'VLIN Y1,Y2 AT X  VERT LINE',
      'TEXT        BACK TO TEXT',
      '',
      'EXAMPLE:',
      '  10 GR',
      '  20 COLOR= 1',
      '  30 FOR X = 0 TO 39',
      '  40 PLOT X,20',
      '  50 NEXT X',
      '  60 GET A$ : TEXT',
    ],
    // Page 9: File System
    [
      '--- FILE SYSTEM ---',
      '',
      'YOUR VIRTUAL DISK:',
      '  CATALOG    LIST FILES',
      '  CD "DIR"   CHANGE DIR',
      '  MKDIR "X"  NEW FOLDER',
      '  RMDIR "X"  DEL FOLDER',
      '  PWD        CURRENT DIR',
      '',
      'FILE COMMANDS:',
      '  SAVE "X"   SAVE PROGRAM',
      '  LOAD "X"   LOAD PROGRAM',
      '  TYPE "X"   VIEW FILE',
      '  DELETE "X"  DELETE FILE',
      '  CREATE "X"  NEW FILE',
      '  RENAME "A","B"  RENAME',
    ],
    // Page 10: Upload/Download & Samples
    [
      '--- UPLOAD & DOWNLOAD ---',
      '',
      'UPLOAD FILES FROM YOUR PC:',
      '  UPLOAD',
      '  (OPENS FILE DIALOG)',
      '',
      'DOWNLOAD FILES TO YOUR PC:',
      '  DOWNLOAD       (PROGRAM)',
      '  DOWNLOAD "X"   (FILE)',
      '',
      '--- SAMPLE PROGRAMS ---',
      '',
      'SAMPLE PROGRAMS ARE IN THE',
      '/SAMPLES DIRECTORY:',
      '  CD "SAMPLES"',
      '  CATALOG',
      '  LOAD "HELLO"',
      '  RUN',
    ],
  ];
};
EOF_TUTORIAL_JS

echo "Writing js/display.js (10/14)..."
cat > "$DIR/js/display.js" << 'EOF_DISPLAY_JS'
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
EOF_DISPLAY_JS

echo "Writing js/claude.js (11/14)..."
cat > "$DIR/js/claude.js" << 'EOF_CLAUDE_JS'
window.App = window.App || {};

class ClaudeAI {
  constructor() {
    this.apiKey = localStorage.getItem('claude_api_key') || '';
    this.model = localStorage.getItem('claude_model') || 'claude-sonnet-4-5-20250929';
    this.conversationHistory = [];
    this.maxHistory = 10;
  }

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('claude_api_key', key);
  }

  getApiKey() {
    return this.apiKey;
  }

  setModel(model) {
    this.model = model;
    localStorage.setItem('claude_model', model);
  }

  getModel() {
    return this.model;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  addToHistory(role, content) {
    this.conversationHistory.push({ role, content });
    if (this.conversationHistory.length > this.maxHistory * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistory * 2);
    }
  }

  getSystemPrompt() {
    return `You are an AI assistant built into an Apple II+ emulator running Applesoft BASIC with DOS 3.3.
You are displayed on a 40-column screen. Keep your answers concise and formatted for 40 characters width.

IMPORTANT FORMATTING RULES:
- Keep lines under 38 characters
- Use short, clear sentences
- Use UPPERCASE for BASIC keywords
- No markdown formatting (no *, #, etc.)
- Use blank lines to separate sections
- For lists, use simple dashes or numbers

You know everything about:
- Apple II, Apple II+, Apple IIe hardware
- Applesoft BASIC programming
- DOS 3.3 and ProDOS commands
- 6502 assembly language
- Retro computing history

Available emulator commands:
PROGRAM: RUN, LIST, NEW, CONT, DEL,
  TRACE, NOTRACE, FP
DISK: CATALOG, SAVE, LOAD, DELETE,
  LOCK, UNLOCK, RENAME, VERIFY, INIT
FILE I/O: OPEN, CLOSE, WRITE, APPEND,
  EXEC, POSITION, BSAVE, BLOAD
DEVICE: PR#, IN#, MON, NOMON
PRODOS: PREFIX, CREATE, CD, PWD
AI: AI KEY, AI MODEL, AI HELP,
  AI NEW, AI WRITE

When asked to write BASIC programs, output ONLY valid Applesoft BASIC numbered lines. No explanations before or after the code unless explicitly asked. Use line numbers starting at 10, incrementing by 10.`;
  }

  getWriteSystemPrompt() {
    return `You are a BASIC program generator for an Apple II+ emulator running Applesoft BASIC.

CRITICAL: Output ONLY numbered Applesoft BASIC program lines.
- No text before or after the program
- No explanations, no comments outside REM
- Line numbers start at 10, increment by 10
- Use valid Applesoft BASIC syntax only
- Max line length: 239 characters
- Available commands: PRINT, INPUT, GOTO,
  GOSUB, RETURN, IF/THEN, FOR/NEXT,
  DIM, READ, DATA, REM, LET, END, STOP,
  HOME, HTAB, VTAB, INVERSE, NORMAL,
  FLASH, TEXT, GR, COLOR=, PLOT, HLIN,
  VLIN, HGR, HCOLOR=, HPLOT,
  PEEK, POKE, CALL, GET, TAB,
  LEFT$, RIGHT$, MID$, LEN, VAL, STR$,
  CHR$, ASC, INT, RND, SQR, ABS, SGN,
  SIN, COS, TAN, ATN, LOG, EXP, FRE,
  POS, SPC, NOT, AND, OR
- String vars end with $, arrays use DIM
- Use HTAB/VTAB for cursor positioning
- Use HOME to clear screen
- Use GET A$ for single keypress input`;
  }

  async *streamMessage(userPrompt, systemPrompt, useHistory) {
    if (!this.apiKey) {
      throw new Error('NO API KEY. USE: AI KEY YOUR-KEY');
    }

    const messages = useHistory
      ? [...this.conversationHistory, { role: 'user', content: userPrompt }]
      : [{ role: 'user', content: userPrompt }];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      let errMsg = 'API ERROR ' + response.status;
      if (response.status === 401) errMsg = 'INVALID API KEY';
      if (response.status === 429) errMsg = 'RATE LIMITED - WAIT';
      if (response.status === 529) errMsg = 'API OVERLOADED - WAIT';
      throw new Error(errMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullResponse += parsed.delta.text;
              yield parsed.delta.text;
            }
          } catch (e) {
            // skip non-JSON lines
          }
        }
      }
    }

    if (useHistory) {
      this.addToHistory('user', userPrompt);
      this.addToHistory('assistant', fullResponse);
    }
  }
}

App.ClaudeAI = ClaudeAI;
EOF_CLAUDE_JS

echo "Writing js/interpreter.js (12/14)..."
cat > "$DIR/js/interpreter.js" << 'EOF_INTERPRETER_JS'
window.App = window.App || {};

class Interpreter {
  constructor(display) {
    this.display = display;
    this.reset();
  }

  reset() {
    this.program = {};
    this.variables = {};
    this.arrays = {};
    this.dataValues = [];
    this.dataPointer = 0;
    this.callStack = [];
    this.forStack = [];
    this.running = false;
    this.stopped = false;
    this.currentLine = 0;
    this.lineIndex = 0;
    this.sortedLines = [];
    this.speed = 0;
    this.inverseMode = false;
    this.flashMode = false;
    this.textMode = true;
    this.loResScreen = null;
    this.loResColor = 0;
    this.hiResColor = 3;
    this.hiResLastX = 0;
    this.hiResLastY = 0;
    this.hiResMode = false;
    this.shapeRotation = 0;
    this.shapeScale = 1;
    this.traceMode = false;
    this.stoppedLineIndex = -1;
    this.stoppedCallStack = null;
    this.stoppedForStack = null;
    this.lastKeyPressed = 0;
    this.lastError = 0;
    this.memory = {};
    this.userFunctions = {};
    this.inputCallback = null;
    this.getCallback = null;
    this.onErrLine = null;
    this.collectData();
  }

  clearVars() {
    this.variables = {};
    this.arrays = {};
    this.dataPointer = 0;
    this.callStack = [];
    this.forStack = [];
    this.userFunctions = {};
    this.inputCallback = null;
    this.getCallback = null;
    this.onErrLine = null;
    this.hiResColor = 3;
    this.hiResLastX = 0;
    this.hiResLastY = 0;
    this.shapeRotation = 0;
    this.shapeScale = 1;
    this.collectData();
  }

  // Collect all DATA statements
  collectData() {
    this.dataValues = [];
    const lines = Object.keys(this.program).map(Number).sort((a, b) => a - b);
    for (const lineNum of lines) {
      const src = this.program[lineNum];
      const dataMatch = src.match(/^\s*DATA\s+(.*)/i);
      if (dataMatch) {
        this.parseDataValues(dataMatch[1]);
      }
      const parts = src.split(':');
      for (let i = 1; i < parts.length; i++) {
        const dm = parts[i].match(/^\s*DATA\s+(.*)/i);
        if (dm) this.parseDataValues(dm[1]);
      }
    }
  }

  parseDataValues(str) {
    let current = '';
    let inQuote = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        this.dataValues.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    this.dataValues.push(current.trim());
  }

  storeLine(lineNum, source) {
    if (source.trim() === '') {
      delete this.program[lineNum];
    } else {
      this.program[lineNum] = source;
    }
    this.sortedLines = Object.keys(this.program).map(Number).sort((a, b) => a - b);
  }

  splitStatements(source) {
    const parts = [];
    let current = '';
    let inQuote = false;
    let i = 0;

    while (i < source.length) {
      const ch = source[i];
      if (ch === '"') {
        inQuote = !inQuote;
        current += ch;
        i++;
        continue;
      }
      if (!inQuote && ch === ':') {
        parts.push(current);
        current = '';
        i++;
        continue;
      }
      if (!inQuote && source.substring(i).match(/^REM(\s|$)/i)) {
        current += source.substring(i);
        i = source.length;
        continue;
      }
      current += ch;
      i++;
    }
    if (current.length > 0) parts.push(current);
    return parts;
  }

  findKeyword(source, keyword) {
    const upper = source.toUpperCase().trim();
    if (upper.startsWith(keyword)) return 0;
    return -1;
  }

  // ===== MAIN RUN LOOP =====
  async run(startLine) {
    this.clearVars();
    this.running = true;
    this.stopped = false;
    this.sortedLines = Object.keys(this.program).map(Number).sort((a, b) => a - b);

    if (this.sortedLines.length === 0) {
      this.running = false;
      return;
    }

    if (startLine !== undefined) {
      this.lineIndex = this.sortedLines.indexOf(startLine);
      if (this.lineIndex === -1) {
        this.display.printLine('?UNDEF\'D STATEMENT ERROR');
        this.running = false;
        return;
      }
    } else {
      this.lineIndex = 0;
    }

    this.stepCount = 0;
    await this.executeLoop();
  }

  async executeLoop() {
    try {
      while (this.running && this.lineIndex < this.sortedLines.length && !this.stopped) {
        this.currentLine = this.sortedLines[this.lineIndex];
        if (this.traceMode) {
          this.display.printString('#' + this.currentLine + ' ');
        }
        const source = this.program[this.currentLine];
        const statements = this.splitStatements(source);

        let jumped = false;
        for (let si = 0; si < statements.length && this.running && !this.stopped; si++) {
          const result = await this.executeStatement(statements[si].trim(), this.currentLine);
          if (result === 'JUMP') { jumped = true; break; }
          if (result === 'STOP' || result === 'END') {
            this.running = false;
            if (result === 'STOP') {
              this.stopped = true;
              this.stoppedLineIndex = this.lineIndex;
              this.stoppedCallStack = [...this.callStack];
              this.stoppedForStack = this.forStack.map(f => ({...f}));
              this.display.printLine(`\nBREAK IN ${this.currentLine}`);
            }
            return;
          }
        }

        if (!jumped && this.running) {
          this.lineIndex++;
        }

        this.stepCount++;
        if (this.stepCount % 100 === 0) {
          await new Promise(r => setTimeout(r, this.speed ? Math.max(1, 255 - this.speed) : 0));
        }
      }
    } catch (e) {
      if (this.onErrLine !== null && this.running) {
        const errLine = this.onErrLine;
        this.onErrLine = null;
        this.lineIndex = this.sortedLines.indexOf(errLine);
        if (this.lineIndex !== -1) {
          await this.executeLoop();
          return;
        }
      }
      if (this.running) {
        this.display.printLine(`\n?${e.message} IN ${this.currentLine}`);
      }
    }
    this.running = false;
  }

  // ===== CONT (Continue after STOP) =====
  async cont() {
    if (this.stoppedLineIndex === -1) {
      this.display.printLine('?CAN\'T CONTINUE ERROR');
      return;
    }
    this.running = true;
    this.stopped = false;
    this.lineIndex = this.stoppedLineIndex + 1;
    if (this.stoppedCallStack) this.callStack = [...this.stoppedCallStack];
    if (this.stoppedForStack) this.forStack = this.stoppedForStack.map(f => ({...f}));
    this.stoppedLineIndex = -1;
    this.stoppedCallStack = null;
    this.stoppedForStack = null;
    this.stepCount = 0;
    await this.executeLoop();
  }

  // ===== EXECUTE A SINGLE STATEMENT =====
  async executeStatement(stmt, lineNum) {
    if (!stmt || stmt.length === 0) return;
    const upperStmt = stmt.toUpperCase().trimStart();

    if (upperStmt.startsWith('REM')) return;

    if (upperStmt.startsWith('PRINT') || upperStmt.startsWith('?')) {
      const argStr = upperStmt.startsWith('PRINT') ? stmt.substring(5) : stmt.substring(1);
      await this.executePrint(argStr.trim());
      return;
    }

    if (upperStmt.startsWith('GOTO')) {
      const target = this.evaluateExpressionFromString(stmt.substring(4).trim());
      this.gotoLine(Math.floor(target));
      return 'JUMP';
    }

    if (upperStmt.startsWith('GOSUB')) {
      const target = this.evaluateExpressionFromString(stmt.substring(5).trim());
      this.callStack.push(this.lineIndex);
      this.gotoLine(Math.floor(target));
      return 'JUMP';
    }

    if (upperStmt.startsWith('RETURN')) {
      if (this.callStack.length === 0) throw new Error('?RETURN WITHOUT GOSUB ERROR');
      this.lineIndex = this.callStack.pop() + 1;
      return 'JUMP';
    }

    if (upperStmt.startsWith('ON')) {
      return await this.executeOn(stmt.substring(2).trim());
    }

    if (upperStmt.startsWith('IF')) {
      return await this.executeIf(stmt.substring(2).trim(), lineNum);
    }

    if (upperStmt.startsWith('FOR')) {
      return this.executeFor(stmt.substring(3).trim());
    }

    if (upperStmt.startsWith('NEXT')) {
      return this.executeNext(stmt.substring(4).trim());
    }

    if (upperStmt.startsWith('LET')) {
      this.executeAssignment(stmt.substring(3).trim());
      return;
    }

    if (upperStmt.startsWith('INPUT')) {
      await this.executeInput(stmt.substring(5).trim());
      return;
    }

    if (upperStmt.startsWith('GET')) {
      await this.executeGet(stmt.substring(3).trim());
      return;
    }

    if (upperStmt.startsWith('DIM')) {
      this.executeDim(stmt.substring(3).trim());
      return;
    }

    if (upperStmt.startsWith('READ')) {
      this.executeRead(stmt.substring(4).trim());
      return;
    }

    if (upperStmt.startsWith('DATA')) return;

    if (upperStmt.startsWith('RESTORE')) {
      this.dataPointer = 0;
      return;
    }

    if (upperStmt.startsWith('DEF')) {
      this.executeDefFn(stmt.substring(3).trim());
      return;
    }

    if (upperStmt === 'END' || upperStmt.startsWith('END')) return 'END';
    if (upperStmt === 'STOP' || upperStmt.startsWith('STOP')) return 'STOP';

    if (upperStmt.startsWith('HOME')) { this.display.clear(); return; }

    if (upperStmt.startsWith('CLEAR') || upperStmt.startsWith('CLR')) {
      this.clearVars();
      return;
    }

    if (upperStmt.startsWith('HTAB')) {
      const val = Math.floor(this.evaluateExpressionFromString(stmt.substring(4).trim()));
      this.display.htab(val);
      return;
    }

    if (upperStmt.startsWith('VTAB')) {
      const val = Math.floor(this.evaluateExpressionFromString(stmt.substring(4).trim()));
      this.display.vtab(val);
      return;
    }

    if (upperStmt.startsWith('SPEED')) {
      const eqPos = stmt.indexOf('=');
      if (eqPos !== -1) {
        this.speed = Math.floor(this.evaluateExpressionFromString(stmt.substring(eqPos + 1).trim()));
      }
      return;
    }

    if (upperStmt.startsWith('NORMAL')) { this.inverseMode = false; this.flashMode = false; this.display.displayMode = 0; return; }
    if (upperStmt.startsWith('INVERSE')) { this.inverseMode = true; this.flashMode = false; this.display.displayMode = 1; return; }
    if (upperStmt.startsWith('FLASH')) { this.flashMode = true; this.inverseMode = false; this.display.displayMode = 2; return; }

    if (upperStmt === 'TEXT' || upperStmt.startsWith('TEXT')) {
      this.textMode = true;
      this.display.showTextMode();
      return;
    }

    if (upperStmt === 'GR' || upperStmt.startsWith('GR')) {
      this.textMode = false;
      this.loResScreen = new Array(App.LORES_HEIGHT).fill(null).map(() => new Array(App.LORES_WIDTH).fill(0));
      this.display.initLoRes();
      return;
    }

    if (upperStmt.startsWith('COLOR')) {
      const eqPos = stmt.indexOf('=');
      if (eqPos !== -1) {
        this.loResColor = Math.floor(this.evaluateExpressionFromString(stmt.substring(eqPos + 1).trim())) & 15;
      }
      return;
    }

    if (upperStmt.startsWith('PLOT')) {
      const args = stmt.substring(4).trim();
      const commaPos = this.findComma(args);
      const x = Math.floor(this.evaluateExpressionFromString(args.substring(0, commaPos).trim()));
      const y = Math.floor(this.evaluateExpressionFromString(args.substring(commaPos + 1).trim()));
      this.loResPlot(x, y);
      return;
    }

    if (upperStmt.startsWith('HLIN')) { return this.executeHlin(stmt.substring(4).trim()); }
    if (upperStmt.startsWith('VLIN')) { return this.executeVlin(stmt.substring(4).trim()); }

    // ===== TRACE / NOTRACE =====
    if (upperStmt.startsWith('TRACE')) { this.traceMode = true; return; }
    if (upperStmt.startsWith('NOTRACE')) { this.traceMode = false; return; }

    // ===== HI-RES GRAPHICS =====
    if (upperStmt === 'HGR' || upperStmt === 'HGR2' || (upperStmt.startsWith('HGR') && !upperStmt.startsWith('HGRAPHICS'))) {
      this.textMode = false;
      this.hiResMode = true;
      this.hiResColor = 3;
      this.display.initHiRes();
      return;
    }

    if (upperStmt.startsWith('HCOLOR')) {
      const eqPos = stmt.indexOf('=');
      if (eqPos !== -1) {
        this.hiResColor = Math.floor(this.evaluateExpressionFromString(stmt.substring(eqPos + 1).trim())) & 7;
      }
      return;
    }

    if (upperStmt.startsWith('HPLOT')) {
      this.executeHplot(stmt.substring(5).trim());
      return;
    }

    // ===== DRAW / XDRAW (shape table stubs) =====
    if (upperStmt.startsWith('DRAW')) {
      // Shape table drawing - stub: requires AT x,y
      return;
    }
    if (upperStmt.startsWith('XDRAW')) {
      // XOR shape table drawing - stub
      return;
    }

    // ===== ROT= / SCALE= =====
    if (upperStmt.startsWith('ROT')) {
      const eqPos = stmt.indexOf('=');
      if (eqPos !== -1) {
        this.shapeRotation = Math.floor(this.evaluateExpressionFromString(stmt.substring(eqPos + 1).trim()));
      }
      return;
    }
    if (upperStmt.startsWith('SCALE')) {
      const eqPos = stmt.indexOf('=');
      if (eqPos !== -1) {
        this.shapeScale = Math.floor(this.evaluateExpressionFromString(stmt.substring(eqPos + 1).trim()));
      }
      return;
    }

    // ===== WAIT (stub) =====
    if (upperStmt.startsWith('WAIT')) return;

    // ===== STORE / RECALL (cassette stubs) =====
    if (upperStmt.startsWith('STORE')) return;
    if (upperStmt.startsWith('RECALL')) return;

    if (upperStmt.startsWith('POKE')) {
      this.executePoke(stmt.substring(4).trim());
      return;
    }
    if (upperStmt.startsWith('CALL')) {
      this.executeCall(stmt.substring(4).trim());
      return;
    }

    if (upperStmt.startsWith('POP')) {
      if (this.callStack.length > 0) this.callStack.pop();
      return;
    }

    if (upperStmt.startsWith('ONERR')) {
      const gotoMatch = stmt.match(/ONERR\s+GOTO\s+(\d+)/i);
      if (gotoMatch) this.onErrLine = parseInt(gotoMatch[1]);
      return;
    }

    if (upperStmt.startsWith('RESUME')) {
      // RESUME continues from the line that caused the error
      return;
    }

    if (this.isAssignment(stmt)) {
      this.executeAssignment(stmt);
      return;
    }

    throw new Error('?SYNTAX ERROR');
  }

  // ===== PRINT =====
  async executePrint(argStr) {
    if (!argStr || argStr.trim().length === 0) {
      this.display.printLine('');
      return;
    }

    const tokens = new App.Tokenizer(argStr).tokens;
    const parser = new App.Parser(tokens);
    let output = '';
    let suppressNewline = false;

    while (parser.peek()) {
      suppressNewline = false;

      if (parser.match('OPERATOR', ';')) { suppressNewline = true; continue; }

      if (parser.match('OPERATOR', ',')) {
        const col = this.display.cursorX;
        const nextTab = Math.ceil((col + 1) / 16) * 16;
        output += ' '.repeat(Math.max(1, nextTab - col));
        suppressNewline = true;
        continue;
      }

      if (parser.peek() && parser.peek().type === 'KEYWORD' && parser.peek().value === 'TAB') {
        parser.advance();
        parser.expect('OPERATOR', '(');
        const tabVal = Math.floor(this.evalAST(parser.parseExpression()));
        parser.expect('OPERATOR', ')');
        this.display.printString(output);
        output = '';
        const spaces = Math.max(0, tabVal - 1 - this.display.cursorX);
        output += ' '.repeat(spaces);
        suppressNewline = true;
        continue;
      }

      if (parser.peek() && parser.peek().type === 'KEYWORD' && parser.peek().value === 'SPC') {
        parser.advance();
        parser.expect('OPERATOR', '(');
        const spcVal = Math.floor(this.evalAST(parser.parseExpression()));
        parser.expect('OPERATOR', ')');
        output += ' '.repeat(Math.max(0, spcVal));
        suppressNewline = true;
        continue;
      }

      const expr = parser.parseExpression();
      const val = this.evalAST(expr);
      if (typeof val === 'string') {
        output += val;
      } else {
        if (val >= 0) {
          output += ' ' + this.formatNumber(val) + ' ';
        } else {
          output += this.formatNumber(val) + ' ';
        }
      }
    }

    this.display.printString(output);
    if (!suppressNewline) {
      this.display.printString('\n');
    }
  }

  formatNumber(n) {
    if (Number.isInteger(n) && Math.abs(n) < 1e10) return n.toString();
    let s = n.toPrecision(9);
    if (s.includes('.')) {
      s = s.replace(/\.?0+$/, '');
    }
    return s;
  }

  // ===== IF/THEN/ELSE =====
  async executeIf(argStr, lineNum) {
    const thenPos = this.findKeywordInString(argStr, 'THEN');
    if (thenPos === -1) throw new Error('?SYNTAX ERROR');

    const condStr = argStr.substring(0, thenPos).trim();
    const afterThen = argStr.substring(thenPos + 4).trim();

    // Split THEN part from ELSE part (respecting quotes)
    let thenPart = afterThen;
    let elsePart = null;
    const elsePos = this.findKeywordInString(afterThen, 'ELSE');
    if (elsePos !== -1) {
      thenPart = afterThen.substring(0, elsePos).trim();
      elsePart = afterThen.substring(elsePos + 4).trim();
    }

    const condVal = this.evaluateExpressionFromString(condStr);
    if (condVal) {
      const trimmed = thenPart.trim();
      if (/^\d+$/.test(trimmed)) {
        this.gotoLine(parseInt(trimmed));
        return 'JUMP';
      }
      const stmts = this.splitStatements(trimmed);
      for (const s of stmts) {
        const result = await this.executeStatement(s.trim(), lineNum);
        if (result === 'JUMP' || result === 'STOP' || result === 'END') return result;
      }
    } else if (elsePart !== null) {
      const trimmed = elsePart.trim();
      if (/^\d+$/.test(trimmed)) {
        this.gotoLine(parseInt(trimmed));
        return 'JUMP';
      }
      const stmts = this.splitStatements(trimmed);
      for (const s of stmts) {
        const result = await this.executeStatement(s.trim(), lineNum);
        if (result === 'JUMP' || result === 'STOP' || result === 'END') return result;
      }
    }
  }

  findKeywordInString(str, keyword) {
    const upper = str.toUpperCase();
    let inQuote = false;
    for (let i = 0; i < upper.length - keyword.length + 1; i++) {
      if (str[i] === '"') { inQuote = !inQuote; continue; }
      if (!inQuote && upper.substring(i, i + keyword.length) === keyword) {
        const before = i > 0 ? upper[i-1] : ' ';
        const after = i + keyword.length < upper.length ? upper[i + keyword.length] : ' ';
        if ((before < 'A' || before > 'Z') && (after < 'A' || after > 'Z')) {
          return i;
        }
      }
    }
    return -1;
  }

  // ===== FOR/NEXT =====
  executeFor(argStr) {
    const tokens = new App.Tokenizer(argStr).tokens;
    const parser = new App.Parser(tokens);

    const varName = parser.expect('IDENTIFIER').value;
    parser.expect('OPERATOR', '=');
    const startVal = this.evalAST(parser.parseExpression());
    parser.expect('KEYWORD', 'TO');
    const endVal = this.evalAST(parser.parseExpression());
    let stepVal = 1;
    if (parser.match('KEYWORD', 'STEP')) {
      stepVal = this.evalAST(parser.parseExpression());
    }

    this.variables[varName] = startVal;
    this.forStack = this.forStack.filter(f => f.varName !== varName);
    this.forStack.push({ varName, endVal, stepVal, lineIndex: this.lineIndex, lineNum: this.currentLine });
  }

  executeNext(argStr) {
    let varName = null;
    if (argStr.trim().length > 0) {
      const tokens = new App.Tokenizer(argStr).tokens;
      if (tokens.length > 0 && tokens[0].type === 'IDENTIFIER') {
        varName = tokens[0].value;
      }
    }

    let forIdx = -1;
    if (varName) {
      for (let i = this.forStack.length - 1; i >= 0; i--) {
        if (this.forStack[i].varName === varName) { forIdx = i; break; }
      }
    } else {
      forIdx = this.forStack.length - 1;
    }

    if (forIdx === -1) throw new Error('?NEXT WITHOUT FOR ERROR');

    const forEntry = this.forStack[forIdx];
    this.variables[forEntry.varName] += forEntry.stepVal;

    const done = forEntry.stepVal > 0
      ? this.variables[forEntry.varName] > forEntry.endVal
      : this.variables[forEntry.varName] < forEntry.endVal;

    if (done) {
      this.forStack.splice(forIdx, 1);
    } else {
      this.lineIndex = forEntry.lineIndex + 1;
      return 'JUMP';
    }
  }

  // ===== ON GOTO/GOSUB =====
  async executeOn(argStr) {
    const isGosub = argStr.toUpperCase().includes('GOSUB');
    const keyword = isGosub ? 'GOSUB' : 'GOTO';
    const keyPos = this.findKeywordInString(argStr, keyword);

    const exprStr = argStr.substring(0, keyPos).trim();
    const targetsStr = argStr.substring(keyPos + keyword.length).trim();

    const val = Math.floor(this.evaluateExpressionFromString(exprStr));
    const targets = targetsStr.split(',').map(t => parseInt(t.trim()));

    if (val >= 1 && val <= targets.length) {
      const target = targets[val - 1];
      if (isGosub) this.callStack.push(this.lineIndex);
      this.gotoLine(target);
      return 'JUMP';
    }
  }

  // ===== INPUT =====
  async executeInput(argStr) {
    let prompt = '? ';
    let varsPart = argStr;

    if (argStr.startsWith('"')) {
      const endQuote = argStr.indexOf('"', 1);
      if (endQuote !== -1) {
        prompt = argStr.substring(1, endQuote);
        varsPart = argStr.substring(endQuote + 1);
        if (varsPart.startsWith(';') || varsPart.startsWith(',')) {
          varsPart = varsPart.substring(1);
        }
        prompt += '? ';
      }
    }

    const varNames = varsPart.split(',').map(v => v.trim().toUpperCase());

    for (const varName of varNames) {
      if (!varName) continue;
      this.display.printString(prompt);
      prompt = '? ';

      const input = await this.waitForInput();
      if (!this.running) return;

      if (varName.endsWith('$')) {
        this.variables[varName] = input;
      } else {
        const num = parseFloat(input);
        this.variables[varName] = isNaN(num) ? 0 : num;
      }
    }
  }

  // ===== GET =====
  async executeGet(argStr) {
    const varName = argStr.trim().toUpperCase();
    const key = await this.waitForKey();
    if (!this.running) return;

    if (varName.endsWith('$')) {
      this.variables[varName] = key;
    } else {
      this.variables[varName] = key.charCodeAt(0);
    }
  }

  waitForInput() {
    return new Promise((resolve) => {
      this.inputCallback = resolve;
      this.display.setInputMode(true);
    });
  }

  waitForKey() {
    return new Promise((resolve) => {
      this.getCallback = resolve;
      this.display.setGetMode(true);
    });
  }

  provideInput(text) {
    if (this.inputCallback) {
      const cb = this.inputCallback;
      this.inputCallback = null;
      this.display.setInputMode(false);
      cb(text);
    }
  }

  provideKey(key) {
    if (this.getCallback) {
      const cb = this.getCallback;
      this.getCallback = null;
      this.display.setGetMode(false);
      cb(key);
    }
  }

  // ===== DIM =====
  executeDim(argStr) {
    const parts = this.splitByCommaTopLevel(argStr);
    for (const part of parts) {
      const match = part.trim().match(/^([A-Z][A-Z0-9]*\$?)\s*\((.+)\)$/i);
      if (!match) throw new Error('?SYNTAX ERROR');
      const name = match[1].toUpperCase();
      const dims = match[2].split(',').map(d => Math.floor(this.evaluateExpressionFromString(d.trim())));
      this.createArray(name, dims);
    }
  }

  createArray(name, dims) {
    const isString = name.endsWith('$');
    const totalSize = dims.reduce((a, d) => a * (d + 1), 1);
    this.arrays[name] = {
      dims: dims.map(d => d + 1),
      data: new Array(totalSize).fill(isString ? '' : 0)
    };
  }

  getArrayElement(name, indices) {
    if (!this.arrays[name]) {
      this.createArray(name, indices.map(() => 10));
    }
    const arr = this.arrays[name];
    const idx = this.calcArrayIndex(arr, indices);
    return arr.data[idx];
  }

  setArrayElement(name, indices, value) {
    if (!this.arrays[name]) {
      this.createArray(name, indices.map(() => 10));
    }
    const arr = this.arrays[name];
    const idx = this.calcArrayIndex(arr, indices);
    arr.data[idx] = value;
  }

  calcArrayIndex(arr, indices) {
    if (indices.length !== arr.dims.length) throw new Error('?BAD SUBSCRIPT ERROR');
    let idx = 0;
    let multiplier = 1;
    for (let i = indices.length - 1; i >= 0; i--) {
      const index = Math.floor(indices[i]);
      if (index < 0 || index >= arr.dims[i]) throw new Error('?BAD SUBSCRIPT ERROR');
      idx += index * multiplier;
      multiplier *= arr.dims[i];
    }
    return idx;
  }

  // ===== READ =====
  executeRead(argStr) {
    const varNames = argStr.split(',').map(v => v.trim().toUpperCase());
    for (const varName of varNames) {
      if (!varName) continue;
      if (this.dataPointer >= this.dataValues.length) throw new Error('?OUT OF DATA ERROR');
      const val = this.dataValues[this.dataPointer++];
      if (varName.endsWith('$')) {
        this.variables[varName] = val;
      } else {
        const num = parseFloat(val);
        this.variables[varName] = isNaN(num) ? 0 : num;
      }
    }
  }

  // ===== DEF FN =====
  executeDefFn(argStr) {
    const match = argStr.match(/^FN\s*([A-Z][A-Z0-9]*)\s*\(([A-Z][A-Z0-9]*)\)\s*=\s*(.*)/i);
    if (!match) throw new Error('?SYNTAX ERROR');
    this.userFunctions[match[1].toUpperCase()] = {
      param: match[2].toUpperCase(),
      body: match[3]
    };
  }

  // ===== LO-RES GRAPHICS =====
  loResPlot(x, y) {
    if (!this.loResScreen) return;
    if (x < 0 || x >= App.LORES_WIDTH || y < 0 || y >= App.LORES_GRAPHICS_ROWS) return;
    this.loResScreen[y][x] = this.loResColor;
    this.display.drawLoResPixel(x, y, this.loResColor);
  }

  executeHlin(argStr) {
    const atPos = this.findKeywordInString(argStr, 'AT');
    if (atPos === -1) throw new Error('?SYNTAX ERROR');
    const xyPart = argStr.substring(0, atPos).trim();
    const yStr = argStr.substring(atPos + 2).trim();
    const commaPos = this.findComma(xyPart);
    const x1 = Math.floor(this.evaluateExpressionFromString(xyPart.substring(0, commaPos).trim()));
    const x2 = Math.floor(this.evaluateExpressionFromString(xyPart.substring(commaPos + 1).trim()));
    const y = Math.floor(this.evaluateExpressionFromString(yStr));
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      this.loResPlot(x, y);
    }
  }

  executeVlin(argStr) {
    const atPos = this.findKeywordInString(argStr, 'AT');
    if (atPos === -1) throw new Error('?SYNTAX ERROR');
    const yyPart = argStr.substring(0, atPos).trim();
    const xStr = argStr.substring(atPos + 2).trim();
    const commaPos = this.findComma(yyPart);
    const y1 = Math.floor(this.evaluateExpressionFromString(yyPart.substring(0, commaPos).trim()));
    const y2 = Math.floor(this.evaluateExpressionFromString(yyPart.substring(commaPos + 1).trim()));
    const x = Math.floor(this.evaluateExpressionFromString(xStr));
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      this.loResPlot(x, y);
    }
  }

  // ===== POKE =====
  executePoke(argStr) {
    const commaPos = this.findComma(argStr);
    if (commaPos === -1) return;
    const addr = Math.floor(this.evaluateExpressionFromString(argStr.substring(0, commaPos).trim()));
    const val = Math.floor(this.evaluateExpressionFromString(argStr.substring(commaPos + 1).trim())) & 255;
    // Normalize negative addresses to unsigned 16-bit
    const uaddr = addr < 0 ? addr + 65536 : addr;

    // Text window control
    if (uaddr === 32) { /* left edge - ignored */ return; }
    if (uaddr === 33) { this.display.textWidth = val; return; }
    if (uaddr === 34) { this.display.scrollTop = val; return; }
    if (uaddr === 35) { this.display.scrollBottom = val; return; }
    if (uaddr === 36) { this.display.cursorX = val; return; }
    if (uaddr === 37) { this.display.cursorY = val; return; }

    // Keyboard strobe clear
    if (uaddr === 49168) { this.lastKeyPressed = 0; return; }

    // Graphics soft switches
    if (uaddr === 49232) { /* TEXT mode */ this.textMode = true; this.display.showTextMode(); return; }
    if (uaddr === 49233) { /* GRAPHICS mode */ return; }
    if (uaddr === 49234) { /* full screen */ return; }
    if (uaddr === 49235) { /* mixed mode */ return; }
    if (uaddr === 49236) { /* page 1 */ return; }
    if (uaddr === 49237) { /* page 2 */ return; }
    if (uaddr === 49238) { /* lo-res */ return; }
    if (uaddr === 49239) { /* hi-res */ return; }

    // Speaker click (toggle speaker for sound)
    if (uaddr === 49200) { App.beep(10, 440); return; }

    // Store in virtual memory for PEEK to read back
    if (!this.memory) this.memory = {};
    this.memory[uaddr] = val;
  }

  // ===== CALL =====
  executeCall(argStr) {
    const addr = Math.floor(this.evaluateExpressionFromString(argStr));
    const uaddr = addr < 0 ? addr + 65536 : addr;

    // CALL -936 / CALL 64600: Clear from cursor to end of screen
    if (uaddr === 64600) {
      this.display.clearToEnd();
      return;
    }

    // CALL -958 / CALL 64578: HOME (clear screen)
    if (uaddr === 64578) {
      this.display.clear();
      return;
    }

    // CALL -868 / CALL 64668: Clear to end of line
    if (uaddr === 64668) {
      this.display.clearToEndOfLine();
      return;
    }

    // CALL -922 / CALL 64614: Line feed
    if (uaddr === 64614) {
      this.display.printChar('\n');
      this.display.render();
      return;
    }

    // CALL 62450: Clear hi-res screen to black
    if (uaddr === 62450) {
      if (this.hiResMode) {
        this.display.ctx.fillStyle = '#000000';
        this.display.ctx.fillRect(0, 0, App.HIRES_WIDTH, App.HIRES_HEIGHT);
      }
      return;
    }

    // CALL 62454: Clear hi-res screen to current HCOLOR
    if (uaddr === 62454) {
      if (this.hiResMode) {
        this.display.ctx.fillStyle = App.HIRES_COLORS[this.hiResColor & 7];
        this.display.ctx.fillRect(0, 0, App.HIRES_WIDTH, App.HIRES_HEIGHT);
      }
      return;
    }

    // Unknown CALL - silently ignore
  }

  // ===== HPLOT =====
  executeHplot(argStr) {
    if (!argStr || argStr.trim().length === 0) return;
    const upper = argStr.toUpperCase().trim();

    // HPLOT TO x,y [TO x,y ...] - draw from last position
    if (upper.startsWith('TO')) {
      const segments = argStr.split(/\bTO\b/i).filter(s => s.trim().length > 0);
      for (const seg of segments) {
        const commaPos = this.findComma(seg.trim());
        const x = Math.floor(this.evaluateExpressionFromString(seg.trim().substring(0, commaPos).trim()));
        const y = Math.floor(this.evaluateExpressionFromString(seg.trim().substring(commaPos + 1).trim()));
        this.display.drawHiResLine(this.hiResLastX, this.hiResLastY, x, y, this.hiResColor);
        this.hiResLastX = x;
        this.hiResLastY = y;
      }
      return;
    }

    // HPLOT x,y [TO x,y ...]
    const parts = argStr.split(/\bTO\b/i);
    const firstPart = parts[0].trim();
    const commaPos = this.findComma(firstPart);
    const x1 = Math.floor(this.evaluateExpressionFromString(firstPart.substring(0, commaPos).trim()));
    const y1 = Math.floor(this.evaluateExpressionFromString(firstPart.substring(commaPos + 1).trim()));

    if (parts.length === 1) {
      // Single point
      this.display.drawHiResPixel(x1, y1, this.hiResColor);
      this.hiResLastX = x1;
      this.hiResLastY = y1;
    } else {
      // First point then lines
      this.display.drawHiResPixel(x1, y1, this.hiResColor);
      this.hiResLastX = x1;
      this.hiResLastY = y1;
      for (let i = 1; i < parts.length; i++) {
        const seg = parts[i].trim();
        const cp = this.findComma(seg);
        const x = Math.floor(this.evaluateExpressionFromString(seg.substring(0, cp).trim()));
        const y = Math.floor(this.evaluateExpressionFromString(seg.substring(cp + 1).trim()));
        this.display.drawHiResLine(this.hiResLastX, this.hiResLastY, x, y, this.hiResColor);
        this.hiResLastX = x;
        this.hiResLastY = y;
      }
    }
  }

  // ===== ASSIGNMENT =====
  isAssignment(stmt) {
    const tokens = new App.Tokenizer(stmt).tokens;
    if (tokens.length >= 2 && tokens[0].type === 'IDENTIFIER') {
      for (let i = 1; i < tokens.length; i++) {
        if (tokens[i].type === 'OPERATOR' && tokens[i].value === '=') return true;
        if (tokens[i].type === 'OPERATOR' && tokens[i].value === '(') {
          let depth = 1;
          i++;
          while (i < tokens.length && depth > 0) {
            if (tokens[i].value === '(') depth++;
            if (tokens[i].value === ')') depth--;
            i++;
          }
          if (i < tokens.length && tokens[i].type === 'OPERATOR' && tokens[i].value === '=') return true;
          return false;
        }
      }
    }
    return false;
  }

  executeAssignment(stmt) {
    const tokens = new App.Tokenizer(stmt).tokens;
    const parser = new App.Parser(tokens);

    const varToken = parser.expect('IDENTIFIER');
    const varName = varToken.value;

    if (parser.match('OPERATOR', '(')) {
      const indices = [this.evalAST(parser.parseExpression())];
      while (parser.match('OPERATOR', ',')) {
        indices.push(this.evalAST(parser.parseExpression()));
      }
      parser.expect('OPERATOR', ')');
      parser.expect('OPERATOR', '=');
      const value = this.evalAST(parser.parseExpression());
      this.setArrayElement(varName, indices.map(Math.floor), value);
      return;
    }

    parser.expect('OPERATOR', '=');
    const value = this.evalAST(parser.parseExpression());
    this.variables[varName] = value;
  }

  // ===== EXPRESSION EVALUATION =====
  evaluateExpressionFromString(str) {
    const tokens = new App.Tokenizer(str).tokens;
    const parser = new App.Parser(tokens);
    return this.evalAST(parser.parseExpression());
  }

  evalAST(node) {
    if (!node) return 0;

    switch (node.type) {
      case 'number': return node.value;
      case 'string': return node.value;
      case 'variable': return this.getVariable(node.name);
      case 'array_access': {
        const indices = node.indices.map(i => Math.floor(this.evalAST(i)));
        return this.getArrayElement(node.name, indices);
      }
      case 'binary': return this.evalBinary(node);
      case 'unary': return this.evalUnary(node);
      case 'builtin_call': return this.evalBuiltin(node.name, node.args.map(a => this.evalAST(a)));
      case 'fn_call': return this.evalUserFn(node.name, this.evalAST(node.arg));
      default: throw new Error('?SYNTAX ERROR');
    }
  }

  getVariable(name) {
    if (name in this.variables) return this.variables[name];
    return name.endsWith('$') ? '' : 0;
  }

  evalBinary(node) {
    const left = this.evalAST(node.left);
    const right = this.evalAST(node.right);

    if (node.op === '+' && (typeof left === 'string' || typeof right === 'string')) {
      return String(left) + String(right);
    }

    if (typeof left === 'string' && typeof right === 'string') {
      switch (node.op) {
        case '=': return left === right ? 1 : 0;
        case '<>': case '><': return left !== right ? 1 : 0;
        case '<': return left < right ? 1 : 0;
        case '>': return left > right ? 1 : 0;
        case '<=': case '=<': return left <= right ? 1 : 0;
        case '>=': case '=>': return left >= right ? 1 : 0;
      }
    }

    const l = Number(left);
    const r = Number(right);

    switch (node.op) {
      case '+': return l + r;
      case '-': return l - r;
      case '*': return l * r;
      case '/':
        if (r === 0) throw new Error('?DIVISION BY ZERO ERROR');
        return l / r;
      case '^': return Math.pow(l, r);
      case '=': return l === r ? 1 : 0;
      case '<>': case '><': return l !== r ? 1 : 0;
      case '<': return l < r ? 1 : 0;
      case '>': return l > r ? 1 : 0;
      case '<=': case '=<': return l <= r ? 1 : 0;
      case '>=': case '=>': return l >= r ? 1 : 0;
      case 'AND': return (l && r) ? 1 : 0;
      case 'OR': return (l || r) ? 1 : 0;
      default: throw new Error('?SYNTAX ERROR');
    }
  }

  evalUnary(node) {
    const val = this.evalAST(node.expr);
    switch (node.op) {
      case '-': return -Number(val);
      case 'NOT': return val ? 0 : 1;
      default: throw new Error('?SYNTAX ERROR');
    }
  }

  evalBuiltin(name, args) {
    switch (name) {
      case 'RND': {
        const n = args[0];
        if (n < 0) return Math.abs(Math.sin(n * 9301 + 49297) % 1);
        return Math.random();
      }
      case 'INT': return Math.floor(args[0]);
      case 'ABS': return Math.abs(args[0]);
      case 'SGN': return Math.sign(args[0]);
      case 'SQR': return Math.sqrt(args[0]);
      case 'SIN': return Math.sin(args[0]);
      case 'COS': return Math.cos(args[0]);
      case 'TAN': return Math.tan(args[0]);
      case 'ATN': return Math.atan(args[0]);
      case 'EXP': return Math.exp(args[0]);
      case 'LOG': {
        if (args[0] <= 0) throw new Error('?ILLEGAL QUANTITY ERROR');
        return Math.log(args[0]);
      }
      case 'LEN': return String(args[0]).length;
      case 'LEFT$': return String(args[0]).substring(0, Math.floor(args[1]));
      case 'RIGHT$': {
        const s = String(args[0]);
        return s.substring(s.length - Math.floor(args[1]));
      }
      case 'MID$': {
        const s = String(args[0]);
        const start = Math.floor(args[1]) - 1;
        const len = args.length > 2 ? Math.floor(args[2]) : s.length;
        return s.substring(start, start + len);
      }
      case 'CHR$': return String.fromCharCode(Math.floor(args[0]));
      case 'ASC': {
        const s = String(args[0]);
        if (s.length === 0) throw new Error('?ILLEGAL QUANTITY ERROR');
        return s.charCodeAt(0);
      }
      case 'VAL': return parseFloat(args[0]) || 0;
      case 'STR$': {
        const n = args[0];
        return n >= 0 ? ' ' + String(n) : String(n);
      }
      case 'POS': return this.display.cursorX;
      case 'SCRN': {
        if (!this.loResScreen) return 0;
        const x = Math.floor(args[0]);
        const y = Math.floor(args[1]);
        if (x >= 0 && x < App.LORES_WIDTH && y >= 0 && y < App.LORES_GRAPHICS_ROWS) {
          return this.loResScreen[y][x];
        }
        return 0;
      }
      case 'PDL': return Math.floor(Math.random() * 256);
      case 'FRE': return 38911;
      case 'PEEK': {
        const addr = Math.floor(args[0]);
        const uaddr = addr < 0 ? addr + 65536 : addr;
        // Cursor position
        if (uaddr === 36) return this.display.cursorX;
        if (uaddr === 37) return this.display.cursorY;
        // Text window
        if (uaddr === 32) return 0; // left edge
        if (uaddr === 33) return this.display.textWidth || 40; // text width
        if (uaddr === 34) return this.display.scrollTop || 0;
        if (uaddr === 35) return this.display.scrollBottom || 24;
        // Keyboard
        if (uaddr === 49152) return this.lastKeyPressed ? (this.lastKeyPressed | 128) : 0;
        if (uaddr === 49168) return 0; // keyboard strobe
        // Current line number (low/high bytes)
        if (uaddr === 218) return this.currentLine & 255;
        if (uaddr === 219) return (this.currentLine >> 8) & 255;
        // Error code (ONERR)
        if (uaddr === 222) return this.lastError || 0;
        // Graphics mode
        if (uaddr === 230) return this.hiResColor;
        // Random seed area
        if (uaddr >= 78 && uaddr <= 82) return Math.floor(Math.random() * 256);
        // Version info
        if (uaddr === 0) return 76; // JMP instruction (Apple II ROM)
        // Check virtual memory
        if (this.memory && this.memory[uaddr] !== undefined) return this.memory[uaddr];
        return 0;
      }
      case 'TAB': return ' '.repeat(Math.max(0, Math.floor(args[0])));
      case 'SPC': return ' '.repeat(Math.max(0, Math.floor(args[0])));
      case 'USR': return 0; // stub - no machine language support
      default: throw new Error('?ILLEGAL QUANTITY ERROR');
    }
  }

  evalUserFn(name, argVal) {
    const fn = this.userFunctions[name];
    if (!fn) throw new Error('?UNDEF\'D FUNCTION ERROR');
    const savedVal = this.variables[fn.param];
    this.variables[fn.param] = argVal;
    const result = this.evaluateExpressionFromString(fn.body);
    this.variables[fn.param] = savedVal;
    return result;
  }

  // ===== HELPERS =====
  gotoLine(lineNum) {
    const idx = this.sortedLines.indexOf(lineNum);
    if (idx === -1) throw new Error('?UNDEF\'D STATEMENT ERROR');
    this.lineIndex = idx;
  }

  findComma(str) {
    let depth = 0;
    let inQuote = false;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '"') inQuote = !inQuote;
      if (!inQuote) {
        if (str[i] === '(') depth++;
        if (str[i] === ')') depth--;
        if (str[i] === ',' && depth === 0) return i;
      }
    }
    return -1;
  }

  splitByCommaTopLevel(str) {
    const result = [];
    let current = '';
    let depth = 0;
    let inQuote = false;
    for (const ch of str) {
      if (ch === '"') inQuote = !inQuote;
      if (!inQuote) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) {
          result.push(current);
          current = '';
          continue;
        }
      }
      current += ch;
    }
    result.push(current);
    return result;
  }
}

App.Interpreter = Interpreter;
EOF_INTERPRETER_JS

echo "Writing js/emulator.js (13/14)..."
cat > "$DIR/js/emulator.js" << 'EOF_EMULATOR_JS'
window.App = window.App || {};

class Emulator {
  constructor() {
    this.displayElement = document.getElementById('text-display');
    this.canvasElement = document.getElementById('lores-canvas');
    this.fileUpload = document.getElementById('file-upload');
    this.display = new App.Display(this.displayElement, this.canvasElement);
    this.interpreter = new App.Interpreter(this.display);
    this.fs = new App.VirtualFileSystem();
    this.ai = new App.ClaudeAI();
    this.inputBuffer = '';
    this.commandMode = true;
    this.setupInput();
    this.setupFileUpload();
    this.installSamples();
    this.boot();
  }

  boot() {
    this.display.clear();
    this.display.printLine('APPLE ][ BASIC OS');
    this.display.printLine('APPLESOFT BASIC INTERPRETER');
    this.display.printLine('(C) 2026 - JAVASCRIPT EDITION');
    this.display.printLine('');
    this.display.printLine('DISK VOLUME ' + this.fs.volumeNumber);
    this.display.printLine('TYPE "HELP" FOR COMMANDS');
    this.display.printLine('TYPE "AI HELP" FOR CLAUDE AI');
    this.display.printLine('TYPE "CATALOG" FOR DISK CONTENTS');
    this.display.printLine('');
    this.display.printLine('READY.');
    this.showPrompt();
    App.beep(100, 1000);
  }

  showPrompt() {
    this.display.printString(']');
    this.inputBuffer = '';
    this.commandMode = true;
  }

  // ===== INPUT HANDLING =====

  setupInput() {
    document.addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      if (tag === 'SELECT' || tag === 'BUTTON') return;
      this.handleKeyDown(e);
    });
  }

  handleKeyDown(e) {
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      this.ctrlC();
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (this.interpreter.getCallback) {
      e.preventDefault();
      const key = e.key.length === 1 ? e.key.toUpperCase() : '';
      if (key) this.interpreter.provideKey(key);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      this.display.printString('\n');

      if (this.interpreter.inputCallback) {
        this.interpreter.provideInput(this.inputBuffer);
        this.inputBuffer = '';
        return;
      }

      const line = this.inputBuffer.trim();
      this.inputBuffer = '';
      if (line.length > 0) {
        this.processLine(line);
      } else {
        this.showPrompt();
      }
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.display.printChar('\x08');
        this.display.render();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.inputBuffer = '';
      this.display.printString('\n');
      this.showPrompt();
      return;
    }

    if (e.key.length > 1) return;

    e.preventDefault();
    const ch = e.key.toUpperCase();
    this.inputBuffer += ch;
    this.interpreter.lastKeyPressed = ch.charCodeAt(0);
    this.display.printChar(ch);
    this.display.render();
  }

  // ===== FILE UPLOAD =====

  setupFileUpload() {
    this.fileUpload.addEventListener('change', (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      let loaded = 0;
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target.result;
          const name = file.name.toUpperCase().replace(/[^A-Z0-9._]/g, '');
          const err = this.fs.writeFile(name || 'UPLOAD.BAS', content);
          loaded++;
          if (err) {
            this.display.printLine(err);
          } else {
            this.display.printLine('UPLOADED: ' + (name || 'UPLOAD.BAS'));
          }
          if (loaded === files.length) {
            this.showPrompt();
          }
        };
        reader.readAsText(file);
      }
      e.target.value = '';
    });
  }

  installSamples() {
    this.fs.mkdir('/SAMPLES');
    const samples = App.getSamples();
    for (const [name, code] of Object.entries(samples)) {
      this.fs.writeFile('/SAMPLES/' + name.toUpperCase() + '.BAS', code.trim());
    }
  }

  // ===== COMMAND PROCESSING =====

  extractQuotedArg(str) {
    const m = str.match(/"([^"]*)"/);
    return m ? m[1].toUpperCase() : str.trim().toUpperCase();
  }

  async processLine(line) {
    const upper = line.toUpperCase().trim();

    // Line number -> store program line
    const lineNumMatch = upper.match(/^(\d+)\s*(.*)/);
    if (lineNumMatch) {
      this.interpreter.storeLine(parseInt(lineNumMatch[1]), lineNumMatch[2]);
      this.showPrompt();
      return;
    }

    // === BASIC Program Commands ===
    if (upper === 'RUN' || upper.startsWith('RUN ')) {
      const arg = upper.substring(3).trim();
      const startLine = arg ? parseInt(arg) : undefined;
      await this.runProgram(startLine);
      return;
    }

    if (upper === 'CONT') {
      this.commandMode = false;
      try {
        await this.interpreter.cont();
      } catch (e) {
        this.display.printLine('\n' + e.message);
      }
      this.display.printString('\n');
      this.showPrompt();
      return;
    }

    if (upper === 'TRACE') {
      this.interpreter.traceMode = true;
      this.display.printLine('TRACE ON');
      this.showPrompt();
      return;
    }

    if (upper === 'NOTRACE') {
      this.interpreter.traceMode = false;
      this.display.printLine('TRACE OFF');
      this.showPrompt();
      return;
    }

    if (upper === 'LIST' || upper.startsWith('LIST ') || upper.startsWith('LIST-')) {
      await this.listProgram(upper === 'LIST' ? '' : upper.substring(4).trim());
      this.showPrompt();
      return;
    }

    if (upper === 'NEW') {
      this.interpreter.program = {};
      this.interpreter.sortedLines = [];
      this.interpreter.clearVars();
      this.display.printLine('');
      this.showPrompt();
      return;
    }

    // DEL - delete program lines (DEL 10,100 or DEL 10-100)
    if (upper.startsWith('DEL ') || upper.startsWith('DEL,')) {
      this.cmdDelLines(upper.substring(3).trim());
      this.showPrompt();
      return;
    }

    // FP (switch to Applesoft - already there)
    if (upper === 'FP') { this.showPrompt(); return; }

    // === DOS 3.3 Disk Commands ===
    if (await this.handleDosCommand(upper)) return;

    // === System Commands ===
    if (upper === 'RESET') { this.reset(); return; }
    if (upper === 'HELP') { await this.showHelp(); this.showPrompt(); return; }

    if (upper === 'TUTORIAL' || upper.startsWith('TUTORIAL ')) {
      const pageArg = upper.substring(8).trim();
      await this.showTutorial(pageArg ? parseInt(pageArg) : 1);
      this.showPrompt();
      return;
    }

    // === Claude AI Commands ===
    if (upper === 'AI' || upper.startsWith('AI ')) {
      await this.handleAiCommand(upper);
      return;
    }

    // Try as immediate BASIC statement
    try {
      this.interpreter.running = true;
      this.interpreter.stopped = false;
      this.interpreter.currentLine = 0;
      await this.interpreter.executeStatement(upper, 0);
      this.interpreter.running = false;
    } catch (e) {
      this.interpreter.running = false;
      this.display.printLine(e.message);
    }
    this.showPrompt();
  }

  // ===== DOS 3.3 COMMAND HANDLER =====

  async handleDosCommand(upper) {

    // CATALOG / CAT
    if (upper === 'CATALOG' || upper === 'CAT' ||
        upper.startsWith('CATALOG ') || upper.startsWith('CAT ')) {
      const arg = upper.replace(/^(CATALOG|CAT)\s*/, '').trim();
      const path = arg ? this.extractQuotedArg(arg) : '';
      await this.cmdCatalog(path);
      this.showPrompt();
      return true;
    }

    // SAVE
    if (upper === 'SAVE' || upper.startsWith('SAVE ')) {
      if (upper === 'SAVE') {
        this.display.printLine('?SYNTAX ERROR');
      } else {
        const path = this.extractQuotedArg(upper.substring(5));
        const fname = path.endsWith('.BAS') ? path : path + '.BAS';
        const content = App.VirtualFileSystem.programToText(this.interpreter.program);
        const err = this.fs.writeFile(fname, content, 'A');
        if (err) this.display.printLine('?' + err);
      }
      this.showPrompt();
      return true;
    }

    // LOAD
    if (upper === 'LOAD' || upper.startsWith('LOAD ')) {
      if (upper === 'LOAD') {
        this.display.printLine('?SYNTAX ERROR');
      } else {
        this.cmdLoad(this.extractQuotedArg(upper.substring(5)));
      }
      this.showPrompt();
      return true;
    }

    // DELETE
    if (upper.startsWith('DELETE ')) {
      const path = this.extractQuotedArg(upper.substring(7));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.deleteFile(fpath);
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // LOCK
    if (upper.startsWith('LOCK ')) {
      const path = this.extractQuotedArg(upper.substring(5));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.lockFile(fpath);
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // UNLOCK
    if (upper.startsWith('UNLOCK ')) {
      const path = this.extractQuotedArg(upper.substring(7));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.unlockFile(fpath);
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // RENAME
    if (upper.startsWith('RENAME ')) {
      const parts = upper.substring(7).split(',');
      if (parts.length !== 2) {
        this.display.printLine('?SYNTAX ERROR');
      } else {
        const oldName = this.resolveWithExt(this.extractQuotedArg(parts[0]));
        const newName = this.extractQuotedArg(parts[1]);
        const err = this.fs.rename(oldName, newName);
        if (err) this.display.printLine('?' + err);
      }
      this.showPrompt();
      return true;
    }

    // VERIFY
    if (upper.startsWith('VERIFY ')) {
      const path = this.extractQuotedArg(upper.substring(7));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.verifyFile(fpath);
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // INIT - format disk (with confirmation)
    if (upper === 'INIT' || upper.startsWith('INIT ')) {
      this.fs.initDisk();
      this.installSamples();
      this.display.printLine('DISK INITIALIZED');
      this.showPrompt();
      return true;
    }

    // MAXFILES
    if (upper.startsWith('MAXFILES ') || upper.startsWith('MAXFILES=')) {
      const val = parseInt(upper.replace(/^MAXFILES\s*=?\s*/, ''));
      if (val >= 1 && val <= 16) {
        this.fs.maxFiles = val;
      } else {
        this.display.printLine('?ILLEGAL QUANTITY ERROR');
      }
      this.showPrompt();
      return true;
    }

    // PR# / IN# (slot select)
    if (upper.startsWith('PR#')) {
      const slot = parseInt(upper.substring(3).trim());
      if (isNaN(slot) || slot < 0 || slot > 7) {
        this.display.printLine('?ILLEGAL QUANTITY ERROR');
      }
      // PR#0 = screen (default), others = no device
      this.showPrompt();
      return true;
    }
    if (upper.startsWith('IN#')) {
      const slot = parseInt(upper.substring(3).trim());
      if (isNaN(slot) || slot < 0 || slot > 7) {
        this.display.printLine('?ILLEGAL QUANTITY ERROR');
      }
      // IN#0 = keyboard (default), others = no device
      this.showPrompt();
      return true;
    }

    // MON / NOMON
    if (upper === 'MON' || upper.startsWith('MON ') || upper.startsWith('MON,')) {
      this.display.printLine('I/O MONITOR NOT AVAILABLE');
      this.showPrompt();
      return true;
    }
    if (upper === 'NOMON' || upper.startsWith('NOMON ') || upper.startsWith('NOMON,')) {
      this.showPrompt();
      return true;
    }

    // EXEC - execute command file
    if (upper.startsWith('EXEC ')) {
      this.cmdExec(this.extractQuotedArg(upper.substring(5)));
      return true;
    }

    // BSAVE (binary save stub)
    if (upper.startsWith('BSAVE ')) {
      this.cmdBsave(upper.substring(6).trim());
      this.showPrompt();
      return true;
    }

    // BLOAD (binary load stub)
    if (upper.startsWith('BLOAD ')) {
      this.cmdBload(upper.substring(6).trim());
      this.showPrompt();
      return true;
    }

    // BRUN (binary run stub)
    if (upper.startsWith('BRUN ')) {
      this.display.printLine('?BINARY NOT SUPPORTED');
      this.showPrompt();
      return true;
    }

    // OPEN - open sequential file
    if (upper.startsWith('OPEN ')) {
      const path = this.extractQuotedArg(upper.substring(5));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.openFile(fpath, 'READ');
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // CLOSE - close file(s)
    if (upper === 'CLOSE' || upper.startsWith('CLOSE ')) {
      const arg = upper.substring(5).trim();
      if (!arg) {
        this.fs.closeFile(null);
      } else {
        const path = this.extractQuotedArg(arg);
        this.fs.closeFile(this.resolveWithExt(path));
      }
      this.showPrompt();
      return true;
    }

    // WRITE - open for writing
    if (upper.startsWith('WRITE ')) {
      const path = this.extractQuotedArg(upper.substring(6));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.openFile(fpath, 'WRITE');
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // APPEND - open for appending
    if (upper.startsWith('APPEND ')) {
      const path = this.extractQuotedArg(upper.substring(7));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.openFile(fpath, 'APPEND');
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // READ - open for reading (alias for OPEN in file context)
    // Note: READ as a BASIC statement is handled by the interpreter
    // This is only matched when it looks like a DOS command: READ "filename"
    if (upper.match(/^READ\s*"/)) {
      const path = this.extractQuotedArg(upper.substring(4));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.openFile(fpath, 'READ');
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // POSITION - set file position
    if (upper.startsWith('POSITION ')) {
      const parts = upper.substring(9).split(',');
      if (parts.length !== 2) {
        this.display.printLine('?SYNTAX ERROR');
      } else {
        const path = this.extractQuotedArg(parts[0]);
        const record = parseInt(parts[1].trim());
        const err = this.fs.positionFile(this.resolveWithExt(path), record);
        if (err) this.display.printLine('?' + err);
      }
      this.showPrompt();
      return true;
    }

    // PREFIX (ProDOS: like CD)
    if (upper === 'PREFIX' || upper.startsWith('PREFIX ')) {
      const arg = upper.substring(6).trim();
      if (!arg) {
        this.display.printLine(this.fs.cwd);
      } else {
        const err = this.fs.cd(this.extractQuotedArg(arg));
        if (err) this.display.printLine('?' + err);
      }
      this.showPrompt();
      return true;
    }

    // CD (alias for PREFIX)
    if (upper === 'CD' || upper.startsWith('CD ')) {
      const arg = upper.substring(2).trim();
      if (!arg) { this.display.printLine(this.fs.cwd); }
      else {
        const err = this.fs.cd(this.extractQuotedArg(arg));
        if (err) this.display.printLine('?' + err);
      }
      this.showPrompt();
      return true;
    }

    // PWD (alias for PREFIX without args)
    if (upper === 'PWD') {
      this.display.printLine(this.fs.cwd);
      this.showPrompt();
      return true;
    }

    // CREATE (ProDOS: create subdirectory)
    if (upper.startsWith('CREATE ')) {
      const path = this.extractQuotedArg(upper.substring(7));
      const err = this.fs.mkdir(path);
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // MKDIR (alias for CREATE)
    if (upper.startsWith('MKDIR ')) {
      const err = this.fs.mkdir(this.extractQuotedArg(upper.substring(6)));
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // RMDIR
    if (upper.startsWith('RMDIR ')) {
      const err = this.fs.rmdir(this.extractQuotedArg(upper.substring(6)));
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // TYPE (show file content - not Apple-original but useful)
    if (upper.startsWith('TYPE ')) {
      const path = this.extractQuotedArg(upper.substring(5));
      const fpath = this.resolveWithExt(path);
      const result = this.fs.readFile(fpath);
      if (result.error) { this.display.printLine('?' + result.error); }
      else {
        this.display.printLine('');
        for (const l of result.content.split('\n')) this.display.printLine(l);
      }
      this.showPrompt();
      return true;
    }

    // UPLOAD (browser: upload file from PC)
    if (upper === 'UPLOAD') {
      this.display.printLine('SELECT FILE(S) TO UPLOAD...');
      this.fileUpload.click();
      return true;
    }

    // DOWNLOAD (browser: download file to PC)
    if (upper === 'DOWNLOAD' || upper.startsWith('DOWNLOAD ')) {
      this.cmdDownload(upper === 'DOWNLOAD' ? null : this.extractQuotedArg(upper.substring(9)));
      this.showPrompt();
      return true;
    }

    return false; // not a DOS command
  }

  // Try to resolve a filename, adding .BAS if not found
  resolveWithExt(path) {
    const node = this.fs.getNode(path);
    if (node) return path;
    if (!path.includes('.')) {
      const withBas = this.fs.getNode(path + '.BAS');
      if (withBas) return path + '.BAS';
    }
    return path;
  }

  // ===== DOS 3.3 CATALOG =====

  async cmdCatalog(path) {
    const dirPath = path || this.fs.cwd;
    const result = this.fs.listDir(dirPath);
    if (result.error) {
      this.display.printLine('?' + result.error);
      return;
    }

    const lines = ['', 'DISK VOLUME ' + this.fs.volumeNumber, ''];

    let totalSectors = 0;
    for (const entry of result.entries) {
      if (entry.type === 'dir') {
        lines.push(' D 002 ' + entry.name);
        totalSectors += 2;
      } else {
        const locked = entry.locked ? '*' : ' ';
        const ftype = entry.fileType || 'T';
        const sectors = entry.sectors || 1;
        totalSectors += sectors;
        const secStr = String(sectors).padStart(3, '0');
        lines.push(locked + ftype + ' ' + secStr + ' ' + entry.name);
      }
    }

    const freeSectors = 560 - totalSectors;
    lines.push('');
    lines.push('FREE SECTORS: ' + Math.max(0, freeSectors));
    await this.printPaged(lines);
  }

  // ===== LOAD =====

  cmdLoad(path) {
    let fpath = this.resolveWithExt(path);
    let result = this.fs.readFile(fpath);
    if (result.error) {
      this.display.printLine('?' + result.error);
      return;
    }
    this.interpreter.program = {};
    this.interpreter.sortedLines = [];
    this.interpreter.clearVars();
    const program = App.VirtualFileSystem.textToProgram(result.content);
    for (const [num, src] of Object.entries(program)) {
      this.interpreter.storeLine(parseInt(num), src);
    }
  }

  // ===== DOWNLOAD =====

  cmdDownload(path) {
    if (!path) {
      const content = App.VirtualFileSystem.programToText(this.interpreter.program);
      if (!content.trim()) {
        this.display.printLine('?NO PROGRAM IN MEMORY');
        return;
      }
      this.triggerDownload('PROGRAM.BAS', content);
      this.display.printLine('DOWNLOADING: PROGRAM.BAS');
    } else {
      const fpath = this.resolveWithExt(path);
      const result = this.fs.readFile(fpath);
      if (result.error) {
        this.display.printLine('?' + result.error);
        return;
      }
      const fname = path.includes('.') ? path : path + '.BAS';
      this.triggerDownload(fname, result.content);
      this.display.printLine('DOWNLOADING: ' + fname);
    }
  }

  triggerDownload(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ===== BSAVE / BLOAD =====

  cmdBsave(argStr) {
    // Parse: BSAVE "name",A$addr,L$len
    const nameMatch = argStr.match(/^"?([^",]+)"?\s*,?\s*A\$?([0-9A-F]+)\s*,?\s*L\$?([0-9A-F]+)/i);
    if (!nameMatch) {
      this.display.printLine('?SYNTAX ERROR');
      return;
    }
    const name = nameMatch[1].toUpperCase();
    const fname = name.endsWith('.BIN') ? name : name + '.BIN';
    // Create a placeholder binary file
    const addr = parseInt(nameMatch[2], 16);
    const len = parseInt(nameMatch[3], 16);
    const content = `; BINARY FILE\n; ADDRESS: $${addr.toString(16).toUpperCase()}\n; LENGTH: $${len.toString(16).toUpperCase()}\n`;
    const err = this.fs.writeFile(fname, content, 'B');
    if (err) this.display.printLine('?' + err);
  }

  cmdBload(argStr) {
    const nameMatch = argStr.match(/^"?([^",]+)"?/i);
    if (!nameMatch) {
      this.display.printLine('?SYNTAX ERROR');
      return;
    }
    const name = nameMatch[1].toUpperCase();
    const fpath = this.resolveWithExt(name);
    const result = this.fs.readFile(fpath);
    if (result.error) {
      this.display.printLine('?' + result.error);
      return;
    }
    // Binary loading is simulated - file content is acknowledged
  }

  // ===== DEL LINES =====
  cmdDelLines(range) {
    let start = 0, end = Infinity;
    const sep = range.includes(',') ? ',' : '-';
    const parts = range.split(sep);
    if (parts.length === 2) {
      if (parts[0].trim()) start = parseInt(parts[0].trim());
      if (parts[1].trim()) end = parseInt(parts[1].trim());
    } else if (parts.length === 1) {
      start = end = parseInt(parts[0].trim());
    }

    for (const lineNum of [...this.interpreter.sortedLines]) {
      if (lineNum >= start && lineNum <= end) {
        delete this.interpreter.program[lineNum];
      }
    }
    this.interpreter.sortedLines = Object.keys(this.interpreter.program).map(Number).sort((a, b) => a - b);
    this.interpreter.collectData();
  }

  // ===== EXEC (run a command file) =====
  async cmdExec(path) {
    const fpath = this.resolveWithExt(path);
    const result = this.fs.readFile(fpath);
    if (result.error) {
      this.display.printLine('?' + result.error);
      this.showPrompt();
      return;
    }
    const lines = result.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        await this.processLine(trimmed);
      }
    }
    this.showPrompt();
  }

  // ===== PROGRAM EXECUTION =====

  async runProgram(startLine) {
    this.commandMode = false;
    try {
      await this.interpreter.run(startLine);
    } catch (e) {
      this.display.printLine('\n' + e.message);
    }
    this.display.printString('\n');
    this.showPrompt();
  }

  async listProgram(range) {
    const sortedLines = this.interpreter.sortedLines;
    let start = 0, end = Infinity;

    if (range) {
      const parts = range.split('-');
      if (parts.length === 2) {
        if (parts[0].trim()) start = parseInt(parts[0].trim());
        if (parts[1].trim()) end = parseInt(parts[1].trim());
      } else {
        start = end = parseInt(range);
      }
    }

    const output = [];
    for (const lineNum of sortedLines) {
      if (lineNum >= start && lineNum <= end) {
        output.push(`${lineNum} ${this.interpreter.program[lineNum]}`);
      }
    }
    await this.printPaged(output);
  }

  ctrlC() {
    if (this.interpreter.running) {
      this.interpreter.running = false;
      this.interpreter.stopped = true;
      this.interpreter.inputCallback = null;
      this.interpreter.getCallback = null;
      this.display.setInputMode(false);
      this.display.setGetMode(false);
      this.display.printLine('\n^C');
      this.display.printLine('BREAK');
      this.showPrompt();
    }
  }

  reset() {
    this.interpreter.running = false;
    this.interpreter.stopped = true;
    this.interpreter.inputCallback = null;
    this.interpreter.getCallback = null;
    this.display.showTextMode();
    this.interpreter.reset();
    this.boot();
  }

  // ===== PAGED OUTPUT (press key to continue) =====

  waitForKey() {
    return new Promise((resolve) => {
      this.interpreter.getCallback = resolve;
      this.display.setGetMode(true);
    });
  }

  async printPaged(lines) {
    const pageSize = this.display.height - 1; // leave 1 line for prompt
    let lineCount = 0;
    for (const line of lines) {
      this.display.printLine(line);
      lineCount++;
      if (lineCount >= pageSize) {
        this.display.printString('PRESS ANY KEY...');
        this.display.render();
        await this.waitForKey();
        this.display.printLine('');
        lineCount = 0;
      }
    }
  }

  // ===== HELP =====

  async showHelp() {
    const lines = [
      '',
      'APPLESOFT BASIC / DOS 3.3',
      '',
      'PROGRAM:',
      ' RUN [LINE]  LIST [M-N]  NEW',
      ' CONT  DEL M,N  TRACE  NOTRACE',
      ' FP  CTRL+C=BREAK',
      '',
      'DISK:',
      ' CATALOG  SAVE  LOAD  DELETE',
      ' LOCK  UNLOCK  RENAME  VERIFY',
      ' INIT  MAXFILES',
      '',
      'FILE I/O:',
      ' OPEN  CLOSE  WRITE  APPEND',
      ' EXEC  POSITION',
      ' BSAVE  BLOAD  BRUN',
      '',
      'DEVICE:',
      ' PR#  IN#  MON  NOMON',
      '',
      'PRODOS:',
      ' PREFIX  CREATE  CATALOG',
      '',
      'CLAUDE AI:',
      ' AI HELP  AI KEY  AI MODEL',
      ' AI question  AI WRITE name,desc',
      '',
      'CATALOG: *=LOCKED  A=APPLESOFT',
      ' B=BINARY T=TEXT I=INTEGER',
      '',
    ];
    await this.printPaged(lines);
  }

  // ===== CLAUDE AI =====

  async handleAiCommand(upper) {
    const arg = upper.substring(2).trim();

    // AI KEY - set API key
    if (arg.startsWith('KEY ')) {
      const key = arg.substring(4).trim();
      if (!key) {
        this.display.printLine('?SYNTAX ERROR');
      } else {
        this.ai.setApiKey(key);
        this.display.printLine('');
        this.display.printLine('API KEY SAVED.');
        const masked = key.substring(0, 7) + '...' + key.slice(-4);
        this.display.printLine('KEY: ' + masked);
      }
      this.showPrompt();
      return;
    }

    // AI KEY (show current)
    if (arg === 'KEY') {
      const key = this.ai.getApiKey();
      if (key) {
        const masked = key.substring(0, 7) + '...' + key.slice(-4);
        this.display.printLine('KEY: ' + masked);
      } else {
        this.display.printLine('NO API KEY SET.');
        this.display.printLine('USE: AI KEY SK-ANT-...');
      }
      this.showPrompt();
      return;
    }

    // AI MODEL - set/show model
    if (arg === 'MODEL') {
      this.display.printLine('MODEL: ' + this.ai.getModel());
      this.showPrompt();
      return;
    }
    if (arg.startsWith('MODEL ')) {
      const model = arg.substring(6).trim().toLowerCase();
      this.ai.setModel(model);
      this.display.printLine('MODEL SET: ' + model);
      this.showPrompt();
      return;
    }

    // AI NEW - clear conversation history
    if (arg === 'NEW') {
      this.ai.clearHistory();
      this.display.printLine('AI CONVERSATION CLEARED.');
      this.showPrompt();
      return;
    }

    // AI HELP
    if (arg === 'HELP' || arg === '') {
      await this.showAiHelp();
      this.showPrompt();
      return;
    }

    // AI WRITE filename description
    if (arg.startsWith('WRITE ')) {
      await this.aiWriteProgram(arg.substring(6).trim());
      this.showPrompt();
      return;
    }

    // AI question - ask Claude
    await this.aiAsk(arg);
    this.showPrompt();
  }

  async showAiHelp() {
    const lines = [
      '',
      '=== CLAUDE AI COMMANDS ===',
      '',
      'AI KEY sk-ant-xxxxx',
      '  Set your Anthropic API key',
      'AI KEY',
      '  Show current key',
      '',
      'AI MODEL model-name',
      '  Set model (default: sonnet)',
      'AI MODEL',
      '  Show current model',
      '',
      'AI your question here',
      '  Ask Claude anything',
      'AI NEW',
      '  Clear conversation history',
      '',
      'AI WRITE filename, description',
      '  Claude writes a BASIC program',
      '  and saves it to disk',
      '',
      'EXAMPLES:',
      ' AI WHAT IS PEEK AND POKE?',
      ' AI HOW DO I DRAW GRAPHICS?',
      ' AI WRITE GAME, GUESS A NUMBER',
      ' AI WRITE SORT, BUBBLE SORT DEMO',
      '',
      'NOTE: Requires Anthropic API key.',
      'Get one at console.anthropic.com',
      '',
    ];
    await this.printPaged(lines);
  }

  async aiAsk(question) {
    if (!this.ai.getApiKey()) {
      this.display.printLine('');
      this.display.printLine('NO API KEY SET.');
      this.display.printLine('USE: AI KEY YOUR-API-KEY');
      this.display.printLine('GET KEY: CONSOLE.ANTHROPIC.COM');
      return;
    }

    this.display.printLine('');
    this.display.printString('THINKING');
    this.display.render();

    try {
      // Show thinking dots
      let dotCount = 0;
      const dotInterval = setInterval(() => {
        if (dotCount < 20) {
          this.display.printChar('.');
          this.display.render();
          dotCount++;
        }
      }, 300);

      const stream = this.ai.streamMessage(
        question,
        this.ai.getSystemPrompt(),
        true
      );

      // Clear thinking line on first chunk
      let firstChunk = true;
      let lineCount = 0;
      let colCount = 0;
      const pageSize = this.display.height - 2;

      for await (const chunk of stream) {
        if (firstChunk) {
          clearInterval(dotInterval);
          // Move to new line after THINKING...
          this.display.printLine('');
          this.display.printLine('');
          firstChunk = false;
        }

        // Print character by character with word wrapping
        for (const ch of chunk) {
          if (ch === '\n') {
            this.display.printChar('\n');
            this.display.render();
            colCount = 0;
            lineCount++;
          } else {
            this.display.printChar(ch.toUpperCase());
            colCount++;
            if (colCount >= this.display.width) {
              colCount = 0;
              lineCount++;
            }
          }

          // Page break
          if (lineCount >= pageSize) {
            this.display.render();
            this.display.printLine('');
            this.display.printString('MORE...');
            this.display.render();
            await this.waitForKey();
            this.display.printLine('');
            lineCount = 0;
          }
        }
        this.display.render();
      }

      if (firstChunk) {
        clearInterval(dotInterval);
      }
      this.display.printLine('');

    } catch (e) {
      this.display.printLine('');
      this.display.printLine('?' + e.message);
    }
  }

  async aiWriteProgram(argStr) {
    if (!this.ai.getApiKey()) {
      this.display.printLine('');
      this.display.printLine('NO API KEY SET.');
      this.display.printLine('USE: AI KEY YOUR-API-KEY');
      return;
    }

    // Parse: filename, description
    const commaIdx = argStr.indexOf(',');
    let filename, description;
    if (commaIdx >= 0) {
      filename = argStr.substring(0, commaIdx).trim();
      description = argStr.substring(commaIdx + 1).trim();
    } else {
      // No comma - treat everything as description, auto-name
      filename = '';
      description = argStr;
    }

    if (!description) {
      this.display.printLine('?SYNTAX ERROR');
      this.display.printLine('USE: AI WRITE NAME, DESCRIPTION');
      return;
    }

    // Generate filename if not provided
    if (!filename) {
      filename = 'AIPROG';
    }
    filename = filename.toUpperCase();
    if (!filename.endsWith('.BAS')) {
      filename += '.BAS';
    }

    this.display.printLine('');
    this.display.printString('WRITING PROGRAM');
    this.display.render();

    try {
      let dotCount = 0;
      const dotInterval = setInterval(() => {
        if (dotCount < 20) {
          this.display.printChar('.');
          this.display.render();
          dotCount++;
        }
      }, 300);

      const stream = this.ai.streamMessage(
        description,
        this.ai.getWriteSystemPrompt(),
        false
      );

      let fullResponse = '';
      let firstChunk = true;

      for await (const chunk of stream) {
        if (firstChunk) {
          clearInterval(dotInterval);
          this.display.printLine('');
          this.display.printLine('');
          firstChunk = false;
        }
        fullResponse += chunk;
        // Show code as it streams in
        for (const ch of chunk) {
          if (ch === '\n') {
            this.display.printChar('\n');
          } else {
            this.display.printChar(ch.toUpperCase());
          }
        }
        this.display.render();
      }

      if (firstChunk) {
        clearInterval(dotInterval);
      }

      // Parse the BASIC program from response
      const programLines = this.parseBasicProgram(fullResponse);

      if (Object.keys(programLines).length === 0) {
        this.display.printLine('');
        this.display.printLine('?NO VALID PROGRAM GENERATED');
        return;
      }

      // Load into interpreter memory
      this.interpreter.program = {};
      this.interpreter.sortedLines = [];
      this.interpreter.clearVars();

      for (const [num, src] of Object.entries(programLines)) {
        this.interpreter.storeLine(parseInt(num), src);
      }

      // Save to filesystem
      const content = App.VirtualFileSystem.programToText(this.interpreter.program);
      const err = this.fs.writeFile(filename, content, 'A');

      this.display.printLine('');
      if (err) {
        this.display.printLine('?SAVE ERROR: ' + err);
      } else {
        const lineCount = Object.keys(programLines).length;
        this.display.printLine('');
        this.display.printLine('PROGRAM SAVED: ' + filename);
        this.display.printLine(lineCount + ' LINES');
        this.display.printLine('TYPE RUN TO EXECUTE');
      }

    } catch (e) {
      this.display.printLine('');
      this.display.printLine('?' + e.message);
    }
  }

  parseBasicProgram(text) {
    const program = {};
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Match lines starting with a number
      const match = trimmed.match(/^(\d+)\s+(.*)/);
      if (match) {
        const lineNum = parseInt(match[1]);
        const code = match[2];
        if (lineNum >= 0 && lineNum <= 63999) {
          program[lineNum] = code;
        }
      }
    }
    return program;
  }

  async showTutorial(page) {
    const pages = App.getTutorialPages();
    const maxPage = pages.length;
    const p = Math.max(1, Math.min(maxPage, page || 1));
    const content = pages[p - 1];

    const lines = [
      '',
      '=== TUTORIAL PAGE ' + p + '/' + maxPage + ' ===',
      '',
      ...content,
      '',
    ];
    if (p < maxPage) {
      lines.push('TYPE "TUTORIAL ' + (p + 1) + '" FOR NEXT');
    } else {
      lines.push('END OF TUTORIAL');
    }
    lines.push('');
    await this.printPaged(lines);
  }
}

App.Emulator = Emulator;
EOF_EMULATOR_JS

echo "Writing js/main.js (14/14)..."
cat > "$DIR/js/main.js" << 'EOF_MAIN_JS'
window.App = window.App || {};

window.addEventListener('DOMContentLoaded', function() {
  var emulator = new App.Emulator();
  window.emulator = emulator;
});
EOF_MAIN_JS

chmod +x "$DIR/../install.sh" 2>/dev/null
echo ""
echo "================================="
echo " Installation complete!"
echo "================================="
echo ""
echo "Open $DIR/index.html in your browser."
