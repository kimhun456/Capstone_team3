var checkTimerInterval = null;

var combosController = function() {
	//UI
	createComboList();
	combosListeners();
	//LOAD STATUS
	getGeneralState();
	getTimerState();
}

function createComboList() {
	var list = $('#combos_list');
	var combos = chrome.extension.getBackgroundPage().comboController.combos;

	list.html('');

	//ADD COMBOS
	$.each(combos, function(i) {
		$('<li/>').addClass('combo combo-loaded noisli-button')
	        .data('id', combos[i].id).text(combos[i].name).appendTo(list);
	});

	//ADD EMPTY SLOT
	if(combos.length < 5) {
		$('<li/>').addClass('combo combo-empty noisli-button').text("Add Combo").appendTo(list);
	}
}

function combosListeners() {

	//SOUND LISTENERS
	$("#unmute-button").unbind('click');
	$("#unmute-button").click(function() {
		toggleMuteUI(true); //button
		toggleMute(true); //background
	});

	$("#mute-button").unbind('click');
	$("#mute-button").click(function() {
		toggleMuteUI(false); //button
		toggleMute(false); //background
	});

	$("#soundSlider").unbind('input');
	$('#soundSlider').on('input', function(){
		var value = $('#soundSlider').val();
		changeVolume(value);

		if(value == 0){
			toggleMuteUI(true);
			toggleMute(true);
		}
		else{
			toggleMuteUI(false, value);
			toggleMute(false);
		}
	});

	//COMBO LISTENERS
	$(".combo-loaded").unbind('click');
	$(".combo-loaded").click(function(event) {
		
		var target = event.target;
		var isActive = $(target).hasClass("combo-active");
		var combo_id = $(target).data('id');

		//if it's the same, stop
		if(isActive){
			toggleComboUI(combo_id, true);
			stopAll();
		} else {
			trackEvent('Combo', 'Play');
			trackProperty("Combo Play Chrome");
			toggleComboUI(combo_id, false);
			playCombo(combo_id);
		}
	});

	$(".combo-empty").unbind('click');
	$(".combo-empty").click(function() {
		trackEvent('Combo', 'Add Combo');
		trackProperty("Combo Add Chrome");
		createCombo();
	});

	//TIMER LISTENERS
	$(".timer_part").unbind('keydown');
	$(".timer_part").keydown(function(e) {
        // Allow: backspace, delete, tab, escape, enter and .
        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
             // Allow: Ctrl+A, Command+A
            (e.keyCode == 65 && ( e.ctrlKey === true || e.metaKey === true ) ) || 
             // Allow: home, end, left, right, down, up
            (e.keyCode >= 35 && e.keyCode <= 40)) {
                 // let it happen, don't do anything
                 return;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }

	});

	$(".timer_part").unbind('keyup');
	$(".timer_part").keyup(function(e) {
        //maximum value of 23:59:59
		if($("#timer_hours").val() > 23)
			$("#timer_hours").val(23);

		if($("#timer_minutes").val() > 59)
			$("#timer_minutes").val(59);

		if($("#timer_seconds").val() > 59)
			$("#timer_seconds").val(59);
		
	});

	$(".timer_part").unbind('blur');
	$(".timer_part").blur(function() {

		var value = $("#timer_hours").val() * 60 * 60 * 1000 +
					$("#timer_minutes").val() * 60 * 1000 +
					$("#timer_seconds").val() * 1000;

		//minimum 5 seconds
		if(value < 5000)
			value = 5000;

		setTimer(value);
		setTimerUI(value); //to update with the 0s
	});

	$("#timer_start").unbind('click');
	$("#timer_start").click(function() {
		var value = $("#timer_hours").val() * 60 * 60 * 1000 +
					$("#timer_minutes").val() * 60 * 1000 +
					$("#timer_seconds").val() * 1000;
		trackEvent('Timer', 'Play');
		trackProperty("Play Timer Chrome");
		startTimer(value);
		startCheckingTimerState();
	});

	$("#timer_stop").unbind('click');
	$("#timer_stop").click(function() {
		stopTimer();
		getTimerState();
	});

	$("#timer_resume").unbind('click');
	$("#timer_resume").click(function() {
		resumeTimer();
		startCheckingTimerState();
	});

	$("#timer_pause").unbind('click');
	$("#timer_pause").click(function() {
		pauseTimer();
		toggleTimerUI(2);
	});
}

function toggleComboUI(id, isActive) {
	isActive = isActive || false
	if(isActive) {
		$(".combo-active").removeClass("combo-active");
	} else {
		//remove the last active and activate the new one
		if($(".combo-active")) $(".combo-active").removeClass("combo-active");
		//go through all combos and select the corresponding one
		$.each($(".combo-loaded"), function(i) {
			if( $($(".combo-loaded")[i]).data("id") == id )
				$($(".combo-loaded")[i]).addClass("combo-active");
		});
	}
}

function toggleMuteUI(isMuted, volume) {
	if(isMuted) {
		$("#unmute-button").hide();
		$("#mute-button").show();
		$('#soundSlider').val(0);
	} else {
		$("#unmute-button").show();
		$("#mute-button").hide();

		if(volume)
			$('#soundSlider').val(volume);
		else
			$('#soundSlider').val(chrome.extension.getBackgroundPage().volume);
	}
}

//Toggles timer UI according to timer state
function toggleTimerUI(timerState) {

	//STOPPED
	if(timerState == 0) {
		$(".timer_part").prop('disabled', false);
		
		$("#timer_start").show();
		$("#timer_pause").show();
		$("#timer_stop").hide();
		$("#timer_resume").hide();

		$(".disabled").removeClass('disabled');
		$("#timer_pause").addClass('disabled');
		$("#timer_counter").removeClass( "playing stopped" ).addClass( "stopped" );

		checkTimerInterval && window.clearInterval(checkTimerInterval);
		getGeneralState();
	}

	//PLAYING
	if (timerState == 1) {
		$(".timer_part").prop('disabled', true);
		
		$("#timer_start").hide();
		$("#timer_pause").show();
		$("#timer_stop").show();
		$("#timer_resume").hide();

		$(".disabled").removeClass('disabled');
		$("#timer_counter").removeClass( "playing stopped" ).addClass( "playing" );

		!checkTimerInterval && startCheckingTimerState();
	}

	//PAUSED
	if (timerState == 2) {
		$(".timer_part").prop('disabled', true);
		
		$("#timer_start").hide();
		$("#timer_pause").hide()
		$("#timer_stop").show();
		$("#timer_resume").show();

		$(".disabled").removeClass('disabled');
		$("#timer_counter").removeClass( "playing stopped" ).addClass( "playing" );

		checkTimerInterval && window.clearInterval(checkTimerInterval);
	}

	//FADING
	if (timerState == 3) {
		$(".timer_part").prop('disabled', true);
		
		$("#timer_start").hide();
		$("#timer_pause").hide();
		$("#timer_stop").show();
		$("#timer_resume").show();

		$(".disabled").removeClass('disabled');
		$("#timer_stop").addClass('disabled');
		$("#timer_resume").addClass('disabled');
		$("#timer_counter").removeClass( "playing stopped" ).addClass( "playing" );

		!checkTimerInterval && startCheckingTimerState();
	}
}

//Sets value in timer UI, time in milliseconds
function setTimerUI(time) {

	time = Math.round(time/1000);

	var hours = Math.floor(time/3600);
	var minutes = Math.floor((time - hours * 3600)/60);
	var seconds = Math.floor(time - hours * 3600 - minutes * 60);

	$("#timer_hours").val((hours >= 10)? hours : "0" + hours);
	$("#timer_minutes").val((minutes >= 10)? minutes : "0" + minutes);
	$("#timer_seconds").val((seconds >= 10)? seconds : "0" + seconds);	
}

//Checks timer state 
function startCheckingTimerState() {
	getTimerState();
	checkTimerInterval = window.setInterval( function() { getTimerState(); }, 1000);
}

// UPDATES THE INTERFACE
// state = { isUserLoggedIn: "", selectedComboID: "", isMuted: "", volume: "" }
function updateUI(state) {
	toggleComboUI(state.selectedComboID);
	toggleMuteUI(state.isMuted, state.volume);
}

// UPDATES THE TIMER INTERFACE
// state = { isTimerRunning: "", time: "" }
function updateTimerUI(state) {
	setTimerUI(state.time);
	toggleTimerUI(state.timerState)
}