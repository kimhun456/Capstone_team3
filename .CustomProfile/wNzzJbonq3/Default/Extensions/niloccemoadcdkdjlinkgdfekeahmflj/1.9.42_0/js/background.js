 /* globals ril, isChrome, isOpera, isSafari, sendMessageToTab, broadcastMessageToAllTabs, executeScriptInTab, isValidURL, getAllTabs, addMessageListener, getSetting, setSetting, openTabWithURL, isGoogleReaderURL, executeScriptFromURLInTabWithCallback, getCurrentTab, isMac */
/* jslint vars: true */

var backgroundPage = (function () {

    /**
     * Module Variables
     */
    var SHOW_RELEASE_NOTES = false;
    var baseHost = "getpocket.com";
    // var baseHost = "admin:s3krit@nick1.dev.readitlater.com";
    var baseURL = "https://" + baseHost;
    var listenerReady = false;
    var messageWaiting = "";
    var delayedMessageData = {};
    /**
     * Helper methods
     */
    function getVersionNumber() {
        // Check if we can get it without any xhr request.
        // Works starting with Safari 6 and Chrome 13
        var versionNumber = isSafari()  ? safari.extension.displayVersion
                                        : chrome.app.getDetails().version;
        if (typeof versionNumber !== 'undefined') { return versionNumber; }

        // Seems like we are on an older browser try to get it from the settings files
        appSettingsPath = isSafari() ?  safari.extension.baseURI + 'Info.plist' :
                                        chrome.extension.getURL('manifest.json');

        // Synchronous request to get the settings file
        var xhr = new XMLHttpRequest();
        xhr.open('GET', appSettingsPath, false);
        xhr.send(null);

        // Extract version number. In Safari we get back an xml response in Chrome json.
        if (isSafari()) {
            $('dict > key', xhr.response).each(function() {
                if ($(this).text() == 'CFBundleShortVersionString') {
                    versionNumber = $(this).next().text();
                    return false; // break
                }
            });
        }
        else {
            var manifestJSON = JSON.parse(xhr.responseText);
            versionNumber = manifestJSON.version;
        }


        return versionNumber;
    }

    /**
     * Notifications
     */
    function loadNotificationUIIntoPage(tab, url, action, callback) {
        var self = this;
        var isExperimental = getSetting('experimental_ui') || false;

        if(typeof getSetting('experimental_ui_force') !== 'undefined'){
            isExperimental = getSetting('experimental_ui_force');
        }

        function injectCSSJS() {
            listenerReady = false;
            messageWaiting = '';
            delayedMessageData = {};

            if (!isSafari()) {
                if(isExperimental){
                    executeStyleFromURLInTab(tab, 'sites/global/ext_save-new.css');
                    executeScriptFromURLInTab(tab, 'sites/global/jquery-2.1.1.min.js');
                    executeScriptFromURLInTab(tab, 'js/experimental/vendor.js');
                    executeScriptFromURLInTab(tab, 'js/experimental/templates.js');
                    executeScriptFromURLInTab(tab, 'js/experimental/modules.js');
                }
                else{
                    executeStyleFromURLInTab(tab, 'sites/global/base.css');
                    executeStyleFromURLInTab(tab, 'sites/global/proximanova_chrome.css');
                    executeStyleFromURLInTab(tab, 'sites/global/ext_save.css');
                    executeStyleFromURLInTab(tab, 'sites/global/ext_save_chrome.css');
                    executeScriptFromURLInTab(tab, 'sites/global/jquery-2.1.1.min.js');
                    executeScriptFromURLInTab(tab, 'sites/global/jquery.tokeninput.min.js');
                }
            }
            else {
                executeStyleFromURLInTab(tab, safari.extension.baseURI + 'sites/global/base.css');
                executeStyleFromURLInTab(tab, safari.extension.baseURI + 'sites/global/proximanova.css');
                executeStyleFromURLInTab(tab, safari.extension.baseURI + 'sites/global/ext_save.css');
                executeScriptFromURLInTab(tab, "sites/global/jquery-2.1.1.min.js", function() {});
                executeScriptFromURLInTab(tab, "sites/global/jquery.tokeninput.min.js", function() {});
            }
        }

        if (isSafari()) {
            injectCSSJS();
        }
        else {
            executeScriptInTabWithCallback(tab, 'window.___PKT__INJECTED;', function(results) {
                if (!results || typeof results[0] == 'object')
                {
                    injectCSSJS();
                }
            });
        }

        if (url) {
            var premstatus = getSetting("premium_status");
            var premupsell = (typeof getSetting("premUpsell") == 'undefined') ? 0 : getSetting("premUpsell");
            var premupselltime = (typeof getSetting("premUpsellTime") == 'undefined') ? 0 : getSetting("premUpsellTime");
            var premupsellcount = (typeof getSetting("premUpsellCount") == 'undefined') ? 0 : parseInt(getSetting("premUpsellCount"));
            if (premstatus !== "1" && premupsell && ((Date.now() - parseInt(premupselltime)) > 259200000) && (premupsellcount < 3) && Math.floor(Math.random()*7+1) == 1)
            {
                premupsell = 1;
                setSetting("premUpsellTime",Date.now());
                setSetting("premUpsellCount",premupsellcount+1);
                ril.sendAnalyticsCall(getSetting('guid'),'saw_upsell');
            }
            else
            {
                premupsell = 0;
            }
            if (action === "save") {
                var savecount = (typeof getSetting("saveCount") == 'undefined') ? 1 : parseInt(getSetting("saveCount"));
                executeScriptInTab(tab, "window.___PKT__URL_TO_SAVE = '" + url + "'; window.___PKT__PREM_STATUS = '" + premstatus + "'; window.___PKT__PREM_UPSELL = '" + premupsell + "'; window.___PKT__SAVE_COUNT = '" + savecount + "'; window.___PKT__INJECTED = true;");
                setSetting("saveCount",savecount+1);
            }
            else if (action === "remove") {
                executeScriptInTab(tab, "window.___PKT__URL_TO_REMOVE = '" + url + "'; window.___PKT__PREM_STATUS = '" + premstatus + "'; window.___PKT__PREM_UPSELL = '" + premupsell + "'; window.___PKT__INJECTED = true;");
            }
        }

        // First insert localization for Pocket overlay
        executeScriptFromURLInTabWithCallback(tab, pkt.i18n.getFilePathForPocketOverlayLocalization(), function() {
            // Insert the Pocket overlay
            if(isExperimental) {
                executeScriptFromURLInTabWithCallback(tab, 'js/r-new.js', callback);
            }else{
                executeScriptFromURLInTabWithCallback(tab, 'js/r.js', callback);
            }

        });
    }


    function showInvalidURLNotification(tab) {
        sendMessageToTab(tab, {
            status: "error",
            error: pkt.i18n.getMessage("background_invalid_url_error")
        });
    }


    /**
     * Toolbar icon changes in Chrome
     */
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


    /**
     * Handle API action call responses
     */
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
            messageWaiting = '';
            delayedMessageData = {};
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

    /**
     * Listen to general messages
     */
    addMessageListener(function messageListenerCallback(request, sender, sendResponse) {
        // console.log('MessageListenerRaw', request);

        if (request.action === "getSetting") {
            sendResponse({"value": getSetting(request.key)});
            return false;
        }
        else if (request.action === "setSetting") {
            setSetting(request.key, request.value);

            broadcastMessageToAllTabs({
                action:"settingChanged",
                key: request.key,
                value:request.value
            });

            sendResponse({});
            return false;
        }
        else if (request.action === "getDisplayName") {
            sendResponse({"value": getDisplayName()});
            return false;
        }
        else if (request.action === "getDisplayUsername") {
            sendResponse({"value": getDisplayUsername()});
            return false;
        }
        else if (request.action === "isValidToken") {
            ril.isValidToken(function(isValid) {
                sendResponse({value: isValid});
            });
            return true;
        }
        else if (request.action === "openTab") {
            var inBackground = typeof request.inBackground !== "undefined" ? request.inBackground : true;
            openTabWithURL(request.url, inBackground);
            sendResponse({});
            return false;
        }
        else if( request.action === "openSettings"){
            chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
            return false;
        }
        else if (request.action === "addURL") {
            // 'addURL' messages cane be used from injected scripts to save
            // links to Pocket
            var url   = request.url;
            var title = request.title;

            // Create login window if the user is not logged in
            if (!ril.isAuthorized()) {
                authentication.showLoginWindow(function() {
                    messageListenerCallback(request, sender, sendResponse);
                });
                return true;
            }

            safariContentInjectionTester.safariContentInjected(sender.tab, url, function(response) {
                if (response.injected === false) {
                    sendResponse({status: "error"});
                    return;
                }

                loadNotificationUIIntoPage(sender.tab, url, 'save', function() {

                    // Check for valid url and present it to the user if it's not valid
                    if (!isValidURL(url)) {
                        showInvalidURLNotification(sender.tab);
                        sendResponse({status: "error"});
                        return;
                    }

                    // We have a valid url try to add it to Pocket
                    ril.add(title, url, {
                        actionInfo: request.actionInfo,
                        success: function(data) {
                            var itemid = null;
                            if (typeof data.action_results == 'object' && data.action_results.length && typeof data.action_results[0] == 'object') {
                                itemid = data.action_results[0].item_id;
                            }
                            onSaveSuccess(sender.tab, request.showSavedToolbarIcon, itemid);
                            sendResponse({status: "success"});
                        },
                        error: function(status, xhr) {
                            // Not authorized
                            if (status === 401) {
                                // Let the user know he's not authorized
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

                                // Show the login window and let him login
                                authentication.showLoginWindow(function () {
                                    // Start the add process again
                                    messageListenerCallback(request, sender, sendResponse);
                                });
                                return false;
                            }

                            // Handle error message
                            onSaveError(sender.tab, xhr);
                        }
                    });
                });
            });

            return true;
        }
        else if (request.action === "addRecURL") {
            // 'addURL' messages cane be used from injected scripts to save
            // links to Pocket
            var url   = request.url;
            var title = request.title;

            // Create login window if the user is not logged in
            if (!ril.isAuthorized()) {
                authentication.showLoginWindow(function() {
                    messageListenerCallback(request, sender, sendResponse);
                });
                return true;
            }

            // Check for valid url and present it to the user if it's not valid
            if (!isValidURL(url)) {
                showInvalidURLNotification(sender.tab);
                sendResponse({status: "error"});
                return;
            }

            // We have a valid url try to add it to Pocket
            ril.add(title, url, {
                actionInfo: request.actionInfo,
                success: function(data) {
                    var itemid = null;
                    if (typeof data.action_results == 'object' && data.action_results.length && typeof data.action_results[0] == 'object') {
                        itemid = data.action_results[0].item_id;
                    }
                    // onSaveSuccess(sender.tab, request.showSavedToolbarIcon, itemid);
                    sendResponse({status: "success"});
                },
                error: function(status, xhr) {
                    // Not authorized
                    if (status === 401) {
                        // Let the user know he's not authorized
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

                        // Show the login window and let him login
                        authentication.showLoginWindow(function () {
                            // Start the add process again
                            messageListenerCallback(request, sender, sendResponse);
                        });
                        return false;
                    }

                    // Handle error message
                    onSaveError(sender.tab, xhr);
                }
            });


            return true;
        }
        else if (request.action === "removeURL") {

            // Don't do anything if not authorized
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
        }
        else if (request.action === "archiveURL") {

            // Don't do anything if not authorized
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
        }
        else if (request.action === "getTags") {

            ril.getTags(function(tags, usedTags) {
                sendResponse({"value": {"tags": tags, "usedTags": usedTags}});
            });
            return true;
        }
        else if (request.action === "getSuggestedTags") {
            ril.getSuggestedTags(request.url, {
                success: function(data) {
                    if (data.status) {
                        sendResponse({status: "success", "value": { "suggestedTags": data.suggested_tags }});
                    }
                    else {
                        sendResponse({status: "error", error: "Invalid User"});
                    }
                },
                error: function(status, xhr) {
                    sendResponse({
                        status: "error",
                        error: xhr.getResponseHeader("X-Error")
                    });
                }
            });
            return true;
        }
        else if (request.action === "addTags") {

            // Don't do anything if not authorized
            if (!ril.isAuthorized()) { return; }

            // Try to add tags
            var tags = request.tags;
            var urlToAddTags = request.url;
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
        }
        else if (request.action === "editTags") {

            // Don't do anything if not authorized
            if (!ril.isAuthorized()) { return; }

            // Try to add tags
            var tags = request.tags;
            var urlToAddTags = request.url;
            var actionInfo = {
                cxt_ui: 'popover',
                cxt_view: 'ext_popover',
                cxt_url: sender.tab.url,
                cxt_suggested_available: request.analytics.cxt_suggested_available,
                cxt_enter_cnt: request.analytics.cxt_entered,
                cxt_suggested_cnt: request.analytics.cxt_suggested,
                cxt_remove_cnt: request.analytics.cxt_removed
            };

            ril.editTags(urlToAddTags, tags, {
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
        }
        else if (request.action === "getRecommendation") {

            // Don't do anything if not authorized
            if (!ril.isAuthorized()) { return; }

            ril.getRecommendations(request.item_id, {
                success: function(response) {

                    // console.log(response);

                    sendResponse({
                        status: "success",
                        data: response
                    });
                },
                error: function(status, xhr) {
                    sendResponse({
                        status: "error",
                        error: xhr.getResponseHeader("X-Error")
                    });
                }
            });
            return true;
        }
        else if (request.action === "listenerReady") {
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
        }
    });


    /**
     * General method to save links to Pocket
     * @param  {Tab}    tab        The tab that shows the page we want to save to Pocket
     * @param  {object} options    Additional options for saving links to Pocket
     */
    var saveLinkToPocket = function(tab, options) {
        var title = options.title || tab.title || "";
        var url   = options.url || tab.url  || "";
        var showSavedIcon = (typeof options.showSavedIcon !== 'undefined') ? options.showSavedIcon : true;
        // Login before, if not authorized
        if (!ril.isAuthorized()) {
            authentication.showLoginWindow(function() {
                saveLinkToPocket(tab, options);
            });
            return;
        }

        // Check if the safari content was already injected
        safariContentInjectionTester.safariContentInjected(tab, url, function(response) {

            // Don't do anything if the Safari content is not injected yet
            if (response.injected === false) { return; }

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
                        if (typeof data.action_results == 'object' && data.action_results.length && typeof data.action_results[0] == 'object') {
                            itemid = data.action_results[0].item_id;
                        }
                        onSaveSuccess(tab, showSavedIcon, itemid);

                        // Success callback
                        if (options.success) { options.success(data); }
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
        });
    };


    /**
     * Context menu handling for Chrome
     */
    (function setupChromeContextMenu() {
        // Don't do anything if it's not Chrome
        if (!isChrome()) return;

        // Add a context menu entry for adding links to Pocket
        var onClickHandler = function(info, tab) {

            var url   = info.linkUrl,
                title = info.selectionText || url,
                cxt_ui = 'right_click_link';

            // If the user didn't open the context menu on a link just
            // save the url of the tab. It's likely that user just clicked on
            // the sites background to open the context menu to add the link
            if (!url) {
                url = tab.url;
                title = tab.title;
                cxt_ui = 'right_click_page';
            }

            saveLinkToPocket(tab, {
                showSavedIcon: false,
                url: url,
                title: title,
                actionInfo: {
                    cxt_ui: 'right_click',
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

        // chrome.contextMenus.create({
        //     "title": "View recommendations",
        //     "contexts": ["browser_action"],
        //     "onclick": function(){
        //         console.log("Hi Bruck")
        //     }
        // });


    }());


    /**
     * Context menu handling for Safari
     */
    (function setupSafariContextMenu() {
        // Don't do anything if not in Safari
        if (!isSafari()) return;

        // Safari Context Menu
        safari.application.addEventListener("command", function(ev) {

            // The handleSaveToPocketContextMenu command event get's called
            // within safari-content.js
            if (ev.command !== "handleSaveToPocketContextMenu") { return; }

            // Try to save the right click url within userInfo from the event
            getCurrentTab(function(tab) {
                var url = ev.userInfo;
                var ctx_ui = 'right_click';

                // User saved the link by clicking on the background
                if (!url) {
                    url = tab.url;
                    ctx_ui = 'right_click_page';
                }

                // Try to save the url to pocket
                saveLinkToPocket(tab, {
                    url: url,
                    actionInfo: {
                        cxt_ui: ctx_ui,
                        cxt_url: tab.url
                    }
                });
            });
        }, false);
    }());


    /**
     * Handles clicks on the browser action in Chrome and in Safari's
     * toolbar item
     */
    (function setupToolbarItems() {

        if (isSafari()) {
            // Set toolbar button handler for Safari
            safari.application.addEventListener("command", function(ev) {
                if (ev.command !== "handleSaveToPocketToolbar") { return; }

                getCurrentTab(function(tab) {
                    var linkInfo = {
                        url: tab.url,
                        actionInfo: {
                            cxt_ui: 'toolbar'
                        }
                    };
                    saveLinkToPocket(tab, linkInfo);
                });
            }, false);

            return;
        }


        /**
         *  Handle the browser action that get's executed if the user pushes
         *  the toolbar icon in Chrome
         */
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
    }());


    /**
     * Initialize the extension
     */
    (function initialize() {

        // Settings
        var appVersionNumber = getVersionNumber();

        // Default settings
        $.each({
            twitter: "true",
            hackernews: "true",
            reddit: "true",
            yahoo: "true",
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

        // Check for first time installation and show an installed page
        if (!boolFromString(getSetting("installed"))) {
            setSetting("installed", "true");
            openTabWithURL(baseURL + "/installed/", isYandex());
        }

        // Check for upgrade from 1.0
        else if (boolFromString(getSetting("installed")) &&
                (!getSetting("lastInstalledVersion") ||
                getSetting("lastInstalledVersion") != appVersionNumber))
        {
            if (SHOW_RELEASE_NOTES) {

                // Show upgrade message
                var browser;
                if (isOpera()) {
                    browser = "opera";
                }
                else if (isYandex()) {
                    browser = "yandex";
                }
                else if (isChrome()) {
                    browser = "chrome";
                }
                else if (isSafari()) {
                    browser = "safari";
                }

                openTabWithURL(baseURL + "/" + browser + "/updated?v=" +
                    appVersionNumber + "&vo=" + getSetting("lastInstalledVersion"), false);
            }

            // manual call to fetch tags to check premium upgrade
            ril.getTags(function(tags, usedTags) {

            });
        }

        // Update last installed version in setting
        setSetting("lastInstalledVersion", appVersionNumber);

        /**
         * Safari specific initialization
         */
        if (isSafari()) {

            /**
             * Safari Settings
             */

            // Set the openSettingsSafariCheckbox to false so if the user will
            // open the settings in Safari again the checkbox will be not checked
            safari.extension.settings.openSettingsSafariCheckbox = false;

            // Add handling of settings changed within Safari
            // We use that to hijack the click on open Pocket settings within
            // the Safari Extension Settings for Pocket
            safari.extension.settings.addEventListener("change", function(ev) {
                var key = ev.key;
                if (key === "openSettingsSafariCheckbox") {
                    var win = safari.application.activeBrowserWindow;
                    var tab;
                    if (!win) {
                        tab = safari.application.openBrowserWindow().activeTab;
                    }
                    else {
                        tab = win.openTab();
                    }
                    tab.url = safari.extension.baseURI + "html/options.html";
                    safari.application.activeBrowserWindow.activate();
                }
            });


            /**
             * Add injection settings for Safari
             * Chrome settings are in manifest.yml
             * Note: You have to add a * at the end of whitelisted url you want to
             *       inject the script else it will not work
             */

            var injectBaseHost = baseHost;
            // var injectBaseHost = "nick1.dev.readitlater.com";

            // Inject scripts needed for the login flow
            safari.extension.addContentScriptFromURL(safari.extension.baseURI + "js/safari-login-signup-window-resize.js", ["https://" + injectBaseHost + "/signup*", "http://" + injectBaseHost + "/signup*", "http://" + injectBaseHost + "/extension_login_success*", "https://" + injectBaseHost + "/extension_login_success*"], [], false);
            safari.extension.addContentScriptFromURL(safari.extension.baseURI + "js/login-inject.js", ["http://" + injectBaseHost + "/extension_login_success*", "https://" + injectBaseHost + "/extension_login_success*"], [], true);
            safari.extension.addContentScriptFromURL(safari.extension.baseURI + "js/logout-inject.js", ["http://" + injectBaseHost + "/login*", "https://" + injectBaseHost + "/login*"], [], false);

            // Inject js code for Twitter
            safari.extension.addContentScriptFromURL(safari.extension.baseURI + "sites/twitter/twitter.ril.js", ["http://twitter.com/*", "https://twitter.com/*"], [], true);
            safari.extension.addContentStyleSheetFromURL(safari.extension.baseURI + "sites/twitter/twitter.ril.css", ["http://twitter.com/*", "https://twitter.com/*"], []);

            // Inject js code for HackerNews
            safari.extension.addContentScriptFromURL(safari.extension.baseURI + "sites/hackernews/hn.pocket.js", ["http://*.ycombinator.org/*", "https://*.ycombinator.org/*", "http://*.ycombinator.com/*", "https://*.ycombinator.com/*"], [], true);

            // Inject js code for Reddit
            safari.extension.addContentScriptFromURL(safari.extension.baseURI + "sites/reddit/reddit.pocket.js", ["*://*.reddit.com/*"], [], true);

            // Inject js code for yahoo
            safari.extension.addContentScriptFromURL(safari.extension.baseURI + "sites/yahoo/yahoo.pocket.js", ["*://*.yahoo.com/*"], [], true);
            safari.extension.addContentScriptFromURL(safari.extension.baseURI + "sites/yahoo/yahoo-share-button.pocket.js", ["*://*.yahoo.com/*"], [], true);
            safari.extension.addContentStyleSheetFromURL(safari.extension.baseURI + "sites/yahoo/yahoo.pocket.css", ["*://*.yahoo.com/*"], []);
        }

        // heartbeat
        ril.setupHeartbeat();
        showNormalToolbarIcon();

        chrome.runtime.onInstalled.addListener(function() {
            ril.checkExperiment();
        });
        chrome.runtime.onUpdateAvailable.addListener(function() {
            ril.checkExperiment();
        });

    }());


    /**
     * Public Methods
     */
    return {
    };
})();
