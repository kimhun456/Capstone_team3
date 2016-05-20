(function()
   {
      var SCROLL_STEP = 50; /* Distance of moving scroll for each rotary event */
	  var page = document.getElementById("main"); /* Query with page ID */

      page.addEventListener("popupshow", function popupOpenHandler(e)
      {
         var popup = e.target; /* Popup element */
        var scroller = popup.querySelector(".ui-popup-wrapper"); /* Element that has scroll */

             /* Rotary event handler */
        var rotaryEventHandler = function(e)
             {
                if (e.detail.direction === "CW")
                /* Right direction */
                {
                   scroller.scrollTop += SCROLL_STEP;
                }
                else if (e.detail.direction === "CCW")
                /* Left direction */
                {
                   scroller.scrollTop -= SCROLL_STEP;
                }
             };

         /* Register the rotary event */
         document.addEventListener("rotarydetent", rotaryEventHandler, false);

         /* Unregister the rotary event */
         popup.addEventListener("popuphide", function popupHideHandler()
         {
            popup.removeEventListener("popuphide", popupHideHandler, false);
            document.removeEventListener("rotarydetent", rotaryEventHandler, false);
         }, false);
      }, false);


	  // main page scroll
      page.addEventListener("pagebeforeshow", function pageScrollHandler(e)
      {
         var page = e.target;
         var elScroller = page.querySelector(".ui-scroller");

         /* Rotary event handler */
         rotaryEventHandler = function(e)
         {
            if (e.detail.direction === "CW")
            /* Right direction */
            {
               elScroller.scrollTop += SCROLL_STEP;
            }
            else if (e.detail.direction === "CCW")
            /* Left direction */
            {
               elScroller.scrollTop -= SCROLL_STEP;
            }
         };

         /* Register the rotary event */
         document.addEventListener("rotarydetent", rotaryEventHandler, false);
		 
         /* Unregister the rotary event */
         page.addEventListener("pagebeforehide", function pageHideHanlder()
         {
            page.removeEventListener("pagebeforehide", pageHideHanlder, false);
            document.removeEventListener("rotarydetent", rotaryEventHandler, false);
         }, false);

      }, false);
   }());
