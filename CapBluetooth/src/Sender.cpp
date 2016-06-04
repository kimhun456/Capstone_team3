/*
 * Samsung API
 * Copyright (c) 2009-2015 Samsung Electronics Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/license/
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


#include "Launcher.h"
#include "BluetoothManager.h"
#include "Notice.h"
#include "MenuList.h"


#define BUBBLE_TEXT_WIDTH 200
#define BUBBLE_MAIN_TEXT_STYLE "<font_size=30>%s</font_size>"
#define BUBBLE_SUB_TEXT_STYLE "<font_size=20 font_weight=Bold color=#454545>%s</font_size>"


Eina_Bool _rotary_handler_cb(void *data, Eext_Rotary_Event_Info *ev);

typedef enum _Message_Bubble_Style {
	MESSAGE_BUBBLE_NONE = 0,
	MESSAGE_BUBBLE_SENT,
	MESSAGE_BUBBLE_RECEIVE,
	MESSAGE_BUBBLE_LAST
} Message_Bubble_Style;

static struct _s_info {
	Evas_Object *main_box;
	Evas_Object *bubble_scroller;
	Evas_Object *bubble_box;
	Evas_Object *input_field_entry;
} s_info = {
	.main_box = NULL,
	.bubble_scroller = NULL,
	.bubble_box = NULL,
	.input_field_entry = NULL,
};



static void _bubble_button_mouse_down_cb(void *data, Evas *e, Evas_Object *obj, void *event_info)
{
	Evas_Object *bg = (Evas_Object *) data;
	int r = 0, g = 0, b = 0, a = 0;

	if (!bg) {
		_E("bg is NULL");
		return;
	}

	evas_object_color_get(bg, &r, &g, &b, &a);
	r *= 0.8;
	g *= 0.8;
	b *= 0.8;

	evas_object_color_set(bg, r, g, b, a);
}

static void _bubble_button_mouse_up_cb(void *data, Evas *e, Evas_Object *obj, void *event_info)
{
	Evas_Object *bg = (Evas_Object *) data;
	int r = 0, g = 0, b = 0, a = 0;

	ret_if(!bg);

	evas_object_color_get(bg, &r, &g, &b, &a);
	r *= 1.25;
	g *= 1.25;
	b *= 1.25;

	evas_object_color_set(bg, r, g, b, a);
}

static Evas_Object *_bubble_table_create(Evas_Object *parent, Message_Bubble_Style style, const char *main_text, const char *sub_text)
{
	Evas_Object *bubble_table = NULL;
	Evas_Object *button = NULL;
	Evas_Object *bg = NULL;
	Evas_Object *main_label = NULL;
	Evas_Object *sub_label = NULL;
	Eina_Strbuf *strbuf = NULL;
	char *buf = NULL;

	bubble_table = elm_table_add(parent);
	goto_if(!bubble_table, ERROR);
	evas_object_size_hint_weight_set(bubble_table, EVAS_HINT_EXPAND, 0.0);
	elm_table_padding_set(bubble_table, ELM_SCALE_SIZE(1), ELM_SCALE_SIZE(1));
	evas_object_show(bubble_table);

	button = elm_button_add(bubble_table);
	goto_if(!button, ERROR);
	elm_object_style_set(button, "transparent");
	evas_object_size_hint_weight_set(button, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	evas_object_size_hint_align_set(button, EVAS_HINT_FILL, EVAS_HINT_FILL);

	bg = evas_object_rectangle_add(evas_object_evas_get(button));
	goto_if(!bg, ERROR);
	elm_object_content_set(button, bg);
	evas_object_event_callback_add(button, EVAS_CALLBACK_MOUSE_DOWN, _bubble_button_mouse_down_cb, bg);
	evas_object_event_callback_add(button, EVAS_CALLBACK_MOUSE_UP, _bubble_button_mouse_up_cb, bg);
	evas_object_show(button);

	/* Prepare string buffer for making mark up text */
	strbuf = eina_strbuf_new();
	goto_if(!strbuf, ERROR);
	/* Make a mark up text to string buffer for main label widget */
	eina_strbuf_append_printf(strbuf, BUBBLE_MAIN_TEXT_STYLE, main_text);
	/* Get the string from string buffer. String buffer will be empty. */
	buf = eina_strbuf_string_steal(strbuf);

	main_label = elm_label_add(bubble_table);
	goto_if(!main_label, ERROR);
	elm_object_text_set(main_label, buf);
	elm_label_wrap_width_set(main_label, ELM_SCALE_SIZE(BUBBLE_TEXT_WIDTH));
	elm_label_line_wrap_set(main_label, ELM_WRAP_MIXED);
	evas_object_size_hint_weight_set(main_label, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	evas_object_size_hint_align_set(main_label, EVAS_HINT_FILL, EVAS_HINT_FILL);
	evas_object_repeat_events_set(main_label, EINA_TRUE);
	evas_object_show(main_label);

	/* Make a mark up text to string buffer for sub label widget */
	eina_strbuf_append_printf(strbuf, BUBBLE_SUB_TEXT_STYLE, sub_text);
	/* Get the string from string buffer. String buffer will be empty. */
	buf = eina_strbuf_string_steal(strbuf);
	/* Free string buffer */
	eina_strbuf_free(strbuf);

	sub_label = elm_label_add(bubble_table);
	goto_if(!sub_label, ERROR);
	elm_object_text_set(sub_label, buf);
	evas_object_size_hint_weight_set(sub_label, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	evas_object_repeat_events_set(sub_label, EINA_TRUE);
	evas_object_show(sub_label);

	switch (style) {
	case MESSAGE_BUBBLE_SENT:
		evas_object_size_hint_align_set(bubble_table, 1.0, 0.0);
		evas_object_size_hint_align_set(sub_label, 1.0, EVAS_HINT_FILL);
		evas_object_color_set(bg, 200, 170, 100, 255);
		elm_table_pack(bubble_table, button, 0, 0, 1, 2);
		elm_table_pack(bubble_table, main_label, 0, 0, 1, 1);
		elm_table_pack(bubble_table, sub_label, 0, 1, 1, 1);
		break;
	case MESSAGE_BUBBLE_RECEIVE:
		evas_object_size_hint_align_set(bubble_table, 0.0, 0.0);
		evas_object_size_hint_align_set(sub_label, 0.0, EVAS_HINT_FILL);
		evas_object_color_set(bg, 100, 170, 200, 255);
		elm_table_pack(bubble_table, button, 0, 0, 1, 2);
		elm_table_pack(bubble_table, main_label, 0, 0, 1, 1);
		elm_table_pack(bubble_table, sub_label, 0, 1, 1, 1);
		break;
	case MESSAGE_BUBBLE_NONE:
	case MESSAGE_BUBBLE_LAST:
	default:
		break;
	}

	return bubble_table;

ERROR:
	if (bubble_table) {
		evas_object_del(bubble_table);
		bubble_table = NULL;
	}

	if (button) {
		evas_object_del(button);
		button = NULL;
	}

	if (bg) {
		evas_object_del(bg);
		bg = NULL;
	}

	if (main_label) {
		evas_object_del(main_label);
		main_label = NULL;
	}

	if (sub_label) {
		evas_object_del(sub_label);
		sub_label = NULL;
	}

	if (strbuf) {
		eina_strbuf_free(strbuf);
		strbuf = NULL;
	}

	return NULL;
}

static char *_current_time_get(void)
{
	Eina_Strbuf *strbuf = eina_strbuf_new();

	time_t local_time = time(NULL);
	struct tm *time_info = localtime(&local_time);

	char buf[200] = { 0 };
	char *ret = NULL;

	retv_if(!strbuf, NULL);

	strftime(buf, 200, "%l:%M", time_info);
	eina_strbuf_append_printf(strbuf, "%s %s", buf, (time_info->tm_hour >= 12) ? "PM" : "AM");
	ret = eina_strbuf_string_steal(strbuf);
	eina_strbuf_free(strbuf);

	return ret;
}

static void _bubble_box_resize_cb(void *data, Evas *e, Evas_Object *obj, void *event_info)
{
	Evas_Coord w = 0, h = 0;

	ret_if(!s_info.bubble_scroller);
	ret_if(!s_info.bubble_box);

	elm_scroller_child_size_get(s_info.bubble_scroller, &w, &h);
	elm_scroller_region_show(s_info.bubble_scroller, 0, h, 0, 0);
	evas_object_event_callback_del(s_info.bubble_box, EVAS_CALLBACK_RESIZE, _bubble_box_resize_cb);
}

static void _next_message_send(appdata_s *ad)
{

	Evas_Object *noti = NULL;
	int ret = 0;

	ret_if(!ad);

	char message[100] = "next";

	ret = bt_socket_send_data(ad->socket_fd, message, strlen(message) + 1);
	if (ret == -1) {
		_E("[bt_socket_send_data] send to fail : %s", message);
		noti = bt_noti_popup_create(ad->navi, "Send Failed");
		if (!noti) {
			_E("Failed to create popup noti");
		}
	} else {



	}
}

static void _prev_message_send(appdata_s *ad)
{

	Evas_Object *noti = NULL;
	int ret = 0;

	ret_if(!ad);

	char message[100] = "prev";

	ret = bt_socket_send_data(ad->socket_fd, message, strlen(message) + 1);
	if (ret == -1) {
		_E("[bt_socket_send_data] send to fail : %s", message);
		noti = bt_noti_popup_create(ad->navi, "Send Failed");
		if (!noti) {
			_E("Failed to create popup noti");
		}
	} else {



	}
}


Eina_Bool _rotary_handler_cb(void *data, Eext_Rotary_Event_Info *ev)
{
	appdata_s * ad = (appdata_s *) data;
   if (ev->direction == EEXT_ROTARY_DIRECTION_CLOCKWISE)
   {
	   _next_message_send(ad);
   }
   else
   {
	   _prev_message_send(ad);
   }

   return EINA_FALSE;
}




static void _send_button_clicked_cb(void *data, Evas_Object *obj, void *event_info)
{
	appdata_s *ad = (appdata_s *) data;
	ret_if(!ad);

	_next_message_send(ad);
}

static Evas_Object *_main_view_create(appdata_s *ad)
{
	Evas_Object *layout = NULL;
	Evas_Object *input_field = NULL;
	Evas_Object *btn_send = NULL;
	char edj_path[PATH_MAX] = { 0, };

	retv_if(!ad, NULL);

	layout = elm_layout_add(ad->navi);
	goto_if(!layout, ERROR);
	app_resource_get(EDJ_FILE, edj_path, (int) PATH_MAX);
	elm_layout_file_set(layout, edj_path, "chat_room");
	evas_object_size_hint_weight_set(layout, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	evas_object_size_hint_align_set(layout, EVAS_HINT_FILL, EVAS_HINT_FILL);
	evas_object_show(layout);

	s_info.bubble_scroller = elm_scroller_add(layout);
	goto_if(!s_info.bubble_scroller, ERROR);
	elm_scroller_bounce_set(s_info.bubble_scroller, EINA_FALSE, EINA_TRUE);
	evas_object_size_hint_weight_set(s_info.bubble_scroller, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	evas_object_size_hint_align_set(s_info.bubble_scroller, EVAS_HINT_FILL, EVAS_HINT_FILL);
	evas_object_show(s_info.bubble_scroller);

	s_info.bubble_box = elm_box_add(s_info.bubble_scroller);
	goto_if(!s_info.bubble_box, ERROR);
	elm_box_align_set(s_info.bubble_box, 0, 0);
	evas_object_size_hint_weight_set(s_info.bubble_box, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	evas_object_size_hint_align_set(s_info.bubble_box, EVAS_HINT_FILL, EVAS_HINT_FILL);
	evas_object_show(s_info.bubble_box);
	elm_box_padding_set(s_info.bubble_box, ELM_SCALE_SIZE(10), ELM_SCALE_SIZE(15));
	elm_object_content_set(s_info.bubble_scroller, s_info.bubble_box);

	elm_object_part_content_set(layout, "sw.scroller", s_info.bubble_scroller);

	s_info.input_field_entry = elm_entry_add(layout);
	goto_if(!s_info.input_field_entry, ERROR);
	elm_object_part_text_set(s_info.input_field_entry, "elm.guide", "Enter Message");
	evas_object_size_hint_weight_set(s_info.input_field_entry, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	evas_object_size_hint_align_set(s_info.input_field_entry, EVAS_HINT_FILL, EVAS_HINT_FILL);
	evas_object_show(s_info.input_field_entry);
	elm_object_part_content_set(layout, "sw.entry", s_info.input_field_entry);

	btn_send = elm_button_add(layout);
	goto_if(!btn_send, ERROR);
	evas_object_size_hint_weight_set(btn_send, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	evas_object_size_hint_align_set(btn_send, EVAS_HINT_FILL, EVAS_HINT_FILL);
	elm_object_text_set(btn_send, "SEND");
	evas_object_smart_callback_add(btn_send, "clicked", _send_button_clicked_cb, ad);
	evas_object_show(btn_send);
	elm_object_part_content_set(layout, "sw.btn.send", btn_send);

	return layout;

ERROR:
	if (layout) {
		evas_object_del(layout);
		layout = NULL;
	}

	if (input_field) {
		evas_object_del(input_field);
		input_field = NULL;
	}

	return NULL;
}

static void _on_main_scroller_del_cb(void *data, Evas *e, Evas_Object *obj, void *event_info)
{
	if (s_info.main_box) {
		evas_object_del(s_info.main_box);
		s_info.main_box = NULL;
	}

	if (s_info.bubble_scroller) {
		evas_object_del(s_info.bubble_scroller);
		s_info.bubble_scroller = NULL;
	}

	if (s_info.bubble_box) {
		evas_object_del(s_info.bubble_box);
		s_info.bubble_box = NULL;
	}

	if (s_info.input_field_entry) {
		evas_object_del(s_info.input_field_entry);
		s_info.input_field_entry = NULL;
	}
}

static void _socket_conn_state_changed_cb(int result, bt_socket_connection_state_e connection_state, bt_socket_connection_s *connection, void *user_data)
{
	Evas_Object *noti = NULL;
	appdata_s *ad = NULL;

	ad = (appdata_s *) user_data;
	ret_if(!ad);
	ret_if(result != BT_ERROR_NONE);

	_D("[_socket_conn_state_changed_cb] Changed");

	//disconnect된다면
	if (connection_state == BT_SOCKET_DISCONNECTED) {
		_I("[_socket_conn_state_changed_cb] Disconnected");
		ad->socket_fd = -1;
		eext_rotary_event_handler_del(_rotary_handler_cb);
		noti = bt_noti_popup_create(ad->navi, "Disconnected with the Friend");
		if (!noti) {
			_E("Failed to create popup noti");
		}
	}
}

static void _socket_data_received_cb(bt_socket_received_data_s *data, void *user_data)
{
	Evas_Object *bubble_table = NULL;
	char *message = NULL;

	ret_if(!data);

	message = strndup(data->data, data->data_size);
	goto_if(!message, ERROR);

	bubble_table = _bubble_table_create(s_info.bubble_box, MESSAGE_BUBBLE_RECEIVE, message, _current_time_get());
	goto_if(!bubble_table, ERROR);

	evas_object_show(bubble_table);
	elm_box_pack_end(s_info.bubble_box, bubble_table);

	evas_object_event_callback_add(s_info.bubble_box, EVAS_CALLBACK_RESIZE, _bubble_box_resize_cb, NULL);

	free(message);

	return;

ERROR:
	if (bubble_table) {
		evas_object_del(bubble_table);
		bubble_table = NULL;
	}

	if (message) {
		free(message);
		message = NULL;
	}

	return;
}


static void _my_socket_data_received_cb(bt_socket_received_data_s *data, void *user_data){

}

// 버튼이 클릭되었을 때
static void
btn_clicked_cb(void *data, Evas_Object *obj, void *event_info)
{

	appdata_s * ad = (appdata_s *) data;


	_next_message_send(ad);

}

// 채팅룸을 만드는 건데 이제 여기를 내가 원하는 레이아웃으로 바꿔야한다.
HAPI void
bt_chat_room_layout_create(appdata_s *ad)
{
	Evas_Object *main_scroller = NULL;
	Elm_Object_Item *navi_it = NULL;
	int ret = -1;

	bt_socket_set_data_received_cb(_socket_data_received_cb, NULL);

	ret = bt_socket_unset_connection_state_changed_cb();
	ret_if(ret != BT_ERROR_NONE);

	ret = bt_socket_set_connection_state_changed_cb(_socket_conn_state_changed_cb, ad);
	ret_if(ret != BT_ERROR_NONE);

	main_scroller = _main_view_create(ad);
	ret_if(!main_scroller);

	evas_object_event_callback_add(main_scroller, EVAS_CALLBACK_DEL, _on_main_scroller_del_cb, NULL);
	navi_it = elm_naviframe_item_push(ad->navi, "Chatting", NULL, NULL, main_scroller, NULL);
	elm_naviframe_item_title_enabled_set(navi_it, EINA_FALSE, EINA_FALSE);
}

Eina_Bool
time_tic_toc(void *data){

	appdata_s *ad = (appdata_s *) data;


	elm_object_text_set(ad->time, "<align=center><font_size=80>00:10</font_size></align>");
	ad->milliseconds +=50;


	return EINA_TRUE;

}


void
add_timer(appdata_s *ad){

	ad->milliseconds = 0;
	ad->timer =  ecore_timer_add(0.1, time_tic_toc, ad);
	elm_object_text_set(ad->time, "<align=center><font_size=80>00:00</font_size></align>");
	evas_object_show(ad->time);

}


// 채팅룸 대신에 버튼 하나만 있는 것을 만들어 보쟈!
HAPI void
bt_button_layout_create(appdata_s *ad)
{
	Evas_Object *nv = ad->navi;
	Evas_Object *button, *layout;

	int ret = 0;
	bt_socket_set_data_received_cb(_my_socket_data_received_cb, NULL);

	eext_rotary_event_handler_add(_rotary_handler_cb, ad);

	ret = bt_socket_unset_connection_state_changed_cb();
	ret_if(ret != BT_ERROR_NONE);

	// 소켓의 상태가 바뀌면
	ret = bt_socket_set_connection_state_changed_cb(_socket_conn_state_changed_cb, ad);
	ret_if(ret != BT_ERROR_NONE);

	layout = elm_layout_add(nv);
	elm_layout_theme_set(layout, "layout", "bottom_button", "default");
	evas_object_show(layout);

	ad->time = elm_label_add(layout);
	evas_object_size_hint_weight_set(ad->time, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	elm_object_text_set(ad->time, "Set Time");
	evas_object_show(ad->time);
	elm_object_part_content_set(layout, "elm.swallow.content",ad->time);


	// 여기 수정 nv -> layout
	button = elm_button_add(layout);
	elm_object_style_set(button, "bottom");
	elm_object_text_set(button, "Next");
	elm_object_part_content_set(layout, "elm.swallow.button", button);
	evas_object_smart_callback_add(button, "clicked", btn_clicked_cb, ad);
	evas_object_show(button);

	elm_naviframe_item_push(nv, "Presentor", NULL, NULL, layout, NULL);

	add_timer(ad);

}
