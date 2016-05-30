#include <sensor.h>
#include "bluetoothleservice.h"
#include "hrs/hrs_common.h"

/*
 * @brief: Check whether a sensor of given type is supported. This is a wrapper function
 * for the sensor_is_supported() function.
 * @param[type]: the type of the sensor to be checked.
 * @param[supported]: reference to the function's evaluation result.
 * @return: the function returns 'true' if the support status was obtained successfully,
 * otherwise 'false' is returned.
 */
bool hrs_common_is_supported(sensor_type_e type, bool *supported)
{
	int ret = sensor_is_supported(type, supported);
	if (ret == SENSOR_ERROR_NOT_SUPPORTED) {
		*supported = false;
		return true;
	} else if (ret != SENSOR_ERROR_NONE) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function sensor_is_supported() failed with error: %s.", get_error_message(ret));
		return false;
	}

	return true;
}

/*
 * @brief: Obtains the handle for the default sensor of a given type. This is a wrapper function
 * for the sensor_get_default_sensor() function.
 * @param[type]: the type of the sensor to be obtained.
 * @param[sensor]: reference to the default sensor's handle.
 * @return: the function returns 'true' if the default sensor's handle was obtained successfully,
 * otherwise 'false' is returned.
 */
bool hrs_common_get_default_sensor(sensor_type_e type, sensor_h *sensor)
{
	int ret = sensor_get_default_sensor(type, sensor);
	if (ret != SENSOR_ERROR_NONE) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function sensor_get_default_sensor() failed with error: %s.", get_error_message(ret));
		return false;
	}

	return true;
}

/*
 * @brief: Creates a data listener for given sensor's handle. This is a wrapper function
 * for the sensor_create_listener() function.
 * @param[sensor]: sensor's handle to be listened for the data.
 * @param[listener]: reference to the listener's handle created for the given sensor's handle.
 * @return: the function returns 'true' if the listener's handle was created successfully,
 * otherwise 'false' is returned.
 */
bool hrs_common_create_listener(sensor_h sensor, sensor_listener_h *listener)
{
	int ret = sensor_create_listener(sensor, listener);
	if (ret != SENSOR_ERROR_NONE) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function sensor_create_listener() failed with error: %s.", get_error_message(ret));
		return false;
	}

	return true;
}

/*
 * @brief: Destroys a data listener. This is a wrapper function
 * for the sensor_destroy_listener() function.
 * @param[listener]: reference to the listener's handle to be destroyed.
 * @return: the function returns 'true' if the listener's handle was destroyed successfully,
 * otherwise 'false' is returned.
 */
bool hrs_common_destroy_listener(sensor_listener_h *listener)
{
	int ret = sensor_destroy_listener(*listener);
	if (ret != SENSOR_ERROR_NONE) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function sensor_destroy_listener() failed with error: %s.", get_error_message(ret));
		return false;
	}

	*listener = NULL;

	return true;
}

/*
 * @brief: Starts listening for incoming data from the related sensor. This is a wrapper function
 * for the sensor_listener_start() function.
 * @param[listener]: reference to the listener's handle.
 * @return: the function returns 'true' if the listener was started successfully,
 * otherwise 'false' is returned.
 */
bool hrs_common_start_listener(sensor_listener_h listener)
{
	int ret = sensor_listener_start(listener);
	if (ret != SENSOR_ERROR_NONE) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function sensor_listener_start() failed with error: %s.", get_error_message(ret));
		return false;
	}

	return true;
}

/*
 * @brief: Stops listening for incoming data from the related sensor. This is a wrapper function
 * for the sensor_listener_stop() function.
 * @param[listener]: reference to the listener's handle.
 * @return: the function returns 'true' if the listener was stopped successfully,
 * otherwise 'false' is returned.
 */
bool hrs_common_stop_listener(sensor_listener_h *listener)
{
	int ret = sensor_listener_stop(*listener);
	if (ret != SENSOR_ERROR_NONE) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function sensor_listener_stop() failed with error: %s.", get_error_message(ret));
		return false;
	}

	return true;
}

/*
 * @brief: Sets the callback function to be invoked whenever the given listener reports incoming data from the related sensor.
 * This is a wrapper function for the sensor_listener_set_event_cb() function.
 * @param[listener]: the listener's handle.
 * @param[interval_ms]: the minimal invocation interval of the given callback function.
 * @param[callback]: the callback function to be invoked with the data received.
 * @param[data]: the user data passed to the given callback function.
 * @return: the function returns 'true' if the callback function was attached successfully,
 * otherwise 'false' is returned.
 */
bool hrs_common_set_event_cb(sensor_listener_h listener, unsigned int interval_ms, sensor_event_cb callback, void *data)
{
	int ret = sensor_listener_set_event_cb(listener, interval_ms, callback, data);
	if (ret != SENSOR_ERROR_NONE) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function sensor_listener_set_event_cb() failed with error: %s.", get_error_message(ret));
		return false;
	}

	return true;
}

/*
 * @brief: Detaches the data receive callback function from the given listener. This is a wrapper function
 * for the sensor_listener_unset_event_cb() function.
 * @param[listener]: the listener's handle.
 * @return: the function returns 'true' if the callback function was detached successfully,
 * otherwise 'false' is returned.
 */
bool hrs_common_unset_event_cb(sensor_listener_h listener)
{
	int ret = sensor_listener_unset_event_cb(listener);
	if (ret != SENSOR_ERROR_NONE) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function sensor_listener_unset_event_cb() failed with error: %s.", get_error_message(ret));
		return false;
	}

	return true;
}

/*
 * @brief: Sets the listener's option which determines the data reading scheme. This is a wrapper function
 * for the sensor_listener_set_option() function.
 * @param[listener]: the listener's handle.
 * @param[option]: the option to be set to the given listener. Available options are: SENSOR_OPTION_DEFAULT,
 * SENSOR_OPTION_ON_IN_SCREEN_OFF, SENSOR_OPTION_ON_IN_POWERSAVE_MODE, SENSOR_OPTION_ALWAYS_ON.
 * @return: the function returns 'true' if the listener's option was set successfully,
 * otherwise 'false' is returned.
 */
bool hrs_common_set_option(sensor_listener_h listener, sensor_option_e option)
{
	int ret = sensor_listener_set_option(listener, option);
	if (ret != SENSOR_ERROR_NONE) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function sensor_listener_set_option() failed with error: %s.", get_error_message(ret));
		return false;
	}

	return true;
}
