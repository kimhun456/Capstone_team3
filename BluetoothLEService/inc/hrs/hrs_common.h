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

#if !defined(_HRS_COMMON_H_)
#define _HRS_COMMON_H_

#include <stdbool.h>

bool hrs_common_is_supported(sensor_type_e type, bool *supported);
bool hrs_common_get_default_sensor(sensor_type_e type, sensor_h *sensor);
bool hrs_common_create_listener(sensor_h sensor, sensor_listener_h *listener);
bool hrs_common_destroy_listener(sensor_listener_h *listener);
bool hrs_common_start_listener(sensor_listener_h listener);
bool hrs_common_stop_listener(sensor_listener_h *listener);
bool hrs_common_set_event_cb(sensor_listener_h listener, unsigned int interval_ms, sensor_event_cb callback, void *data);
bool hrs_common_unset_event_cb(sensor_listener_h listener);
bool hrs_common_set_option(sensor_listener_h listener, sensor_option_e option);

#endif
