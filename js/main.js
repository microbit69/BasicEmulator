import { Emulator } from './emulator.js';

let emulator;

window.addEventListener('DOMContentLoaded', () => {
  emulator = new Emulator();
  // Expose for console debugging
  window.emulator = emulator;
});
