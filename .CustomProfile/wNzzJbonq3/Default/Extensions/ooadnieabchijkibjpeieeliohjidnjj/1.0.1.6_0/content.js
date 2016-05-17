function passToWeb(data) {
	window.postMessage(data, '*');
}
