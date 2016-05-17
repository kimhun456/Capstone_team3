/* VERSION 3.2*/
// Use http://jscompress.com/ and copy output to r.js when ready to go to production
if (window.thePKT_BM) {
    window.thePKT_BM.save();
}
else {
    /*
    PKT_BM_OVERLAY is the view itself and contains all of the methods to manipute the overlay and messaging.
    It does not contain any logic for saving or communication with the extension or server.
    */
    var PKT_BM_OVERLAY = function (options) {
        var self = this;
        this.baseHost                               = "getpocket.com";
        this.inited                                 = false;
        this.active                                 = false;
        this.delayedStateSaved                      = false;
        this.wrapper                                = null;
        this.premiumStatus                          = (window.___PKT__PREM_STATUS === '1');
        this.premiumUpsell                          = (window.___PKT__PREM_UPSELL === '1');
        this.saveCount                              = window.___PKT__SAVE_COUNT;
        this.savedUrl                               = '';
        this.savedItemId                            = '';
        this.preventCloseTimerCancel                = false;
        this.closeValid                             = true;
        this.suggestedTagsLoaded                    = false;
        this.mouseInside                            = false;
        this.autocloseTimer                         = null;
        this.autocloseTiming                        = 1000;
        this.autocloseTimingFinalState              = 2000;
        this.userTags                               = [];
        this.cxt_suggested_available                = 0;
        this.cxt_entered                            = 0;
        this.cxt_suggested                          = 0;
        this.cxt_removed                            = 0;
        this.justaddedsuggested                     = false;
        this.recListLoaded                          = false;

        // TODO: populate this with actual translations
        this.translations                           = {};
        this.translations.addTags                   = pkt.r_i18n.add_tags             || 'Add Tags';
        this.translations.close                     = pkt.r_i18n.close                || 'Close';
        this.translations.invalidTags               = pkt.r_i18n.invalid_tags         || 'Tags are limited to 25 characters';
        this.translations.openPocket                = pkt.r_i18n.open_pocket          || 'Open Pocket';
        this.translations.pageRemoved               = pkt.r_i18n.page_removed         || 'Page removed';
        this.translations.pageArchived              = 'Page Archived';
        this.translations.recSaved                  = 'Recommendation Saved';
        this.translations.pageSaved                 = pkt.r_i18n.page_saved           || 'Saved';
        this.translations.premiumUpsellHeader       = pkt.r_i18n.premium_upsellheader || 'Get organized with Suggested Tags';
        this.translations.premiumUpsellLink         = pkt.r_i18n.premium_upselllink   || 'Start your free Pocket Premium trial!';
        this.translations.processingRemove          = pkt.r_i18n.processing_remove    || 'Removing page...';
        this.translations.processingArchive         = 'Archiving Page...';
        this.translations.processingRec             = 'Saving Recommendation...';
        this.translations.processingTags            = pkt.r_i18n.processing_tags      || 'Adding tags...';
        this.translations.processingUrl             = pkt.r_i18n.processing_url       || 'Saving URL...';
        this.translations.recentTags                = pkt.r_i18n.recent_tags          || 'Recent Tags';
        this.translations.removePage                = pkt.r_i18n.remove_page          || 'Remove Page';
        this.translations.save                      = pkt.r_i18n.save                 || 'Save';
        this.translations.suggestedTags             = pkt.r_i18n.suggested_tags       || 'Suggested Tags';
        this.translations.suggestedTagsError        = pkt.r_i18n.suggested_tags_error || 'We’re having trouble retrieving suggested tags. Reload the page and save the item again.';
        this.translations.tagsSaved                 = pkt.r_i18n.tags_saved           || 'Tags Added';
        this.translations.unauthorized              = pkt.r_i18n.unauthorized         || 'Unauthorized access. Please log in.';

        // Actions
        this.initTags = function(){
            PKT_EXT.TAGGING.init({
                containerName       : 'pkt_ext_tag_input_wrapper',
                listContainerName   : 'pkt_ext_suggested_tags',
                saveButtonName      : '',
                placeholder         : 'Add some tags...',
                premiumStatus       : self.premiumStatus
            });
        };

        this.initRecommendations = function(){
            self.wantsRecs       = true;
            PKT_EXT.SAVERECS.init({
                recContainerName    : 'pkt_ext_save_recs',
                recListName         : 'pkt_ext_recommendations_list',
                recLoaded           : self.initAutoCloseEvents
            });
        };

        this.initTips = function(){

            $('.simple-tooltip').on('mouseenter', function(e){
                var item = $(this);
                clearTimeout(self.hoverTimer);
                self.hoverTimer = setTimeout(function(){
                    item.addClass('active_tooltip')
                }, 1250);
            });

            $('.simple-tooltip').on('mouseleave', function(e){
                var item = $(this);
                item.removeClass('active_tooltip');
                clearTimeout(self.hoverTimer);
            });
        }
        this.initSettings = function(){
            $('.pkt_ext_action_options').on('click', function(e){
                e.preventDefault();
                thePKT_BM.sendMessage({
                        action: "openSettings",
                    })
            });
        }
        this.initOverflow = function() {
            var overflow        = $('.pkt_ext_overflow'),
                overflowTrigger = $('.pkt_ext_action_overflow');

            overflowTrigger.on('mouseenter', function(e){
                if(self.pageRemoved) return;
                overflow.addClass('active');
                clearTimeout(self.overflowTimer);
            });

            overflowTrigger.on('mouseleave', function(e){
                if(self.pageRemoved) return;
                self.overflowTimer = setTimeout(function(){
                    overflow.removeClass('active')
                }, 1250);
            });


            overflow.on('mouseenter', function(e){
                if(self.pageRemoved) return;
                overflow.removeClass('active').addClass('active');
                clearTimeout(self.overflowTimer);
            });

            overflow.on('mouseleave', function(e){
                if(self.pageRemoved) return;
                overflow.removeClass('active')
                clearTimeout(self.overflowTimer);
            });
        }
        this.initRemovePageInput = function() {
            $('.pkt_ext_action_removeitem').click(function(e) {
                if ($(this).parents('.pkt_ext_item_actions_disabled').length) {
                    e.preventDefault();
                    return;
                }
                if ($(this).hasClass('pkt_ext_action_removeitem')) {
                    e.preventDefault();
                    self.disableInput();

                    thePKT_BM.sendMessage({
                        action: "removeURL",
                        item_id: self.savedItemId
                    }, function (response) {
                        if (response.status == 'success') {
                            self.pageRemoved = true;
                            $('.pkt_ext_logo_action_copy').text(self.translations.pageRemoved);
                            $('.pkt_ext_logo').addClass('removed');
                            $('.pkt_ext_logo').removeClass('archived');
                            self.startCloseTimer(400);

                            clearTimeout(self.overflowTimer);
                            $('.pkt_ext_overflow').removeClass('active');
                        }
                        else if (response.status == 'error') {
                        }
                    });
                }
            });



        };
        this.initArchivePageInput = function(){

            $('.pkt_ext_action_archive').click(function(e) {
                if ($(this).parents('.pkt_ext_item_actions_disabled').length) {
                    e.preventDefault();
                    return;
                }
                if ($(this).hasClass('pkt_ext_action_archive')) {
                    e.preventDefault();
                    self.disableInput();
                    // $('.pkt_ext_logo_action_copy').text(self.translations.processingArchive);
                    thePKT_BM.sendMessage({
                        action: "archiveURL",
                        item_id: self.savedItemId
                    }, function (response) {
                        if (response.status == 'success') {
                            $('.pkt_ext_logo_action_copy').text(self.translations.pageArchived);
                            $('.pkt_ext_logo').removeClass('removed');
                            $('.pkt_ext_logo').addClass('archived');
                        }
                        else if (response.status == 'error') {
                            $('.pkt_ext_edit_msg').addClass('pkt_ext_edit_msg_error pkt_ext_edit_msg_active').text(response.error);
                        }
                    });
                }
            });
        };
        this.initAutoCloseEvents = function() {
            self.initPosition = $(document).scrollTop();
            window.addEventListener('scroll', self.startScrollCloseTimer);

            // document.body.addEventListener('mouseenter', self.startCloseTimer);

            self.wrapper.on('mouseenter',function() {
                self.mouseInside = true;
                self.stopCloseTimer();
            });
            self.wrapper.on('mouseleave',function() {
                self.mouseInside = false;
                self.startCloseTimer();
            });
            self.wrapper.on('click',function(e) {
                self.closeValid = false;
            });

            var tagInput = $(PKT_EXT.TAGGING.getInput());

            tagInput.focus(function(e){
                self.hasFocus = true;
                self.stopCloseTimer();
            });

            tagInput.blur(function(e){
                self.hasFocus = false;
                if(!self.mouseInside) self.startCloseTimer();
            });

            self.stopCloseTimer();
        };

        // Utilities
        this.startScrollCloseTimer = function(e){
            var distanceScrolled = Math.abs($(document).scrollTop() - self.initPosition);
            if( distanceScrolled < 100) return;

            window.removeEventListener('scroll', self.startScrollCloseTimer);
            self.startCloseTimer(500);
        };

        this.startCloseTimer = function(manualtime) {

            var settime = manualtime ? manualtime : self.autocloseTiming;
            if (typeof self.autocloseTimer == 'number') {
                clearTimeout(self.autocloseTimer);
            }

            if(!self.hasFocus){
                self.autocloseTimer = setTimeout(function() {
                    $('.pkt_ext_container').addClass('pkt_ext_container_inactive');
                }, settime);
            }
        };
        this.stopCloseTimer = function() {
            clearTimeout(self.autocloseTimer);
        };

        this.disableInput = function() {
            this.wrapper.find('.pkt_ext_item_actions').addClass('pkt_ext_item_actions_disabled');
            this.wrapper.find('.pkt_ext_btn').addClass('pkt_ext_btn_disabled');
            this.wrapper.find('.pkt_ext_tag_input_wrapper').addClass('pkt_ext_tag_input_wrapper_disabled');
            if (this.wrapper.find('.pkt_ext_suggestedtag_detail').length) {
                this.wrapper.find('.pkt_ext_suggestedtag_detail').addClass('pkt_ext_suggestedtag_detail_disabled');
            }
        };
        this.enableInput = function() {
            this.wrapper.find('.pkt_ext_item_actions').removeClass('pkt_ext_item_actions_disabled');
            this.checkValidTagSubmit();
            this.wrapper.find('.pkt_ext_tag_input_wrapper').removeClass('pkt_ext_tag_input_wrapper_disabled');
            if (this.wrapper.find('.pkt_ext_suggestedtag_detail').length) {
                this.wrapper.find('.pkt_ext_suggestedtag_detail').removeClass('pkt_ext_suggestedtag_detail_disabled');
            }
        };
        this.closePopup = function() {
            self.stopCloseTimer();
            $('.pkt_ext_container').addClass('pkt_ext_container_inactive');
        };

        // States
        this.showStateSaved = function() {
            if (self.active) {
                self.delayedStateSaved = true;
                return;
            }
            self.urlToSave = window.___PKT__URL_TO_SAVE;
            $('.pkt_ext_container').addClass('pkt_ext_container_detailactive');
            $('.pkt_ext_container').removeClass('pkt_ext_container_inactive');

            if(self.wantsRecs){
                PKT_EXT.SAVERECS.loadRecs(self.savedItemId);
            }
            else{
                self.startCloseTimer(7000);
            }


        };
        this.showStateLoading = function() {

            $('.pkt_ext_logo_action_copy').text(self.translations.pageSaved);
            self.pageRemoved = false;
            var baseclasslist = 'pkt_ext_container pkt_ext_container_active';
            if (this.wrapper.hasClass('pkt_ext_container_flexbox')) {
                baseclasslist += ' pkt_ext_container_flexbox';
            }
            this.wrapper.attr('class',baseclasslist);
        };
        this.showStateFinalMsg = function(msg) {
            this.wrapper.find('.pkt_ext_finalstatedetail')
            .one('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd',function(e){
                $(this).off('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd');
            });
            this.wrapper.find('.pkt_ext_finalstatedetail h2').text(msg);
            this.wrapper.addClass('pkt_ext_container_finalstate');
        };
        this.showStateError = function(msg) {
            this.wrapper.find('.pkt_ext_finalstatedetail h2').text(msg);
            this.wrapper.addClass('pkt_ext_container_finalerrorstate');
        };
        this.showStateUnauthorized = function() {
            this.wrapper.find('.pkt_ext_finalstatedetail h2').text(this.translations.unauthorized);
            this.wrapper.addClass('pkt_ext_container_finalerrorstate');
        };
    };

    PKT_BM_OVERLAY.prototype = {
        create : function() {

            if (this.active){return;}

            this.active = true;
            var self = this;

            // kill any running timers
            self.stopCloseTimer();
            self.closeValid = true;

            var bodys = document.getElementsByTagName('body');
            var body = bodys ? bodys[0] : false;

            if (!body) {
                body = document.documentElement;
            }
            if (!this.inited) {
                this.inited = true;
                // add page saved element
                var container;
                var existingcontainer = document.getElementsByClassName('pkt_ext_container');

                if (!existingcontainer.length) {

                     // Inject icons for use.
                    PKT_EXT.ICONS.inject();

                    var containerbaseclass = (supportsFlexbox()) ? 'pkt_ext_container pkt_ext_container_flexbox pkt_ext_container_inactive' : 'pkt_ext_container pkt_ext_container_inactive';
                    container = document.createElement('div');
                    container.className = containerbaseclass;
                    container.id = 'pkt_ext_master'
                    container.setAttribute('aria-live','polite');
                    var openpocketsuffix = (typeof self.saveCount == 'string'
                                            && self.saveCount == '1') ? '?save_cnt=1' : '?save_cnt=multi';

                    var extcontainerdetail = PKT_EXT.TEMPLATES.save({
                        actionCopy: self.translations.pageSaved,
                        openPocket: openpocketsuffix
                    });


                    container.innerHTML = extcontainerdetail;
                    body.appendChild(container);


                    self.wrapper = $('.pkt_ext_container');
                    self.initTags();
                    self.initTips();
                    // self.initRecommendations(); // REC_INIT
                    self.initSettings();
                    self.initArchivePageInput();
                    self.initRemovePageInput();
                    self.initAutoCloseEvents();
                    self.initOverflow();

                }
                else
                {
                    container = container[0];
                }

                // set page saved to active
                setTimeout(function()
                {
                    container.className = containerbaseclass + ' pkt_ext_container_active';
                    self.active = false;
                    if (self.delayedStateSaved) {
                        self.delayedStateSaved = false;
                        self.showStateSaved();
                    }
                },10);
            }
            else {
                self.showStateLoading();
                self.active = false;
                if (self.delayedStateSaved) {
                    self.delayedStateSaved = false;
                    self.showStateSaved();
                }
            }

            function supportsFlexbox() {
                function DetectDisplayValue(val) {
                    // detect CSS display:val support in JavaScript
                    //
                    var detector = document.createElement("detect");
                    detector.style.display = val;
                    return (detector.style.display === val);
                }
                return (DetectDisplayValue('flex') || DetectDisplayValue('-webkit-flex'));
            }
        },
        showStateSaved : function() {
            this.showStateSaved();
        },
        showStateError : function() {
            this.showStateError();
        },
        showStateUnauthorized : function() {
            this.showStateUnauthorized();
        }
    };

    // Layer between Bookmarklet and Extensions
    var PKT_BM = function () {};

    PKT_BM.prototype = {
        init: function () {
            if (this.inited) {
                return;
            }
            this.overlay = new PKT_BM_OVERLAY();

            this.inited = true;
            this.requestListener = undefined;
        },

        isChrome: function() {
            return window.chrome != undefined && window.chrome.app;
        },

        isSafari: function() {
            return window.safari != undefined;
        },

        addMessageListener: function (listener) {
            // Remove event listener if one is currently registered
            if (this.requestListener !== undefined) {
                this.removeMessageListener();
            }

            // Add request listener
            if (this.isChrome()) {
                this.requestListener = listener;
                chrome.extension.onMessage.addListener(listener);
            } else if (this.isSafari()) {
                this.requestListener = function (thingy) {
                    listener(thingy.message, thingy);
                };
                window.safari.self.addEventListener("message", this.requestListener);
            }
        },

        removeMessageListener: function () {
            if (this.isChrome()) {
                chrome.extension.onMessage.removeListener(this.requestListener);
            } else if (this.isSafari()) {
                window.safari.self.removeEventListener("message", this.requestListener);
            }
            this.requestListener = undefined;
        },


        sendMessage: function (message, cb) {
            if (this.isChrome()) {
                if (window.chrome.extension.sendMessage) {
                    window.chrome.extension.sendMessage(message, cb);
                } else {
                    window.chrome.extension.sendRequest(message, cb);
                }
            } else if (this.isSafari()) {
                if (cb) {
                    message["__cbId"] = Callbacker.addCb(cb);
                }

                safari.self.tab.dispatchMessage("message", message);
            }
        },

        handleMessageResponse: function(response) {
            if (response.status == "success") {
                if (typeof response.item_id == 'string') {
                    this.overlay.savedItemId = response.item_id;
                }
                $('.pkt_ext_logo').removeClass('removed');
                $('.pkt_ext_logo').removeClass('archived');
                this.overlay.showStateSaved();
            }
            else if (response.status == "unauthorized") {
                this.overlay.showStateUnauthorized();
            }
            else if (response.status == "error") {
                this.overlay.showStateError(response.message);
            }
        },

        save: function() {

            this.overlay.create();

            this.overlay.savedUrl = window.___PKT__URL_TO_SAVE;

            this.addMessageListener(function(request, sender, response) {
                this.handleMessageResponse(request);
            }.bind(this));

            thePKT_BM.sendMessage({action: "listenerReady"}, function (response) {
            });
        }
    }

    // make sure the page has fully loaded before trying anything
    $(document).ready(function() {

        if (document.location.hostname !== "localhost") {

            if(!window.thePKT_BM){
                var thePKT_BM = new PKT_BM();
                window.thePKT_BM = thePKT_BM;
                thePKT_BM.init();
            }

            window.thePKT_BM.save();
        }
    });
}
void(0);

