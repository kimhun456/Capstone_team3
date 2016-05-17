/* VERSION 3.2*/
// Use http://jscompress.com/ and copy output to r.js when ready to go to production
//try{
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
        this.baseHost = "getpocket.com";
        // this.baseHost = "admin:s3krit@sechs.dev.readitlater.com";

        this.inited = false;
        this.active = false;
        this.delayedStateSaved = false;
        this.wrapper = null;
        this.premiumStatus = (window.___PKT__PREM_STATUS === '1');
        this.premiumUpsell = (window.___PKT__PREM_UPSELL === '1');
        this.saveCount = window.___PKT__SAVE_COUNT;
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
        this.translations = {};
        this.translations.addTags = pkt.r_i18n.add_tags || 'Add Tags';
        this.translations.close = pkt.r_i18n.close || 'Close';
        this.translations.invalidTags = pkt.r_i18n.invalid_tags || 'Tags are limited to 25 characters';
        this.translations.openPocket = pkt.r_i18n.open_pocket || 'Open Pocket';
        this.translations.pageRemoved = pkt.r_i18n.page_removed || 'Page Removed';
        this.translations.pageSaved = pkt.r_i18n.page_saved || 'Page Saved';
        this.translations.premiumUpsellHeader = pkt.r_i18n.premium_upsellheader || 'Get organized with Suggested Tags';
        this.translations.premiumUpsellLink = pkt.r_i18n.premium_upselllink || 'Start your free Pocket Premium trial!';
        this.translations.processingRemove = pkt.r_i18n.processing_remove || 'Removing page...';
        this.translations.processingTags = pkt.r_i18n.processing_tags || 'Adding tags...';
        this.translations.processingUrl = pkt.r_i18n.processing_url || 'Saving URL...';
        this.translations.recentTags = pkt.r_i18n.recent_tags || 'Recent Tags';
        this.translations.removePage = pkt.r_i18n.remove_page || 'Remove Page';
        this.translations.save = pkt.r_i18n.save || 'Save';
        this.translations.suggestedTags = pkt.r_i18n.suggested_tags || 'Suggested Tags';
        this.translations.suggestedTagsError = pkt.r_i18n.suggested_tags_error || 'We’re having trouble retrieving suggested tags. Reload the page and save the item again.';
        this.translations.tagsSaved = pkt.r_i18n.tags_saved || 'Tags Added';
        this.translations.unauthorized = pkt.r_i18n.unauthorized || 'Unauthorized access. Please log in.';
        this.closeValid = true;
        this.suggestedTagsLoaded = false;
        this.mouseInside = false;
        this.autocloseTimer = null;

        // TODO: allow the timer to be editable?
        this.autocloseTiming = 4000;
        this.autocloseTimingFinalState = 2000;
        this.userTags = [];
        this.cxt_suggested_available = 0;
        this.cxt_entered = 0;
        this.cxt_suggested = 0;
        this.cxt_removed = 0;
        this.justaddedsuggested = false;
        this.fillTagContainer = function(tags,container,tagclass) {
            var newtagleft = 0;
            for (var i = 0; i < tags.length; i++) {
                var newtag = $('<li><a href="#" class="token_tag ' + tagclass + '">' + tags[i] + '</a></li>');
                container.append(newtag);
                var templeft = newtag.position().left;
                if (templeft > newtagleft) {
                    this.cxt_suggested_available++;
                    newtagleft = templeft;
                }
                else {
                    newtag.remove();
                    break;
                }
            }
        };
        this.fillUserTags = function() {
            var self = this;
            thePKT_BM.sendMessage({action: "getTags"}, function (response) {
                self.userTags = response.value.tags;
            });
        };
        this.fillSuggestedTags = function() {
            if (!$('.pkt_ext_suggestedtag_detail').length) {
                self.suggestedTagsLoaded = true;
                self.startCloseTimer();
                return;
            }
            thePKT_BM.sendMessage({
                    action: "getSuggestedTags",
                    url: self.urlToSave || window.location.toString(),
                },
                function (response) {
                    $('.pkt_ext_suggestedtag_detail').removeClass('pkt_ext_suggestedtag_detail_loading');
                    if (response.status == 'success') {
                        var newtags = [];
                        for (var i = 0; i < response.value.suggestedTags.length; i++)
                        {
                            newtags.push(response.value.suggestedTags[i].tag);
                        }
                        self.suggestedTagsLoaded = true;
                        if (!self.mouseInside) {
                            self.startCloseTimer();
                        }
                        self.fillTagContainer(newtags,$('.pkt_ext_suggestedtag_detail ul'),'token_suggestedtag');
                    }
                    else if (response.status == 'error') {
                        var msg = $('<p class="suggestedtag_msg">');
                        msg.text(response.error);
                        $('.pkt_ext_suggestedtag_detail').append(msg);
                        this.suggestedTagsLoaded = true;
                        if (!self.mouseInside) {
                            self.startCloseTimer();
                        }
                    }
                }
            );
        };
        this.checkValidTagSubmit = function() {
            var inputlength = $.trim($('.pkt_ext_tag_input_wrapper').find('.token-input-input-token').children('input').val()).length;
            if ($('.pkt_ext_container').find('.token-input-token').length || (inputlength > 0 && inputlength < 26))
            {
                $('.pkt_ext_container').find('.pkt_ext_btn').removeClass('pkt_ext_btn_disabled');
            }
            else
            {
                $('.pkt_ext_container').find('.pkt_ext_btn').addClass('pkt_ext_btn_disabled');
            }
            self.updateSlidingTagList();
        };
        this.updateSlidingTagList = function() {
            var inputleft = $('.token-input-input-token input').position().left;
            var listleft = $('.token-input-list').position().left;
            var listleftmanual = parseInt($('.token-input-list').css('left'));
            var listleftnatural = listleft - listleftmanual;
            var leftwidth = $('.tag-input-wrapper').outerWidth();

            if ((inputleft + listleft + 20) > leftwidth)
            {
                $('.token-input-list').css('left',Math.min(((inputleft + listleftnatural - leftwidth + 20)*-1),0) + 'px');
            }
            else
            {
                $('.token-input-list').css('left','0');
            }
        };
        this.showActiveTags = function() {
            if (!$('.pkt_ext_suggestedtag_detail').length) {
                return;
            }
            var activetokenstext = '|';
            $('.token-input-token').each(function(index, element) {
                activetokenstext += $(element).find('p').text() + '|';
            });

            var inactivetags = $('.pkt_ext_suggestedtag_detail').find('.token_tag_inactive');
            inactivetags.each(function(index,element) {
                if (activetokenstext.indexOf('|' + $(element).text() + '|') == -1) {
                    $(element).removeClass('token_tag_inactive');
                }
            });
        };
        this.hideInactiveTags = function() {
            if (!$('.pkt_ext_suggestedtag_detail').length) {
                return;
            }
            var activetokenstext = '|';
            $('.token-input-token').each(function(index, element) {
                activetokenstext += $(element).find('p').text() + '|';
            });
            var activesuggestedtags = $('.token_tag').not('.token_tag_inactive');
            activesuggestedtags.each(function(index,element) {
                if (activetokenstext.indexOf('|' + $(element).text() + '|') > -1) {
                    $(element).addClass('token_tag_inactive');
                }
            });
        };
        this.sanitizeText = function(s) {
            var sanitizeMap = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': '&quot;',
                "'": '&#39;'
            };
            if (typeof s !== 'string')
            {
                return '';
            }
            else
            {
                return String(s).replace(/[&<>"']/g, function (str) {
                    return sanitizeMap[str];
                });
            }
        };
        this.checkPlaceholderStatus = function() {
            if (this.wrapper.find('.pkt_ext_tag_input_wrapper').find('.token-input-token').length)
            {
                this.wrapper.find('.token-input-input-token input').attr('placeholder','');
            }
            else
            {
                this.wrapper.find('.token-input-input-token input').attr('placeholder',$('.pkt_ext_tag_input').attr('placeholder')).css('width','200px');
            }
        };
        this.initTagInput = function() {
            var inputwrapper = $('.pkt_ext_tag_input_wrapper');
            inputwrapper.find('.pkt_ext_tag_input').tokenInput([], {
                searchDelay: 200,
                minChars: 1,
                animateDropdown: false,
                noResultsHideDropdown: true,
                scrollKeyboard: true,
                emptyInputLength: 200,
                search_function: function(term, cb) {
                    var returnlist = [];
                    if (term.length) {
                        var limit = 15;
                        var r = new RegExp('^' + term);
                        for (var i = 0; i < self.userTags.length; i++) {
                            if (r.test(self.userTags[i]) && limit > 0) {
                                returnlist.push({name:self.userTags[i]});
                                limit--;
                            }
                        }
                    }
                    else {
                        returnlist.push({name:'blah'});
                    }
                    if (!$('.token-input-dropdown-tag').data('init')) {
                        $('.token-input-dropdown-tag').css('width',inputwrapper.outerWidth()).data('init');
                        inputwrapper.append($('.token-input-dropdown-tag'));
                    }
                    cb(returnlist);
                },
                textToData: function(text) {
                    if($.trim(text).length > 25 || !$.trim(text).length) {
                        if (text.length > 25) {
                            $('.pkt_ext_edit_msg').addClass('pkt_ext_edit_msg_error pkt_ext_edit_msg_active').text(self.translations.invalidTags);
                            changestamp = Date.now();
                            setTimeout(function() {
                                $('.token-input-input-token input').val(text).focus();
                            },10);
                        }
                        return null;
                    }
                    else {
                        $('.pkt_ext_edit_msg').removeClass('pkt_ext_edit_msg_error pkt_ext_edit_msg_active').text('');
                        return {name:self.sanitizeText(text.toLowerCase())};
                    }
                },
                onReady: function() {
                    $('.token-input-dropdown').addClass('token-input-dropdown-tag');
                    inputwrapper.find('.token-input-input-token input').attr('placeholder',$('.tag-input').attr('placeholder')).css('width','200px');
                    if ($('.pkt_ext_suggestedtag_detail').length) {
                        self.wrapper.find('.pkt_ext_suggestedtag_detail').on('click','.token_tag',function(e) {
                            e.preventDefault();
                            var tag = $(e.target);
                            if ($(this).parents('.pkt_ext_suggestedtag_detail_disabled').length) {
                                return;
                            }
                            self.justaddedsuggested = true;
                            inputwrapper.find('.pkt_ext_tag_input').tokenInput('add',{id:inputwrapper.find('.token-input-token').length,name:tag.text()});
                            tag.addClass('token-suggestedtag-inactive');
                            $('.token-input-input-token input').focus();
                        });
                    }
                    $('.token-input-list').on('keydown','input',function(e) {
                        if (e.which == 37) {
                            self.updateSlidingTagList();
                        }
                    }).on('keypress','input',function(e) {
                        if (e.which == 13) {
                            if (Date.now() - changestamp > 250) {
                                e.preventDefault();
                                self.wrapper.find('.pkt_ext_btn').trigger('click');
                            }
                        }
                    }).on('keyup','input',function(e) {
                        self.checkValidTagSubmit();
                    });
                    self.checkPlaceholderStatus();
                },
                onAdd: function() {
                    self.checkValidTagSubmit();
                    changestamp = Date.now();
                    self.hideInactiveTags();
                    self.checkPlaceholderStatus();
                    if (self.justaddedsuggested) {
                        self.cxt_suggested++;
                        self.justaddedsuggested = false;
                    }
                    else {
                        self.cxt_entered++;
                    }
                },
                onDelete: function() {
                    self.checkValidTagSubmit();
                    changestamp = Date.now();
                    self.showActiveTags();
                    self.checkPlaceholderStatus();
                    self.cxt_removed++;
                }
            });
            $('body').on('keydown',function(e) {
                var key = e.keyCode || e.which;
                if (key == 8) {
                    var selected = $('.token-input-selected-token');
                    if (selected.length) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        inputwrapper.find('.pkt_ext_tag_input').tokenInput('remove',{name:selected.find('p').text()});
                    }
                }
                else {
                    if ($(e.target).parent().hasClass('token-input-input-token')) {
                        e.stopImmediatePropagation();
                    }
                }
            });
        };
        this.initAddTagInput = function() {
            $('.pkt_ext_btn').click(function(e) {
                e.preventDefault();
                if ($(this).hasClass('pkt_ext_btn_disabled') || $('.pkt_ext_edit_msg_active').filter('.pkt_ext_edit_msg_error').length)
                {
                    return;
                }
                self.disableInput();
                $('.pkt_ext_container').find('.pkt_ext_detail h2').text(self.translations.processingTags);
                var originaltags = [];
                $('.token-input-token').each(function()
                {
                    var text = $.trim($(this).find('p').text());
                    if (text.length)
                    {
                        originaltags.push(text);
                    }
                });
                thePKT_BM.sendMessage({
                        action: "addTags",
                        url: self.urlToSave || window.location.toString(),
                        tags: originaltags,
                        analytics: {
                            cxt_suggested_available: self.cxt_suggested_available,
                            cxt_entered: self.cxt_entered,
                            cxt_suggested: self.cxt_suggested,
                            cxt_removed: self.cxt_removed
                        }
                    },
                    function (response) {
                        if (response.status == 'success') {
                            self.showStateFinalMsg(self.translations.tagsSaved);
                        }
                        else if (response.status == 'error') {
                            $('.pkt_ext_edit_msg').addClass('pkt_ext_edit_msg_error pkt_ext_edit_msg_active').text(response.error);
                        }
                    }
                );
            });
        };
        this.initRemovePageInput = function() {
            $('.pkt_ext_removeitem').click(function(e) {
                if ($(this).parents('.pkt_ext_item_actions_disabled').length) {
                    e.preventDefault();
                    return;
                }
                if ($(this).hasClass('pkt_ext_removeitem')) {
                    e.preventDefault();
                    self.disableInput();
                    $('.pkt_ext_container').find('.pkt_ext_detail h2').text(self.translations.processingRemove);
                    thePKT_BM.sendMessage({
                        action: "removeURL",
                        item_id: self.savedItemId
                    }, function (response) {
                        if (response.status == 'success') {
                            self.showStateFinalMsg(self.translations.pageRemoved);
                        }
                        else if (response.status == 'error') {
                            $('.pkt_ext_edit_msg').addClass('pkt_ext_edit_msg_error pkt_ext_edit_msg_active').text(response.error);
                        }
                    });
                }
            });
        };
        this.initCloseWindowInput = function() {
            self.wrapper.find('.pkt_ext_close').click(function(e) {
                e.preventDefault();
                self.closePopup();
            });
            self.wrapper.find('.pkt_ext_openpocket').click(function(e)
            {
                self.wrapper.find('.pkt_ext_close').trigger('click');
            });
            if (self.wrapper.find('.pkt_ext_premupsell').length)
            {
                self.wrapper.find('.pkt_ext_premupsell').find('a').click(function(e)
                {
                    self.wrapper.find('.pkt_ext_close').trigger('click');
                });
            }
        };
        this.initAutoCloseEvents = function() {
            this.wrapper.on('mouseenter',function() {
                self.mouseInside = true;
                if (self.suggestedTagsLoaded) {
                    self.stopCloseTimer();
                }
            });
            this.wrapper.on('mouseleave',function() {
                self.mouseInside = false;
                if (self.suggestedTagsLoaded) {
                    self.startCloseTimer();
                }
            });
            this.wrapper.on('click',function(e) {
                self.closeValid = false;
            });
        };
        this.startCloseTimer = function(manualtime) {
            var settime = manualtime ? manualtime : self.autocloseTiming;
            if (typeof self.autocloseTimer == 'number') {
                clearTimeout(self.autocloseTimer);
            }
            self.autocloseTimer = setTimeout(function() {
                if (self.closeValid || self.preventCloseTimerCancel) {
                    $('.pkt_ext_container').addClass('pkt_ext_container_inactive');
                    self.preventCloseTimerCancel = false;
                }
            }, settime);
        };
        this.stopCloseTimer = function() {
            if (self.preventCloseTimerCancel) {
                return;
            }
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
        this.showStateSaved = function() {
            if (self.active) {
                self.delayedStateSaved = true;
                return;
            }
            self.urlToSave = window.___PKT__URL_TO_SAVE;
            $('.pkt_ext_container').addClass('pkt_ext_container_detailactive');

            self.fillUserTags();
            if (self.suggestedTagsLoaded) {
                self.startCloseTimer();
            }
            else {
                self.fillSuggestedTags();
            }
        };
        this.showStateLoading = function() {
            // reset window settings
            this.wrapper.find('.pkt_ext_detail h2').text(this.translations.pageSaved);
            this.wrapper.find('.pkt_ext_btn').addClass('pkt_ext_btn_disabled');
            var suggesteddetail = this.wrapper.find('.pkt_ext_suggestedtag_detail');
            if (suggesteddetail.length) {
                var msg = suggesteddetail.find('.suggestedtag_msg');
                if (msg.length) {
                    msg.remove();
                }
                suggesteddetail.find('ul').html('');
                suggesteddetail.addClass('pkt_ext_suggestedtag_detail_loading');
            }
            this.wrapper.find('.pkt_ext_edit_msg').removeClass('pkt_ext_edit_msg_error pkt_ext_edit_msg_active').text('');
            this.wrapper.find('.pkt_ext_tag_input').tokenInput('clear');
            this.suggestedTagsLoaded = false;
            this.cxt_suggested_available = 0;
            this.cxt_entered = 0;
            this.cxt_suggested = 0;
            this.cxt_removed = 0;
            this.enableInput();

            // set base class
            var baseclasslist = 'pkt_ext_container pkt_ext_container_active';
            if (this.wrapper.hasClass('pkt_ext_container_flexbox')) {
                baseclasslist += ' pkt_ext_container_flexbox';
            }
            this.wrapper.attr('class',baseclasslist);

        };
        this.showStateFinalMsg = function(msg) {
            this.wrapper.find('.pkt_ext_finalstatedetail').one('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd',function(e)
            {
                $(this).off('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd');
                self.preventCloseTimerCancel = true;
                self.startCloseTimer(self.autocloseTimingFinalState);
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
        this.closePopup = function() {
            self.stopCloseTimer();
            $('.pkt_ext_container').addClass('pkt_ext_container_inactive');
        };
    };

    PKT_BM_OVERLAY.prototype = {
        create : function() {
            if (this.active)
            {
                return;
            }
            this.active = true;
            var self = this;

            // kill any running timers
            self.preventCloseTimerCancel = false;
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
                    var containerbaseclass = 'pkt_ext_container';
                    if (supportsFlexbox()) {
                        containerbaseclass = 'pkt_ext_container pkt_ext_container_flexbox';
                    }
                    container = document.createElement('div');

                    container.className = containerbaseclass;
                    container.setAttribute('aria-live','polite');
                    var openpocketsuffix = '?save_cnt=multi';
                    if (typeof self.saveCount == 'string' && self.saveCount == '1')
                    {
                        openpocketsuffix = '?save_cnt=1';
                    }
                    var extcontainerdetail = '\
                    <div class="pkt_ext_initload">\
                        <div class="pkt_ext_loadingspinner"><div></div></div>\
                    </div>\
                    <div class="pkt_ext_finalstatedetail">\
                        <h2></h2>\
                    </div>\
                    <div class="pkt_ext_detail">\
                        <a title="' + self.translations.close + '" class="pkt_ext_close" href="#">' + self.translations.close + '</a>\
                        <h2>' + self.translations.pageSaved + '</h2>\
                        <nav class="pkt_ext_item_actions pkt_ext_cf">\
                            <ul>\
                                <li><a class="pkt_ext_openpocket" href="http://getpocket.com/a' + openpocketsuffix + '" target="_blank">' + self.translations.openPocket + '</a></li>\
                                <li class="pkt_ext_actions_separator"></li>\
                                <li><a class="pkt_ext_removeitem" href="#">' + self.translations.removePage + '</a></li>\
                            </ul>\
                        </nav>\
                        <p class="pkt_ext_edit_msg"></p>\
                        <ul class="pkt_ext_rainbow_separator pkt_ext_cf">\
                            <li class="pkt_ext_color_1"></li>\
                            <li class="pkt_ext_color_2"></li>\
                            <li class="pkt_ext_color_3"></li>\
                            <li class="pkt_ext_color_4"></li>\
                        </ul>\
                        <div class="pkt_ext_tag_detail pkt_ext_cf">\
                            <div class="pkt_ext_tag_input_wrapper">\
                                <div class="pkt_ext_tag_input_blocker"></div>\
                                <input class="pkt_ext_tag_input" type="text" placeholder="' + self.translations.addTags + '">\
                            </div>\
                            <a href="#" class="pkt_ext_btn pkt_ext_btn_disabled">' + self.translations.save + '</a>\
                        </div>';
                    // Determine if user is as premium user or not, add suggested tags accordingly
                    if (self.premiumStatus) {

                        extcontainerdetail += '\
                            <div class="pkt_ext_suggestedtag_detail pkt_ext_suggestedtag_detail_loading">\
                                <h4>' + self.translations.suggestedTags + '</h4>\
                                <div class="pkt_ext_loadingspinner"><div></div></div>\
                                <ul class="pkt_ext_cf">\
                                </ul>\
                            </div>';
                    }
                    extcontainerdetail += '\
                    </div>';
                    container.innerHTML = extcontainerdetail;
                    body.appendChild(container);
                    // Determine if user should see the premium upsell
                    if (!self.premiumStatus && self.premiumUpsell) {
                        $('.pkt_ext_tag_detail').after('<div class="pkt_ext_premupsell"><h4>' + self.translations.premiumUpsellHeader + '</h4><p><a href="https://getpocket.com/premium/?prt=ifT0Oyt6myb0Da&s=extupsell" target="_blank">' + self.translations.premiumUpsellLink + '</a></p></div>');
                    }
                    self.wrapper = $('.pkt_ext_container');
                    self.initTagInput();
                    self.initAddTagInput();
                    self.initRemovePageInput();
                    self.initCloseWindowInput();
                    self.initAutoCloseEvents();
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
        if(!window.thePKT_BM){
            var thePKT_BM = new PKT_BM();
            window.thePKT_BM = thePKT_BM;
            thePKT_BM.init();
        }

        window.thePKT_BM.save();
    });
}
void(0);
//}catch(e){alert(e);}
