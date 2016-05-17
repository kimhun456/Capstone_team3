console.log("I am background.js");
var DEBUG_BACKGROUND = false;

//ENUM
var TimerStates = {
	STOPPED: 0,
	RUNNING: 1,
	PAUSED: 2,
	FADDING: 3
}

//VARIABLES
var host = "http://www.noisli.com";
var soundController = new SoundController();
var comboController = new CombosController();

var timer = null;
var fadeOutTime = 5 * 1000; //miliseconds

//USER STATUS
var isUserLoggedIn = false;
var isFirstTime = true;

//TIMER STATUS
var timerState = TimerStates.STOPPED;
var startDate = null;
var totalTime = 25 * 60 * 1000; //miliseconds
var remainingTime = totalTime; //miliseconds

//COMBO STATUS
var selectedComboID = "";

//SOUND STATUS
var isMuted = false;
var volume = 75;

//Initialize sounds
soundController.setupSounds(function() {
	getSounds();
});

//Set listeners
chrome.runtime.onMessage.addListener(receiveMessage);

function receiveMessage(request, sender, sendResponse) {
	switch(request.action) {
		case "loadCombos": getCombos(sendResponse); break;
		case "loadSounds": getSounds(sendResponse); break;
		case "login": logIn(request.argument, sendResponse); break;
		case "loginOauth": loginWithOAuth(request.argument, sendResponse); break;
		case "logout": logOut(sendResponse); break;
		case "signup": openWebsite(request.action, sendResponse); break;
		case "forgot": openWebsite(request.action, sendResponse); break;
		case "playCombo": playCombo(request.argument, sendResponse); break;
		case "createCombo": createCombo(sendResponse); break;
		case "stopAll": stopAll(sendResponse); break;
		case "toggleMute": toggleMute(request.argument, sendResponse); break;
		case "setVolume": changeVolume(request.argument, sendResponse); break;
		case "setTimer": setTimer(request.argument, sendResponse); break;
		case "startTimer": startTimer(request.argument, sendResponse); break;
		case "stopTimer": stopTimer(sendResponse); break;
		case "pauseTimer": pauseTimer(sendResponse); break;
		case "resumeTimer": resumeTimer(sendResponse); break;
		case "getGeneralState": getGeneralState(sendResponse); break;
		case "getTimerState": getTimerState(sendResponse); break;
		case "getUserInfo": getUserInfo(sendResponse); break;
		case "loadTimer": loadTimer(sendResponse); break;
		case "saveTimer": saveTimer(value, sendResponse); break;
		case "loadState": loadState(sendResponse); break;
		default: return false; //No need to wait for 'sendResponse'
	}
	return true; //call 'sendResponse' later
}

function logMessage(message) {
	DEBUG_BACKGROUND && console.log(message);
}


//GET COMBOS FROM SERVER AND SAVES THEM ON THE SOUNDCONTROLLER OBJECT
function getSounds() {
	logMessage("SOUNDS: getting sounds...");
	$.ajax({
		type: 'GET',
		url: host + '/get_sound_links',
		success: function(data, status, xhr){
			logMessage("SOUNDS: loaded successfully");
			soundController.loadSounds(data);
			//sendResponse({ success: true, message: "Sounds: loaded successfully" });
	  	},
	  	error: function(xhr, type, exception) {
	  		logMessage("SOUNDS: could not be loaded");
	  		//sendResponse({ success: false, message: "Sounds: could not be loaded" });
		}
	});
}

//GET COMBOS FROM SERVER AND SAVES THEM ON THE COMBOS OBJECT
function getCombos(sendResponse) {
	logMessage("COMBOS: getting combos...");
	comboController = new CombosController();
	$.ajax({
		type: 'GET',
		url: host + '/get_combos',
		success: function(data, status, xhr){
			logMessage("COMBOS: loaded successfully");
			logMessage("HTTP CODE: " + xhr.status);
			
			comboController.loadCombos(data);
			checkIfSelectedComboStillExists();

			isUserLoggedIn = true;
			sendResponse({ success: true, message: "COMBOS: loaded successfully" });
	  	},
	  	error: function(xhr, type, exception) {
	  		logMessage("COMBOS: could not be loaded");
	  		logMessage("HTTP CODE: " + xhr.status);
	  		sendResponse({ success: false, message: "COMBOS: could not be loaded", data: { httpCode: xhr.status } });
		}
	});
}

function logIn(arguments, sendResponse) {
	logMessage("LOGIN: loggin in...");
	$.ajax({
		type: 'POST',
		url: host + '/users/sign_in',
		data: { "user": { "email": arguments.email, "password": arguments.password, "remember_me": arguments.remember_me }, "format": "json" },
		success: function(data, status, xhr){
			logMessage("LOGIN: logged in successfully");
			
			isUserLoggedIn = true;

			reloadOptions();
			sendResponse({ success: true, message: "LOGIN: logged in successfully", data: data });
		},
		error: function(xhr, type, exception) {
			isUserLoggedIn = false;
			logMessage("LOGIN: could not logged in");
			sendResponse({ success: false, message: "LOGIN: could not logged in", data: xhr });
		}
	});
}

function loginWithOAuth(provider, sendResponse) {
	logMessage("LOGIN: Loggin in with " + provider + "...");

	var callbackOnSuccess = function(data) {
		logMessage("LOGIN: logged in successfully with " + provider);
		sendResponse({ success: true, message: "LOGIN: logged in successfully with " + provider, data: data });
		isUserLoggedIn = true;
		reloadOptions();
	}

	var callbackOnError = function() {
		isUserLoggedIn = false;
		logMessage("LOGIN: could not logged in with " + provider);
		sendResponse({ success: false, message: "LOGIN: could not logged in with " + provider });
	}

	if(provider == "facebook")
		loginWithFacebook(callbackOnSuccess, callbackOnError);
	if(provider == "google")
		loginWithGoogle(callbackOnSuccess, callbackOnError);
}

function logOut(sendResponse) {
	logMessage("LOGOUT: loggin out...");
	$.ajax({
		type: 'DELETE',
		url: host + '/users/sign_out',
		success: function(data, status, xhr){
			logMessage("LOGOUT: logged out successfully");
			
			isUserLoggedIn = false;
			selectedComboID = "";
			soundController.stopAll();
			stopTimer();
			
			sendResponse({ success: true, message: "LOGOUT: logged out successfully" });
		},
		error: function(xhr, type, exception) {
			logMessage("LOGOUT: could not logged out");
			sendResponse({ success: false, message: "LOGOUT: could not logged out" });
		}
	});
}

function playCombo(comboId, sendResponse) {
	logMessage("PLAYER: playing Combo " + comboId + "...");
	selectedComboID = comboId;
	soundController.playCombo(comboController.getCombo(comboId), volume);
}

function createCombo(sendResponse) {
	openWebsite('', sendResponse);
}

function stopAll(sendResponse) {
	logMessage("PLAYER: stopping all sounds...");
	selectedComboID = "";
	soundController.stopAll();
}

function toggleMute(value, sendResponse) {
	logMessage("PLAYER: setting mute to " + value + "...");
	isMuted = value;
	soundController.toggleMute(value);
}

function changeVolume(value, sendResponse) {
	logMessage("PLAYER: setting volume to " + value + "...");
	volume = value;
	if(selectedComboID != "")
		soundController.changeVolume(value, comboController.getCombo(selectedComboID));
}

function setTimer(value, sendResponse) {
	logMessage("TIMER: setting to " + value + "...");
	totalTime = value;
	remainingTime = value;

	saveTimer(value, sendResponse);
}

function startTimer(value, sendResponse) {
	logMessage("TIMER: starting...");
	timerState = TimerStates.RUNNING;

	totalTime = value || totalTime;
	remainingTime = totalTime;
	startDate = new Date();
	
	var timeTimer = remainingTime - fadeOutTime;
	
	var callback = function() {
		if(typeof timer != undefined && timer != null) {
			timer.stop();
			timer = null;
		}
		
		logMessage("TIMER: fadding...");
		timerState = TimerStates.FADDING;

		var faddingCallback = function() {
			//since this callback is called once per each sound
			//we make sure that it only runs once by checking timerstate
			logMessage(timerState);
			if(timerState != TimerStates.STOPPED) {
				selectedComboID = "";
				stopTimer();
				stopAll();
			 	trackEvent("Timer", "Session done");
			 	trackProperty("Session done Chrome");
			}
		}

		if(selectedComboID == ""){
			timer = new Timer();
			timer.start(fadeOutTime, faddingCallback);
		}
		else
			soundController.fadeOutAll(fadeOutTime, comboController.getCombo(selectedComboID), faddingCallback);
	}

	timer = new Timer();
	timer.start(timeTimer, callback);
}

function stopTimer(sendResponse) {
	logMessage("TIMER: stopping...");
	timerState = TimerStates.STOPPED;

	if(typeof timer != undefined && timer != null) {
		timer.stop();
		timer = null;
	}
	remainingTime = totalTime;
}

function pauseTimer(sendResponse) {
	
	timerState = TimerStates.PAUSED;

	remainingTime -= new Date() - startDate;
	logMessage("TIMER: pausing... at " + remainingTime);

	timer.pause();
}

function resumeTimer(sendResponse) {
	logMessage("TIMER: resuming...");
	timerState = TimerStates.RUNNING;

	startDate = new Date();

	if(typeof timer != undefined)
		timer.resume();
}

function getTimerState(sendResponse) {
	logMessage("TIMER: getting timer state...");
	var timeToSend;

	if(timerState == TimerStates.STOPPED)
		timeToSend = totalTime;
	if(timerState == 1 || timerState == 3)
		timeToSend = remainingTime - (new Date() - startDate);
	if(timerState == 2)
		timeToSend = remainingTime;
		//timeToSend = remainingTime - (Math.round((new Date() - startDate)/1000) * 1000) );

	var message = "TIMER: state is " + timerState + " " + timeToSend;
	sendResponse({ success: true, message: message, data: {
		timerState: timerState,
		time: timeToSend
	}});
	logMessage("TIMER: sent successfully");
}

function getGeneralState(sendResponse) {
	logMessage("BACKGROUND STATE: getting general state...");
	var message = "BACKGROUND STATE: " + isUserLoggedIn + " " + selectedComboID + " " + isMuted + " " + volume;
	sendResponse({ success: true, message: message, data: {
		isUserLoggedIn: isUserLoggedIn,
		selectedComboID: selectedComboID,
		isMuted: isMuted,
		volume: volume
	}});
	logMessage("BACKGROUND STATE: sent successfully");
}

function getUserInfo(sendResponse) {
	logMessage("USER: getting user info...");
	$.ajax({
		type: 'GET',
		url: host + '/get_user_info',
		success: function(data, status, xhr){
			logMessage("USER: loaded successfully");
			sendResponse({ success: true, message: "USER: loaded successfully", data: data.user });
	  	},
	  	error: function(xhr, type, exception) {
	  		logMessage("USER: could not be loaded");
	  		sendResponse({ success: false, message: "USER: could not be loaded"});
		}
	});
}

function loadTimer(sendResponse) {
	logMessage("TIMER: getting timer...");
	$.ajax({
		type: 'GET',
		url: host + '/get_timer',
		success: function(data, status, xhr) {
			logMessage("TIMER: loaded successfully");
			
			var loadedtimer = (data.timer)? data.timer : 25 * 60 * 1000;
			totalTime = loadedtimer;
			
			sendResponse({ success: true, message: "TIMER: loaded successfully", data: loadedtimer });
		},
		error: function(xhr, type, exception) {
			logMessage("TIMER: could not be loaded");
			sendResponse({ success: false, message: "TIMER: could not be loaded"});
		}
	});
}

function saveTimer(value, sendResponse) {
	logMessage("TIMER: saving timer...");
	$.ajax({
		type: 'POST',
		url: host + '/save_timer',
		data: { timer: value },
		success: function(data, status, xhr) {
			logMessage("TIMER: saved successfully");
			sendResponse({ success: true, message: "TIMER: saved successfully"});
		},
		error: function(xhr, type, exception) {
			logMessage("TIMER: could not be saved");
			sendResponse({ success: false, message: "TIMER: could not be saved"});
		}
	});
}

function loadState(sendResponse) {
	logMessage("STATE: getting user info, timer and combos...");
	$.ajax({
		type: 'GET',
		url: host + '/get_state',
		success: function(data, status, xhr) {
			logMessage("STATE: user info, timer and combos loaded successfully");

			isUserLoggedIn = true;

			comboController.loadCombos(data);
			checkIfSelectedComboStillExists();
			
			var loadedtimer = (data.timer)? data.timer : 25 * 60 * 1000;
			totalTime = loadedtimer;
			
			sendResponse({ success: true, message: "STATE: user info, timer and combos loaded successfully", data: data });
		},
		error: function(xhr, type, exception) {
			logMessage("STATE: user info, timer and combos could not be loaded");
			
			isUserLoggedIn = false;
			selectedComboID = "";
			soundController.stopAll();
			stopTimer();

			sendResponse({ success: false, message: "STATE: user info, timer and combos could not be loaded", data: { httpCode: xhr.status } });
		}
	});
}

/* TAB MANAGEMENT */

function openWebsite(action, sendResponse) {
	logMessage("TAB: opening Website...");
	var url = host + '/' + action;
	chrome.tabs.create({"url":url, "selected":true});
}

function reloadOptions() {
	logMessage("TAB: reloading options...");
	var tabs = chrome.extension.getViews({type:'tab'});
	for(var i = 0; i < tabs.length; i++) {
		console.log(tabs[i].location.href);
		console.log(chrome.extension.getURL("options.html"));
		if(tabs[i].location.href.indexOf(chrome.extension.getURL("options.html")) == 0)
			tabs[i].location.reload();
	}
}

function checkIfSelectedComboStillExists() {
	if( $.grep(comboController.combos, function(c){ return c.id == selectedComboID; }).length == 0 )
		stopAll();
}