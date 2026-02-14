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
