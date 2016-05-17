var port = {},
	   tabMgr = {};

// message from web
chrome.runtime.onMessageExternal.addListener (
	function(request, sender, sendResponse) {
		if (request.svc == "install") {
			sendResponse("install");
			return;
		}
		
		if (request.svc == undefined || request.ver == undefined || request.param == undefined ) {
			sendResponse("param");
			return;
		} 
		
		var param = request.param;
		var svc = request.svc;
		var ver = request.ver;
		param.tabId = sender.tab.id; 
		param.svc = svc;
		param.ver = ver;
			
		var hostName = svc + "_" + ver;
		
		if (port[svc] == undefined) {
			chrome.runtime.sendNativeMessage(hostName,
			{},
			function(response) {				
				if (response == undefined) {
					// proxy app not installed
					error = {};
					error.err = true;
					error.errCode = 1000; 
					error.tabId = param.tabId;
					sendWebMessage(error);
				} else {
					// proxy app installed
					executeProxy(param);
					saveTabInfo(param) ;
					sendNativeMessage(param);
				}
			});
		} else {
			saveTabInfo(param) ;
			sendNativeMessage(param);
		}
	}
 );

// message from native
function onNativeMessage(msg) {
	if (msg.err == "true") {
		console.log("errCode : " + msg.errCode);
	}
	sendWebMessage(msg);
}

function sendWebMessage(msg) {
	var tabId = msg.tabId;
	delete msg.tabId;
	
	chrome.tabs.query({}, function(tabs) {      			
				for (var i = 0; i < tabs.length; i++) {        
					if (tabs[i].id == tabId) {
							var code = "passToWeb('" + JSON.stringify(msg) + "');"; 
	
							chrome.tabs.executeScript(parseInt(tabId), {
								file : 'content.js', allFrames : true
							}
							, function() {
								chrome.tabs.executeScript(parseInt(tabId), {code : code, allFrames : true});
  		  				    });
					}
				}
	});
}
// disconnect from native
function onDisconnect(msg) {
	if (msg.name != null) {
		delete port[msg.name];
	}
}

// send message native
function sendNativeMessage(param) {
	data = {
				'param' : param
	}

	port[param.svc].postMessage(data);
}

function saveTabInfo(param) {
	if (tabMgr[param.svc] == null) {
		tabMgr[param.svc] = [param.tabId]
	} else {
		var count = tabMgr[param.svc].length;
		var bNew = true;
		
		// check tabId dup
		for (index = 0; index < count; ++index) {
				if (tabMgr[param.svc][index] == param.tabId) {
					bNew = false;
					break;
				}
		}
		
		if (bNew) {
			tabMgr[param.svc][count] = param.tabId;
		}	
	}
}

function executeProxy(param) {
	var svc = param.svc;
	
	if (port[svc] == undefined) {	
		var hostName = svc + "_" + param.ver;
		port[svc] = chrome.runtime.connectNative(hostName);
		port[svc].onMessage.addListener(onNativeMessage);
		port[svc].onDisconnect.addListener(onDisconnect); 
		port[svc].name = svc;
	} 
}

// tab close listener
chrome.tabs.onRemoved.addListener(function callback(tabId, removeInfo) {
	for (svc in tabMgr) {
		var index = tabMgr[svc].indexOf(tabId);
		
		if (index > -1) {
			var removed = tabMgr[svc].splice(index, 1);
			var param= {};
			
			if (svc == "cassiod") {	// cassiod	
				param.svc = "cassiod";
				param.tabId = tabId;
				param.cmd = "TabClosed"
				sendNativeMessage(param); 
			} else if (svc == "nlivecast") { // nlivecast
				if (tabMgr[svc].length == 0) { 
					param.svc = svc;
					param.tabId = tabId;
					param.cmd = "stopProxy";
					sendNativeMessage(param);
				}
			} else if (svc == "multitrack" || svc == "nstoremoviedown") {
				if (tabMgr[svc].length == 0) { 
					param.svc = svc;
					param.tabId = tabId;
					param.cmd = "stop_proxy";
					sendNativeMessage(param);
				}
			}
		}
	}
})