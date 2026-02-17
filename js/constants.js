window.App = window.App || {};

// Screen dimensions
App.SCREEN_WIDTH = 40;
App.SCREEN_HEIGHT = 24;

// Lo-Res graphics (40×48 pixels, mixed mode uses 40×40 + 4 text rows)
App.LORES_WIDTH = 40;
App.LORES_HEIGHT = 48;
App.LORES_GRAPHICS_ROWS = 40;  // rows used in mixed mode

// Hi-Res graphics (280×192 pixels, mixed mode uses 280×160 + 4 text rows)
App.HIRES_WIDTH = 280;
App.HIRES_HEIGHT = 192;
App.HIRES_GRAPHICS_ROWS = 160; // rows used in mixed mode

// Character cell dimensions (7×8 pixels → 40×24 = 280×192)
App.CHAR_WIDTH = 7;
App.CHAR_HEIGHT = 8;

// Monochrome amber color
App.AMBER_COLOR = '#ffb000';

// Apple II Lo-Res color palette (original RGB values, kept as reference)
// In monochrome mode these are mapped to brightness levels
App.LORES_COLORS = [
  '#000000', // 0  Black
  '#dd0033', // 1  Magenta/Red
  '#000099', // 2  Dark Blue
  '#dd22dd', // 3  Purple
  '#007722', // 4  Dark Green
  '#555555', // 5  Grey 1
  '#2222ff', // 6  Medium Blue
  '#6666ff', // 7  Light Blue
  '#885500', // 8  Brown
  '#ff6600', // 9  Orange
  '#aaaaaa', // 10 Grey 2
  '#ff9988', // 11 Pink
  '#11dd00', // 12 Light Green
  '#ffff00', // 13 Yellow
  '#44ff99', // 14 Aqua
  '#ffffff', // 15 White
];

// Apple II Hi-Res color palette (original HCOLOR= 0-7)
// In monochrome mode: 0,4=off (black), all others=on (amber)
App.HIRES_COLORS = [
  '#000000', // 0  Black (off)
  '#11dd00', // 1  Green (on)
  '#dd22dd', // 2  Violet (on)
  '#ffffff', // 3  White (on)
  '#000000', // 4  Black (off)
  '#ff6600', // 5  Orange (on)
  '#2222ff', // 6  Blue (on)
  '#ffffff', // 7  White (on)
];
