/**
 * Checks if we already injected the safari content file into Safari to
 * communicate between the Extension and the content page
 */
var safariContentInjectionTester = (function() {
    /**
     * Helpers
     */
    Array.prototype.removeByValue = function(val) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] == val) {
                this.splice(i, 1);
                break;
            }
        }
    };

    /*
     * Check if we already injected Safari into the page, this is necessary
     * as immediately after the user installed the Safari extension is not able
     * to save any page that was open before the installation process happened
     */

    var safariContentAvailableCheckedSites = [];
    var safariContentAvailableSites = [];

    var safariContentInjected = function(tab, url, callback) {
        if (isChrome()) {
            // In Chrome we don't have to check explicitly as we don't have to inject
            // the safar content script
            callback({injected: true});
        }
        else if (boolFromString(getSetting('pocket.restart'))) {
            // If Safari was restarted after the installation the pocket.restart
            // setting is true and this means the safari-content file will be
            // injected in each further load of a site
            callback({injected: true});
        }
        else {
            // Check if safari content is injected in script after installed
            // the Pocket Extension the first time
            if ($.inArray(url, safariContentAvailableCheckedSites) === -1) {
                safariContentAvailableCheckedSites.push(url);
                // Check if the safari content is available by sending a message
                // to the injected script in the tab
                tab.page.dispatchMessage("isSafariContentAvailable", {url: url});
                setTimeout(function () {
                    // After a timeout check again if we got a message from the
                    // injected script that let us know if the script was
                    // injected in this tab
                    safariContentInjected(tab, url, callback);
                }, 250);
            }
            else if (($.inArray(url, safariContentAvailableCheckedSites) !== -1) &&
                ($.inArray(url, safariContentAvailableSites) === -1))
            {
                // If the content was injected the site should be in the
                // safariContentAvailableSites if it's not in there the safari
                // content file was not injected

                // Remove it from safariContentAvailableCheckedSites to start
                // the cycle again if the user clicks on the toolbar button
                safariContentAvailableCheckedSites.removeByValue(url);

                // Something went wrong show an alert
                alert(pkt.i18n.getMessage("background_after_install_error"));

                callback({injected: false});
            }
            else {
                safariContentAvailableCheckedSites.removeByValue(url);
                safariContentAvailableSites.removeByValue(url);

                callback({injected: true});
            }
        }

        // Only Safari needs this code
        if (!isSafari()) { return; }

        /**
         * Safari Content Injection Checking
         */
        safari.application.addEventListener("message", function(msg) {
            var name = msg.name;
            var message = msg.message;
            if (name === "safariContentAvailable") {
                safariContentAvailableSites.push(message.url);
            }
        });

        // We keep track if Safari was restarted after the Pocket Extension was installed.

        if (!boolFromString(getSetting('pocket.run')) &&
            !boolFromString(getSetting('pocket.restart')))
        {
            setSetting('pocket.restart', true);
        }
        else {
            if (!boolFromString(getSetting('pocket.run'))) {
                setSetting('pocket.restart', true);
                setSetting('pocket.run', true);
            }
        }
    };

    return {
        safariContentInjected: safariContentInjected
    };
}());
