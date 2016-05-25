/*
+ * Copyright (c) 2016 Samsung Electronics Co., Ltd
 *
 * Licensed under the Flora License, Version 1.1 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://floralicense.org/license/
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#if !defined(_MAIN_H)
#define _MAIN_H

#if !defined(PACKAGE)
#define PACKAGE "org.example.stopwatch"
#endif

#ifdef  LOG_TAG
#undef  LOG_TAG
#endif
#define LOG_TAG "stopwatch"

#define SEC_ANGLE 6
#define STOPWATCH_LAP_MAX 99
#define STOPWATCH_RUNNING_TIME_MAX 60
#define PROGRESSBAR_SEC_ANGLE 0.1667
#define PROGRESSBAR_RADIUS 109.5
#define PROGRESSBAR_WIDTH 5

typedef enum {
	STOPWATCH_STATE_READY = 0,
	STOPWATCH_STATE_RUNNING,
	STOPWATCH_STATE_STOP,
	STOPWATCH_STATE_MAX_STOP,
	STOPWATCH_STATE_MAX,
} stopwatch_state_e;

typedef enum {
	STOPWATCH_MARK_TYPE_MAIN = 0,
	STOPWATCH_MARK_TYPE_LAP,
	STOPWATCH_MARK_TYPE_MAX,
} stopwatch_mark_type_e;

typedef enum {
	STOPWATCH_BUTTON_TYPE_START = 0,
	STOPWATCH_BUTTON_TYPE_STOP,
	STOPWATCH_BUTTON_TYPE_RESUME,
	STOPWATCH_BUTTON_TYPE_LAP,
	STOPWATCH_BUTTON_TYPE_LAP_READY,
	STOPWATCH_BUTTON_TYPE_RESET,
	STOPWATCH_BUTTON_TYPE_MAX_STOP,
	STOPWATCH_BUTTON_TYPE_MAX,
} stopwatch_button_type_e;

void stopwatch_set_stopwatch_state(stopwatch_state_e state);
void stopwatch_handle_animator(int command);
Eina_Bool stopwatch_update_animation(void *data);
#endif
