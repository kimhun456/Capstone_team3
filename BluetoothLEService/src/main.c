/*
 * Copyright (c) 2016 Samsung Electronics Co., Ltd. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include <service_app.h>
#include <system_settings.h>
#include <Elementary.h>
#include "bluetoothleservice.h"
#include "data.h"
#include "bt/bt_common.h"
#include "hrs/hrs_listener.h"

#define HEART_RATE_SENSOR_READ_INTERVAL 1000

static bool __bt_init(void);
static void __bt_device_state_changed_cb(int result, bt_adapter_state_e adapter_state, void *user_data);
static void __hrs_data_read_cb(float *data, int data_count);

/*
 * @brief: Hook to take necessary actions before main event loop starts
 * Initialize resources and service's data
 * If this function returns true, the main loop of service starts
 * If this function returns false, the service is terminated
 */
static bool app_create(void *user_data)
{
	if (!bt_common_is_bluetooth_supported())
		dlog_print(DLOG_ERROR, LOG_TAG, "Bluetooth is not supported.");

	if (!bt_common_is_bluetooth_le_supported())
		dlog_print(DLOG_ERROR, LOG_TAG, "Bluetooth Low Energy is not supported.");

	if (!hrs_listener_create(HEART_RATE_SENSOR_READ_INTERVAL, __hrs_data_read_cb))
		dlog_print(DLOG_ERROR, LOG_TAG, "Cannot crate the Heart Rate Sensor listener.");

	if (!__bt_init())
		dlog_print(DLOG_ERROR, LOG_TAG, "Bluetooth activation error.");

	return true;
}

/*
 * @brief: This callback function is called when another application
 * sends the launch request to the application
 */
static void app_control(app_control_h app_control, void *user_data)
{
	/* Handle the launch request. */
}

/*
 * @brief: This callback function is called once after the main loop of the service exits
 */
static void app_terminate(void *user_data)
{
	hrs_listener_delete();

	data_finalize();
	dlog_print(DLOG_WARN, LOG_TAG, "Heart Rate Measurement advertiser stopped.");

	bt_common_unset_state_change_callback();
	bt_common_finalize();
}

/*
 * @brief: This function will be called when the language is changed
 */
static void ui_app_lang_changed(app_event_info_h event_info, void *user_data)
{
	/*APP_EVENT_LANGUAGE_CHANGED*/
	char *locale = NULL;

	system_settings_get_value_string(SYSTEM_SETTINGS_KEY_LOCALE_LANGUAGE, &locale);

	if (locale != NULL) {
		elm_language_set(locale);
		free(locale);
	}
	return;
}

/*
 * @brief: Main function of the service
 */
int main(int argc, char *argv[])
{
	int ret;

	service_app_lifecycle_callback_s event_callback = {0, };
	app_event_handler_h handlers[5] = {NULL, };

	event_callback.create = app_create;
	event_callback.terminate = app_terminate;
	event_callback.app_control = app_control;

	/*
	 * If you want to handling more events,
	 * Please check the service's lifecycle guide.
	 */
	service_app_add_event_handler(&handlers[APP_EVENT_LANGUAGE_CHANGED], APP_EVENT_LANGUAGE_CHANGED, ui_app_lang_changed, NULL);

	ret = service_app_main(argc, argv, &event_callback, NULL);
	if (ret != APP_ERROR_NONE)
		dlog_print(DLOG_ERROR, LOG_TAG, "service_app_main() is failed. err = %d", ret);

	return ret;
}

/*
 * @brief: Initialization of Bluetooth adapter and its advertiser.
 * @return: Function returns 'true' if the Bluetooth adapter and its advertiser
 * is successfully initialized, otherwise 'false' is returned.
 */
static bool __bt_init(void)
{
	bool is_enabled = false;

	if (bt_common_initialize()) {
		bt_common_set_state_change_callback(__bt_device_state_changed_cb);

		bt_common_get_state(&is_enabled);
		data_change_advertiser_state(is_enabled);
	}

	return is_enabled;
}

/*
 * @brief: The callback function invoked whenever the state of the Bluetooth adapter is changed.
 * This callback function is attached with the bt_common_set_state_change_callback() function.
 */
static void __bt_device_state_changed_cb(int result, bt_adapter_state_e adapter_state, void *user_data)
{
	data_change_advertiser_state(adapter_state == BT_ADAPTER_ENABLED);
}

/*
 * @brief: The callback function invoked whenever the data from Heart Rate Sensor is received.
 * This callback function is attached via the hrs_listener_create() function.
 */
static void __hrs_data_read_cb(float *data, int data_count)
{
	data_pack(data, HRS_SL_WRIST);
}
