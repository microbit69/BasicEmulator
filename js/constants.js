window.App = window.App || {};

// Screen dimensions
App.SCREEN_WIDTH = 40;
App.SCREEN_HEIGHT = 24;

// Lo-Res graphics
App.LORES_WIDTH = 40;
App.LORES_HEIGHT = 48;
App.LORES_GRAPHICS_ROWS = 40;

// Apple II Lo-Res color palette
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

// Hi-Res graphics
App.HIRES_WIDTH = 280;
App.HIRES_HEIGHT = 192;

// Apple II Hi-Res color palette (HCOLOR= 0-7)
App.HIRES_COLORS = [
  '#000000', // 0  Black
  '#11dd00', // 1  Green
  '#dd22dd', // 2  Violet/Purple
  '#ffffff', // 3  White
  '#000000', // 4  Black
  '#ff6600', // 5  Orange
  '#2222ff', // 6  Blue
  '#ffffff', // 7  White
];
