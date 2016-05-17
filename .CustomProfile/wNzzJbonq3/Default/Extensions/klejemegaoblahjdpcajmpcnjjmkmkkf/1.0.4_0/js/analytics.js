var debugAnalytics = true;

//GOOGLE ANALYTICS
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-63039528-1']);
_gaq.push(['_trackPageview']);


(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

function trackEvent(category, event, label) {

	var infoArray = [];

	category && infoArray.push('_trackEvent');
	category && infoArray.push(category);
	category && event && infoArray.push(event);
	category && event && label && infoArray.push(label);

	_gaq && _gaq.push(infoArray);

	!_gaq && debugAnalytics && console.log("ANALYTICS - Google Analytics: not ready!");
	_gaq && debugAnalytics &&console.log("ANALYTICS - Google Analytics: sending info [" + infoArray.toString() + "]");
}


//MIXPANEL
var mixpanel = mixpanel || {};
mixpanel.api = 'https://api.mixpanel.com';
mixpanel.token = "51869db26e6777cfd786fe8b8c9efcd0";

function trackUser(user, confirmed_at) {

	mixpanel.distinct_id = user.id;

	console.log(user);

	var dataToSend = {
		"$token": mixpanel.token,
    	"$distinct_id": user.id,
    	"$set": {
    		"$email": user.email,
			"$first_name": user.first_name,
			"$last_name": user.last_name,
			"Username": user.username,
			"Last Session Chrome": Date(),
			"Used on Chrome": "Yes",
    	}
	};

	if (confirmed_at)
		dataToSend['$set']["Sign Up Date"] = confirmed_at;

	sendToMixpanel(mixpanel.api + '/engage', dataToSend);
	
	//Increment Session
	trackProperty("Session Chrome");
}

function trackProperty(property) {

	if(!mixpanel.distinct_id) {
		debugAnalytics && console.log("ANALYTICS - Mixpanel: user is not defined");
		return;
	}

	var inc = {};
	inc[property] = 1;

	var dataToSend = {
		"$token": mixpanel.token,
    	"$distinct_id": mixpanel.distinct_id,
    	"$add": inc
	};

	sendToMixpanel(mixpanel.api + '/engage', dataToSend);
}

function sendToMixpanel(url, data) {
	debugAnalytics && console.log("ANALYTICS - Mixpanel: sending ", data);
	var encoded = base64(JSON.stringify(data));
	var finalURL = url + "?data=" + encoded;
	$.get(finalURL);
}

//Base64 encode data
function base64(data) {
	var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

	if (!data) {
		return data;
	}

	data = utf8Encode(data);

	do { // pack three octets into four hexets
		o1 = data.charCodeAt(i++);
		o2 = data.charCodeAt(i++);
		o3 = data.charCodeAt(i++);

		bits = o1<<16 | o2<<8 | o3;

		h1 = bits>>18 & 0x3f;
		h2 = bits>>12 & 0x3f;
		h3 = bits>>6 & 0x3f;
		h4 = bits & 0x3f;

		// use hexets to index into b64, and append result to encoded string
		tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
	} while (i < data.length);

	enc = tmp_arr.join('');

	switch( data.length % 3 ){
		case 1:
			enc = enc.slice(0, -2) + '==';
			break;
		case 2:
			enc = enc.slice(0, -1) + '=';
			break;
	}

	return enc;

	function utf8Encode(string) {
		string = (string+'').replace(/\r\n/g, "\n").replace(/\r/g, "\n");

		var utftext = "",
			start,
			end;
		var stringl = 0,
			n;

		start = end = 0;
		stringl = string.length;

		for (n = 0; n < stringl; n++) {
			var c1 = string.charCodeAt(n);
			var enc = null;

			if (c1 < 128) {
				end++;
			} else if((c1 > 127) && (c1 < 2048)) {
				enc = String.fromCharCode((c1 >> 6) | 192, (c1 & 63) | 128);
			} else {
				enc = String.fromCharCode((c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128);
			}
			if (enc !== null) {
				if (end > start) {
					utftext += string.substring(start, end);
				}
				utftext += enc;
				start = end = n+1;
			}
		}

		if (end > start) {
			utftext += string.substring(start, string.length);
		}

		return utftext;
	}
}