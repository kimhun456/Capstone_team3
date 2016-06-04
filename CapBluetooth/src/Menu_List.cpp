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

#include "log.h"
#include "Launcher.h"
#include "BluetoothManager.h"
#include "Notice.h"
#include "Sender.h"
#include "MenuList.h"


static void _gestrue_cb(void *data, Evas_Object *obj, void *event_info)
{
	_D("%s", __func__);

	appdata_s *ad = (appdata_s *) data;
	ret_if(!ad);

	bt_mgr_initialize(ad, BT_MGR_SEARCH);
}

//
//// 서버 찾는
//static void _search_cb(void *data, Evas_Object *obj, void *event_info)
//{
//	_D("%s", __func__);
//
//	appdata_s *ad = (appdata_s *) data;
//	ret_if(!ad);
//
//	bt_mgr_initialize(ad, BT_MGR_SEARCH);
//}



/* 서버 기다리는 거 */
static void _wait_cb(void *data, Evas_Object *obj, void *event_info)
{
	_D("%s", __func__);

	appdata_s *ad = (appdata_s *) data;
	ret_if(!ad);

	bt_mgr_initialize(ad, BT_MGR_WAIT);
}

static void list_selected_cb(void *data, Evas_Object *obj, void *event_info)
{
	Elm_Object_Item *it = static_cast<Elm_Object_Item *>(event_info);
	elm_list_item_selected_set(it, EINA_FALSE);
}

static Eina_Bool _naviframe_pop_cb(void *data, Elm_Object_Item *it)
{
	ui_app_exit();
	return EINA_FALSE;
}

void create_list_view(appdata_s *ad)
{
	Evas_Object *list;
	Evas_Object *btn;
	Evas_Object *nf = ad->navi;
	Elm_Object_Item *nf_it;

	/* List */
	list = elm_list_add(nf);
	elm_list_mode_set(list, ELM_LIST_COMPRESS);
	evas_object_smart_callback_add(list, "selected", list_selected_cb, NULL);

	/* Main Menu Items Here */
	elm_list_item_append(list, "Wait Client", NULL, NULL, _wait_cb, ad);
	elm_list_item_append(list, "Gesture Setting", NULL, NULL, _gestrue_cb, ad);

	elm_list_go(list);

	/* This button is set for devices which doesn't have H/W back key. */
	btn = elm_button_add(nf);
	elm_object_style_set(btn, "naviframe/end_btn/default");
	nf_it = elm_naviframe_item_push(nf, "Bluetooth Chat", btn, NULL, list, NULL);
	elm_naviframe_item_pop_cb_set(nf_it, _naviframe_pop_cb, ad);
}
