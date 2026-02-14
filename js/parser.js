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
