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

#include <string.h>
#include <stdlib.h>
#include "hrs/hrs_data.h"
#include "bluetoothleservice.h"

#define HRM_DATA_SIZE_MAX 7
#define BSL_DATA_SIZE_MAX 1

#define HRM_BIT_STATE_VALUE_FORMAT_8 0x00
#define HRM_BIT_STATE_VALUE_FORMAT_16 0x01
#define HRM_BIT_STATE_CONTACT_UNSUPPORTED_1 0x00
#define HRM_BIT_STATE_CONTACT_UNSUPPORTED_2 0x02
#define HRM_BIT_STATE_CONTACT_NOT_DETECTED 0x04
#define HRM_BIT_STATE_CONTACT_DETECTED 0x06
#define HRM_BIT_STATE_ENERGY_EXP_NOT_PRESENT 0x00
#define HRM_BIT_STATE_ENERGY_EXP_PRESENT 0x08
#define HRM_BIT_STATE_RR_INTERVAL_NOT_PRESENT 0x00
#define HRM_BIT_STATE_RR_INTERVAL_PRESENT 0x16

struct _sensor_location_s {
	char value;
};

struct _measurement_s {
	unsigned short value;
	bool contact_supported;
	bool contact_detected;
	bool energy_exp_present;
	unsigned short energy_exp;
	bool rr_interval_present;
	unsigned short rr_interval;
};

static struct _measurement_s __measurement = {0,};
static struct _sensor_location_s __sensor_location = { .value = HRS_SL_OTHER };
static unsigned char __hrs_data_buffer[HRM_DATA_SIZE_MAX] = {0,};
static unsigned char __hrs_location_buffer[BSL_DATA_SIZE_MAX] = {0,};

/*
 * @brief: Internal function setting the bit flags describing the content of
 * the heart rate sensor within the data buffer. The bit flags are initially set via
 * the following functions: hrs_data_set_contact(), hrs_data_set_energy_exp()
 * hrs_data_set_rr_interval() and stored internally in static __measurement variable.
 * @param[buff_pos]: the starting position in the buffer where the flags are stored.
 */
static void __set_heart_rate_buffer_flags(int *buff_pos)
{
	if (__measurement.value > 0xFF)
		__hrs_data_buffer[*buff_pos] |= HRM_BIT_STATE_VALUE_FORMAT_16;
	else
		__hrs_data_buffer[*buff_pos] |= HRM_BIT_STATE_VALUE_FORMAT_8;

	if (!__measurement.contact_supported)
		__hrs_data_buffer[*buff_pos] |= HRM_BIT_STATE_CONTACT_UNSUPPORTED_1;
	else {
		if (__measurement.contact_detected)
			__hrs_data_buffer[*buff_pos] |= HRM_BIT_STATE_CONTACT_DETECTED;
		else
			__hrs_data_buffer[*buff_pos] |= HRM_BIT_STATE_CONTACT_NOT_DETECTED;
	}

	if (__measurement.energy_exp_present)
		__hrs_data_buffer[*buff_pos] |= HRM_BIT_STATE_ENERGY_EXP_PRESENT;
	else
		__hrs_data_buffer[*buff_pos] |= HRM_BIT_STATE_ENERGY_EXP_NOT_PRESENT;

	if (__measurement.rr_interval_present)
		__hrs_data_buffer[*buff_pos] |= HRM_BIT_STATE_RR_INTERVAL_PRESENT;
	else
		__hrs_data_buffer[*buff_pos] |= HRM_BIT_STATE_RR_INTERVAL_NOT_PRESENT;

	(*buff_pos)++;
}

/*
 * @brief: Internal function setting the heart rate measurement value within the buffer.
 * The heart rate measurement value is initially set via hrs_data_new_measurement() function
 * and stored internally in static __measurement variable.
 * @param[buff_pos]: the starting position in the buffer where the heart rate measurement
 * value is stored.
 */
static void __set_heart_rate_buffer_value(int *buff_pos)
{
	int value_size = 1;

	if (__measurement.value > 0xFF)
		value_size = 2;

	memcpy(&__hrs_data_buffer[*buff_pos], &__measurement.value, value_size);
	(*buff_pos) += value_size;
}

/*
 * @brief: Internal function setting the energy expenditure existence statement within the buffer.
 * The energy expenditure value is initially set via hrs_data_set_energy_exp() function
 * and stored internally in static __measurement variable.
 * @param[buff_pos]: the starting position in the buffer where the energy expenditure
 * value is stored.
 */
static void __set_heart_rate_buffer_energy_exp(int *buff_pos)
{
	int value_size = 2;

	if (__measurement.energy_exp_present) {
		memcpy(&__hrs_data_buffer[*buff_pos], &__measurement.energy_exp, value_size);
		(*buff_pos) += value_size;
	}
}

/*
 * @brief: Internal function setting the RR-interval value within the buffer.
 * The RR-interval value is initially set via hrs_data_set_rr_interval() function
 * and stored internally in static __measurement variable.
 * @param[buff_pos]: the starting position in the buffer where the RR-interval
 * value is stored.
 */
static void __set_heart_rate_buffer_rr_interval(int *buff_pos)
{
	int value_size = 2;

	if (__measurement.rr_interval_present) {
		memcpy(&__hrs_data_buffer[*buff_pos], &__measurement.rr_interval, value_size);
		(*buff_pos) += value_size;
	}
}

/*
 * @brief: Internal function setting the body sensor location place within the buffer.
 * The body sensor location place is initially set via hrs_data_new_location() function
 * and stored internally in static __sensor_location variable.
 * @param[buff_pos]: the starting position in the buffer where the body sensor location
 * place is stored.
 */
static void __set_heart_rate_sensor_location(int *buff_pos)
{
	int value_size = 1;

	memcpy(&__hrs_location_buffer[*buff_pos], &__sensor_location.value, value_size);
	(*buff_pos) += value_size;
}

/*
 * @brief: Function prepares the internal static __measurement variable as a placeholder
 * for all the related information storage. It sets the heart rate measurement value within
 * mentioned static __measurement variable.
 * @param[value]: the value of the heart rate measurement.
 */
void hrs_data_new_measurement(unsigned short value)
{
	memset(&__measurement, 0, sizeof(struct _measurement_s));
	memset(__hrs_data_buffer, 0, sizeof(__hrs_data_buffer));

	__measurement.value = value;
}

/*
 * @brief: Function prepares the internal static __sensor_location variable as a placeholder
 * for all the related information storage. It sets the body sensor location value within
 * mentioned static __sensor_location variable.
 * @param[location]: the value of the body sensor location.
 */
void hrs_data_new_location(hrs_location_e location)
{
	__sensor_location.value = (char)location;
}

/*
 * @brief: Function sets the contact value and detection state within the static __measurement variable.
 * @param[supported]: determines whether the contact feature is supported.
 * @param[detected]: the detected state in case the contact feature is supported.
 */
void hrs_data_set_contact(bool supported, bool detected)
{
	__measurement.contact_supported = supported;
	__measurement.contact_detected = false;

	if (!supported)
		return;

	__measurement.contact_detected = detected;
}

/*
 * @brief: Function sets the energy expenditure presence and its value within the static __measurement variable.
 * @param[present]: determines whether the energy expenditure feature is supported.
 * @param[value]: the value of the energy expenditure in case the feature is supported.
 */
void hrs_data_set_energy_exp(bool present, unsigned short value)
{
	__measurement.energy_exp_present = present;
	__measurement.energy_exp = 0;

	if (!present)
		return;

	__measurement.energy_exp = value;
}

/*
 * @brief: Function sets the RR-interval presence and its value within the static __measurement variable.
 * @param[present]: determines whether the RR-interval feature is supported.
 * @param[value]: the value of the RR-interval in case the feature is supported.
 */
void hrs_data_set_rr_interval(bool present, unsigned short value)
{
	__measurement.rr_interval_present = present;
	__measurement.rr_interval = 0;

	if (!present)
		return;

	__measurement.rr_interval = value;
}

/*
 * @brief: Function packs all the heart rate measurement related values stored within
 * the static __measurement variable into the internal buffer according to the specification
 * described here: https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml
 * @param[data]: the target buffer where the packed data is stored. Resulting buffer must be freed by the calling function.
 * @param[buff_size]: the size of the packed data.
 */
void hrs_data_pack_data(char **data, int *buff_size)
{
	int buff_pos = 0;

	*data = NULL;
	*buff_size = 0;

	__set_heart_rate_buffer_flags(&buff_pos);
	__set_heart_rate_buffer_value(&buff_pos);
	__set_heart_rate_buffer_energy_exp(&buff_pos);
	__set_heart_rate_buffer_rr_interval(&buff_pos);

	*buff_size = buff_pos;

	if (*buff_size == 0)
		return;

	*data = (char *)malloc(*buff_size);
	if (!(*data)) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Failed to allocate memory for heart rate data buffer.");
		return;
	}

	memcpy(*data, __hrs_data_buffer, *buff_size);
}

/*
 * @brief: Function packs all the body sensor location related values stored within
 * the static __sensor_location variable into the internal buffer according to the specification
 * described here: https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.body_sensor_location.xml
 * @param[data]: the target buffer where the packed data is stored. Resulting buffer must be freed by the calling function.
 * @param[buff_size]: the size of the packed data.
 */
void hrs_data_pack_location(char **data, int *buff_size)
{
	int buff_pos = 0;

	if (!data || !buff_size) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Function data_pack_hrs_location() failed due to wrong arguments.");
		return;
	}

	*data = NULL;
	*buff_size = 0;

	__set_heart_rate_sensor_location(&buff_pos);

	*buff_size = buff_pos;

	if (*buff_size == 0)
		return;

	*data = (char *)malloc(*buff_size);
	if (!(*data)) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Failed to allocate memory for sensor location data buffer.");
		return;
	}

	memcpy(*data, __hrs_location_buffer, *buff_size);
}
