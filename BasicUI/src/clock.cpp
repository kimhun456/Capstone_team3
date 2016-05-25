/*
 * clock.cpp
 *
 *  Created on: May 24, 2016
 *      Author: HyunJae
 */

#include "clock.h"

using namespace std;


string
getCurrentTime(appdata_s *ad){

	string header = "<align=center>";
	string tail = "</align>";
	string millisecond = std::to_string(ad->milliseconds);

	int seconds = ad->milliseconds /100;
	int minutes = seconds/60;
	int milli = ad->milliseconds%100;
	seconds %=60;

	string min;
	string sec;
	string mil;

	if(minutes < 10){
		 min = "0" + std::to_string(minutes);
	}else{
		 min = std::to_string(minutes);
	}


	if(seconds < 10){
		sec = "0" + std::to_string(seconds);
	}else{
		sec = std::to_string(seconds);
	}

	if(milli < 10){
		mil = "0" + std::to_string(milli);
	}else{
		mil = std::to_string(milli);
	}


	string result = min +":"+sec +":" + mil;

	return result;

}

Eina_Bool
ticktock(void *data) {


	appdata_s *ad =  static_cast<appdata_s*>(data);
	ad->milliseconds +=5;

	const char * message = getCurrentTime(ad).c_str();


	/* Label */
	elm_object_text_set(ad->content, message);



    return ECORE_CALLBACK_RENEW;
 }

static Evas_Event_Flags
start_stopCB(void *data, void *event_info)
{
   appdata_s *ad =  static_cast<appdata_s*>(data);
   	if(ad->start){
   		ecore_timer_freeze(ad->timer);
   		ad->start = false;
//   		elm_object_text_set(ad->startButton, "START");
   	}else{
   		ecore_timer_thaw(ad->timer);
   		ad->start = true;
//   		elm_object_text_set(ad->startButton, "STOP");
   	}
   return EVAS_EVENT_FLAG_ON_HOLD;
}


static Evas_Event_Flags
resetCB(void *data, void *event_info)
{

	appdata_s *ad =  static_cast<appdata_s*>(data);


	ad->start = false;
	ad->milliseconds = 0;
	ecore_timer_reset(ad->timer);
	ecore_timer_freeze(ad->timer);
	elm_object_text_set(ad->content, "<align=center>00:00:00</align>");
//	elm_object_text_set(ad->startButton, "START");

   return EVAS_EVENT_FLAG_ON_HOLD;
}



void
make_clock(appdata_s *ad){
	ad->start = false;
	ad->milliseconds = 0;
	// 0.05초 마다 호출
	ad->timer  =  ecore_timer_add( 0.05, ticktock, ad);
	ecore_timer_freeze(ad->timer);

	elm_gesture_layer_cb_set(ad->gesture, ELM_GESTURE_N_LONG_TAPS, ELM_GESTURE_STATE_MOVE, resetCB, ad);
	elm_gesture_layer_cb_set(ad->gesture, ELM_GESTURE_N_TAPS, ELM_GESTURE_STATE_END, start_stopCB, ad);
//	evas_object_smart_callback_add(ad->content, "clicked", start_stopCB, ad);


}