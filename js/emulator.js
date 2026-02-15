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
    this.display.printLine('DISK VOLUME ' + this.fs.volumeNumber);
    this.display.printLine('TYPE "HELP" FOR COMMANDS');
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
      'CATALOG: *=LOCKED  A=APPLESOFT',
      ' B=BINARY T=TEXT I=INTEGER',
      '',
    ];
    await this.printPaged(lines);
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
