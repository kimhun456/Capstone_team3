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

#include "data.h"
#include "bt/bt_advertiser.h"
#include "bluetoothleservice.h"

#define APPEARANCE_GENERIC_HEART_RATE_SENSOR 832
#define HEART_RATE_SENSOR_DATA_INDEX 0	/* Bits per minute value is stored at index 0 of the sensor's data read. */

struct _ctrl_data {
	bt_advertiser_h adv_hrm_h;	/* Heart Rate advertiser handle */
};

static struct _ctrl_data __ctrldata = {0,};

bool __pack_hrs_data(float *value, char **buffer, int *buffer_size);
bool __pack_hrs_location(hrs_location_e hrs_location, char **buffer, int *buffer_size);

void data_initialize(void)
{

}

/*
 * @brief: Data module finalization by Bluetooth LE Advertiser deletion.
 */
void data_finalize(void)
{
	if (__ctrldata.adv_hrm_h)
		bt_advertiser_delete(&__ctrldata.adv_hrm_h);
}

/*
 * @brief: Creation of data two buffers for: value of heart rate and the location
 * of the heart rate sensor. The buffers structure conforms to:\n
 * - heart rate value: https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml\n
 * - sensor location: https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.body_sensor_location.xml
 * @param[hrm_value]: measurement value stored in a table of possible measurements.
 * @param[hrs_location]: the location of the sensor.
 * @return: The function returns 'true' if the data is successfully stored in the target buffers,
 * otherwise 'false' is returned.
 */
bool data_pack(float *hrm_value, hrs_location_e hrs_location)
{
	int buffer_size = 0;
	char *buffer = NULL;

	if (!__ctrldata.adv_hrm_h)
		return false;

	if (__pack_hrs_data(hrm_value, &buffer, &buffer_size)) {
		bt_advertizer_set_data(&__ctrldata.adv_hrm_h, HRM_UUID, (const char *)buffer, buffer_size);
		free(buffer);
	}

	if (__pack_hrs_location(hrs_location, &buffer, &buffer_size)) {
		bt_advertizer_set_data(&__ctrldata.adv_hrm_h, BSL_UUID, (const char *)buffer, buffer_size);
		free(buffer);
	}

	return true;
}

/*
 * @brief: Function creates or deletes the Bluetooth LE advertiser depending on the argument's value.
 * @param[enabled]: the Bluetooth LE advertiser is created for 'enabled' argument set to 'true',
 * otherwise the existing advertiser is removed.
 */
void data_change_advertiser_state(bool enabled)
{
	if (enabled) {
		if (bt_advertiser_create(&__ctrldata.adv_hrm_h, APPEARANCE_GENERIC_HEART_RATE_SENSOR))
			dlog_print(DLOG_INFO, LOG_TAG, "Heart Rate Measurement advertiser started.");
		else
			dlog_print(DLOG_WARN, LOG_TAG, "Failed to start Heart Rate Measurement advertiser.");
	} else if (__ctrldata.adv_hrm_h) {
		bt_advertiser_delete(&__ctrldata.adv_hrm_h);
		dlog_print(DLOG_WARN, LOG_TAG, "Heart Rate Measurement advertiser stopped.");
	}
}

/*
 * @brief: Creates the buffer for heart rate measurement value and packs all the
 * related data: measurement value, contact state, energy expended state, RR-interval.
 * See the https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml
 * web page for reference.
 * @param[value]: measurement value stored in a table of possible measurements.
 * @param[buffer]: resulting data buffer.
 * @param[buffer_size]: the size of the resulting buffer.
 * @return: The function returns 'true' if the data is successfully stored in the target buffer,
 * otherwise 'false' is returned.
 */
bool __pack_hrs_data(float *value, char **buffer, int *buffer_size)
{
	if (!buffer || ! buffer_size) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function data_pack_hrs_data() failed due to wrong arguments.");
		return false;
	}

	*buffer = NULL;
	*buffer_size = 0;

	if (value[HEART_RATE_SENSOR_DATA_INDEX] < 0.0)
		value[HEART_RATE_SENSOR_DATA_INDEX] = 0.0;

	hrs_data_new_measurement((unsigned short)value[HEART_RATE_SENSOR_DATA_INDEX]);
	/* The API does not support sensor contact detection. */
	hrs_data_set_contact(false, false);
	hrs_data_set_energy_exp(false, 0);
	hrs_data_set_rr_interval(false, 0);
	hrs_data_pack_data(buffer, buffer_size);

	return (*buffer != NULL);
}

/*
 * @brief: Creates the buffer and packs the body sensor location value.
 * See the https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.body_sensor_location.xml
 * web page for reference.
 * @param[hrs_location]: the location of the sensor.
 * @param[buffer]: resulting data buffer.
 * @param[buffer_size]: the size of the resulting buffer.
 * @return: The function returns 'true' if the location value is successfully stored in the target buffer,
 * otherwise 'false' is returned.
 */
bool __pack_hrs_location(hrs_location_e hrs_location, char **buffer, int *buffer_size)
{
	*buffer = NULL;
	*buffer_size = 0;

	hrs_data_new_location(hrs_location);
	hrs_data_pack_location(buffer, buffer_size);

	return (*buffer != NULL);
}
