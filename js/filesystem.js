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
