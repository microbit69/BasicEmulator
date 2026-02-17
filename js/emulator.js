window.App = window.App || {};

class Emulator {
  constructor() {
    this.canvasElement = document.getElementById('apple2-canvas');
    this.screenContainer = document.getElementById('screen-container');
    this.frame = document.getElementById('apple2-frame');
    this.bgImage = document.getElementById('bg-image');
    this.powerBtn = document.getElementById('power-btn');
    this.powerLed = document.getElementById('power-led');
    this.fileUpload = document.getElementById('file-upload');
    this.display = new App.Display(this.canvasElement);
    this.interpreter = new App.Interpreter(this.display);
    this.drives = [new App.VirtualFileSystem(), new App.VirtualFileSystem()];
    this.drives[1].volumeName = 'BACKUP';
    this.drives[1].volumeNumber = 253;
    this.currentDrive = 1;
    this.fs = this.drives[0];
    this.driveLeds = [document.getElementById('drive1-led'), document.getElementById('drive2-led')];
    this.ai = new App.ClaudeAI();
    this.inputBuffer = '';
    this.commandMode = true;
    this.poweredOn = false;
    this.booting = false;
    this.setupInput();
    this.setupFileUpload();
    this.setupPowerButton();
    this.installSamples();
    // Start in OFF state
    this.screenContainer.classList.add('off');
  }

  // ===== BACKGROUND IMAGE =====

  setBackground(imagePath) {
    this.bgImage.src = imagePath;
    this.frame.dataset.bg = imagePath;
  }

  // ===== POWER BUTTON =====

  setupPowerButton() {
    this.powerBtn.addEventListener('click', () => this.togglePower());
  }

  async togglePower() {
    if (this.booting) return; // ignore clicks during boot
    if (this.poweredOn) {
      this.powerOff();
    } else {
      await this.powerOn();
    }
  }

  async powerOn() {
    this.booting = true;
    this.poweredOn = true;
    this.powerLed.classList.add('on');

    // Reset display and interpreter state from any previous session
    this.display.showTextMode();
    this.interpreter.reset();

    // CRT turn-on: electromagnetic pop + screen activation
    App.crtPop();
    this.screenContainer.classList.remove('off', 'crt-off');
    this.screenContainer.classList.add('crt-on');
    this.display.clear();

    await this.sleep(200);

    // Classic Apple II power-on beep (1-bit speaker buzz)
    App.appleBeep();
    await this.sleep(250);

    // === Phase 1: Memory garbage (random chars flash briefly) ===
    this.fillScreenGarbage();
    this.display.render();
    await this.sleep(120);

    // === Phase 2: Screen clears, Apple II ROM banner ===
    this.display.clear();
    await this.sleep(200);

    this.display.printLine('APPLE ][');
    this.display.render();
    await this.sleep(300);

    // === Phase 3: Memory test with ticking sounds ===
    const memSteps = ['4K', '8K', '16K', '32K', '48K'];
    for (const step of memSteps) {
      this.display.cursorX = 0;
      this.display.cursorY = 2;
      for (let x = 0; x < this.display.width; x++) {
        this.display.screenBuffer[2][x] = ' ';
      }
      const msg = 'MEMORY TEST... ' + step;
      for (let i = 0; i < msg.length; i++) {
        this.display.screenBuffer[2][i] = msg[i];
      }
      this.display.render();
      App.memTick();
      await this.sleep(80);
    }
    // Final memory result
    this.display.cursorX = 0;
    this.display.cursorY = 2;
    for (let x = 0; x < this.display.width; x++) {
      this.display.screenBuffer[2][x] = ' ';
    }
    const memOk = '48K RAM  -  SYSTEM OK';
    for (let i = 0; i < memOk.length; i++) {
      this.display.screenBuffer[2][i] = memOk[i];
    }
    this.display.render();
    App.appleBeep();
    await this.sleep(400);

    // === Phase 4: Disk drive activation ===
    this.display.cursorY = 4;
    this.display.cursorX = 0;
    this.display.printString('DISK II  SLOT 6  DRIVE 1');
    this.display.render();
    this.diskActivity(1, 2500);
    await this.sleep(150);

    // Start disk motor (continuous whirring)
    var motor = App.diskMotorStart();
    await this.sleep(300);

    // Head seek to track 0 (rapid stepper clicks)
    await App.diskSeek(8, 35);
    await this.sleep(200);

    // === Phase 5: DOS loading with disk activity ===
    this.display.cursorY = 6;
    this.display.cursorX = 0;
    this.display.printString('LOADING DOS...');
    this.display.render();

    // More head seeking as DOS loads
    await App.diskSeek(5, 50);
    await this.sleep(250);

    this.display.cursorY = 7;
    this.display.cursorX = 0;
    this.display.printString('DOS VERSION 3.3  16-SECTOR');
    this.display.render();

    // Final head seeks
    await App.diskSeek(3, 60);
    await this.sleep(200);

    // === Phase 6: BASIC loading ===
    this.display.cursorY = 9;
    this.display.cursorX = 0;
    this.display.printString('APPLESOFT BASIC');
    this.display.render();
    await this.sleep(200);

    // Stop disk motor
    motor.stop(0.4);
    await this.sleep(500);

    // === Phase 7: Final boot screen ===
    this.display.clear();
    await this.sleep(100);
    this.boot();

    this.screenContainer.classList.remove('crt-on');
    this.booting = false;
  }

  powerOff() {
    this.poweredOn = false;
    this.powerLed.classList.remove('on');

    // Stop any running program
    this.interpreter.running = false;
    this.interpreter.stopped = true;
    this.interpreter.inputCallback = null;
    this.interpreter.getCallback = null;

    // CRT turn-off sound + effect
    App.crtOff();
    this.screenContainer.classList.remove('crt-on');
    this.screenContainer.classList.add('crt-off');

    setTimeout(() => {
      this.display.clear();
      this.screenContainer.classList.remove('crt-off');
      this.screenContainer.classList.add('off');
    }, 400);
  }

  fillScreenGarbage() {
    const chars = '@#$%&*!?/\\|+=<>[]{}~^0123456789ABCDEF';
    for (let y = 0; y < this.display.height; y++) {
      for (let x = 0; x < this.display.width; x++) {
        this.display.screenBuffer[y][x] = chars[Math.floor(Math.random() * chars.length)];
        this.display.attrBuffer[y][x] = Math.random() > 0.7 ? 1 : 0;
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  diskActivity(drive, duration) {
    var d = drive || this.currentDrive;
    var led = this.driveLeds[d - 1];
    if (!led) return;
    led.classList.add('active');
    clearTimeout(led._timer);
    led._timer = setTimeout(function() { led.classList.remove('active'); }, duration || 400);
  }

  selectDrive(num) {
    if (num === 1 || num === 2) {
      this.currentDrive = num;
      this.fs = this.drives[num - 1];
    }
  }

  boot() {
    this.display.clear();
    this.display.printLine('APPLE ][ BASIC OS');
    this.display.printLine('APPLESOFT BASIC INTERPRETER');
    this.display.printLine('(C) 2026 - JAVASCRIPT EDITION');
    this.display.printLine('');
    this.display.printLine('SLOT 6: DRIVE 1 & DRIVE 2');
    this.display.printLine('DISK VOLUME ' + this.fs.volumeNumber);
    this.display.printLine('280X192 MONOCHROME DISPLAY');
    this.display.printLine('LO-RES 40X40 / HI-RES 280X160');
    this.display.printLine('');
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

    // Paste support (Ctrl+V / Cmd+V)
    document.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (text) this.handlePaste(text);
    });
  }

  handlePaste(text) {
    if (!this.poweredOn || this.booting) return;
    // Keep original case in buffer (needed for API keys etc.)
    // Display uppercase on screen (Apple II style)
    const clean = text.replace(/[\r\n]/g, '');
    for (const ch of clean) {
      if (ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) < 127) {
        this.inputBuffer += ch;
        this.display.printChar(ch.toUpperCase());
      }
    }
    this.display.render();
  }

  handleKeyDown(e) {
    if (!this.poweredOn || this.booting) return;

    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      this.ctrlC();
      return;
    }

    // Allow Ctrl+V / Cmd+V for paste (handled by paste event)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') return;

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

    // === Claude AI Commands (preserve original case for API key) ===
    if (upper === 'AI' || upper.startsWith('AI ')) {
      await this.handleAiCommand(line.trim());
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

  // Parse ,D1 or ,D2 suffix from command; temporarily switch drive
  parseDriveSuffix(cmd) {
    var m = cmd.match(/,\s*D([12])\s*$/);
    if (m) {
      return { cmd: cmd.replace(/,\s*D[12]\s*$/, '').trim(), drive: parseInt(m[1]) };
    }
    return { cmd: cmd, drive: 0 };
  }

  withDrive(driveNum, fn) {
    var prev = this.currentDrive;
    if (driveNum) this.selectDrive(driveNum);
    this.diskActivity(this.currentDrive);
    var result = fn();
    if (driveNum) this.selectDrive(prev);
    return result;
  }

  async handleDosCommand(upper) {

    // CATALOG / CAT
    if (upper === 'CATALOG' || upper === 'CAT' ||
        upper.startsWith('CATALOG ') || upper.startsWith('CAT ')) {
      const arg = upper.replace(/^(CATALOG|CAT)\s*/, '').trim();
      const ds = this.parseDriveSuffix(arg);
      const path = ds.cmd ? this.extractQuotedArg(ds.cmd) : '';
      const prev = this.currentDrive;
      if (ds.drive) this.selectDrive(ds.drive);
      this.diskActivity(this.currentDrive, 800);
      await this.cmdCatalog(path);
      if (ds.drive) this.selectDrive(prev);
      this.showPrompt();
      return true;
    }

    // SAVE
    if (upper === 'SAVE' || upper.startsWith('SAVE ')) {
      if (upper === 'SAVE') {
        this.display.printLine('?SYNTAX ERROR');
      } else {
        const ds = this.parseDriveSuffix(upper.substring(5));
        this.withDrive(ds.drive, () => {
          const path = this.extractQuotedArg(ds.cmd);
          const fname = path.endsWith('.BAS') ? path : path + '.BAS';
          const content = App.VirtualFileSystem.programToText(this.interpreter.program);
          const err = this.fs.writeFile(fname, content, 'A');
          if (err) this.display.printLine('?' + err);
        });
      }
      this.showPrompt();
      return true;
    }

    // LOAD
    if (upper === 'LOAD' || upper.startsWith('LOAD ')) {
      if (upper === 'LOAD') {
        this.display.printLine('?SYNTAX ERROR');
      } else {
        const ds = this.parseDriveSuffix(upper.substring(5));
        this.withDrive(ds.drive, () => {
          this.cmdLoad(this.extractQuotedArg(ds.cmd));
        });
      }
      this.showPrompt();
      return true;
    }

    // DELETE
    if (upper.startsWith('DELETE ')) {
      this.diskActivity();
      const path = this.extractQuotedArg(upper.substring(7));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.deleteFile(fpath);
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // LOCK
    if (upper.startsWith('LOCK ')) {
      this.diskActivity();
      const path = this.extractQuotedArg(upper.substring(5));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.lockFile(fpath);
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // UNLOCK
    if (upper.startsWith('UNLOCK ')) {
      this.diskActivity();
      const path = this.extractQuotedArg(upper.substring(7));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.unlockFile(fpath);
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // RENAME
    if (upper.startsWith('RENAME ')) {
      this.diskActivity();
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
      this.diskActivity();
      const path = this.extractQuotedArg(upper.substring(7));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.verifyFile(fpath);
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // INIT - format disk (with confirmation)
    if (upper === 'INIT' || upper.startsWith('INIT ')) {
      this.diskActivity(this.currentDrive, 1000);
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
      this.diskActivity(this.currentDrive, 800);
      this.cmdExec(this.extractQuotedArg(upper.substring(5)));
      return true;
    }

    // BSAVE (binary save stub)
    if (upper.startsWith('BSAVE ')) {
      this.diskActivity();
      this.cmdBsave(upper.substring(6).trim());
      this.showPrompt();
      return true;
    }

    // BLOAD (binary load stub)
    if (upper.startsWith('BLOAD ')) {
      this.diskActivity();
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
      this.diskActivity();
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
      this.diskActivity();
      const path = this.extractQuotedArg(upper.substring(6));
      const fpath = this.resolveWithExt(path);
      const err = this.fs.openFile(fpath, 'WRITE');
      if (err) this.display.printLine('?' + err);
      this.showPrompt();
      return true;
    }

    // APPEND - open for appending
    if (upper.startsWith('APPEND ')) {
      this.diskActivity();
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
      this.diskActivity();
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
    const count = this.interpreter.sortedLines.length;
    if (count === 0 && result.content.trim().length > 0) {
      this.display.printLine('?FILE FORMAT ERROR');
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
    if (this.poweredOn) {
      this.boot();
    }
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
      '=== APPLESOFT BASIC OS ===',
      '=== COMPLETE COMMAND REFERENCE ===',
      '',
      '--- PROGRAM CONTROL ---',
      'RUN [line]    Run program [from line]',
      'LIST [m-n]    List program [lines m-n]',
      'NEW           Clear program & variables',
      'CONT          Continue after STOP/BREAK',
      'DEL m,n       Delete lines m through n',
      'TRACE         Show line numbers as run',
      'NOTRACE       Turn off TRACE',
      'FP            Switch to Applesoft BASIC',
      'CTRL+C        Break/stop running program',
      '',
      '--- BASIC STATEMENTS ---',
      'PRINT expr    Output to screen (?=short)',
      'INPUT "p";v   Prompt and read input',
      'GET v$        Read single keypress',
      'LET v=expr    Assign variable (LET opt.)',
      'IF e THEN s   Conditional execution',
      'GOTO line     Jump to line number',
      'GOSUB line    Call subroutine at line',
      'RETURN        Return from GOSUB',
      'FOR v=a TO b [STEP s]',
      '              Counted loop',
      'NEXT [v]      End of FOR loop',
      'ON e GOTO l1,l2  Computed jump',
      'ON e GOSUB l1,l2 Computed call',
      'DIM v(n)      Dimension array',
      'READ v        Read from DATA statements',
      'DATA v1,v2    Store inline data',
      'RESTORE       Reset DATA pointer',
      'DEF FN f(x)=e Define function',
      'REM text      Comment/remark',
      'END           End program',
      'STOP          Break with line number',
      'POP           Discard GOSUB return addr',
      'ONERR GOTO l  Error handler',
      'CLEAR / CLR   Clear all variables',
      '',
      '--- SCREEN & TEXT ---',
      'HOME          Clear screen, cursor home',
      'HTAB col      Move cursor to column 1-40',
      'VTAB row      Move cursor to row 1-24',
      'NORMAL        White on black text',
      'INVERSE       Black on white text',
      'FLASH         Flashing text',
      'TEXT          Return to text mode',
      'SPEED= n      Output speed 0-255',
      '',
      '--- LOW-RES GRAPHICS (40x40+TEXT) ---',
      'GR            Init lo-res mixed mode',
      '              (40x40 gfx + 4 text rows)',
      'COLOR= n      Set color 0-15',
      '              (amber brightness levels)',
      'PLOT x,y      Plot single block',
      'HLIN x1,x2 AT y  Horizontal line',
      'VLIN y1,y2 AT x  Vertical line',
      '',
      '--- HI-RES GRAPHICS (280x160+TEXT) ---',
      'HGR           Init hi-res page 1',
      '              (280x160 gfx + 4 text rows)',
      'HGR2          Init hi-res page 2',
      'HCOLOR= n     0,4=off  1-3,5-7=on',
      '              (monochrome amber)',
      'HPLOT x,y     Plot point',
      'HPLOT TO x,y  Draw line to point',
      'HPLOT x,y TO x2,y2  Draw line',
      '',
      '--- SCREEN PAGES ---',
      'POKE 49236,0  Show page 1',
      'POKE 49237,0  Show page 2',
      'POKE 49234,0  Full screen (no text)',
      'POKE 49235,0  Mixed mode (with text)',
      '',
      '--- PEEK / POKE / CALL ---',
      'PEEK(addr)    Read memory location',
      'POKE addr,val Write to memory location',
      'CALL addr     Call machine language',
      '',
      '--- MATH FUNCTIONS ---',
      'ABS(n) SGN(n) INT(n) SQR(n)',
      'SIN(n) COS(n) TAN(n) ATN(n)',
      'LOG(n) EXP(n) RND(n)',
      '',
      '--- STRING FUNCTIONS ---',
      'LEN(s$)         String length',
      'LEFT$(s$,n)     Left n characters',
      'RIGHT$(s$,n)    Right n characters',
      'MID$(s$,p[,n])  Substring at pos p',
      'ASC(s$)         ASCII code of char',
      'CHR$(n)         Character from code',
      'VAL(s$)         String to number',
      'STR$(n)         Number to string',
      '',
      '--- OTHER FUNCTIONS ---',
      'FRE(n)        Free memory',
      'POS(n)        Cursor column position',
      'SPC(n)        Print n spaces',
      'TAB(n)        Tab to column n',
      'SCRN(x,y)     Lo-res color at x,y',
      '',
      '--- DOS 3.3 DISK COMMANDS ---',
      'CATALOG [path]  List disk directory',
      'SAVE name       Save program to disk',
      'LOAD name       Load program from disk',
      'DELETE name      Delete file from disk',
      'LOCK name        Protect file',
      'UNLOCK name      Unprotect file',
      'RENAME old,new   Rename a file',
      'VERIFY name      Check file integrity',
      'INIT             Format/init disk',
      'MAXFILES n       Set max open files 1-16',
      '',
      '--- FILE I/O ---',
      'OPEN name       Open file for reading',
      'CLOSE [name]    Close file(s)',
      'WRITE name      Open file for writing',
      'APPEND name     Open file for appending',
      'READ "name"     Open file for reading',
      'POSITION n,r    Set file record pos',
      'EXEC name       Execute command file',
      'BSAVE n,Ahh,Lhh  Save binary file',
      'BLOAD n[,Ahh]   Load binary file',
      'BRUN name        Run binary (stub)',
      '',
      '--- DEVICE ---',
      'PR# n        Select output slot 0-7',
      'IN# n        Select input slot 0-7',
      'MON          I/O monitor (stub)',
      'NOMON        Disable I/O monitor',
      '',
      '--- PRODOS / DIRECTORIES ---',
      'CREATE name   Create subdirectory',
      'MKDIR name    Alias for CREATE',
      'RMDIR name    Remove subdirectory',
      'PREFIX [path] Show/set current dir',
      'CD [path]     Alias for PREFIX',
      'PWD           Show current directory',
      '',
      '--- BROWSER / EXTRAS ---',
      'TYPE name     Display file contents',
      'UPLOAD        Upload file from PC',
      'DOWNLOAD [n]  Download file to PC',
      '',
      '--- CLAUDE AI ---',
      'AI question      Ask Claude anything',
      'AI WRITE n,desc  Write & save program',
      'AI AGENT instr   Agent controls emulator',
      'AI KEY [key]     Set/show API key',
      'AI MODEL [name]  Set/show model',
      'AI NEW           Clear AI conversation',
      'AI HELP          Show AI help',
      '',
      '--- SYSTEM ---',
      'HELP          This command reference',
      'TUTORIAL [n]  Interactive tutorial',
      'RESET         Reset emulator',
      '',
      'CATALOG LEGEND: *=LOCKED A=APPLESOFT',
      '  B=BINARY T=TEXT I=INTEGER D=DIR',
      '',
    ];
    await this.printPaged(lines);
  }

  // ===== CLAUDE AI =====

  async handleAiCommand(originalLine) {
    const arg = originalLine.substring(2).trim();
    const argUpper = arg.toUpperCase();

    // AI KEY - set API key (preserve original case!)
    if (argUpper.startsWith('KEY ')) {
      const key = arg.substring(4).trim();
      if (!key) {
        this.display.printLine('?SYNTAX ERROR');
      } else {
        this.ai.setApiKey(key);
        this.display.printLine('');
        this.display.printLine('API KEY SAVED.');
        const masked = key.substring(0, 7) + '...' + key.slice(-4);
        this.display.printLine('KEY: ' + masked.toUpperCase());
      }
      this.showPrompt();
      return;
    }

    // AI KEY (show current)
    if (argUpper === 'KEY') {
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
    if (argUpper === 'MODEL') {
      this.display.printLine('MODEL: ' + this.ai.getModel());
      this.showPrompt();
      return;
    }
    if (argUpper.startsWith('MODEL ')) {
      const model = arg.substring(6).trim().toLowerCase();
      this.ai.setModel(model);
      this.display.printLine('MODEL SET: ' + model);
      this.showPrompt();
      return;
    }

    // AI NEW - clear conversation history
    if (argUpper === 'NEW') {
      this.ai.clearHistory();
      this.display.printLine('AI CONVERSATION CLEARED.');
      this.showPrompt();
      return;
    }

    // AI HELP
    if (argUpper === 'HELP' || argUpper === '') {
      await this.showAiHelp();
      this.showPrompt();
      return;
    }

    // AI AGENT - autonomous agent mode
    if (argUpper.startsWith('AGENT ')) {
      await this.aiAgent(arg.substring(6).trim());
      this.showPrompt();
      return;
    }

    // AI WRITE filename description
    if (argUpper.startsWith('WRITE ')) {
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
      'AI AGENT instruction',
      '  Claude controls the emulator',
      '  like a user - types commands,',
      '  writes programs, saves files',
      '',
      'EXAMPLES:',
      ' AI WHAT IS PEEK AND POKE?',
      ' AI HOW DO I DRAW GRAPHICS?',
      ' AI WRITE GAME, GUESS A NUMBER',
      ' AI WRITE SORT, BUBBLE SORT DEMO',
      ' AI AGENT WRITE A GAME AND SAVE IT',
      ' AI AGENT LOAD HELLO AND RUN IT',
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

  async aiAgent(instruction) {
    if (!this.ai.getApiKey()) {
      this.display.printLine('');
      this.display.printLine('NO API KEY SET.');
      this.display.printLine('USE: AI KEY YOUR-API-KEY');
      this.display.printLine('GET KEY: CONSOLE.ANTHROPIC.COM');
      return;
    }

    if (!instruction) {
      this.display.printLine('?SYNTAX ERROR');
      this.display.printLine('USE: AI AGENT instruction');
      return;
    }

    this.display.printLine('');
    this.display.printString('AGENT WORKING');
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
        instruction,
        this.ai.getAgentSystemPrompt(),
        false
      );

      let fullResponse = '';
      let firstChunk = true;

      for await (const chunk of stream) {
        if (firstChunk) {
          clearInterval(dotInterval);
          this.display.printLine('');
          firstChunk = false;
        }
        fullResponse += chunk;
      }

      if (firstChunk) {
        clearInterval(dotInterval);
      }

      // Parse response into individual lines to execute
      const lines = fullResponse.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('```'));

      if (lines.length === 0) {
        this.display.printLine('');
        this.display.printLine('?NO COMMANDS GENERATED');
        return;
      }

      this.display.printLine('');
      this.display.printLine('EXECUTING ' + lines.length + ' COMMANDS...');
      this.display.printLine('');
      this.display.render();

      // Suppress showPrompt during agent execution
      const origShowPrompt = this.showPrompt.bind(this);
      this.showPrompt = () => {};

      // Execute each line as if the user typed it
      for (const line of lines) {
        this.display.printString(']' + line.toUpperCase());
        this.display.printLine('');
        this.display.render();
        await this.processLine(line);
        this.display.render();
        // Delay between commands for visual feedback
        await new Promise(r => setTimeout(r, 200));
      }

      // Restore showPrompt
      this.showPrompt = origShowPrompt;

      this.display.printLine('');
      this.display.printLine('AGENT DONE. ' + lines.length + ' COMMANDS EXECUTED.');

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
