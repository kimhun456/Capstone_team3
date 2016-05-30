#include <sensor.h>
#include "bluetoothleservice.h"
#include "hrs/hrs_listener.h"
#include "hrs/hrs_common.h"

struct _sensor_data {
	sensor_type_e type;
	sensor_h sensor_handle;
	sensor_listener_h listener_handle;
	sensor_data_read_cb read_cb;
};

static struct _sensor_data __sdata = {0,};

/*
 * @brief: Internal callback function invoked on sensor's data receive by the listener.
 * This callback function is attached within the hrs_listener_create() function.
 * If non-empty data set is read successfully, then the read_cb() callback function
 * attached to the hrs_listener is invoked.
 * @param[sensor]: the handle of the sensor which data is being delivered.
 * @param[event]: reference to the data delivered from the sensor.
 * @param[data]: the user data passed the callback function via the callback attach function.
 */
static void __sensor_event_cb(sensor_h sensor, sensor_event_s *event, void *data)
{
	if (!event) {
		dlog_print(DLOG_INFO, LOG_TAG, "Sensor event data is invalid.");
		return;
	}

	if (event->value_count == 0)
		return;

	if (__sdata.read_cb)
		__sdata.read_cb(event->values, event->value_count);
}

/*
 * @brief: Internal function checking whether a given type of the Heart Rate Sensor is supported.
 * @param[type]: the type of the sensor to be checked. Available types: SENSOR_HRM (common),
 * SENSOR_HRM_LED_GREEN, SENSOR_HRM_LED_IR, SENSOR_HRM_LED_RED.
 * @return: the function returns 'true' if the given sensor is supported, otherwise 'false' is returned.
 */
static bool __check_hrm_support(sensor_type_e type)
{
	bool supported = false;

	if (!hrs_common_is_supported(type, &supported))
		return false;

	if (!supported)
		return false;

	switch (type) {
	case SENSOR_HRM:
		dlog_print(DLOG_INFO, LOG_TAG, "Common HRM sensor is supported.");
		break;
	case SENSOR_HRM_LED_GREEN:
		dlog_print(DLOG_INFO, LOG_TAG, "Green LED HRM sensor is supported.");
		break;
	case SENSOR_HRM_LED_IR:
		dlog_print(DLOG_INFO, LOG_TAG, "Infrared LED HRM sensor is supported.");
		break;
	case SENSOR_HRM_LED_RED:
		dlog_print(DLOG_INFO, LOG_TAG, "Red LED HRM sensor is supported.");
		break;
	default:
		dlog_print(DLOG_INFO, LOG_TAG, "Unhandled HRM sensor type is supported.");
	}

	return true;
}

/*
 * @brief: Internal function checking whether any type of the Heart Rate Sensor is supported.
 * @param[type]: reference to the function's evaluation result. The supported type is referenced.
 * @return: the function returns 'true' if any sensor type is supported, otherwise 'false' is returned.
 */
static bool __get_supported(sensor_type_e *type)
{
	*type = SENSOR_HRM;
	if (__check_hrm_support(*type))
		return true;

	*type = SENSOR_HRM_LED_GREEN;
	if (__check_hrm_support(*type))
		return true;

	*type = SENSOR_HRM_LED_IR;
	if (__check_hrm_support(*type))
		return true;

	*type = SENSOR_HRM_LED_RED;
	if (__check_hrm_support(*type))
		return true;

	dlog_print(DLOG_WARN, LOG_TAG, "No HRM sensor is supported.");

	return false;
}

/*
 * @brief: Function creates the data listener for Heart Rate Sensor. The listener is created successfully
 * if the following conditions are met: any type of Heart Rate Sensor is supported, it's handle is
 * available and the data read callback function was attached successfully. After the listener is
 * created, the data listening starts with given interval. Whenever sensor's data arrives, the custom
 * read_cb() callback is invoked.
 * @param[interval]: the minimal invocation interval of the given callback function.
 * @param[read_cb]: the custom callback function invoked whenever non-empty data set was received.
 * @return: the function returns 'true' if the listener was created and started successfully,
 * otherwise 'false' is returned.
 */
bool hrs_listener_create(int interval, sensor_data_read_cb read_cb)
{
	__sdata.read_cb = read_cb;

	if (!__get_supported(&__sdata.type))
		return false;

	if (!hrs_common_get_default_sensor(__sdata.type, &__sdata.sensor_handle))
		return false;

	if (!hrs_common_create_listener(__sdata.sensor_handle, &__sdata.listener_handle))
		return false;

	if (!hrs_common_set_event_cb(__sdata.listener_handle, interval, __sensor_event_cb, NULL)) {
		hrs_common_destroy_listener(&__sdata.listener_handle);
		return false;
	}

	if (!hrs_common_start_listener(__sdata.listener_handle)) {
		hrs_common_unset_event_cb(__sdata.listener_handle);
		hrs_common_destroy_listener(&__sdata.listener_handle);
		return false;
	}

	hrs_common_set_option(__sdata.listener_handle, SENSOR_OPTION_ALWAYS_ON);

	return true;
}

/*
 * @brief: Function stops the listener, detaches data read callback and deletes the listener handle.
 */
void hrs_listener_delete(void)
{
	__sdata.read_cb = NULL;

	if (!__sdata.listener_handle)
		return;

	hrs_common_stop_listener(&__sdata.listener_handle);
	hrs_common_unset_event_cb(__sdata.listener_handle);
	hrs_common_destroy_listener(&__sdata.listener_handle);
}
