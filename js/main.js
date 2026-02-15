window.App = window.App || {};

/* Position the screen overlay to match the CRT glass in the background image.
   Pixel coordinates measured from the 1536×1024 source PNG. */
(function() {
  var GLASS_LEFT   = 220;   // px in source image
  var GLASS_TOP    =  78;
  var GLASS_WIDTH  = 490;
  var GLASS_HEIGHT = 382;
  var IMG_W        = 1536;
  var IMG_H        = 1024;

  function positionScreen() {
    var img   = document.getElementById('bg-image');
    var frame = document.getElementById('apple2-frame');
    var sc    = document.getElementById('screen-container');
    if (!img || !frame || !sc) return;

    var imgRect   = img.getBoundingClientRect();
    var frameRect = frame.getBoundingClientRect();

    // Offset of image within the frame (should be 0,0 but just in case)
    var ox = imgRect.left - frameRect.left;
    var oy = imgRect.top  - frameRect.top;

    // Scale from source pixels to rendered pixels
    var sx = imgRect.width  / IMG_W;
    var sy = imgRect.height / IMG_H;

    sc.style.left   = (ox + GLASS_LEFT   * sx) + 'px';
    sc.style.top    = (oy + GLASS_TOP    * sy) + 'px';
    sc.style.width  = (GLASS_WIDTH  * sx) + 'px';
    sc.style.height = (GLASS_HEIGHT * sy) + 'px';
  }

  window.addEventListener('load', positionScreen);
  window.addEventListener('resize', positionScreen);
  // Also expose so emulator can call it if needed
  window.positionScreen = positionScreen;
})();

window.addEventListener('DOMContentLoaded', function() {
  var emulator = new App.Emulator();
  window.emulator = emulator;
});
