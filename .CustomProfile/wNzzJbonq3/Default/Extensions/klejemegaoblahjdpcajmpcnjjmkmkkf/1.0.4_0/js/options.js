var backgroundController = chrome.extension.getBackgroundPage();

function sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError) {
	console.log("Sending Message to Background: " + action + " " + arguments);
	chrome.runtime.sendMessage( { action: action, argument: arguments }, function(response) {
			console.log("Background replied => " + response.message);
			if(response.success) {
				if(typeof callbackOnSuccess == 'function') callbackOnSuccess(response.data);
			} else {
				if(typeof callbackOnError == 'function') callbackOnError(response.data);
			}
		});
}

function getUserInfo() {
	console.log("getting user info");
	var action = "getUserInfo";
	var arguments = "";
	var callbackOnSuccess = function(data) { renderOptions(true, data); };
	var callbackOnError = function() { renderOptions(false); };

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function logOut() {
	
	var action = "logout";
	var arguments = "";
	var callbackOnSuccess = function() { getUserInfo(); };
	var callbackOnError = function() { };

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function renderOptions(isLoggedIn, info) {
	console.log("Rendering... ");
	if(isLoggedIn) {
		console.log(info);
		$("#logged-out").hide();
		$("#logged-in").show();
		$("#logged-in span").text((info.first_name)? info.first_name : info.username);
		
		$("#log-out").click(function() {
			logOut();
		});

	} else {
		$("#logged-out").css('visibility', 'visible').show();
		$("#logged-in").hide();
	}
}

$(document).ready(function() {
	getUserInfo();
});
