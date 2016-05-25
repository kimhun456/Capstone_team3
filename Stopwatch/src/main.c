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

#include <app.h>
#include <Elementary.h>
#include <system_settings.h>
#include <efl_extension.h>
#include <dlog.h>

#include "stopwatch.h"
#include "view.h"
#include "data.h"

static struct stopwatch_info {
	stopwatch_state_e state;
	int current_lap;
	long long time_ref;
	long long time_lap_diff;
	long long time_elapse_sum;
	Ecore_Animator *animator;
	long long lap_record[100];
} s_info = {
	.state = STOPWATCH_STATE_READY,
	.current_lap = 0,
	.animator = NULL,
	.time_ref = 0,
	.time_lap_diff = 0,
	.time_elapse_sum = 0,
	.lap_record = {0, },
};

static void _init_stopwatch(void);
static Eina_Bool _lap_visibility_cb(void *data);
static void _touch_cb(void *data, Evas_Object *obj, const char *emission, const char *source);
static void _start_click_cb(void *data, Evas_Object *obj, const char *emission, const char *source);
static void _reset_click_cb(void *data, Evas_Object *obj, const char *emission, const char *source);
static long long _get_current_ms_time(void);

/**
 * @brief Hook to take necessary actions before main event loop starts.
 * @param[in] user_data The user data to be passed to the callback function
 * Initialize UI resources and application's data
 * If this function returns true, the main loop of application starts
 * If this function returns false, the application is terminated
 */
static bool app_create(void *user_data)
{
	/* Hook to take necessary actions before main event loop starts
	   Initialize UI resources and application's data
	   If this function returns true, the main loop of application starts
	   If this function returns false, the application is terminated */
	char *image = NULL;
	char full_path[PATH_MAX] = { 0, };

	/* Create main view */
	if (!view_create()) {
		dlog_print(DLOG_ERROR, LOG_TAG, "view_create() is failed");
		return false;
	}

	data_get_full_path(EDJ_FILE, full_path, (int)PATH_MAX);
	view_stopwatch_create_layout(full_path);

	/* Set background image to "sw.number.bg" part of EDC */
	image = data_get_image_path("sw.number.bg");
	view_set_image(view_stopwatch_get_layout_object(), "sw.number.bg", image);
	view_set_color(view_stopwatch_get_layout_object(), "sw.number.bg", 249, 249, 249, 255);
	free(image);

	/* Create the lap mark part */
	image = data_get_image_path("sw.mark.lap");
	view_stopwatch_set_part(image, STOPWATCH_MARK_TYPE_LAP);
	free(image);

	/* Create the main mark part */
	image = data_get_image_path("sw.mark.main");
	view_stopwatch_set_part(image, STOPWATCH_MARK_TYPE_MAIN);
	free(image);

	/* Set background image to "sw.main.lap.number.bg" part of EDC */
	image = data_get_image_path("sw.main.lap.number.bg");
	view_set_image(view_stopwatch_get_layout_object(), "sw.main.lap.number.bg", image);
	view_set_color(view_stopwatch_get_layout_object(), "sw.main.lap.number.bg", 63, 63, 63, 0);
	free(image);

	/* Add callback to edje signal */
	view_stopwatch_add_callback_to_signal("start_down", "edj", _touch_cb, NULL);
	view_stopwatch_add_callback_to_signal("start_up", "edj", _touch_cb, NULL);
	view_stopwatch_add_callback_to_signal("reset_down", "edj", _touch_cb, NULL);
	view_stopwatch_add_callback_to_signal("reset_up", "edj", _touch_cb, NULL);
	view_stopwatch_add_callback_to_signal("start,click", "edj", _start_click_cb, NULL);
	view_stopwatch_add_callback_to_signal("reset,click", "edj", _reset_click_cb, NULL);

	if (!view_stopwatch_set_progressbar()) {
		dlog_print(DLOG_ERROR, LOG_TAG, "view_stopwatch_set_progressbar() is failed");
		return false;
	}

	return true;
}

/**
 * @brief This callback function is called when another application.
 * @param[in] app_control The handle to the app_control
 * @param[in] user_data The user data to be passed to the callback function
 * sends the launch request to the application
 */
static void app_control(app_control_h app_control, void *user_data)
{
	/* Handle the launch request. */
}

/**
 * @brief This callback function is called each time.
 * @param[in] user_data The user data to be passed to the callback function
 * the application is completely obscured by another application
 * and becomes invisible to the user
 */
static void app_pause(void *user_data)
{
	/* Take necessary actions when application becomes invisible. */
	stopwatch_handle_animator(STOPWATCH_ANIMATION_STOP);
}

/**
 * @brief This callback function is called each time.
 * @param[in] user_data The user data to be passed to the callback function
 * the application becomes visible to the user
 */
static void app_resume(void *user_data)
{
	/* Take necessary actions when application becomes visible. */
	stopwatch_handle_animator(STOPWATCH_ANIMATION_RESUME);
}

/**
 * @brief This callback function is called once after the main loop of the application exits.
 * @param[in] user_data The user data to be passed to the callback function
 */
static void app_terminate(void *user_data)
{
	/*
	 * Destroy window component.
	 */
	view_destroy();

	/*
	 * Destroy window component.
	 */
	if (s_info.animator) {
		ecore_animator_del(s_info.animator);
		s_info.animator = NULL;
	}
}

/**
 * @brief This function will be called when the language is changed.
 * @param[in] event_info The system event information
 * @param[in] user_data The user data to be passed to the callback function
 */
static void ui_app_lang_changed(app_event_info_h event_info, void *user_data)
{
	/* APP_EVENT_LANGUAGE_CHANGED */
	char *locale = NULL;

	system_settings_get_value_string(SYSTEM_SETTINGS_KEY_LOCALE_LANGUAGE, &locale);

	if (locale != NULL) {
		elm_language_set(locale);
		free(locale);
	}
	return;
}

/**
 * @brief Main function of the application.
 * @param[in] argc The argument count
 * @param[in] argv The argument vector
 */
int main(int argc, char *argv[])
{
	int ret;

	ui_app_lifecycle_callback_s event_callback = {0, };
	app_event_handler_h handlers[5] = {NULL, };

	event_callback.create = app_create;
	event_callback.terminate = app_terminate;
	event_callback.pause = app_pause;
	event_callback.resume = app_resume;
	event_callback.app_control = app_control;

	/*
	 * If you want to handle more events,
	 * please check the application lifecycle guide.
	 */
	ui_app_add_event_handler(&handlers[APP_EVENT_LANGUAGE_CHANGED], APP_EVENT_LANGUAGE_CHANGED, ui_app_lang_changed, NULL);

	ret = ui_app_main(argc, argv, &event_callback, NULL);
	if (ret != APP_ERROR_NONE)
		dlog_print(DLOG_ERROR, LOG_TAG, "ui_app_main() is failed. err = %d", ret);

	return ret;
}

/**
 * @brief Function will be operated when mouse down and up events is triggered.
 * @param[in] data The data to be passed to the callback function
 * @param[in] obj The edje object where the signal comes from.
 * @param[in] emission The exact signal's emission string to be passed to the callback function
 * @param[in] source The exact signal's source
 */
static void _touch_cb(void *data, Evas_Object *obj, const char *emission, const char *source)
{
	/*
	 * Set button state depending on current state and incoming event.
	 * "start_down" and "start_up" correspond to upper touch area events.
	 * "reset_down" and "reset_up" correspond to lower touch area events.
	 * Every down and up event have to be pair.
	 * */

	if (!strcmp(emission, "start_down")) {

		/* The press animation play */
		if (s_info.state != STOPWATCH_STATE_MAX_STOP)
			view_stopwatch_play_press_animation();

		if (s_info.state == STOPWATCH_STATE_READY)
			view_stopwatch_set_button_pressed(STOPWATCH_BUTTON_TYPE_START);
		else if (s_info.state == STOPWATCH_STATE_RUNNING)
			view_stopwatch_set_button_pressed(STOPWATCH_BUTTON_TYPE_STOP);
		else if (s_info.state == STOPWATCH_STATE_STOP)
			view_stopwatch_set_button_pressed(STOPWATCH_BUTTON_TYPE_RESUME);

	} else if (!strcmp(emission, "start_up")) {

		if (s_info.state == STOPWATCH_STATE_READY)
			view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_START);
		else if (s_info.state == STOPWATCH_STATE_RUNNING)
			view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_STOP);
		else if (s_info.state == STOPWATCH_STATE_STOP)
			view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_RESUME);

	} else if (!strcmp(emission, "reset_down")) {

		if (s_info.state == STOPWATCH_STATE_RUNNING)
			view_stopwatch_set_button_pressed(STOPWATCH_BUTTON_TYPE_LAP);
		else if (s_info.state == STOPWATCH_STATE_STOP || s_info.state == STOPWATCH_STATE_MAX_STOP)
			view_stopwatch_set_button_pressed(STOPWATCH_BUTTON_TYPE_RESET);

	} else if (!strcmp(emission, "reset_up")) {

		if (s_info.state == STOPWATCH_STATE_RUNNING)
			view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_LAP);
		else if (s_info.state == STOPWATCH_STATE_STOP || s_info.state == STOPWATCH_STATE_MAX_STOP)
			view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_RESET);

	}
}

/**
 * @brief Function will be operated when clicked events of upper touch area(start) is triggered.
 * @param[in] data The data to be passed to the callback function
 * @param[in] obj The Edje object where the signal comes from.
 * @param[in] emission The exact signal's emission string to be passed to the callback function
 * @param[in] source The exact signal's source
 */
static void _start_click_cb(void *data, Evas_Object *obj, const char *emission, const char *source)
{

	if (s_info.state == STOPWATCH_STATE_READY) {
		/*
		 * Start Stopwatch
		 */
		stopwatch_set_stopwatch_state(STOPWATCH_STATE_RUNNING);
	} else if (s_info.state == STOPWATCH_STATE_RUNNING) {
		/*
		 * Stop Stopwatch
		 */
		stopwatch_set_stopwatch_state(STOPWATCH_STATE_STOP);
	} else if (s_info.state == STOPWATCH_STATE_STOP) {
		/*
		 * Resume Stopwatch
		 */
		stopwatch_set_stopwatch_state(STOPWATCH_STATE_RUNNING);
	} else if (s_info.state == STOPWATCH_STATE_MAX_STOP) {
		/*
		 * Ignore this event.
		 */
	} else {
		dlog_print(DLOG_ERROR, LOG_TAG, "_start_click_cb Invalid Status [%d]", s_info.state);
	}
}

/**
 * @brief Function will be operated when clicked events of the lower touch area(reset) is triggered.
 * @param[in] data The data to be passed to the callback function
 * @param[in] obj The Edje object where the signal comes from.
 * @param[in] emission The exact signal's emission string to be passed to the callback function
 * @param[in] source The exact signal's source
 */
static void _reset_click_cb(void *data, Evas_Object *obj, const char *emission, const char *source)
{
	if (s_info.state == STOPWATCH_STATE_READY) {
		/*
		 * Ignore this event. At ready state, start is available only.
		 */
		return;
	} else if (s_info.state == STOPWATCH_STATE_RUNNING) {
		/*
		 * Record laps
		 */
		stopwatch_set_stopwatch_state(STOPWATCH_STATE_RUNNING);
	} else if (s_info.state == STOPWATCH_STATE_STOP || s_info.state == STOPWATCH_STATE_MAX_STOP) {
		/*
		 * Reset Stopwatch
		 */
		stopwatch_set_stopwatch_state(STOPWATCH_STATE_READY);
	} else {
		dlog_print(DLOG_ERROR, LOG_TAG, "_reset_click_cb Invalid Status [%d]", s_info.state);
	}
}

/**
 * @brief Sets stopwatch state machine.
 * @param[in] state The target state
 */
void stopwatch_set_stopwatch_state(stopwatch_state_e state)
{
	dlog_print(DLOG_DEBUG, LOG_TAG, "stopwatch_set_state From [%d] To [%d]", s_info.state, state);

	switch (state) {
	case STOPWATCH_STATE_READY:
		{
			if (s_info.state == STOPWATCH_STATE_STOP || s_info.state == STOPWATCH_STATE_MAX_STOP) {
				/*
				 * Reset Stopwatch
				 */
				_init_stopwatch();
			} else {
				dlog_print(DLOG_ERROR, LOG_TAG, "stopwatch_set_state Invalid STOPWATCH_STATE_READY at [%d]", state, s_info.state);
				return;
			}
		}
		break;
	case STOPWATCH_STATE_RUNNING:
		{
			if (s_info.state == STOPWATCH_STATE_READY) {
				/*
				 * Start Stopwatch
				 */
				s_info.time_ref = _get_current_ms_time();
				stopwatch_handle_animator(STOPWATCH_ANIMATION_START);
			} else if (s_info.state == STOPWATCH_STATE_STOP) {
				/*
				 * Resume Stopwatch
				 * Set running from stop
				 */
				s_info.time_ref = _get_current_ms_time();
				stopwatch_handle_animator(STOPWATCH_ANIMATION_RESUME);
			} else if (s_info.state == STOPWATCH_STATE_RUNNING && s_info.current_lap < STOPWATCH_LAP_MAX) {
				/*
				 * Record laps
				 * Set running from running
				 */
				s_info.time_lap_diff = _get_current_ms_time() - s_info.time_ref + s_info.time_elapse_sum;

				/* Keep lap records in static array. */
				if (s_info.current_lap > 0)
					s_info.lap_record[s_info.current_lap] = s_info.time_lap_diff;

				/* Increase lap indicator */
				s_info.current_lap += 1;

				if (s_info.current_lap == 1)
					view_stopwatch_set_lapmark_visibility(true);

				/* Update laps status view */
				view_stopwatch_set_lap_number(s_info.current_lap);
			} else {
				dlog_print(DLOG_ERROR, LOG_TAG, "stopwatch_set_state Invalid STOPWATCH_STATE_RUNNING at [%d]", state, s_info.state);
				return;
			}

			/* Change buttons and state */
			view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_STOP);
			view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_LAP);
			s_info.state = STOPWATCH_STATE_RUNNING;
		}
		break;
	case STOPWATCH_STATE_STOP:
		{
			if (s_info.state == STOPWATCH_STATE_RUNNING) {
				/*
				 * Stop Stopwatch
				 * Save sum of elapse time and stop animation
				 */
				s_info.time_elapse_sum += _get_current_ms_time() - s_info.time_ref;
				stopwatch_handle_animator(STOPWATCH_ANIMATION_STOP);

				/* Change buttons and state */
				view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_RESUME);
				view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_RESET);
				s_info.state = STOPWATCH_STATE_STOP;
			} else {
				dlog_print(DLOG_ERROR, LOG_TAG, "stopwatch_set_state Invalid STOPWATCH_STATE_STOP at [%d]", state, s_info.state);
				return;
			}
		}
		break;
	case STOPWATCH_STATE_MAX_STOP:
		{
			if (s_info.state == STOPWATCH_STATE_RUNNING) {
				/*
				 * Stop Stopwatch
				 * Save sum of elapse time and stop animation
				 */
				s_info.time_elapse_sum += _get_current_ms_time() - s_info.time_ref;
				stopwatch_handle_animator(STOPWATCH_ANIMATION_STOP);

				/* Change buttons and state */
				view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_MAX_STOP);
				view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_RESET);
				s_info.state = STOPWATCH_STATE_MAX_STOP;
			} else {
				dlog_print(DLOG_ERROR, LOG_TAG, "stopwatch_set_state Invalid STOPWATCH_STATE_MAX_STOP at [%d]", state, s_info.state);
				return;
			}
		}
		break;
	default:
		dlog_print(DLOG_ERROR, LOG_TAG, "stopwatch_set_state Invalid [%d]", state);
		break;
	}
}

/**
 * @brief Handles stopwatch animator.
 * @param[in] command The command to be executed
 */
void stopwatch_handle_animator(int command)
{
	switch (command) {
	case STOPWATCH_ANIMATION_INIT:
		{
			/* Initialize animator*/
			if (s_info.animator) {
				ecore_animator_del(s_info.animator);
				s_info.animator = NULL;
			}

			/* Initialize animation object position */
			stopwatch_update_animation(NULL);
			view_stopwatch_rotate_mark(STOPWATCH_MARK_TYPE_LAP, 0.0, (STOPWATCH_MARK_WIDTH / 2), (STOPWATCH_MARK_HEIGHT / 2));
		}
		break;
	case STOPWATCH_ANIMATION_START:
		{
			/* Start animation */
			s_info.animator = ecore_animator_add(stopwatch_update_animation, NULL);
		}
		break;
	case STOPWATCH_ANIMATION_STOP:
		{
			/* Pause animation */
			if (s_info.animator)
				ecore_animator_freeze(s_info.animator);
		}
		break;
	case STOPWATCH_ANIMATION_RESUME:
		{
			/* Resume animation */
			if (s_info.animator)
				ecore_animator_thaw(s_info.animator);
		}
		break;
	default:
		dlog_print(DLOG_ERROR, LOG_TAG, "stopwatch_set_state Invalid Command [%d]", command);
		break;
	}
}

/**
 * @brief Updates animation changing object's position.
 * @param[in] user_data The user data to be passed to the callback functions
 */
Eina_Bool stopwatch_update_animation(void *data)
{
	double degree = 0.0f;
	double progress = 0.0f;
	int msec = 0;
	int sec = 0;
	int min = 0;
	char min_str[3] = {0, };
	char sec_str[3] = {0, };
	char msec_str[3] = {0, };
	long long current_time = _get_current_ms_time();
	long long current_sum;

	if (current_time == 0) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Fail to get current time");
		return ECORE_CALLBACK_RENEW;
	}

	/*
	 * Calculate sum of elapse time at this moment
	 */
	current_sum = current_time - s_info.time_ref + s_info.time_elapse_sum;

	/*
	 * Parse millisecond time to various format (minutes, seconds, milliseconds)
	 */
	sec = current_sum / 1000;
	msec = current_sum % 1000;
	min = sec / 60;
	sec = sec % 60;

	/*
	 * Stopwatch running time is limited to 60 minutes.
	 */
	if (min >= STOPWATCH_RUNNING_TIME_MAX) {
		view_set_text(view_stopwatch_get_layout_object(), "text.main.minutes", "60");
		view_set_text(view_stopwatch_get_layout_object(), "text.main.seconds", "00");
		view_set_text(view_stopwatch_get_layout_object(), "text.main.milliseconds", "00");
		view_stopwatch_rotate_mark(STOPWATCH_MARK_TYPE_MAIN, 360, (STOPWATCH_MARK_WIDTH / 2), (STOPWATCH_MARK_HEIGHT / 2));
		view_stopwatch_set_progressbar_val(0);

		stopwatch_set_stopwatch_state(STOPWATCH_STATE_MAX_STOP);
		return ECORE_CALLBACK_CANCEL;
	}

	/*
	 * Update Stopwatch time number
	 */
	if (min < 10)
		sprintf(min_str, "0%d", min);
	else
		sprintf(min_str, "%d", min);

	if (sec < 10)
		sprintf(sec_str, "0%d", sec);
	else
		sprintf(sec_str, "%d", sec);

	if (msec < 10)
		sprintf(msec_str, "0%d", msec/10);
	else
		sprintf(msec_str, "%d", msec/10);

	view_set_text(view_stopwatch_get_layout_object(), "text.main.minutes", min_str);
	view_set_text(view_stopwatch_get_layout_object(), "text.main.seconds", sec_str);
	view_set_text(view_stopwatch_get_layout_object(), "text.main.milliseconds", msec_str);

	/*
	 * Rotate Stopwatch the main mark
	 */
	degree = sec * SEC_ANGLE;
	degree += msec * SEC_ANGLE / 1000.0;
	view_stopwatch_rotate_mark(STOPWATCH_MARK_TYPE_MAIN, degree, (STOPWATCH_MARK_WIDTH / 2), (STOPWATCH_MARK_HEIGHT / 2));

	progress = (min % 10) * 10;
	progress += sec * PROGRESSBAR_SEC_ANGLE;
	progress += msec * PROGRESSBAR_SEC_ANGLE / 1000.0;
	view_stopwatch_set_progressbar_val(progress);

	if (s_info.current_lap > 0) {
		/*
		 * Calculate sum of current lap elapse time
		 */
		current_sum = _get_current_ms_time() - s_info.time_ref + s_info.time_elapse_sum - s_info.time_lap_diff;

		sec = (int)current_sum / 1000;
		msec = (int)current_sum % 1000;
		sec = sec % 60;

		/*
		 * Rotate Stopwatch the lap mark
		 */
		degree = sec * SEC_ANGLE;
		degree += msec * SEC_ANGLE / 1000.0;

		view_stopwatch_rotate_mark(STOPWATCH_MARK_TYPE_LAP, degree, (STOPWATCH_MARK_WIDTH / 2), (STOPWATCH_MARK_HEIGHT / 2));
	}

	return ECORE_CALLBACK_RENEW;
}

/**
 * @brief Gets system time by milliseconds.
 */
static long long _get_current_ms_time(void)
{
	struct timespec tp;
	long long res = 0;

	if (clock_gettime(CLOCK_MONOTONIC, &tp) == -1) {
		/*
		 * Zero mean invalid time
		 */
		return 0;
	} else {
		/*
		 * Calculate milliseconds time
		 */
		res = tp.tv_sec * 1000 + tp.tv_nsec / 1000000;
		return res;
	}
}

static Eina_Bool _lap_visibility_cb(void *data)
{
	view_stopwatch_set_lapmark_visibility(false);
	return ECORE_CALLBACK_CANCEL;
}

/**
 * @brief Initializes Stopwatch.
 */
static void _init_stopwatch(void)
{
	int i;

	/*
	 * Initialize static data
	 */
	for (i = 0 ;  i <= STOPWATCH_LAP_MAX ; i++) {
		s_info.lap_record[i] = 0;
	}

	s_info.time_ref = _get_current_ms_time();
	s_info.time_elapse_sum = 0;
	s_info.time_lap_diff = 0;
	s_info.current_lap = 0;

	/*
	 * Initialize view
	 */
	stopwatch_handle_animator(STOPWATCH_ANIMATION_INIT);
	view_stopwatch_set_lap_number(s_info.current_lap);
	view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_START);
	view_stopwatch_set_button_released(STOPWATCH_BUTTON_TYPE_LAP_READY);
	s_info.state = STOPWATCH_STATE_READY;
	view_stopwatch_set_progressbar_val(0);
	ecore_timer_add(0.1, _lap_visibility_cb, NULL);
}
