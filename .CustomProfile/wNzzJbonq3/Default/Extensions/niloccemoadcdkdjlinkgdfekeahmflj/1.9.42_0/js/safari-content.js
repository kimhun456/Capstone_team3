// Helper module for Safari. Injected in any site to have a proper communication
// between the background page and the injected page

(function() {
	// Bail out if not the top window
	if (!window.safari || window.top != window) return;

	safari.self.addEventListener("message", function(msg) {
		var name = msg.name;
		var message = msg.message;

		if (name === "executeScript") {
			eval(message);
		}
		else if (name === "__performCb") {
			var cbId = message.cbId;
			var data = message.data;
			Callbacker.performCbFromIdWithData(data, cbId);
		}
		else if (name === "isSafariContentAvailable") {
			safari.self.tab.dispatchMessage("safariContentAvailable", message);
		}
	});

	document.addEventListener("contextmenu", function(evt) {
		var link = evt.target;

		// Get parent node in case of text nodes (old safari versions)
		if (link.nodeType == Node.TEXT_NODE) {
			link = link.parentNode;
		}

		// If for some reason, it's not an element node, abort
		if (link.nodeType != Node.ELEMENT_NODE) {
			safari.self.tab.setContextMenuEventUserInfo(evt, undefined);
			return;
		}

		// Try to get a link element in the parent chain as we can be in the
		// last child element
		var currentElement = link;
		while (currentElement !== null) {
			if (currentElement.nodeType == Node.ELEMENT_NODE &&
				currentElement.nodeName.toLowerCase() == 'a')
			{
				// We have a link element try to save it
				link = currentElement;
				break;
			}
			currentElement = currentElement.parentNode;
		}

		// Let background.js know that we found a link
		if (typeof link !== "undefined" && evt && link && link.href) {
			safari.self.tab.setContextMenuEventUserInfo(evt, link.href);
		}
	}, false);

	var Callbacker = window.Callbacker = {
		addCb: function (cb) {
			if (!this._cbsToIds) {
				this._cbsToIds = {};
			}
			if (!this._cbCounter) {
				this._cbCounter = 0;
			}

			var cbId = ++this._cbCounter;
			this._cbsToIds[cbId] = cb;
			return cbId;
		},
		performCbFromIdWithData: function(data, cbId) {
			if (!this._cbsToIds) return;

			var cb = this._cbsToIds[cbId];
			if (!cb) return;

			this._cbsToIds[cbId] = undefined;

			cb(data);
		}
	};
}());
