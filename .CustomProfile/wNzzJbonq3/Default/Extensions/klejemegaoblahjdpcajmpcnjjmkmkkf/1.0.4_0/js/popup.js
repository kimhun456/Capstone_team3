console.log("I am popup.js");

//VARIABLES
var views = {};
var DEBUG_POPUP = true;
var backgroundController = chrome.extension.getBackgroundPage();
var lastView = null;

/* COMMON FUNCTIONS */

function sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError) {
	DEBUG_POPUP && console.log("Sending Message to Background: " + action + " " + arguments);
	chrome.runtime.sendMessage( { action: action, argument: arguments }, function(response) {
			DEBUG_POPUP && console.log("Background replied => " + response.message);
			if(response.success) {
				callbackOnSuccess && callbackOnSuccess(response.data);
			} else {
				callbackOnError && callbackOnError(response.data);
			}
		});
}

function renderView(view) {
	DEBUG_POPUP && console.log("Rendering view " + view.id + "...");
	var template_url = chrome.extension.getURL("layouts/" + view.html);
	$.get(template_url, function(data) {

		//avoid rendering when the view is alredy rendered
		if(!lastView || lastView != view.id) {
			$('#popup-content').html(data); //set html
		}

		view.controller(); //execute controller
		lastView = view.id;
	});
}

/* ACTIONS */

function logIn(email, password, remember_me, callbackOnTrue, callbackOnFalse) {

	var action = "login";
	var arguments = { email: email, password: password, remember_me: remember_me };

	var callbackOnSuccess = function(user) {
		trackEvent('Log In', 'Email');

		loadState();
		callbackOnTrue && callbackOnTrue();
	};

	var callbackOnError = function(data) {
		if(data.responseJSON == undefined) {
			renderView(views.offline);
			return;
		}
		callbackOnFalse && callbackOnFalse(data);
	};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function logInWithFacebook() {

	var action = "loginOauth";
	var arguments = "facebook";
	var callbackOnSuccess = function(user) {
		trackEvent('Log In', 'Facebook');

		loadState();
	};
	var callbackOnError = function() { renderView(views.offline); };

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function logInWithGoogle() {

	var action = "loginOauth";
	var arguments = "google";
	var callbackOnSuccess = function(user) {
		trackEvent('Log In', 'Google');

		loadState();
	};
	var callbackOnError = function() { renderView(views.offline); };

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function logOut() {
	
	var action = "logout";
	var arguments = "";
	var callbackOnSuccess = function() { renderView(views.login); };
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function createAccount() {
	
	var action = "signup";
	var arguments = "";
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function forgotPassword() {
	
	var action = "forgot";
	var arguments = "";
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function loadCombos() {
	
	var action = "loadCombos";
	var arguments = "";
	var callbackOnSuccess = function() { renderView(views.combos); };
	var callbackOnError = function(data) {

		if(data && data.httpCode == 401)
			renderView(views.login);

		if(data && (data.httpCode >= 500 || data.httpCode == 0))
			renderView(views.offline);
	};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function loadSounds() {

	var action = "loadSounds";
	var arguments = "";
	var callbackOnSuccess = function() {};
	var callbackOnError = function() { renderView(views.offline); };

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function playCombo(id) {
	
	var action = "playCombo";
	var arguments = id;
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function createCombo() {

	var action = "createCombo";
	var arguments = "";
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function stopAll() {

	var action = "stopAll";
	var arguments = "";
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function toggleMute(value) {

	var action = "toggleMute";
	var arguments = value;
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function changeVolume(value) {

	var action = "setVolume";
	var arguments = value;
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function setTimer(value) {

	var action = "setTimer";
	var arguments = value;
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function startTimer(value) {

	var action = "startTimer";
	var arguments = value;
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function stopTimer() {

	var action = "stopTimer";
	var arguments = "";
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function pauseTimer() {

	var action = "pauseTimer";
	var arguments = "";
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function resumeTimer() {

	var action = "resumeTimer";
	var arguments = "";
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function getTimerState() {

	var action = "getTimerState";
	var arguments = "";
	var callbackOnSuccess = function(data) {
		if(typeof data != undefined) updateTimerUI(data);
	};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);

}

function getGeneralState() {

	updateUI({
		isUserLoggedIn: backgroundController.isUserLoggedIn,
		selectedComboID: backgroundController.selectedComboID,
		isMuted: backgroundController.isMuted,
		volume: backgroundController.volume
	});
	
}

function loadTimer() {
	var action = "loadTimer";
	var arguments = "";
	var callbackOnSuccess = function() { getTimerState(); };
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function saveTimer(value) {
	var action = "saveTimer";
	var arguments = value;
	var callbackOnSuccess = function() {};
	var callbackOnError = function() {};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

function loadState() {

	var action = "loadState";
	var arguments = "";
	var callbackOnSuccess = function(data) {
		
		renderView(views.combos);
		
		trackEvent("Pageviews", "Logged in");
		trackUser(data.user, data.confirmed_at);
	};
	var callbackOnError = function(data) {

		if(data && data.httpCode == 401) {
			renderView(views.login);
			trackEvent("Pageviews", "Logged out");
		}

		if(data && (data.httpCode >= 500 || data.httpCode == 0))
			renderView(views.offline);
	};

	sendMessageToBackground(action, arguments, callbackOnSuccess, callbackOnError);
}

document.addEventListener('DOMContentLoaded', function() {

	views = {
		login : { id: "login", html: "login.html", controller: loginController },
		combos: { id: "combos", html: "combos.html", controller: combosController },
		offline: { id: "offline", html: "offline.html", controller: offlineController },
	}

	//If this is not the first time, load view according to the last state
	if(backgroundController && !backgroundController.isUserLoggedIn && !backgroundController.isFirstTime)
		renderView(views.login);
	else if(backgroundController && backgroundController.isUserLoggedIn && !backgroundController.isFirstTime) {
		renderView(views.combos);
	}

	if(backgroundController) backgroundController.isFirstTime = false;
	loadState();
});