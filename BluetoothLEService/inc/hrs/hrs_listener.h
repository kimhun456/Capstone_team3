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

#if !defined(_HRS_LISTENER_H_)
#define _HRS_LISTENER_H_

#include <stdbool.h>

typedef void (*sensor_data_read_cb)(float *data, int data_count);

bool hrs_listener_create(int interval, sensor_data_read_cb read_cb);
void hrs_listener_delete(void);

#endif
