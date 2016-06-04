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

#include <bluetooth.h>


#include "Launcher.h"
#include "MenuList.h"
#include "BluetoothManager.h"
#include "Notice.h"
#include "Sender.h"
#include "log.h"

static void _win_delete_request_cb(void *data, Evas_Object *obj, void *event_info)
{
	ui_app_exit();
}

HAPI void app_resource_get(const char *edj_file_in, char *edj_path_out, int edj_path_max)
{
	char *res_path = app_get_resource_path();
	if (res_path) {
		snprintf(edj_path_out, edj_path_max, "%s%s", res_path, edj_file_in);
		free(res_path);
	}
}

static void _destroy_base_gui(appdata_s *ad)
{
	ret_if(!ad);

	evas_object_del(ad->navi);
	evas_object_del(ad->layout);
	evas_object_del(ad->conform);
	evas_object_del(ad->win);
}

static void _create_base_gui(appdata_s *ad)
{
	Evas_Object *genlist = NULL;
	int x = 0, y = 0, w = 0, h = 0;

	ad->socket_fd = -1;
	ad->server_socket_fd = -1;
	ad->role = BT_SOCKET_UNKNOWN;

	/* Window */
	ad->win = elm_win_util_standard_add(PACKAGE, PACKAGE);
	elm_win_conformant_set(ad->win, EINA_TRUE);
	elm_win_autodel_set(ad->win, EINA_TRUE);

	if (elm_win_wm_rotation_supported_get(ad->win)) {
		int rots[4] = { 0, 90, 180, 270 };
		elm_win_wm_rotation_available_rotations_set(ad->win, (const int *) (&rots), 4);
	}

	elm_win_screen_size_get(ad->win, &x, &y, &w, &h);
	_D("window size : %dx%d(%d, %d)", w, h, x, y);
	ad->win_w = w;
	ad->win_h = h;

	evas_object_smart_callback_add(ad->win, "delete,request", _win_delete_request_cb, NULL);

	/* Conformant */
	ad->conform = elm_conformant_add(ad->win);
	goto_if(!ad->conform, ERROR);
	evas_object_size_hint_weight_set(ad->conform, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	elm_win_resize_object_add(ad->win, ad->conform);
	evas_object_show(ad->conform);

	/* Eext Circle Surface Creation */
	ad->circle_surface = eext_circle_surface_conformant_add(ad->conform);

	/* Base Layout */
	ad->layout = elm_layout_add(ad->conform);
	evas_object_size_hint_weight_set(ad->layout, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	elm_layout_theme_set(ad->layout, "layout", "application", "default");
	evas_object_show(ad->layout);

	elm_object_content_set(ad->conform, ad->layout);

	/* Naviframe */
	ad->navi = elm_naviframe_add(ad->layout);
	goto_if(!ad->navi, ERROR);
	elm_object_part_content_set(ad->layout, "elm.swallow.content", ad->navi);
	eext_object_event_callback_add(ad->navi, EEXT_CALLBACK_BACK, eext_naviframe_back_cb, NULL);
	eext_object_event_callback_add(ad->navi, EEXT_CALLBACK_MORE, eext_naviframe_more_cb, NULL);
	evas_object_show(ad->navi);

	create_list_view(ad);

	/* Show window after base gui is set up */
	evas_object_show(ad->win);

	return;

ERROR:
	_E("Failed to create base GUI");

	if (genlist) {
		evas_object_del(genlist);
		genlist = NULL;
	}

	return;
}

static bool _app_create(void *data)
{
	/* Hook to take necessary actions before main event loop starts
	   Initialize UI resources and application's data
	   If this function returns true, the main loop of application starts
	   If this function returns false, the application is terminated */
	appdata_s *ad = (appdata_s *) data;
	retv_if(!ad, false);

	_create_base_gui(ad);

	return true;
}

static void _app_control(app_control_h app_control, void *data)
{
	/* Handle the launch request. */
}

static void _app_pause(void *data)
{
	/* Take necessary actions when application becomes invisible. */
}

static void _app_resume(void *data)
{
	_D("RESUMED AND BT_MGR_RELEASE");
	bt_mgr_release();
}

static void _app_terminate(void *data)
{
	/* Release all resources. */
	appdata_s *ad = (appdata_s *) data;
	int ret;

	ret_if(!ad);

	_D("APP TERMINATED");
	if (ad->socket_fd != -1) {
		ret = bt_socket_disconnect_rfcomm(ad->socket_fd);
		if (ret != BT_ERROR_NONE) {
			_E("[bt_socket_disconnect_rfcomm] Failed");
		} else {
			ad->socket_fd = -1;
		}
	}
	if (ad->server_socket_fd != -1) {
		ret = bt_socket_destroy_rfcomm(ad->server_socket_fd);
		if (ret != BT_ERROR_NONE) {
			_E("[bt_socket_destroy_rfcomm] Failed");
		} else {
			ad->server_socket_fd = -1;
		}
	}
	bt_mgr_release();

	_destroy_base_gui(ad);
}

static void _ui_app_lang_changed(app_event_info_h event_info, void *user_data)
{
	/* APP_EVENT_LANGUAGE_CHANGED */
	char *locale = NULL;
	system_settings_get_value_string(SYSTEM_SETTINGS_KEY_LOCALE_LANGUAGE, &locale);

	if (locale) {
		elm_language_set(locale);
		free(locale);
	}

	return;
}

static void _ui_app_orient_changed(app_event_info_h event_info, void *user_data)
{
	/* APP_EVENT_DEVICE_ORIENTATION_CHANGED */
	return;
}

static void _ui_app_region_changed(app_event_info_h event_info, void *user_data)
{
	/* APP_EVENT_REGION_FORMAT_CHANGED */
}

static void _ui_app_low_battery(app_event_info_h event_info, void *user_data)
{
	/* APP_EVENT_LOW_BATTERY */
}

static void _ui_app_low_memory(app_event_info_h event_info, void *user_data)
{
	/* APP_EVENT_LOW_MEMORY */
}

int main(int argc, char *argv[])
{
	appdata_s ad = { 0, };
	int ret = 0;

	ui_app_lifecycle_callback_s event_callback = { 0, };
	app_event_handler_h handlers[5] = { NULL, };

	event_callback.create = _app_create;
	event_callback.terminate = _app_terminate;
	event_callback.pause = _app_pause;
	event_callback.resume = _app_resume;
	event_callback.app_control = _app_control;

	ui_app_add_event_handler(&handlers[APP_EVENT_LOW_BATTERY], APP_EVENT_LOW_BATTERY, _ui_app_low_battery, &ad);
	ui_app_add_event_handler(&handlers[APP_EVENT_LOW_MEMORY], APP_EVENT_LOW_MEMORY, _ui_app_low_memory, &ad);
	ui_app_add_event_handler(&handlers[APP_EVENT_DEVICE_ORIENTATION_CHANGED], APP_EVENT_DEVICE_ORIENTATION_CHANGED, _ui_app_orient_changed, &ad);
	ui_app_add_event_handler(&handlers[APP_EVENT_LANGUAGE_CHANGED], APP_EVENT_LANGUAGE_CHANGED, _ui_app_lang_changed, &ad);
	ui_app_add_event_handler(&handlers[APP_EVENT_REGION_FORMAT_CHANGED], APP_EVENT_REGION_FORMAT_CHANGED, _ui_app_region_changed, &ad);
	ui_app_remove_event_handler(handlers[APP_EVENT_LOW_MEMORY]);

	ret = ui_app_main(argc, argv, &event_callback, &ad);
	if (ret != APP_ERROR_NONE) {
		_E("ui_app_main() is failed. err = %d", ret);
	}

	return ret;
}
