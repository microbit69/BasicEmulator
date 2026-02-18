window.App = window.App || {};

/**
 * MOS 6502 CPU Emulator
 *
 * Implements the full official 6502 instruction set (56 instructions, 151 opcodes)
 * with all 13 addressing modes. Used by the Apple II emulator for:
 *   - CALL addr (execute machine language from BASIC)
 *   - USR(addr) (execute ML and return accumulator value)
 *   - BRUN (load and execute binary files)
 *   - System Monitor G command (go/execute)
 *
 * The CPU shares the 64KB memory array with the BASIC interpreter,
 * and I/O accesses ($C000-$C0FF) trigger the same soft switch behavior.
 */
class CPU6502 {
  constructor(memory, readHook, writeHook) {
    // CPU registers
    this.A = 0;     // Accumulator (8-bit)
    this.X = 0;     // X index register (8-bit)
    this.Y = 0;     // Y index register (8-bit)
    this.SP = 0xFD; // Stack pointer (8-bit, points into $0100-$01FF)
    this.PC = 0;    // Program counter (16-bit)

    // Status flags (P register bits)
    this.C = 0;  // Carry
    this.Z = 0;  // Zero
    this.I = 1;  // Interrupt disable (set on reset)
    this.D = 0;  // Decimal mode
    this.B = 0;  // Break command
    this.V = 0;  // Overflow
    this.N = 0;  // Negative

    // Memory: shared 64KB Uint8Array from the interpreter
    this.memory = memory;

    // Optional hooks for I/O (soft switches, etc.)
    // readHook(addr) -> value or null (null = use memory directly)
    // writeHook(addr, value) -> true if handled, false = write to memory
    this.readHook = readHook || null;
    this.writeHook = writeHook || null;

    // Execution state
    this.halted = false;    // Set by BRK or when execution should stop
    this.cycles = 0;        // Cycle counter
    this.maxCycles = 0;     // Max cycles before forced halt (0 = unlimited)

    // Build the opcode dispatch table
    this._buildOpcodeTable();
  }

  // === Memory Access ===

  read(addr) {
    addr &= 0xFFFF;
    if (this.readHook) {
      const val = this.readHook(addr);
      if (val !== null && val !== undefined) return val & 0xFF;
    }
    return this.memory[addr];
  }

  write(addr, val) {
    addr &= 0xFFFF;
    val &= 0xFF;
    if (this.writeHook) {
      if (this.writeHook(addr, val)) return;
    }
    this.memory[addr] = val;
  }

  // Read 16-bit value (little-endian)
  read16(addr) {
    return this.read(addr) | (this.read(addr + 1) << 8);
  }

  // Read 16-bit with zero page wrapping (for indirect addressing)
  read16zp(addr) {
    return this.read(addr & 0xFF) | (this.read((addr + 1) & 0xFF) << 8);
  }

  // === Stack Operations ===

  push(val) {
    this.memory[0x100 + this.SP] = val & 0xFF;
    this.SP = (this.SP - 1) & 0xFF;
  }

  push16(val) {
    this.push((val >> 8) & 0xFF);
    this.push(val & 0xFF);
  }

  pull() {
    this.SP = (this.SP + 1) & 0xFF;
    return this.memory[0x100 + this.SP];
  }

  pull16() {
    const lo = this.pull();
    const hi = this.pull();
    return (hi << 8) | lo;
  }

  // === Status Register ===

  getP() {
    return (this.C ? 0x01 : 0) |
           (this.Z ? 0x02 : 0) |
           (this.I ? 0x04 : 0) |
           (this.D ? 0x08 : 0) |
           (this.B ? 0x10 : 0) |
           0x20 |  // Unused bit, always 1
           (this.V ? 0x40 : 0) |
           (this.N ? 0x80 : 0);
  }

  setP(val) {
    this.C = (val & 0x01) ? 1 : 0;
    this.Z = (val & 0x02) ? 1 : 0;
    this.I = (val & 0x04) ? 1 : 0;
    this.D = (val & 0x08) ? 1 : 0;
    this.B = (val & 0x10) ? 1 : 0;
    this.V = (val & 0x40) ? 1 : 0;
    this.N = (val & 0x80) ? 1 : 0;
  }

  // Update N and Z flags from a value
  setNZ(val) {
    this.N = (val & 0x80) ? 1 : 0;
    this.Z = (val & 0xFF) === 0 ? 1 : 0;
  }

  // === Addressing Modes (return effective address) ===

  // Immediate: operand is the byte itself (returns address of operand)
  addrImm() {
    return this.PC++;
  }

  // Zero Page: $nn
  addrZP() {
    return this.read(this.PC++) & 0xFF;
  }

  // Zero Page,X: ($nn + X) & 0xFF
  addrZPX() {
    return (this.read(this.PC++) + this.X) & 0xFF;
  }

  // Zero Page,Y: ($nn + Y) & 0xFF
  addrZPY() {
    return (this.read(this.PC++) + this.Y) & 0xFF;
  }

  // Absolute: $nnnn
  addrAbs() {
    const lo = this.read(this.PC++);
    const hi = this.read(this.PC++);
    return (hi << 8) | lo;
  }

  // Absolute,X: $nnnn + X
  addrAbsX() {
    const base = this.addrAbs();
    const addr = (base + this.X) & 0xFFFF;
    // Extra cycle if page boundary crossed
    if ((base & 0xFF00) !== (addr & 0xFF00)) this.cycles++;
    return addr;
  }

  // Absolute,X (no extra cycle for page cross - for write instructions)
  addrAbsXW() {
    const base = this.addrAbs();
    return (base + this.X) & 0xFFFF;
  }

  // Absolute,Y: $nnnn + Y
  addrAbsY() {
    const base = this.addrAbs();
    const addr = (base + this.Y) & 0xFFFF;
    if ((base & 0xFF00) !== (addr & 0xFF00)) this.cycles++;
    return addr;
  }

  // Absolute,Y (no extra cycle for write)
  addrAbsYW() {
    const base = this.addrAbs();
    return (base + this.Y) & 0xFFFF;
  }

  // Indirect: ($nnnn) - only used by JMP
  addrInd() {
    const ptrLo = this.read(this.PC++);
    const ptrHi = this.read(this.PC++);
    const ptr = (ptrHi << 8) | ptrLo;
    // 6502 bug: if pointer is at $xxFF, high byte wraps within page
    const lo = this.read(ptr);
    const hi = this.read((ptr & 0xFF00) | ((ptr + 1) & 0xFF));
    return (hi << 8) | lo;
  }

  // (Indirect,X): (($nn + X) & 0xFF) - indexed indirect
  addrIndX() {
    const zp = (this.read(this.PC++) + this.X) & 0xFF;
    return this.read16zp(zp);
  }

  // (Indirect),Y: ($nn) + Y - indirect indexed
  addrIndY() {
    const zp = this.read(this.PC++);
    const base = this.read16zp(zp);
    const addr = (base + this.Y) & 0xFFFF;
    if ((base & 0xFF00) !== (addr & 0xFF00)) this.cycles++;
    return addr;
  }

  // (Indirect),Y (no extra cycle for write)
  addrIndYW() {
    const zp = this.read(this.PC++);
    const base = this.read16zp(zp);
    return (base + this.Y) & 0xFFFF;
  }

  // Relative: signed 8-bit offset (for branch instructions)
  addrRel() {
    let offset = this.read(this.PC++);
    if (offset & 0x80) offset -= 256; // sign extend
    return (this.PC + offset) & 0xFFFF;
  }

  // === ALU Operations ===

  // Add with carry (handles decimal mode)
  opADC(val) {
    if (this.D) {
      // BCD mode
      let lo = (this.A & 0x0F) + (val & 0x0F) + this.C;
      let hi = (this.A >> 4) + (val >> 4);
      if (lo > 9) { lo -= 10; hi++; }
      // Overflow is set based on binary arithmetic
      const binResult = this.A + val + this.C;
      this.V = (~(this.A ^ val) & (this.A ^ binResult) & 0x80) ? 1 : 0;
      if (hi > 9) { hi -= 10; this.C = 1; } else { this.C = 0; }
      this.A = ((hi << 4) | (lo & 0x0F)) & 0xFF;
      this.setNZ(this.A);
    } else {
      const result = this.A + val + this.C;
      this.V = (~(this.A ^ val) & (this.A ^ result) & 0x80) ? 1 : 0;
      this.C = result > 0xFF ? 1 : 0;
      this.A = result & 0xFF;
      this.setNZ(this.A);
    }
  }

  // Subtract with carry (handles decimal mode)
  opSBC(val) {
    if (this.D) {
      // BCD mode
      let lo = (this.A & 0x0F) - (val & 0x0F) - (1 - this.C);
      let hi = (this.A >> 4) - (val >> 4);
      if (lo < 0) { lo += 10; hi--; }
      // Overflow and carry based on binary arithmetic
      const binResult = this.A - val - (1 - this.C);
      this.V = ((this.A ^ val) & (this.A ^ binResult) & 0x80) ? 1 : 0;
      this.C = binResult >= 0 ? 1 : 0;
      if (hi < 0) { hi += 10; }
      this.A = ((hi << 4) | (lo & 0x0F)) & 0xFF;
      this.setNZ(this.A);
    } else {
      const result = this.A - val - (1 - this.C);
      this.V = ((this.A ^ val) & (this.A ^ result) & 0x80) ? 1 : 0;
      this.C = result >= 0 ? 1 : 0;
      this.A = result & 0xFF;
      this.setNZ(this.A);
    }
  }

  // Compare (sets flags based on register - memory)
  opCMP(reg, val) {
    const result = reg - val;
    this.C = reg >= val ? 1 : 0;
    this.setNZ(result & 0xFF);
  }

  // Arithmetic shift left
  opASL(addr) {
    let val;
    if (addr === -1) {
      // Accumulator mode
      this.C = (this.A >> 7) & 1;
      this.A = (this.A << 1) & 0xFF;
      this.setNZ(this.A);
    } else {
      val = this.read(addr);
      this.C = (val >> 7) & 1;
      val = (val << 1) & 0xFF;
      this.write(addr, val);
      this.setNZ(val);
    }
  }

  // Logical shift right
  opLSR(addr) {
    if (addr === -1) {
      this.C = this.A & 1;
      this.A = this.A >> 1;
      this.setNZ(this.A);
    } else {
      let val = this.read(addr);
      this.C = val & 1;
      val = val >> 1;
      this.write(addr, val);
      this.setNZ(val);
    }
  }

  // Rotate left
  opROL(addr) {
    const oldC = this.C;
    if (addr === -1) {
      this.C = (this.A >> 7) & 1;
      this.A = ((this.A << 1) | oldC) & 0xFF;
      this.setNZ(this.A);
    } else {
      let val = this.read(addr);
      this.C = (val >> 7) & 1;
      val = ((val << 1) | oldC) & 0xFF;
      this.write(addr, val);
      this.setNZ(val);
    }
  }

  // Rotate right
  opROR(addr) {
    const oldC = this.C;
    if (addr === -1) {
      this.C = this.A & 1;
      this.A = (this.A >> 1) | (oldC << 7);
      this.setNZ(this.A);
    } else {
      let val = this.read(addr);
      this.C = val & 1;
      val = (val >> 1) | (oldC << 7);
      this.write(addr, val);
      this.setNZ(val);
    }
  }

  // Branch if condition is true
  branch(condition) {
    const target = this.addrRel();
    if (condition) {
      // Extra cycle for branch taken
      this.cycles++;
      // Extra cycle if page boundary crossed
      if ((this.PC & 0xFF00) !== (target & 0xFF00)) this.cycles++;
      this.PC = target;
    }
  }

  // === Execution ===

  /**
   * Execute instructions starting at the current PC.
   * Stops when:
   *   - BRK is encountered (halted = true)
   *   - RTS is executed with SP at or above the initial SP (returned to caller)
   *   - maxCycles is reached (if > 0)
   *   - halted flag is set externally
   *
   * @param {number} startAddr - Starting address (sets PC)
   * @param {object} options - { maxCycles, stopOnRTS }
   * @returns {number} - Number of cycles executed
   */
  run(startAddr, options) {
    options = options || {};
    this.PC = startAddr & 0xFFFF;
    this.halted = false;
    this.cycles = 0;
    this.maxCycles = options.maxCycles || 1000000; // Safety limit: ~1 second at 1MHz
    const stopOnRTS = options.stopOnRTS !== false; // default true
    const initialSP = this.SP;

    while (!this.halted) {
      this.step();

      // Check cycle limit
      if (this.maxCycles > 0 && this.cycles >= this.maxCycles) {
        this.halted = true;
      }
    }

    return this.cycles;
  }

  /**
   * Execute a single instruction.
   */
  step() {
    const opcode = this.read(this.PC++);
    const handler = this.opcodes[opcode];

    if (handler) {
      handler.call(this);
    } else {
      // Illegal opcode - treat as NOP (1 byte, 2 cycles)
      this.cycles += 2;
    }
  }

  // === Reset ===

  reset() {
    this.A = 0;
    this.X = 0;
    this.Y = 0;
    this.SP = 0xFD;
    this.C = 0;
    this.Z = 0;
    this.I = 1;
    this.D = 0;
    this.B = 0;
    this.V = 0;
    this.N = 0;
    this.halted = false;
    this.cycles = 0;
    // Load PC from reset vector ($FFFC/$FFFD)
    this.PC = this.read16(0xFFFC);
  }

  // === Opcode Dispatch Table ===

  _buildOpcodeTable() {
    this.opcodes = new Array(256).fill(null);
    const o = this.opcodes;
    const self = this;

    // === BRK ===
    o[0x00] = function() { // BRK
      self.PC++;
      self.push16(self.PC);
      self.push(self.getP() | 0x10); // B flag set in pushed value
      self.I = 1;
      self.PC = self.read16(0xFFFE);
      self.halted = true; // Stop execution on BRK
      self.cycles += 7;
    };

    // === NOP ===
    o[0xEA] = function() { self.cycles += 2; }; // NOP

    // === LDA ===
    o[0xA9] = function() { self.A = self.read(self.addrImm()); self.setNZ(self.A); self.cycles += 2; };
    o[0xA5] = function() { self.A = self.read(self.addrZP()); self.setNZ(self.A); self.cycles += 3; };
    o[0xB5] = function() { self.A = self.read(self.addrZPX()); self.setNZ(self.A); self.cycles += 4; };
    o[0xAD] = function() { self.A = self.read(self.addrAbs()); self.setNZ(self.A); self.cycles += 4; };
    o[0xBD] = function() { self.A = self.read(self.addrAbsX()); self.setNZ(self.A); self.cycles += 4; };
    o[0xB9] = function() { self.A = self.read(self.addrAbsY()); self.setNZ(self.A); self.cycles += 4; };
    o[0xA1] = function() { self.A = self.read(self.addrIndX()); self.setNZ(self.A); self.cycles += 6; };
    o[0xB1] = function() { self.A = self.read(self.addrIndY()); self.setNZ(self.A); self.cycles += 5; };

    // === LDX ===
    o[0xA2] = function() { self.X = self.read(self.addrImm()); self.setNZ(self.X); self.cycles += 2; };
    o[0xA6] = function() { self.X = self.read(self.addrZP()); self.setNZ(self.X); self.cycles += 3; };
    o[0xB6] = function() { self.X = self.read(self.addrZPY()); self.setNZ(self.X); self.cycles += 4; };
    o[0xAE] = function() { self.X = self.read(self.addrAbs()); self.setNZ(self.X); self.cycles += 4; };
    o[0xBE] = function() { self.X = self.read(self.addrAbsY()); self.setNZ(self.X); self.cycles += 4; };

    // === LDY ===
    o[0xA0] = function() { self.Y = self.read(self.addrImm()); self.setNZ(self.Y); self.cycles += 2; };
    o[0xA4] = function() { self.Y = self.read(self.addrZP()); self.setNZ(self.Y); self.cycles += 3; };
    o[0xB4] = function() { self.Y = self.read(self.addrZPX()); self.setNZ(self.Y); self.cycles += 4; };
    o[0xAC] = function() { self.Y = self.read(self.addrAbs()); self.setNZ(self.Y); self.cycles += 4; };
    o[0xBC] = function() { self.Y = self.read(self.addrAbsX()); self.setNZ(self.Y); self.cycles += 4; };

    // === STA ===
    o[0x85] = function() { self.write(self.addrZP(), self.A); self.cycles += 3; };
    o[0x95] = function() { self.write(self.addrZPX(), self.A); self.cycles += 4; };
    o[0x8D] = function() { self.write(self.addrAbs(), self.A); self.cycles += 4; };
    o[0x9D] = function() { self.write(self.addrAbsXW(), self.A); self.cycles += 5; };
    o[0x99] = function() { self.write(self.addrAbsYW(), self.A); self.cycles += 5; };
    o[0x81] = function() { self.write(self.addrIndX(), self.A); self.cycles += 6; };
    o[0x91] = function() { self.write(self.addrIndYW(), self.A); self.cycles += 6; };

    // === STX ===
    o[0x86] = function() { self.write(self.addrZP(), self.X); self.cycles += 3; };
    o[0x96] = function() { self.write(self.addrZPY(), self.X); self.cycles += 4; };
    o[0x8E] = function() { self.write(self.addrAbs(), self.X); self.cycles += 4; };

    // === STY ===
    o[0x84] = function() { self.write(self.addrZP(), self.Y); self.cycles += 3; };
    o[0x94] = function() { self.write(self.addrZPX(), self.Y); self.cycles += 4; };
    o[0x8C] = function() { self.write(self.addrAbs(), self.Y); self.cycles += 4; };

    // === Transfer ===
    o[0xAA] = function() { self.X = self.A; self.setNZ(self.X); self.cycles += 2; }; // TAX
    o[0xA8] = function() { self.Y = self.A; self.setNZ(self.Y); self.cycles += 2; }; // TAY
    o[0x8A] = function() { self.A = self.X; self.setNZ(self.A); self.cycles += 2; }; // TXA
    o[0x98] = function() { self.A = self.Y; self.setNZ(self.A); self.cycles += 2; }; // TYA
    o[0xBA] = function() { self.X = self.SP; self.setNZ(self.X); self.cycles += 2; }; // TSX
    o[0x9A] = function() { self.SP = self.X; self.cycles += 2; }; // TXS

    // === Stack ===
    o[0x48] = function() { self.push(self.A); self.cycles += 3; }; // PHA
    o[0x08] = function() { self.push(self.getP() | 0x10); self.cycles += 3; }; // PHP
    o[0x68] = function() { self.A = self.pull(); self.setNZ(self.A); self.cycles += 4; }; // PLA
    o[0x28] = function() { self.setP(self.pull()); self.cycles += 4; }; // PLP

    // === ADC ===
    o[0x69] = function() { self.opADC(self.read(self.addrImm())); self.cycles += 2; };
    o[0x65] = function() { self.opADC(self.read(self.addrZP())); self.cycles += 3; };
    o[0x75] = function() { self.opADC(self.read(self.addrZPX())); self.cycles += 4; };
    o[0x6D] = function() { self.opADC(self.read(self.addrAbs())); self.cycles += 4; };
    o[0x7D] = function() { self.opADC(self.read(self.addrAbsX())); self.cycles += 4; };
    o[0x79] = function() { self.opADC(self.read(self.addrAbsY())); self.cycles += 4; };
    o[0x61] = function() { self.opADC(self.read(self.addrIndX())); self.cycles += 6; };
    o[0x71] = function() { self.opADC(self.read(self.addrIndY())); self.cycles += 5; };

    // === SBC ===
    o[0xE9] = function() { self.opSBC(self.read(self.addrImm())); self.cycles += 2; };
    o[0xE5] = function() { self.opSBC(self.read(self.addrZP())); self.cycles += 3; };
    o[0xF5] = function() { self.opSBC(self.read(self.addrZPX())); self.cycles += 4; };
    o[0xED] = function() { self.opSBC(self.read(self.addrAbs())); self.cycles += 4; };
    o[0xFD] = function() { self.opSBC(self.read(self.addrAbsX())); self.cycles += 4; };
    o[0xF9] = function() { self.opSBC(self.read(self.addrAbsY())); self.cycles += 4; };
    o[0xE1] = function() { self.opSBC(self.read(self.addrIndX())); self.cycles += 6; };
    o[0xF1] = function() { self.opSBC(self.read(self.addrIndY())); self.cycles += 5; };

    // === AND ===
    o[0x29] = function() { self.A &= self.read(self.addrImm()); self.setNZ(self.A); self.cycles += 2; };
    o[0x25] = function() { self.A &= self.read(self.addrZP()); self.setNZ(self.A); self.cycles += 3; };
    o[0x35] = function() { self.A &= self.read(self.addrZPX()); self.setNZ(self.A); self.cycles += 4; };
    o[0x2D] = function() { self.A &= self.read(self.addrAbs()); self.setNZ(self.A); self.cycles += 4; };
    o[0x3D] = function() { self.A &= self.read(self.addrAbsX()); self.setNZ(self.A); self.cycles += 4; };
    o[0x39] = function() { self.A &= self.read(self.addrAbsY()); self.setNZ(self.A); self.cycles += 4; };
    o[0x21] = function() { self.A &= self.read(self.addrIndX()); self.setNZ(self.A); self.cycles += 6; };
    o[0x31] = function() { self.A &= self.read(self.addrIndY()); self.setNZ(self.A); self.cycles += 5; };

    // === ORA ===
    o[0x09] = function() { self.A |= self.read(self.addrImm()); self.setNZ(self.A); self.cycles += 2; };
    o[0x05] = function() { self.A |= self.read(self.addrZP()); self.setNZ(self.A); self.cycles += 3; };
    o[0x15] = function() { self.A |= self.read(self.addrZPX()); self.setNZ(self.A); self.cycles += 4; };
    o[0x0D] = function() { self.A |= self.read(self.addrAbs()); self.setNZ(self.A); self.cycles += 4; };
    o[0x1D] = function() { self.A |= self.read(self.addrAbsX()); self.setNZ(self.A); self.cycles += 4; };
    o[0x19] = function() { self.A |= self.read(self.addrAbsY()); self.setNZ(self.A); self.cycles += 4; };
    o[0x01] = function() { self.A |= self.read(self.addrIndX()); self.setNZ(self.A); self.cycles += 6; };
    o[0x11] = function() { self.A |= self.read(self.addrIndY()); self.setNZ(self.A); self.cycles += 5; };

    // === EOR ===
    o[0x49] = function() { self.A ^= self.read(self.addrImm()); self.setNZ(self.A); self.cycles += 2; };
    o[0x45] = function() { self.A ^= self.read(self.addrZP()); self.setNZ(self.A); self.cycles += 3; };
    o[0x55] = function() { self.A ^= self.read(self.addrZPX()); self.setNZ(self.A); self.cycles += 4; };
    o[0x4D] = function() { self.A ^= self.read(self.addrAbs()); self.setNZ(self.A); self.cycles += 4; };
    o[0x5D] = function() { self.A ^= self.read(self.addrAbsX()); self.setNZ(self.A); self.cycles += 4; };
    o[0x59] = function() { self.A ^= self.read(self.addrAbsY()); self.setNZ(self.A); self.cycles += 4; };
    o[0x41] = function() { self.A ^= self.read(self.addrIndX()); self.setNZ(self.A); self.cycles += 6; };
    o[0x51] = function() { self.A ^= self.read(self.addrIndY()); self.setNZ(self.A); self.cycles += 5; };

    // === CMP ===
    o[0xC9] = function() { self.opCMP(self.A, self.read(self.addrImm())); self.cycles += 2; };
    o[0xC5] = function() { self.opCMP(self.A, self.read(self.addrZP())); self.cycles += 3; };
    o[0xD5] = function() { self.opCMP(self.A, self.read(self.addrZPX())); self.cycles += 4; };
    o[0xCD] = function() { self.opCMP(self.A, self.read(self.addrAbs())); self.cycles += 4; };
    o[0xDD] = function() { self.opCMP(self.A, self.read(self.addrAbsX())); self.cycles += 4; };
    o[0xD9] = function() { self.opCMP(self.A, self.read(self.addrAbsY())); self.cycles += 4; };
    o[0xC1] = function() { self.opCMP(self.A, self.read(self.addrIndX())); self.cycles += 6; };
    o[0xD1] = function() { self.opCMP(self.A, self.read(self.addrIndY())); self.cycles += 5; };

    // === CPX ===
    o[0xE0] = function() { self.opCMP(self.X, self.read(self.addrImm())); self.cycles += 2; };
    o[0xE4] = function() { self.opCMP(self.X, self.read(self.addrZP())); self.cycles += 3; };
    o[0xEC] = function() { self.opCMP(self.X, self.read(self.addrAbs())); self.cycles += 4; };

    // === CPY ===
    o[0xC0] = function() { self.opCMP(self.Y, self.read(self.addrImm())); self.cycles += 2; };
    o[0xC4] = function() { self.opCMP(self.Y, self.read(self.addrZP())); self.cycles += 3; };
    o[0xCC] = function() { self.opCMP(self.Y, self.read(self.addrAbs())); self.cycles += 4; };

    // === BIT ===
    o[0x24] = function() { // BIT zp
      const val = self.read(self.addrZP());
      self.Z = (self.A & val) === 0 ? 1 : 0;
      self.N = (val >> 7) & 1;
      self.V = (val >> 6) & 1;
      self.cycles += 3;
    };
    o[0x2C] = function() { // BIT abs
      const val = self.read(self.addrAbs());
      self.Z = (self.A & val) === 0 ? 1 : 0;
      self.N = (val >> 7) & 1;
      self.V = (val >> 6) & 1;
      self.cycles += 4;
    };

    // === ASL ===
    o[0x0A] = function() { self.opASL(-1); self.cycles += 2; };          // ASL A
    o[0x06] = function() { self.opASL(self.addrZP()); self.cycles += 5; };
    o[0x16] = function() { self.opASL(self.addrZPX()); self.cycles += 6; };
    o[0x0E] = function() { self.opASL(self.addrAbs()); self.cycles += 6; };
    o[0x1E] = function() { self.opASL(self.addrAbsXW()); self.cycles += 7; };

    // === LSR ===
    o[0x4A] = function() { self.opLSR(-1); self.cycles += 2; };          // LSR A
    o[0x46] = function() { self.opLSR(self.addrZP()); self.cycles += 5; };
    o[0x56] = function() { self.opLSR(self.addrZPX()); self.cycles += 6; };
    o[0x4E] = function() { self.opLSR(self.addrAbs()); self.cycles += 6; };
    o[0x5E] = function() { self.opLSR(self.addrAbsXW()); self.cycles += 7; };

    // === ROL ===
    o[0x2A] = function() { self.opROL(-1); self.cycles += 2; };          // ROL A
    o[0x26] = function() { self.opROL(self.addrZP()); self.cycles += 5; };
    o[0x36] = function() { self.opROL(self.addrZPX()); self.cycles += 6; };
    o[0x2E] = function() { self.opROL(self.addrAbs()); self.cycles += 6; };
    o[0x3E] = function() { self.opROL(self.addrAbsXW()); self.cycles += 7; };

    // === ROR ===
    o[0x6A] = function() { self.opROR(-1); self.cycles += 2; };          // ROR A
    o[0x66] = function() { self.opROR(self.addrZP()); self.cycles += 5; };
    o[0x76] = function() { self.opROR(self.addrZPX()); self.cycles += 6; };
    o[0x6E] = function() { self.opROR(self.addrAbs()); self.cycles += 6; };
    o[0x7E] = function() { self.opROR(self.addrAbsXW()); self.cycles += 7; };

    // === INC ===
    o[0xE6] = function() { const a = self.addrZP(); const v = (self.read(a) + 1) & 0xFF; self.write(a, v); self.setNZ(v); self.cycles += 5; };
    o[0xF6] = function() { const a = self.addrZPX(); const v = (self.read(a) + 1) & 0xFF; self.write(a, v); self.setNZ(v); self.cycles += 6; };
    o[0xEE] = function() { const a = self.addrAbs(); const v = (self.read(a) + 1) & 0xFF; self.write(a, v); self.setNZ(v); self.cycles += 6; };
    o[0xFE] = function() { const a = self.addrAbsXW(); const v = (self.read(a) + 1) & 0xFF; self.write(a, v); self.setNZ(v); self.cycles += 7; };

    // === DEC ===
    o[0xC6] = function() { const a = self.addrZP(); const v = (self.read(a) - 1) & 0xFF; self.write(a, v); self.setNZ(v); self.cycles += 5; };
    o[0xD6] = function() { const a = self.addrZPX(); const v = (self.read(a) - 1) & 0xFF; self.write(a, v); self.setNZ(v); self.cycles += 6; };
    o[0xCE] = function() { const a = self.addrAbs(); const v = (self.read(a) - 1) & 0xFF; self.write(a, v); self.setNZ(v); self.cycles += 6; };
    o[0xDE] = function() { const a = self.addrAbsXW(); const v = (self.read(a) - 1) & 0xFF; self.write(a, v); self.setNZ(v); self.cycles += 7; };

    // === INX, INY, DEX, DEY ===
    o[0xE8] = function() { self.X = (self.X + 1) & 0xFF; self.setNZ(self.X); self.cycles += 2; }; // INX
    o[0xC8] = function() { self.Y = (self.Y + 1) & 0xFF; self.setNZ(self.Y); self.cycles += 2; }; // INY
    o[0xCA] = function() { self.X = (self.X - 1) & 0xFF; self.setNZ(self.X); self.cycles += 2; }; // DEX
    o[0x88] = function() { self.Y = (self.Y - 1) & 0xFF; self.setNZ(self.Y); self.cycles += 2; }; // DEY

    // === Branch Instructions ===
    o[0x10] = function() { self.branch(!self.N); self.cycles += 2; }; // BPL
    o[0x30] = function() { self.branch(!!self.N); self.cycles += 2; }; // BMI
    o[0x50] = function() { self.branch(!self.V); self.cycles += 2; }; // BVC
    o[0x70] = function() { self.branch(!!self.V); self.cycles += 2; }; // BVS
    o[0x90] = function() { self.branch(!self.C); self.cycles += 2; }; // BCC
    o[0xB0] = function() { self.branch(!!self.C); self.cycles += 2; }; // BCS
    o[0xD0] = function() { self.branch(!self.Z); self.cycles += 2; }; // BNE
    o[0xF0] = function() { self.branch(!!self.Z); self.cycles += 2; }; // BEQ

    // === JMP ===
    o[0x4C] = function() { self.PC = self.addrAbs(); self.cycles += 3; }; // JMP abs
    o[0x6C] = function() { self.PC = self.addrInd(); self.cycles += 5; }; // JMP (ind)

    // === JSR / RTS / RTI ===
    o[0x20] = function() { // JSR
      const target = self.addrAbs();
      self.push16(self.PC - 1); // Push return address - 1
      self.PC = target;
      self.cycles += 6;
    };

    o[0x60] = function() { // RTS
      self.PC = (self.pull16() + 1) & 0xFFFF;
      // Check if we've returned past the initial call level
      // If SP is at $FD or higher (initial value), we've returned from the top-level call
      if (self.SP >= 0xFD) {
        self.halted = true;
      }
      self.cycles += 6;
    };

    o[0x40] = function() { // RTI
      self.setP(self.pull());
      self.PC = self.pull16();
      self.cycles += 6;
    };

    // === Flag Instructions ===
    o[0x18] = function() { self.C = 0; self.cycles += 2; }; // CLC
    o[0x38] = function() { self.C = 1; self.cycles += 2; }; // SEC
    o[0x58] = function() { self.I = 0; self.cycles += 2; }; // CLI
    o[0x78] = function() { self.I = 1; self.cycles += 2; }; // SEI
    o[0xD8] = function() { self.D = 0; self.cycles += 2; }; // CLD
    o[0xF8] = function() { self.D = 1; self.cycles += 2; }; // SED
    o[0xB8] = function() { self.V = 0; self.cycles += 2; }; // CLV
  }

  // === Disassembler ===

  /**
   * Disassemble instructions starting at addr.
   * @param {number} addr - Start address
   * @param {number} count - Number of instructions to disassemble
   * @returns {Array<{addr, bytes, mnemonic, operand, text}>}
   */
  disassemble(addr, count) {
    const result = [];
    let pc = addr & 0xFFFF;

    for (let i = 0; i < count && pc <= 0xFFFF; i++) {
      const startPC = pc;
      const opcode = this.memory[pc++];
      const info = CPU6502.OPCODE_INFO[opcode];

      if (!info) {
        result.push({
          addr: startPC,
          bytes: [opcode],
          mnemonic: '???',
          operand: '',
          text: this._fmtAddr(startPC) + '-  ' + this._fmtByte(opcode) +
                '         ???'
        });
        continue;
      }

      const [mnemonic, mode, bytes] = info;
      const byteArr = [opcode];
      for (let b = 1; b < bytes; b++) {
        byteArr.push(this.memory[pc++] || 0);
      }

      let operand = '';
      switch (mode) {
        case 'imp': break;
        case 'acc': operand = 'A'; break;
        case 'imm': operand = '#$' + this._fmtByte(byteArr[1]); break;
        case 'zp':  operand = '$' + this._fmtByte(byteArr[1]); break;
        case 'zpx': operand = '$' + this._fmtByte(byteArr[1]) + ',X'; break;
        case 'zpy': operand = '$' + this._fmtByte(byteArr[1]) + ',Y'; break;
        case 'abs': operand = '$' + this._fmtAddr((byteArr[2] << 8) | byteArr[1]); break;
        case 'abx': operand = '$' + this._fmtAddr((byteArr[2] << 8) | byteArr[1]) + ',X'; break;
        case 'aby': operand = '$' + this._fmtAddr((byteArr[2] << 8) | byteArr[1]) + ',Y'; break;
        case 'ind': operand = '($' + this._fmtAddr((byteArr[2] << 8) | byteArr[1]) + ')'; break;
        case 'izx': operand = '($' + this._fmtByte(byteArr[1]) + ',X)'; break;
        case 'izy': operand = '($' + this._fmtByte(byteArr[1]) + '),Y'; break;
        case 'rel': {
          let offset = byteArr[1];
          if (offset & 0x80) offset -= 256;
          operand = '$' + this._fmtAddr((pc + offset) & 0xFFFF);
          break;
        }
      }

      const bytesStr = byteArr.map(b => this._fmtByte(b)).join(' ');
      const text = this._fmtAddr(startPC) + '-  ' + bytesStr.padEnd(9) +
                   mnemonic + ' ' + operand;

      result.push({
        addr: startPC,
        bytes: byteArr,
        mnemonic,
        operand,
        text
      });
    }

    return result;
  }

  _fmtByte(b) {
    return (b & 0xFF).toString(16).toUpperCase().padStart(2, '0');
  }

  _fmtAddr(a) {
    return (a & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }

  // Get CPU state as a formatted string (for monitor display)
  getStateString() {
    return 'A=' + this._fmtByte(this.A) +
           ' X=' + this._fmtByte(this.X) +
           ' Y=' + this._fmtByte(this.Y) +
           ' SP=' + this._fmtByte(this.SP) +
           ' PC=' + this._fmtAddr(this.PC) +
           ' ' + (this.N ? 'N' : '-') +
           (this.V ? 'V' : '-') +
           '-' +
           (this.B ? 'B' : '-') +
           (this.D ? 'D' : '-') +
           (this.I ? 'I' : '-') +
           (this.Z ? 'Z' : '-') +
           (this.C ? 'C' : '-');
  }
}

// === Static Opcode Information Table (for disassembler) ===
// Format: [mnemonic, addressing_mode, byte_count]
CPU6502.OPCODE_INFO = {
  0x00: ['BRK', 'imp', 1], 0x01: ['ORA', 'izx', 2], 0x05: ['ORA', 'zp', 2],
  0x06: ['ASL', 'zp', 2], 0x08: ['PHP', 'imp', 1], 0x09: ['ORA', 'imm', 2],
  0x0A: ['ASL', 'acc', 1], 0x0D: ['ORA', 'abs', 3], 0x0E: ['ASL', 'abs', 3],
  0x10: ['BPL', 'rel', 2], 0x11: ['ORA', 'izy', 2], 0x15: ['ORA', 'zpx', 2],
  0x16: ['ASL', 'zpx', 2], 0x18: ['CLC', 'imp', 1], 0x19: ['ORA', 'aby', 3],
  0x1D: ['ORA', 'abx', 3], 0x1E: ['ASL', 'abx', 3],
  0x20: ['JSR', 'abs', 3], 0x21: ['AND', 'izx', 2], 0x24: ['BIT', 'zp', 2],
  0x25: ['AND', 'zp', 2], 0x26: ['ROL', 'zp', 2], 0x28: ['PLP', 'imp', 1],
  0x29: ['AND', 'imm', 2], 0x2A: ['ROL', 'acc', 1], 0x2C: ['BIT', 'abs', 3],
  0x2D: ['AND', 'abs', 3], 0x2E: ['ROL', 'abs', 3],
  0x30: ['BMI', 'rel', 2], 0x31: ['AND', 'izy', 2], 0x35: ['AND', 'zpx', 2],
  0x36: ['ROL', 'zpx', 2], 0x38: ['SEC', 'imp', 1], 0x39: ['AND', 'aby', 3],
  0x3D: ['AND', 'abx', 3], 0x3E: ['ROL', 'abx', 3],
  0x40: ['RTI', 'imp', 1], 0x41: ['EOR', 'izx', 2], 0x45: ['EOR', 'zp', 2],
  0x46: ['LSR', 'zp', 2], 0x48: ['PHA', 'imp', 1], 0x49: ['EOR', 'imm', 2],
  0x4A: ['LSR', 'acc', 1], 0x4C: ['JMP', 'abs', 3], 0x4D: ['EOR', 'abs', 3],
  0x4E: ['LSR', 'abs', 3],
  0x50: ['BVC', 'rel', 2], 0x51: ['EOR', 'izy', 2], 0x55: ['EOR', 'zpx', 2],
  0x56: ['LSR', 'zpx', 2], 0x58: ['CLI', 'imp', 1], 0x59: ['EOR', 'aby', 3],
  0x5D: ['EOR', 'abx', 3], 0x5E: ['LSR', 'abx', 3],
  0x60: ['RTS', 'imp', 1], 0x61: ['ADC', 'izx', 2], 0x65: ['ADC', 'zp', 2],
  0x66: ['ROR', 'zp', 2], 0x68: ['PLA', 'imp', 1], 0x69: ['ADC', 'imm', 2],
  0x6A: ['ROR', 'acc', 1], 0x6C: ['JMP', 'ind', 3], 0x6D: ['ADC', 'abs', 3],
  0x6E: ['ROR', 'abs', 3],
  0x70: ['BVS', 'rel', 2], 0x71: ['ADC', 'izy', 2], 0x75: ['ADC', 'zpx', 2],
  0x76: ['ROR', 'zpx', 2], 0x78: ['SEI', 'imp', 1], 0x79: ['ADC', 'aby', 3],
  0x7D: ['ADC', 'abx', 3], 0x7E: ['ROR', 'abx', 3],
  0x81: ['STA', 'izx', 2], 0x84: ['STY', 'zp', 2], 0x85: ['STA', 'zp', 2],
  0x86: ['STX', 'zp', 2], 0x88: ['DEY', 'imp', 1], 0x8A: ['TXA', 'imp', 1],
  0x8C: ['STY', 'abs', 3], 0x8D: ['STA', 'abs', 3], 0x8E: ['STX', 'abs', 3],
  0x90: ['BCC', 'rel', 2], 0x91: ['STA', 'izy', 2], 0x94: ['STY', 'zpx', 2],
  0x95: ['STA', 'zpx', 2], 0x96: ['STX', 'zpy', 2], 0x98: ['TYA', 'imp', 1],
  0x99: ['STA', 'aby', 3], 0x9A: ['TXS', 'imp', 1], 0x9D: ['STA', 'abx', 3],
  0xA0: ['LDY', 'imm', 2], 0xA1: ['LDA', 'izx', 2], 0xA2: ['LDX', 'imm', 2],
  0xA4: ['LDY', 'zp', 2], 0xA5: ['LDA', 'zp', 2], 0xA6: ['LDX', 'zp', 2],
  0xA8: ['TAY', 'imp', 1], 0xA9: ['LDA', 'imm', 2], 0xAA: ['TAX', 'imp', 1],
  0xAC: ['LDY', 'abs', 3], 0xAD: ['LDA', 'abs', 3], 0xAE: ['LDX', 'abs', 3],
  0xB0: ['BCS', 'rel', 2], 0xB1: ['LDA', 'izy', 2], 0xB4: ['LDY', 'zpx', 2],
  0xB5: ['LDA', 'zpx', 2], 0xB6: ['LDX', 'zpy', 2], 0xB8: ['CLV', 'imp', 1],
  0xB9: ['LDA', 'aby', 3], 0xBA: ['TSX', 'imp', 1], 0xBC: ['LDY', 'abx', 3],
  0xBD: ['LDA', 'abx', 3], 0xBE: ['LDX', 'aby', 3],
  0xC0: ['CPY', 'imm', 2], 0xC1: ['CMP', 'izx', 2], 0xC4: ['CPY', 'zp', 2],
  0xC5: ['CMP', 'zp', 2], 0xC6: ['DEC', 'zp', 2], 0xC8: ['INY', 'imp', 1],
  0xC9: ['CMP', 'imm', 2], 0xCA: ['DEX', 'imp', 1], 0xCC: ['CPY', 'abs', 3],
  0xCD: ['CMP', 'abs', 3], 0xCE: ['DEC', 'abs', 3],
  0xD0: ['BNE', 'rel', 2], 0xD1: ['CMP', 'izy', 2], 0xD5: ['CMP', 'zpx', 2],
  0xD6: ['DEC', 'zpx', 2], 0xD8: ['CLD', 'imp', 1], 0xD9: ['CMP', 'aby', 3],
  0xDD: ['CMP', 'abx', 3], 0xDE: ['DEC', 'abx', 3],
  0xE0: ['CPX', 'imm', 2], 0xE1: ['SBC', 'izx', 2], 0xE4: ['CPX', 'zp', 2],
  0xE5: ['SBC', 'zp', 2], 0xE6: ['INC', 'zp', 2], 0xE8: ['INX', 'imp', 1],
  0xE9: ['SBC', 'imm', 2], 0xEA: ['NOP', 'imp', 1], 0xEC: ['CPX', 'abs', 3],
  0xED: ['SBC', 'abs', 3], 0xEE: ['INC', 'abs', 3],
  0xF0: ['BEQ', 'rel', 2], 0xF1: ['SBC', 'izy', 2], 0xF5: ['SBC', 'zpx', 2],
  0xF6: ['INC', 'zpx', 2], 0xF8: ['SED', 'imp', 1], 0xF9: ['SBC', 'aby', 3],
  0xFD: ['SBC', 'abx', 3], 0xFE: ['INC', 'abx', 3]
};

App.CPU6502 = CPU6502;
