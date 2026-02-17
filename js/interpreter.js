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
          if (result === 'SKIP_LINE') { break; }
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

    if (upperStmt === 'GR' || (upperStmt.startsWith('GR') && !upperStmt.startsWith('GRAPHICS'))) {
      this.textMode = false;
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
    if (upperStmt === 'HGR' || (upperStmt.startsWith('HGR') && !upperStmt.startsWith('HGR2') && !upperStmt.startsWith('HGRAPHICS'))) {
      this.textMode = false;
      this.hiResMode = true;
      this.hiResColor = 3;  // White (on) by default
      this.display.initHiRes(1);
      return;
    }

    if (upperStmt === 'HGR2' || upperStmt.startsWith('HGR2')) {
      this.textMode = false;
      this.hiResMode = true;
      this.hiResColor = 3;
      this.display.initHiRes(2);
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
    } else {
      // Condition false, no ELSE: skip rest of line (Applesoft BASIC behavior)
      return 'SKIP_LINE';
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
    if (x < 0 || x >= 40) return;
    const maxY = (this.display.screenMode === 'gr') ? 40 : 48;
    if (y < 0 || y >= maxY) return;
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
    if (uaddr === 49233) { /* GRAPHICS mode - activate current graphics mode */ return; }
    if (uaddr === 49234) { /* full screen */
      if (this.display.screenMode === 'gr') { this.display.screenMode = 'gr_full'; this.display.render(); }
      else if (this.display.screenMode === 'hgr') { this.display.screenMode = 'hgr_full'; this.display.render(); }
      return;
    }
    if (uaddr === 49235) { /* mixed mode */
      if (this.display.screenMode === 'gr_full') { this.display.screenMode = 'gr'; this.display.render(); }
      else if (this.display.screenMode === 'hgr_full') { this.display.screenMode = 'hgr'; this.display.render(); }
      return;
    }
    if (uaddr === 49236) { /* page 1 */ this.display.setDisplayPage(1); return; }
    if (uaddr === 49237) { /* page 2 */ this.display.setDisplayPage(2); return; }
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
        this.display.clearHiRes(false);
      }
      return;
    }

    // CALL 62454: Clear hi-res screen to current HCOLOR
    if (uaddr === 62454) {
      if (this.hiResMode) {
        this.display.clearHiRes(this._hcolorIsOn());
      }
      return;
    }

    // Unknown CALL - silently ignore
  }

  // ===== HPLOT =====
  // hiResColor: 0,4=black(off), 1,2,3,5,6,7=on (monochrome amber)
  _hcolorIsOn() {
    return this.hiResColor !== 0 && this.hiResColor !== 4;
  }

  executeHplot(argStr) {
    if (!argStr || argStr.trim().length === 0) return;
    const upper = argStr.toUpperCase().trim();
    const colorOn = this._hcolorIsOn();

    // HPLOT TO x,y [TO x,y ...] - draw from last position
    if (upper.startsWith('TO')) {
      const segments = argStr.split(/\bTO\b/i).filter(s => s.trim().length > 0);
      for (const seg of segments) {
        const commaPos = this.findComma(seg.trim());
        const x = Math.floor(this.evaluateExpressionFromString(seg.trim().substring(0, commaPos).trim()));
        const y = Math.floor(this.evaluateExpressionFromString(seg.trim().substring(commaPos + 1).trim()));
        this.display.drawHiResLine(this.hiResLastX, this.hiResLastY, x, y, colorOn);
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
      this.display.drawHiResPixel(x1, y1, colorOn);
      this.hiResLastX = x1;
      this.hiResLastY = y1;
    } else {
      // First point then lines
      this.display.drawHiResPixel(x1, y1, colorOn);
      this.hiResLastX = x1;
      this.hiResLastY = y1;
      for (let i = 1; i < parts.length; i++) {
        const seg = parts[i].trim();
        const cp = this.findComma(seg);
        const x = Math.floor(this.evaluateExpressionFromString(seg.substring(0, cp).trim()));
        const y = Math.floor(this.evaluateExpressionFromString(seg.substring(cp + 1).trim()));
        this.display.drawHiResLine(this.hiResLastX, this.hiResLastY, x, y, colorOn);
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
        const x = Math.floor(args[0]);
        const y = Math.floor(args[1]);
        return this.display.getLoResPixel(x, y);
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
