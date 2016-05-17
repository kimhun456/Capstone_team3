//VALUES
EXTENSION_ID = "klejemegaoblahjdpcajmpcnjjmkmkkf";

FB_CLIENT_ID = "1496974077209368";
FB_REDIRECT_URI = "https://" + EXTENSION_ID + ".chromiumapp.org/provider_fb";
FB_SCOPES = "email"

GOOGLE_CLIENT_ID = "244809216039-nbkjphap91h5l5m0fur41saq9su470tf.apps.googleusercontent.com"
GOOGLE_REDIRECT_URI = "https://" + EXTENSION_ID + ".chromiumapp.org/provider_g";
GOOGLE_SCOPES = "email";


function loginServer(id, email, name, provider, firstName, lastName, callbackOnSuccess, callbackOnError) {
  $.ajax({
    type: 'POST',
    url: host + '/authenficate_by_omniauth',
    dataType: 'json',
    data: { auth: { id: id, email: email, name: name, provider: provider, first_name: firstName, last_name: lastName } },
    success: function(data, status, xhr) {
        callbackOnSuccess(data);
    },

    error: function(jqXHR, textStatus, errorThrown) {
      callbackOnError();
    }
  });
}


function loginWithFacebook(callbackOnSuccess, callbackOnError) {

  function getInfoFromFacebook(token) {
    console.log("FACEBOOK: getting info...");
    $.ajax({
      type: 'GET',
      url: 'https://graph.facebook.com/me?access_token=' + token,
      dataType: 'json',
      success: function(response) {
        loginServer(response.id, response.email, response.name, "facebook", response.first_name, response.last_name, callbackOnSuccess, callbackOnError);
        console.log("FACEBOOK: info loaded successfully");
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("FACEBOOK: error getting info");
      }
    });
  }

  function facebookIdentity() {
    console.log("FACEBOOK: opening facebook...");

    var myUrl = "https://www.facebook.com/dialog/oauth?"
    + "client_id=" + FB_CLIENT_ID + "&"
    + "&redirect_uri=" + FB_REDIRECT_URI + "&"
    + "response_type=token&"
    + "scope=" + FB_SCOPES;

    chrome.identity.launchWebAuthFlow({'url': myUrl, 'interactive': true}, function(redirect_url) {

      if (chrome.runtime.lastError) {
        console.log("FACEBOOK: failed authentication");
        console.log(chrome.runtime.lastError);
        return;
      }

      if(redirect_url != null) {
        //console.log("Got the url: " + redirect_url);
        var access_token = redirect_url.split("#access_token=")[1].split("&expires_in=")[0];
        //console.log("Parsed token: " + access_token);
        console.log("FACEBOOK: successful authentication");
        getInfoFromFacebook(access_token);
      }
      //TODO: REMOVE TOKEN CACHE IF FAILS
    });
  }

  facebookIdentity();

}

function loginWithGoogle(callbackOnSuccess, callbackOnError) {

  function getInfoFromGoogle(token) {
    console.log("GOOGLE: getting info...");

    $.ajax({
      type: 'GET',
      url: ' https://www.googleapis.com/plus/v1/people/me?access_token=' + token,
      dataType: 'json',
      success: function(response) {
        //console.log(response);
        loginServer(response["id"], response["emails"][0].value, response["name"].givenName + " " + response["name"].familyName,
          "google", response["name"].givenName, response["name"].familyName, callbackOnSuccess, callbackOnError);
        console.log("GOOGLE: info loaded successfully");
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("GOOGLE: error getting info");
      }
    });
  }

  function validateGoogleToken(token, callbackOnSuccess, callbackOnError) {
    $.ajax({
      type: 'GET',
      url: 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token,
      dataType: 'json',
      success: function(response) {
        console.log("GOOGLE: token is valid");
        callbackOnSuccess && callbackOnSuccess();
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("GOOGLE: token validation failed");
        callbackOnError && callbackOnError();
      }
    });
  }

  function googleIdentity() {
    console.log("GOOGLE: opening google...");

    var myUrl = "https://accounts.google.com/o/oauth2/auth?"
    + "client_id=" + GOOGLE_CLIENT_ID + "&"
    + "&redirect_uri=" + GOOGLE_REDIRECT_URI + "&"
    + "response_type=token&"
    + "scope=" + GOOGLE_SCOPES;

    chrome.identity.launchWebAuthFlow({'url': myUrl, 'interactive': true}, function(redirect_url) {

     if (chrome.runtime.lastError) {
        console.log("GOOGLE: failed authentication");
        console.log(chrome.runtime.lastError);
        return;
      }

      if(redirect_url != null) {
        //console.log("Got the url: " + redirect_url);
        var access_token = redirect_url.split("#access_token=")[1].split("&")[0];
        //console.log("Parsed token: " + access_token);
        console.log("GOOGLE: successful authentication");
        validateGoogleToken(access_token, function() { getInfoFromGoogle(access_token); }, function() {});
      }
    //TODO: REMOVE TOKEN CACHE IF FAILS
    });
  }

  googleIdentity();

}





