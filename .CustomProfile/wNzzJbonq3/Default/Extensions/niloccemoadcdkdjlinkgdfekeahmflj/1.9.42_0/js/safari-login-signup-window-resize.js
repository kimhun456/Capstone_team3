/*
    Inject this file to resize and move the window that it was injected
 */

// (function() {

//     // Bail out if not the top window
//     if (isSafari() && window.top != window) return;

//     // Check the current url and be sure that we are from the extension. If
//     // we are not from the extension we just bail out
//     var url = document.URL;
//     if (url.indexOf("src=extension") === -1 && url.indexOf("extension_login_success") === -1) {
//         return;
//     }

//     var width  = 430,
//         height = 610,
//         x = Math.floor((screen.width / 2) - ((width + 1) / 2)),
//         y = Math.floor((screen.height / 2) - (height / 2));

//     window.moveTo(x, y);
//     window.resizeTo(width, height);
//     window.moveTo(x, y);
// }());
