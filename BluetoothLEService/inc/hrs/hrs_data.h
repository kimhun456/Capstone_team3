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

#if !defined(_HRS_DATA_H_)
#define _HRS_DATA_H_

#include <stdbool.h>

#define HRM_UUID "2A37"
#define BSL_UUID "2A38"

typedef enum {HRS_SL_OTHER = 0, HRS_SL_CHEST, HRS_SL_WRIST, HRS_SL_FINGER, HRS_SL_HAND, HRS_SL_EAR_LOBE, HRS_SL_FOOT} hrs_location_e;

void hrs_data_new_measurement(unsigned short value);
void hrs_data_new_location(hrs_location_e location);
void hrs_data_set_contact(bool supported, bool detected);
void hrs_data_set_energy_exp(bool present, unsigned short value);
void hrs_data_set_rr_interval(bool present, unsigned short value);
void hrs_data_pack_data(char **data, int *buff_size);
void hrs_data_pack_location(char **data, int *buff_size);

#endif
