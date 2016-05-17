 /* globals ril, isChrome, isOpera, isSafari, sendMessageToTab, broadcastMessageToAllTabs, executeScriptInTab, isValidURL, getAllTabs, addMessageListener, getSetting, setSetting, openTabWithURL, isGoogleReaderURL, executeScriptFromURLInTabWithCallback, getCurrentTab, isMac */
/* jslint vars: true */

(function () {

    var SHOW_RELEASE_NOTES  = false;
        baseHost            = "getpocket.com",
        baseURL             = "https://" + baseHost,
        listenerReady       = false,
        messageWaiting      = "",
        delayedMessageData  = {};


/*==========================================================================
 HELPERS
===========================================================================*/
    function getVersionNumber() {
        var versionNumber = isSafari()  ? safari.extension.displayVersion : chrome.app.getDetails().version;
        return versionNumber;
    }

/*==========================================================================
 LOAD UI INTO TAB PAGE
===========================================================================*/
    function injectCSSJS(tab) {

        // Styles
        executeStyleFromURLInTab(tab, 'sites/global/ext_save-new.css');

        // Scripts
        executeScriptFromURLInTab(tab, 'sites/global/jquery-2.1.1.min.js');
        executeScriptFromURLInTab(tab, 'js/experimental/vendor.js');
        executeScriptFromURLInTab(tab, 'js/experimental/templates.js');
        executeScriptFromURLInTab(tab, 'js/experimental/modules.js');

        // Mark as injected
         executeScriptInTab(tab, "window.___PKT__INJECTED = true")
    }

    function loadNotificationUIIntoPage(tab, url, action, callback) {


        // Has script been injected?
        executeScriptInTabWithCallback(tab, 'window.___PKT__INJECTED;', function(results) {
            if ( !results[0] ) injectCSSJS(tab);
        });

        if (url) {
            var premstatus  = getSetting("premium_status");
            var savecount   = (typeof getSetting("saveCount") == 'undefined') ? 1 : parseInt(getSetting("saveCount"));

            executeScriptInTab(tab, "window.___PKT__URL_TO_SAVE = '" + url
                + "'; window.___PKT__PREM_STATUS = '" + premstatus
                + "'; window.___PKT__SAVE_COUNT = '" + savecount + "';");

            setSetting("saveCount",savecount+1);

        }

        executeScriptFromURLInTabWithCallback(tab, pkt.i18n.getFilePathForPocketOverlayLocalization(), function() {
            executeScriptFromURLInTabWithCallback(tab, 'js/r-new.js', callback);
        });
    }

/*==========================================================================
 TOOLBAR ICON MANIPULATION
===========================================================================*/

    function showToolbarIcon(tabId, iconName) {
        // Safari don't support changing the toolbar icon
        if (isSafari()) { return; }

        // Change toolbar icon to new icon
        var smallIconPath = "../img/" + iconName + "-19.png";
        var bigIconPath = "../img/" + iconName + "-38.png";
        chrome.browserAction.setIcon({
            tabId: tabId,
            path: {
                "19": smallIconPath,
                "38": bigIconPath
            }
        });
    }

    function showNormalToolbarIcon(tabId) {
        showToolbarIcon(tabId, 'browser-action-icon');
    }

    function showSavedToolbarIcon(tabId) {
        showToolbarIcon(tabId, 'browser-action-icon-added');
    }

/*==========================================================================
 RESPONSE TO SAVE ACTIONS
===========================================================================*/
    function onSaveSuccess(tab, showToolbarIcon, itemId) {
        if (typeof showToolbarIcon !== 'undefined' && showToolbarIcon === true) {
            showSavedToolbarIcon(tab.id);
        }
        if (listenerReady) {
            messageWaiting = '';
            delayedMessageData = {};
            sendMessageToTab(tab, {status: "success", item_id: itemId});
        }
        else {
            delayedMessageData = {
                tab: tab,
                status: "success",
                item_id: itemId
            };
            messageWaiting = 'success';
        }
    }

    function onSaveError(tab, xhr) {
        // Handle error message
        var errorMessage = xhr.getResponseHeader("X-Error");
        if (errorMessage === null || typeof errorMessage === 'undefined') {
            errorMessage = pkt.i18n.getMessage("background_save_url_error_no_message");
        }
        else {
            errorMessage = pkt.i18n.getMessagePlaceholder("background_save_url_error_message", [errorMessage]);
        }
        if (listenerReady) {
            messageWaiting      = '';
            delayedMessageData  = {};
            sendMessageToTab(tab, { status: 'error', message: errorMessage });
        }
        else {
            delayedMessageData = {
                tab: tab,
                status: 'error',
                message: errorMessage
            };
            messageWaiting = 'error';
        }
    }

/*==========================================================================
 SAVE/REMOVE/ARCHIVE ACTION
===========================================================================*/

    var saveLinkToPocket = function(tab, options) {
        var title           = options.title || tab.title || "";
        var url             = options.url || tab.url  || "";
        var showSavedIcon   = (typeof options.showSavedIcon !== 'undefined') ? options.showSavedIcon : true;


        // Login before, if not authorized
        if (!ril.isAuthorized()) {
            authentication.showLoginWindow(function() {
                saveLinkToPocket(tab, options);
            });
            return;
        }

        // Load the notification UI in the page to show the overlay
        loadNotificationUIIntoPage(tab, url, 'save', function() {

            // Check for valid url and present it to the user if it's not valid
            if (!isValidURL(url)) {
                showInvalidURLNotification(tab);
                return;
            }

            // Add the url to Pocket
            ril.add(title, url, {
                actionInfo: options.actionInfo,
                success: function(data) {
                    var itemid = null;
                    if (typeof data.action_results == 'object'
                        && data.action_results.length
                        && typeof data.action_results[0] == 'object') {
                        itemid = data.action_results[0].item_id;
                    }
                    onSaveSuccess(tab, showSavedIcon, itemid);

                },
                error: function(status, xhr) {
                    // Not authorized
                    if (status === 401) {
                        if (listenerReady) {
                            messageWaiting = '';
                            delayedMessageData = {};
                            sendMessageToTab(tab, {"status": "unauthorized"});
                        }
                        else {
                            delayedMessageData = {
                                'status': 'unauthorized'
                            };
                            messageWaiting = 'unauthorized';
                        }
                        authentication.showLoginWindow(function() {
                            saveLinkToPocket(tab, options);
                        });
                        return;
                    }

                    // Handle error message
                    onSaveError(tab, xhr);

                    // Error callback
                    if (options.error) { options.error(status, xhr); }
                }
            });
        });
    };

/*==========================================================================
 SETUP
===========================================================================*/
    var setupDefaults = function(){
        $.each({
            "keyboard-shortcut": "true",
            "keyboard-shortcut-add": (isMac() ? String.fromCharCode("8984") + "+" + String.fromCharCode("8679") + "+P" : "ctrl+shift+S")
        }, function (key, value) {
            if (!getSetting(key)) {
                setSetting(key, value);
            }
        });

        // Change command key in the keyboard shortcut on windows or linux to ctrl
        if (!isMac() && getSetting("keyboard-shortcut-add").match("command")){
            setSetting("keyboard-shortcut-add", getSetting("keyboard-shortcut-add").replace(/command/g, "ctrl"));
        }
    }

    var setupToolbarItems = function() {

        chrome.browserAction.onClicked.addListener(function(tab, url) {
            // Check if we are in the "new Tab" site and open the
            // Pocket Web App if so
            if (typeof url === "undefined" && tab.active && tab.url === "chrome://newtab/") {
                chrome.tabs.update(tab.id, {url: baseURL});
                return;
            }

            // Try to save the link
            saveLinkToPocket(tab, {
                url: url,
                actionInfo: {
                    cxt_ui: 'toolbar'
                }
            });

        });
    };

    var setupRightContext = function(){
        // Add a context menu entry for adding links to Pocket
        var onClickHandler = function(info, tab) {
            var url     = info.linkUrl,
                title   = info.selectionText || url,
                cxt_ui  = 'right_click_link';

            if (!url) {
                url     = tab.url;
                title   = tab.title;
                cxt_ui  = 'right_click_page';
            }

            saveLinkToPocket(tab, {
                showSavedIcon: false,
                url: url,
                title: title,
                actionInfo: {
                    cxt_ui: cxt_ui,
                    cxt_url: tab.url
                }
            });
        };

        var onClickBAHandler = function(info, tab){
            chrome.tabs.getSelected(null, function(tab){
              chrome.tabs.update(tab.id, {url: "https://getpocket.com/a/?s=ext_rc_open"});
            })
        };

        chrome.contextMenus.create({
            "title": pkt.i18n.getMessage("contextMenuEntryTitle"),
            "contexts": ["page", "frame", "editable", "image", "video", "audio", "link", "selection"],
            "onclick": onClickHandler
        });

        chrome.contextMenus.create({
            "title": pkt.i18n.getMessage("contextMenuEntryVisit"),
            "contexts": ["browser_action"],
            "onclick": onClickBAHandler
        });
    };

    var setupExtensionModificationListeners = function(){
        chrome.runtime.onInstalled.addListener(function() { ril.checkExperiment();});
        chrome.runtime.onUpdateAvailable.addListener(function() { ril.checkExperiment();});
    }

/*==========================================================================
 MESSAGING TO PAGES FROM BACKGROUND
===========================================================================*/

    addMessageListener(function messageListenerCallback(request, sender, sendResponse) {

        switch(request.action){

            case "getSetting":
                sendResponse({"value": getSetting(request.key)});
                break;

            case "setSetting":
                setSetting(request.key, request.value);
                broadcastMessageToAllTabs({ action:"settingChanged", key: request.key, value:request.value });
                break;

            case "getDisplayName":
                sendResponse({"value": getDisplayName()});
                break;

            case "getDisplayUsername":
                sendResponse({"value": getDisplayUsername()});
                break;

            case "isValidToken":
                ril.isValidToken(function(isValid) {
                    sendResponse({value: isValid});
                });
                break;

            case "openTab":
                var inBackground = typeof request.inBackground !== "undefined" ? request.inBackground : true;
                openTabWithURL(request.url, inBackground);
                break;

            case "openSettings":
                chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
                break;

            case "addURL":

                saveLinkToPocket(sender.tab, request);
                return true;
                break;

            case "removeURL":
                if (!ril.isAuthorized()) { return; }

                ril.remove(request.item_id, {
                    success: function() {
                        showNormalToolbarIcon(sender.tab.id);
                        sendResponse({status: "success"});
                    },
                    error: function(status, xhr) {
                        sendResponse({
                            status: "error",
                            error: xhr.getResponseHeader("X-Error")
                        });
                    }
                });
                return true;
                break;

            case "archiveURL":

                if (!ril.isAuthorized()) { return; }
                ril.archive(request.item_id, {
                    success: function() {
                        showNormalToolbarIcon(sender.tab.id);
                        sendResponse({status: "success"});
                    },
                    error: function(status, xhr) {
                        sendResponse({
                            status: "error",
                            error: xhr.getResponseHeader("X-Error")
                        });
                    }
                });
                return true;
                break;

            case "getTags":
                ril.getTags(function(tags, usedTags) {
                    sendResponse({"value": {"tags": tags, "usedTags": usedTags}});
                });
                return true;
                break;

            case "getSuggestedTags":
                ril.getSuggestedTags(request.url, {
                    success: function(data) {
                        if (data.status) sendResponse({status: "success", "value": { "suggestedTags": data.suggested_tags }});
                        else sendResponse({status: "error", error: "Invalid User"});
                    },
                    error: function(status, xhr) {
                        sendResponse({ status: "error", error: xhr.getResponseHeader("X-Error") });
                    }
                });
                return true;
                break;

            case "addTags":
            case "editTags":

                if (!ril.isAuthorized()) { return; }
                var tags            = request.tags;
                var urlToAddTags    = request.url;
                var actionInfo = {
                    cxt_ui: 'popover',
                    cxt_view: 'ext_popover',
                    cxt_url: sender.tab.url,
                    cxt_suggested_available: request.analytics.cxt_suggested_available,
                    cxt_enter_cnt: request.analytics.cxt_entered,
                    cxt_suggested_cnt: request.analytics.cxt_suggested,
                    cxt_remove_cnt: request.analytics.cxt_removed
                };

                ril.addTags(urlToAddTags, tags, {
                    actionInfo: actionInfo,
                    success: function() {
                        sendResponse({status: "success"});
                    },
                    error: function(status, xhr) {
                        if (status === 401) {
                            if (listenerReady) {
                                delayedMessageData = {};
                                messageWaiting = '';
                                sendMessageToTab(sender.tab, {status: "unauthorized"});
                            }
                            else {
                                delayedMessageData = {
                                    status: 'unauthorized'
                                };
                                messageWaiting = 'unauthorized';
                            }
                            authentication.showLoginWindow(function() {
                                messageListenerCallback(request, sender, sendResponse);
                            });
                            return true;
                        }

                        sendResponse({
                            status: "error",
                            error: xhr.getResponseHeader("X-Error")
                        });
                    }
                });
                return true;
                break;

            case "getRecommendation":
                if (!ril.isAuthorized()) { return; }
                ril.getRecommendations(request.item_id, {
                    success: function(response) {
                        sendResponse({ status: "success", data: response });
                    },
                    error: function(status, xhr) {
                        sendResponse({ status: "error", error: xhr.getResponseHeader("X-Error") });
                    }
                });
                return true;
                break;

            case "listenerReady":
                listenerReady = true;
                if (messageWaiting == 'success') {
                    messageWaiting = '';
                    setTimeout(function() {
                        onSaveSuccess(delayedMessageData.tab,delayedMessageData.status,delayedMessageData.item_id);
                        delayedMessageData = {};
                    },50);
                }
                else if (messageWaiting == 'error') {
                    messageWaiting = '';
                    setTimeout(function() {
                        sendMessageToTab(delayedMessageData.tab,{status: delayedMessageData.status, message: delayedMessageData.message});
                        delayedMessageData = {};
                    },50);
                }
                else if (messageWaiting == 'unauthorized') {
                    messageWaiting = '';
                    setTimeout(function() {
                        sendMessageToTab(delayedMessageData.tab,{status: delayedMessageData.status});
                        delayedMessageData = {};
                    },50);
                }
                return true;
                break;

        }
    });



/*==========================================================================
 INITALIZE THE EXTENSION
===========================================================================*/



    setupDefaults();
    setupToolbarItems();
    setupRightContext();
    showNormalToolbarIcon();
    setupExtensionModificationListeners();



})();
