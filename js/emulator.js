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

    // BASIC commands
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

    // DEL - delete program lines (DEL 10,100 or DEL 10-100)
    if (upper.startsWith('DEL ') || upper.startsWith('DEL,')) {
      this.cmdDelLines(upper.substring(3).trim());
      this.showPrompt();
      return;
    }

    // PR# / IN# (slot commands - stubs)
    if (upper.startsWith('PR#')) {
      const slot = parseInt(upper.substring(3).trim());
      if (slot === 0) { /* back to screen - already there */ }
      this.showPrompt();
      return;
    }
    if (upper.startsWith('IN#')) {
      const slot = parseInt(upper.substring(3).trim());
      if (slot === 0) { /* back to keyboard - already there */ }
      this.showPrompt();
      return;
    }

    // MON / NOMON
    if (upper === 'MON' || upper.startsWith('MON ')) {
      this.display.printLine('MONITOR NOT AVAILABLE');
      this.showPrompt();
      return;
    }
    if (upper === 'NOMON') { this.showPrompt(); return; }

    // FP (switch to Applesoft - already there)
    if (upper === 'FP') { this.showPrompt(); return; }

    // EXEC - execute a command file
    if (upper.startsWith('EXEC ')) {
      await this.cmdExec(this.extractQuotedArg(upper.substring(5)));
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

  // ===== DEL LINES =====
  cmdDelLines(range) {
    let start = 0, end = Infinity;
    // Support both DEL 10,100 and DEL 10-100
    const sep = range.includes(',') ? ',' : '-';
    const parts = range.split(sep);
    if (parts.length === 2) {
      if (parts[0].trim()) start = parseInt(parts[0].trim());
      if (parts[1].trim()) end = parseInt(parts[1].trim());
    } else if (parts.length === 1) {
      start = end = parseInt(parts[0].trim());
    }

    let count = 0;
    for (const lineNum of [...this.interpreter.sortedLines]) {
      if (lineNum >= start && lineNum <= end) {
        delete this.interpreter.program[lineNum];
        count++;
      }
    }
    this.interpreter.sortedLines = Object.keys(this.interpreter.program).map(Number).sort((a, b) => a - b);
    this.interpreter.collectData();
  }

  // ===== EXEC (run a command file) =====
  async cmdExec(path) {
    let result = this.fs.readFile(path);
    if (result.error && !path.endsWith('.BAS')) {
      result = this.fs.readFile(path + '.BAS');
    }
    if (result.error) {
      this.display.printLine(result.error);
      return;
    }
    const lines = result.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        await this.processLine(trimmed);
      }
    }
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
    this.display.printLine('RUN [LINE] RUN PROGRAM');
    this.display.printLine('CONT       CONTINUE AFTER STOP');
    this.display.printLine('LIST       LIST PROGRAM');
    this.display.printLine('NEW        CLEAR PROGRAM');
    this.display.printLine('TRACE      ENABLE LINE TRACE');
    this.display.printLine('NOTRACE    DISABLE LINE TRACE');
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
