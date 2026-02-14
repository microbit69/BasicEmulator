<# : batch portion
@echo off & powershell -ExecutionPolicy Bypass "iex (gc \"%~f0\" -Raw)" & pause & exit /b
: end batch / begin PowerShell #>

# ============================================================
#  Applesoft BASIC Installer for Windows
# ============================================================

Write-Host ""
Write-Host "========================================"
Write-Host "  Applesoft BASIC Interpreter Installer"
Write-Host "  JavaScript Edition"
Write-Host "========================================"
Write-Host ""

$dir = "C:\ClaudeCode"

Write-Host "Installing to: $dir"
Write-Host ""

# Create directory structure
New-Item -ItemType Directory -Path "$dir\css" -Force | Out-Null
New-Item -ItemType Directory -Path "$dir\js"  -Force | Out-Null

# --- File 1 of 13 ---
Write-Host "Writing index.html (1/13)..."
$content = @'
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
<script src="js/interpreter.js"></script>
<script src="js/emulator.js"></script>
<script src="js/main.js"></script>

</body>
</html>
'@
Set-Content -Path "$dir\index.html" -Value $content -Encoding UTF8

# --- File 2 of 13 ---
Write-Host "Writing css/style.css (2/13)..."
$content = @'
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
    0 0 60px rgba(0, 255, 0, 0.05),
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
  background: #000800;
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
  color: #33ff33;
  white-space: pre;
  letter-spacing: 1px;
  text-shadow: 0 0 5px rgba(51, 255, 51, 0.5), 0 0 10px rgba(51, 255, 51, 0.2);
  min-height: 600px;
  width: 660px;
  user-select: none;
  position: relative;
}

/* ===== CURSOR ===== */
.cursor {
  display: inline;
  animation: blink 1s step-end infinite;
  background-color: #33ff33;
  color: #000800;
  text-shadow: none;
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.inverse {
  background-color: #33ff33;
  color: #000800;
  text-shadow: none;
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
  background: #33ff33;
  border-radius: 50%;
  box-shadow: 0 0 6px #33ff33;
  margin-top: 12px;
  animation: led-glow 2s ease-in-out infinite alternate;
}

@keyframes led-glow {
  0% { box-shadow: 0 0 4px #33ff33; }
  100% { box-shadow: 0 0 10px #33ff33, 0 0 20px rgba(51, 255, 51, 0.3); }
}

/* ===== RESPONSIVE ===== */
@media (max-width: 740px) {
  #monitor { padding: 16px; border-radius: 16px; }
  #text-display { font-size: 14px; width: 460px; min-height: 420px; letter-spacing: 0.5px; }
  #screen-container { padding: 10px; }
}
'@
Set-Content -Path "$dir\css\style.css" -Value $content -Encoding UTF8

# --- File 3 of 13 ---
Write-Host "Writing js/constants.js (3/13)..."
$content = @'
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
'@
Set-Content -Path "$dir\js\constants.js" -Value $content -Encoding UTF8

# --- File 4 of 13 ---
Write-Host "Writing js/audio.js (4/13)..."
$content = @'
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
'@
Set-Content -Path "$dir\js\audio.js" -Value $content -Encoding UTF8

# --- File 5 of 13 ---
Write-Host "Writing js/tokenizer.js (5/13)..."
$content = @'
window.App = window.App || {};

const KEYWORDS = [
  'PRINT','GOTO','GOSUB','RETURN','IF','THEN','ELSE','FOR','TO','STEP',
  'NEXT','LET','INPUT','DIM','READ','DATA','RESTORE','DEF','FN',
  'REM','END','STOP','ON','AND','OR','NOT','TAB','SPC','HTAB','VTAB',
  'HOME','CLEAR','CLR','RUN','LIST','NEW','LOAD','SAVE',
  'GR','COLOR','PLOT','HLIN','VLIN','TEXT','HGR','HCOLOR','HPLOT',
  'POKE','PEEK','CALL','SPEED','NORMAL','INVERSE','FLASH',
  'POP','ONERR','RESUME','GET','AT'
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
'@
Set-Content -Path "$dir\js\tokenizer.js" -Value $content -Encoding UTF8

# --- File 6 of 13 ---
Write-Host "Writing js/parser.js (6/13)..."
$content = @'
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
'@
Set-Content -Path "$dir\js\parser.js" -Value $content -Encoding UTF8

# --- File 7 of 13 ---
Write-Host "Writing js/filesystem.js (7/13)..."
$content = @'
window.App = window.App || {};

class VirtualFileSystem {
  constructor() {
    this.root = { type: 'dir', name: '/', children: {} };
    this.cwd = '/';
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

  mkdir(path) {
    const { parent, name } = this.getParentAndName(path);
    if (!parent || parent.type !== 'dir') return '?PATH NOT FOUND';
    if (!name) return '?SYNTAX ERROR';
    if (parent.children[name]) return '?FILE EXISTS';
    parent.children[name] = { type: 'dir', name, children: {} };
    return null;
  }

  rmdir(path) {
    const { parent, name } = this.getParentAndName(path);
    if (!parent || !name) return '?PATH NOT FOUND';
    const node = parent.children[name];
    if (!node) return '?FILE NOT FOUND';
    if (node.type !== 'dir') return '?NOT A DIRECTORY';
    if (Object.keys(node.children).length > 0) return '?DIRECTORY NOT EMPTY';
    delete parent.children[name];
    return null;
  }

  writeFile(path, content) {
    const { parent, name } = this.getParentAndName(path);
    if (!parent || parent.type !== 'dir') return '?PATH NOT FOUND';
    if (!name) return '?SYNTAX ERROR';
    if (parent.children[name] && parent.children[name].type === 'dir') return '?IS A DIRECTORY';
    parent.children[name] = { type: 'file', name, content };
    return null;
  }

  readFile(path) {
    const node = this.getNode(path);
    if (!node) return { error: '?FILE NOT FOUND' };
    if (node.type !== 'file') return { error: '?NOT A FILE' };
    return { content: node.content };
  }

  deleteFile(path) {
    const { parent, name } = this.getParentAndName(path);
    if (!parent || !name) return '?PATH NOT FOUND';
    if (!parent.children[name]) return '?FILE NOT FOUND';
    if (parent.children[name].type === 'dir') return '?IS A DIRECTORY';
    delete parent.children[name];
    return null;
  }

  rename(oldPath, newPath) {
    const { parent: op, name: on } = this.getParentAndName(oldPath);
    const { parent: np, name: nn } = this.getParentAndName(newPath);
    if (!op || !op.children[on]) return '?FILE NOT FOUND';
    if (!np || np.type !== 'dir') return '?PATH NOT FOUND';
    np.children[nn] = op.children[on];
    np.children[nn].name = nn;
    if (op !== np || on !== nn) delete op.children[on];
    return null;
  }

  listDir(path) {
    const node = this.getNode(path || this.cwd);
    if (!node) return { error: '?PATH NOT FOUND' };
    if (node.type !== 'dir') return { error: '?NOT A DIRECTORY' };
    return { entries: Object.values(node.children) };
  }

  cd(path) {
    const abs = this.resolve(path);
    const node = this.getNode(abs);
    if (!node) return '?PATH NOT FOUND';
    if (node.type !== 'dir') return '?NOT A DIRECTORY';
    this.cwd = abs || '/';
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
'@
Set-Content -Path "$dir\js\filesystem.js" -Value $content -Encoding UTF8

# --- File 8 of 13 ---
Write-Host "Writing js/samples.js (8/13)..."
$content = @'
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
'@
Set-Content -Path "$dir\js\samples.js" -Value $content -Encoding UTF8

# --- File 9 of 13 ---
Write-Host "Writing js/tutorial.js (9/13)..."
$content = @'
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
'@
Set-Content -Path "$dir\js\tutorial.js" -Value $content -Encoding UTF8

# --- File 10 of 13 ---
Write-Host "Writing js/display.js (10/13)..."
$content = @'
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
      App.beep();
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
    this.canvas.width = App.LORES_WIDTH * 7;
    this.canvas.height = App.LORES_GRAPHICS_ROWS * 4;
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
    this.ctx.fillStyle = App.LORES_COLORS[color & 15];
    this.ctx.fillRect(x * pixW, y * pixH, pixW, pixH);
  }

  showTextMode() {
    this.canvas.style.display = 'none';
    this.clear();
  }
}

App.Display = Display;
'@
Set-Content -Path "$dir\js\display.js" -Value $content -Encoding UTF8

# --- File 11 of 13 ---
Write-Host "Writing js/interpreter.js (11/13)..."
$content = @'
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
        const source = this.program[this.currentLine];
        const statements = this.splitStatements(source);

        let jumped = false;
        for (let si = 0; si < statements.length && this.running && !this.stopped; si++) {
          const result = await this.executeStatement(statements[si].trim(), this.currentLine);
          if (result === 'JUMP') { jumped = true; break; }
          if (result === 'STOP' || result === 'END') {
            this.running = false;
            if (result === 'STOP') {
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

    if (upperStmt.startsWith('NORMAL')) { this.inverseMode = false; this.flashMode = false; return; }
    if (upperStmt.startsWith('INVERSE')) { this.inverseMode = true; this.flashMode = false; return; }
    if (upperStmt.startsWith('FLASH')) { this.flashMode = true; this.inverseMode = false; return; }

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

    if (upperStmt.startsWith('POKE')) return;
    if (upperStmt.startsWith('CALL')) return;

    if (upperStmt.startsWith('POP')) {
      if (this.callStack.length > 0) this.callStack.pop();
      return;
    }

    if (upperStmt.startsWith('ONERR')) {
      const gotoMatch = stmt.match(/ONERR\s+GOTO\s+(\d+)/i);
      if (gotoMatch) this.onErrLine = parseInt(gotoMatch[1]);
      return;
    }

    if (upperStmt.startsWith('RESUME')) return;

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

  // ===== IF/THEN =====
  async executeIf(argStr, lineNum) {
    const thenPos = this.findKeywordInString(argStr, 'THEN');
    if (thenPos === -1) throw new Error('?SYNTAX ERROR');

    const condStr = argStr.substring(0, thenPos).trim();
    const thenPart = argStr.substring(thenPos + 4).trim();

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
        if (addr === 49152) return Math.floor(Math.random() * 128);
        if (addr === 49168) return 0;
        return 0;
      }
      case 'TAB': return ' '.repeat(Math.max(0, Math.floor(args[0])));
      case 'SPC': return ' '.repeat(Math.max(0, Math.floor(args[0])));
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
'@
Set-Content -Path "$dir\js\interpreter.js" -Value $content -Encoding UTF8

# --- File 12 of 13 ---
Write-Host "Writing js/emulator.js (12/13)..."
$content = @'
window.App = window.App || {};

class Emulator {
  constructor() {
    this.displayElement = document.getElementById('text-display');
    this.canvasElement = document.getElementById('lores-canvas');
    this.fileUpload = document.getElementById('file-upload');
    this.display = new App.Display(this.displayElement, this.canvasElement);
    this.interpreter = new App.Interpreter(this.display);
    this.fs = new App.VirtualFileSystem();
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
    this.display.printLine('TYPE "HELP" FOR COMMANDS');
    this.display.printLine('TYPE "TUTORIAL" FOR TUTORIAL');
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

    // BASIC commands
    if (upper === 'RUN') { await this.runProgram(); return; }

    if (upper === 'LIST' || upper.startsWith('LIST ') || upper.startsWith('LIST-')) {
      this.listProgram(upper === 'LIST' ? '' : upper.substring(4).trim());
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

    if (upper === 'RESET') { this.reset(); return; }
    if (upper === 'HELP') { this.showHelp(); this.showPrompt(); return; }

    if (upper === 'TUTORIAL' || upper.startsWith('TUTORIAL ')) {
      const pageArg = upper.substring(8).trim();
      this.showTutorial(pageArg ? parseInt(pageArg) : 1);
      this.showPrompt();
      return;
    }

    // Filesystem commands
    if (this.handleFilesystemCommand(upper)) return;

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

  handleFilesystemCommand(upper) {
    // CATALOG / CAT / DIR
    if (upper === 'CATALOG' || upper === 'CAT' || upper === 'DIR' ||
        upper.startsWith('CATALOG ') || upper.startsWith('CAT ') || upper.startsWith('DIR ')) {
      const arg = upper.replace(/^(CATALOG|CAT|DIR)\s*/, '').trim();
      const path = arg ? this.extractQuotedArg(arg) : '';
      this.cmdCatalog(path);
      this.showPrompt();
      return true;
    }

    // PWD
    if (upper === 'PWD') {
      this.display.printLine(this.fs.cwd);
      this.showPrompt();
      return true;
    }

    // CD
    if (upper === 'CD' || upper.startsWith('CD ')) {
      const arg = upper.substring(2).trim();
      if (!arg) { this.display.printLine(this.fs.cwd); }
      else {
        const err = this.fs.cd(this.extractQuotedArg(arg));
        if (err) this.display.printLine(err);
      }
      this.showPrompt();
      return true;
    }

    // MKDIR
    if (upper.startsWith('MKDIR ')) {
      const err = this.fs.mkdir(this.extractQuotedArg(upper.substring(6)));
      if (err) this.display.printLine(err);
      this.showPrompt();
      return true;
    }

    // RMDIR
    if (upper.startsWith('RMDIR ')) {
      const err = this.fs.rmdir(this.extractQuotedArg(upper.substring(6)));
      if (err) this.display.printLine(err);
      this.showPrompt();
      return true;
    }

    // CREATE
    if (upper.startsWith('CREATE ')) {
      const path = this.extractQuotedArg(upper.substring(7));
      const err = this.fs.writeFile(path, '');
      if (err) this.display.printLine(err);
      else this.display.printLine('CREATED: ' + path);
      this.showPrompt();
      return true;
    }

    // DELETE / DEL
    if (upper.startsWith('DELETE ') || upper.startsWith('DEL ')) {
      const cmd = upper.startsWith('DELETE') ? 'DELETE' : 'DEL';
      const path = this.extractQuotedArg(upper.substring(cmd.length + 1));
      const err = this.fs.deleteFile(path);
      if (err) this.display.printLine(err);
      else this.display.printLine('DELETED: ' + path);
      this.showPrompt();
      return true;
    }

    // RENAME
    if (upper.startsWith('RENAME ')) {
      const parts = upper.substring(7).split(',');
      if (parts.length !== 2) {
        this.display.printLine('?SYNTAX: RENAME "OLD","NEW"');
      } else {
        const err = this.fs.rename(this.extractQuotedArg(parts[0]), this.extractQuotedArg(parts[1]));
        if (err) this.display.printLine(err);
        else this.display.printLine('RENAMED');
      }
      this.showPrompt();
      return true;
    }

    // TYPE
    if (upper.startsWith('TYPE ')) {
      const result = this.fs.readFile(this.extractQuotedArg(upper.substring(5)));
      if (result.error) { this.display.printLine(result.error); }
      else {
        this.display.printLine('');
        for (const l of result.content.split('\n')) this.display.printLine(l);
      }
      this.showPrompt();
      return true;
    }

    // SAVE
    if (upper === 'SAVE' || upper.startsWith('SAVE ')) {
      if (upper === 'SAVE') {
        this.display.printLine('?SYNTAX: SAVE "FILENAME"');
      } else {
        const path = this.extractQuotedArg(upper.substring(5));
        const fname = path.endsWith('.BAS') ? path : path + '.BAS';
        const content = App.VirtualFileSystem.programToText(this.interpreter.program);
        const err = this.fs.writeFile(fname, content);
        if (err) this.display.printLine(err);
        else this.display.printLine('SAVED: ' + fname);
      }
      this.showPrompt();
      return true;
    }

    // LOAD
    if (upper === 'LOAD' || upper.startsWith('LOAD ')) {
      if (upper === 'LOAD') {
        this.display.printLine('?SYNTAX: LOAD "FILENAME"');
      } else {
        this.cmdLoad(this.extractQuotedArg(upper.substring(5)));
      }
      this.showPrompt();
      return true;
    }

    // UPLOAD
    if (upper === 'UPLOAD') {
      this.display.printLine('SELECT FILE(S) TO UPLOAD...');
      this.fileUpload.click();
      return true;
    }

    // DOWNLOAD
    if (upper === 'DOWNLOAD' || upper.startsWith('DOWNLOAD ')) {
      this.cmdDownload(upper === 'DOWNLOAD' ? null : this.extractQuotedArg(upper.substring(9)));
      this.showPrompt();
      return true;
    }

    return false; // not a filesystem command
  }

  // ===== FILESYSTEM COMMAND IMPLEMENTATIONS =====

  cmdCatalog(path) {
    const result = this.fs.listDir(path || this.fs.cwd);
    if (result.error) {
      this.display.printLine(result.error);
      return;
    }
    this.display.printLine('');
    this.display.printLine('DIRECTORY: ' + this.fs.resolve(path || this.fs.cwd));
    this.display.printLine('');
    if (result.entries.length === 0) {
      this.display.printLine('  (EMPTY)');
    } else {
      for (const entry of result.entries) {
        if (entry.type === 'dir') {
          this.display.printLine('  [DIR]  ' + entry.name);
        } else {
          const size = entry.content ? entry.content.length : 0;
          this.display.printLine('  [FILE] ' + entry.name + '  (' + size + ' BYTES)');
        }
      }
    }
    this.display.printLine('');
    this.display.printLine(result.entries.length + ' ENTRIES');
  }

  cmdLoad(path) {
    let result = this.fs.readFile(path);
    let fname = path;
    if (result.error && !path.endsWith('.BAS')) {
      result = this.fs.readFile(path + '.BAS');
      if (!result.error) fname = path + '.BAS';
    }
    if (result.error) {
      this.display.printLine(result.error);
      return;
    }
    this.interpreter.program = {};
    this.interpreter.sortedLines = [];
    this.interpreter.clearVars();
    const program = App.VirtualFileSystem.textToProgram(result.content);
    for (const [num, src] of Object.entries(program)) {
      this.interpreter.storeLine(parseInt(num), src);
    }
    this.display.printLine('LOADED: ' + fname);
  }

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
      let result = this.fs.readFile(path);
      if (result.error && !path.endsWith('.BAS')) {
        result = this.fs.readFile(path + '.BAS');
      }
      if (result.error) {
        this.display.printLine(result.error);
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

  listProgram(range) {
    const lines = this.interpreter.sortedLines;
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

    for (const lineNum of lines) {
      if (lineNum >= start && lineNum <= end) {
        this.display.printLine(`${lineNum} ${this.interpreter.program[lineNum]}`);
      }
    }
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

  // ===== HELP & TUTORIAL =====

  showHelp() {
    this.display.printLine('');
    this.display.printLine('=== BASIC COMMANDS ===');
    this.display.printLine('RUN        RUN PROGRAM');
    this.display.printLine('LIST       LIST PROGRAM');
    this.display.printLine('NEW        CLEAR PROGRAM');
    this.display.printLine('RESET      RESET EMULATOR');
    this.display.printLine('CTRL+C     BREAK PROGRAM');
    this.display.printLine('');
    this.display.printLine('=== FILE SYSTEM ===');
    this.display.printLine('CATALOG    LIST DIRECTORY');
    this.display.printLine('CD "DIR"   CHANGE DIRECTORY');
    this.display.printLine('PWD        SHOW CURRENT DIR');
    this.display.printLine('MKDIR "X"  CREATE DIRECTORY');
    this.display.printLine('RMDIR "X"  REMOVE DIRECTORY');
    this.display.printLine('CREATE "X" CREATE EMPTY FILE');
    this.display.printLine('DELETE "X" DELETE FILE');
    this.display.printLine('RENAME "A","B"  RENAME');
    this.display.printLine('TYPE "X"   SHOW FILE CONTENT');
    this.display.printLine('');
    this.display.printLine('=== SAVE / LOAD ===');
    this.display.printLine('SAVE "X"   SAVE PROGRAM');
    this.display.printLine('LOAD "X"   LOAD PROGRAM');
    this.display.printLine('UPLOAD     UPLOAD FROM PC');
    this.display.printLine('DOWNLOAD   DOWNLOAD PROGRAM');
    this.display.printLine('DOWNLOAD "X" DOWNLOAD FILE');
    this.display.printLine('');
    this.display.printLine('TYPE "TUTORIAL" FOR TUTORIAL');
    this.display.printLine('');
  }

  showTutorial(page) {
    const pages = App.getTutorialPages();
    const maxPage = pages.length;
    const p = Math.max(1, Math.min(maxPage, page || 1));
    const content = pages[p - 1];

    this.display.printLine('');
    this.display.printLine('=== TUTORIAL PAGE ' + p + '/' + maxPage + ' ===');
    this.display.printLine('');
    for (const line of content) {
      this.display.printLine(line);
    }
    this.display.printLine('');
    if (p < maxPage) {
      this.display.printLine('TYPE "TUTORIAL ' + (p + 1) + '" FOR NEXT');
    } else {
      this.display.printLine('END OF TUTORIAL');
    }
    this.display.printLine('');
  }
}

App.Emulator = Emulator;
'@
Set-Content -Path "$dir\js\emulator.js" -Value $content -Encoding UTF8

# --- File 13 of 13 ---
Write-Host "Writing js/main.js (13/13)..."
$content = @'
window.App = window.App || {};

window.addEventListener('DOMContentLoaded', function() {
  var emulator = new App.Emulator();
  window.emulator = emulator;
});
'@
Set-Content -Path "$dir\js\main.js" -Value $content -Encoding UTF8

# ============================================================
Write-Host ""
Write-Host "========================================"
Write-Host "  Installation Complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "Files installed to: $dir"
Write-Host ""
Write-Host "To run the Applesoft BASIC Interpreter:"
Write-Host "  1. Open the AppleSoftBASIC folder"
Write-Host "  2. Double-click index.html"
Write-Host "  3. (Or right-click > Open with browser)"
Write-Host ""
Write-Host "Enjoy your Apple ][ experience!"
Write-Host ""
