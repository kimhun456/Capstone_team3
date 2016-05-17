var offlineController = function() {
	
	$("#reload_button").removeClass('disabled');

	$('#reload_button').unbind('click');
	$('#reload_button').click( function() {
		//give feedback to the user
		$("#reload_button").addClass('disabled');
		setTimeout(function () {
			loadSounds();
			loadState();
		}, 1000);

	});
}