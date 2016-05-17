var loginController = function() {
	
	$("#login_form").unbind('submit');
	$("#login_form").submit(function(event) {
		event.preventDefault();
		
		$("#login_button").attr("disabled", true);

		var email = $("input[name='email']").val();
		var password = $("input[name='password']").val();
		var remember_me = true; //$("input[name='remember_me']").is(':checked');

		var callbackOnSuccess = function() { $("#login_button").attr("disabled", false); };
		var callbackOnError = function(data) {

			$("#login_button").attr("disabled", false);

			if (data.responseJSON.error == "invalid password." || $("input[name='password']").val().length == 0 ) {
				$("#password-field").css({"padding-right": ($("#password-error").width() + 20) + "px"});
	     		$("#password-error").show();
			} else if (data.responseJSON.error == "invalid email." ||
				data.responseJSON.error == "You have to confirm your email address before continuing." ||
				data.responseJSON.error == "You need to sign in or sign up before continuing.") {
				$("#email-field").css({"padding-right": ($("#email-error").width() + 18) + "px"});
	        	$("#email-error").show();
			}
		}

		logIn(email, password, remember_me, callbackOnSuccess, callbackOnError);
	});

	$("#login_facebook").unbind('click');
	$("#login_facebook").click(function() {
		logInWithFacebook();
	});

	$("#login_google").unbind('click');
	$("#login_google").click(function() {
		logInWithGoogle();
	});

	$("#create_account").unbind('click');
	$("#create_account").click(function() {
		trackEvent('Sign Up', 'Create Account');
		createAccount();
	});

	$("#forgot_password").unbind('click');
	$("#forgot_password").click(function() {
		forgotPassword();
	});

	$("#email-field").off("focus input click");
	$("#email-field").on("focus input click", function() {
		resetForm();
	});

	$("#password-field").off("focus input click");
	$("#password-field").on("focus input click", function() {
		resetForm();
	});

}

function resetForm() {
		$("#email-field").css({"padding-right": "20px"});
		$("#password-field").css({"padding-right": "20px"});
		$("#email-error").hide();
		$("#password-error").hide();
	}