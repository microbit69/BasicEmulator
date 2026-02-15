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
  AI NEW, AI WRITE, AI AGENT

When asked to write BASIC programs, output ONLY valid Applesoft BASIC numbered lines. No explanations before or after the code unless explicitly asked. Use line numbers starting at 10, incrementing by 10.`;
  }

  getAgentSystemPrompt() {
    return `You are an AI agent controlling an Apple II+ emulator running Applesoft BASIC with DOS 3.3.
You receive instructions from the user and must accomplish them by outputting emulator commands - exactly as if you were typing at the keyboard.

OUTPUT FORMAT:
Return ONLY lines to be typed into the emulator, one per line. No explanations, no comments outside REM statements, no markdown.
Each line you output will be executed as if the user typed it and pressed ENTER.

AVAILABLE COMMANDS:
- Numbered lines (e.g. 10 PRINT "HI") are stored as program lines
- NEW - clear current program
- RUN - run the program
- LIST - list the program
- SAVE filename - save program to disk
- LOAD filename - load program from disk
- CATALOG - show disk contents
- DELETE filename - delete a file
- HOME - clear screen
- Any valid Applesoft BASIC immediate command
- Any DOS 3.3 command

RULES:
- Output ONLY lines to type, nothing else
- Each line is executed sequentially
- To write a program: output NEW, then numbered lines, then SAVE
- To modify a program: LOAD it, add/change lines, SAVE it
- To run a program: output RUN
- Line numbers 0-63999, increment by 10
- Max line length: 239 characters
- Use valid Applesoft BASIC syntax
- You can chain multiple operations (e.g. write program, save, run)

EXAMPLE - if asked "write a hello world program and save it":
NEW
10 HOME
20 PRINT "HELLO WORLD!"
30 END
SAVE HELLO

EXAMPLE - if asked "show what files are on disk":
CATALOG

EXAMPLE - if asked "load the game and run it":
LOAD GAME
RUN`;
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
      try {
        const errBody = await response.json();
        if (errBody.error?.message) {
          errMsg = errBody.error.message.substring(0, 120).toUpperCase();
        }
      } catch (e) { /* ignore parse errors */ }
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
