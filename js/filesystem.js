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
