/*
 * Copyright (c) 2016 Samsung Electronics Co., Ltd
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

#include <tizen.h>
#include <dlog.h>
#include <app.h>
#include <efl_extension.h>
#include <Elementary.h>
#include "stopwatch.h"
#include "view.h"

static struct view_info {
	Evas_Object *win;
	Evas_Object *conform;
	Evas_Object *layout;
	Evas_Object *main_mark;
	Evas_Object *lap_mark;
	Evas_Object *progressbar;
} s_info = {
	.win = NULL,
	.conform = NULL,
	.layout = NULL,
	.main_mark = NULL,
	.lap_mark = NULL,
	.progressbar = NULL,
};

static void _win_delete_request_cb(void *data, Evas_Object *obj, void *event_info);
static void _stopwatch_layout_back_cb(void *data, Evas_Object *obj, void *event_info);

/**
 * @brief Creates essential objects: window, conformant and layout.
 */
Eina_Bool view_create(void)
{
	/* Create the window */
	s_info.win = view_create_win(PACKAGE);
	if (s_info.win == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "failed to create a window.");
		return EINA_FALSE;
	}

	/* Create the conformant */
	s_info.conform = view_create_conformant_without_indicator(s_info.win);
	if (s_info.conform == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "failed to create a conformant");
		return EINA_FALSE;
	}

	/* Show the window after main view is set up */
	evas_object_show(s_info.win);
	return EINA_TRUE;
}

/**
 * @brief Creates a basic window named package.
 * @param[in] pkg_name Name of the window
 */
Evas_Object *view_create_win(const char *pkg_name)
{
	Evas_Object *win = NULL;

	/*
	 * Window
	 * Create and initialize elm_win.
	 * elm_win is mandatory to manipulate the window.
	 */
	win = elm_win_util_standard_add(pkg_name, pkg_name);
	elm_win_conformant_set(win, EINA_TRUE);
	elm_win_autodel_set(win, EINA_TRUE);

	/* Rotation setting */
	if (elm_win_wm_rotation_supported_get(win)) {
		int rots[4] = { 0, 90, 180, 270 };
		elm_win_wm_rotation_available_rotations_set(win, (const int *)(&rots), 4);
	}

	evas_object_smart_callback_add(win, "delete,request", _win_delete_request_cb, NULL);

	return win;
}

/**
 * @brief Creates a conformant without indicator for wearable app.
 * @param[in] win The object to which you want to set this conformant
 * Conformant is mandatory for base GUI to have proper size
 */
Evas_Object *view_create_conformant_without_indicator(Evas_Object *win)
{
	/*
	 * Conformant
	 * Create and initialize elm_conformant.
	 * elm_conformant is mandatory for base GUI to have proper size
	 * when indicator or virtual keypad is visible.
	 */
	Evas_Object *conform = NULL;

	if (win == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "window is NULL.");
		return NULL;
	}

	conform = elm_conformant_add(win);
	evas_object_size_hint_weight_set(conform, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);
	elm_win_resize_object_add(win, conform);

	evas_object_show(conform);

	return conform;
}

/**
 * @brief Creates a layout to target parent object with edje file.
 * @param[in] parent The object to which you want to add this layout
 * @param[in] file_path File path of the EDJ file will be used
 * @param[in] group_name Name of group in EDJ you want to set to
 * @param[in] cb_function The function called when back event is detected
 * @param[in] user_data The user data to be passed to the callback function
 */
Evas_Object *view_create_layout(Evas_Object *parent, const char *file_path, const char *group_name, Eext_Event_Cb cb_function, void *user_data)
{
	Evas_Object *layout = NULL;

	if (parent == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "parent is NULL.");
		return NULL;
	}

	/* Create layout using EDC(an edje file) */
	layout = elm_layout_add(parent);
	elm_layout_file_set(layout, file_path, group_name);

	/* Layout size setting */
	evas_object_size_hint_weight_set(layout, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);

	if (cb_function)
		eext_object_event_callback_add(layout, EEXT_CALLBACK_BACK, cb_function, user_data);

	evas_object_show(layout);

	return layout;
}

/**
 * @brief Creates and sets a layout to conformant.
 * @param[in] parent Target conformant object
 * @param[in] file_path File path of EDJ will be used
 * @param[in] group_name Group name in EDJ you want to set to layout
 * @param[in] cb_function The function will be called when the back event is detected
 * @param[in] user_data The user data to be passed to the callback functions
 */
Evas_Object *view_create_layout_for_conformant(Evas_Object *parent, const char *file_path, const char *group_name, Eext_Event_Cb cb_function, void *user_data)
{
	Evas_Object *layout = NULL;

	if (parent == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "parent is NULL.");
		return NULL;
	}

	/* Create layout for conformant */
	if (file_path == NULL)
		layout = view_create_layout_by_theme(parent, "layout", "application", "default");
	else
		layout = view_create_layout(parent, file_path, group_name, cb_function, user_data);

	if (layout == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "layout is NULL.");
		return NULL;
	}

	elm_object_content_set(parent, layout);

	return layout;
}

/**
 * @brief Creates a layout with theme.
 * @param[in] parent Object to which you want to add this layout
 * @param[in] class_name The class of the group
 * @param[in] group_name Group name in EDJ that you want to set to layout
 * @param[in] style The style to use
 */
Evas_Object *view_create_layout_by_theme(Evas_Object *parent, const char *class_name, const char *group_name, const char *style)
{
	/*
	 * Layout
	 * Create and initialize elm_layout.
	 * view_create_layout_by_theme() is used to create layout by using premade edje file.
	 */
	Evas_Object *layout = NULL;

	if (parent == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "parent is NULL.");
		return NULL;
	}

	layout = elm_layout_add(parent);
	elm_layout_theme_set(layout, class_name, group_name, style);
	evas_object_size_hint_weight_set(layout, EVAS_HINT_EXPAND, EVAS_HINT_EXPAND);

	evas_object_show(layout);

	return layout;
}

/**
 * @brief Creates essential object for the this application, like conformant and layout
 * @param[in] file_path File path of EDJ file will be used
 */
void view_stopwatch_create_layout(const char *file_path)
{
	s_info.layout = view_create_layout_for_conformant(s_info.conform, file_path, GRP_MAIN, _stopwatch_layout_back_cb, NULL);
	if (s_info.layout == NULL) {
		evas_object_del(s_info.win);
		dlog_print(DLOG_ERROR, LOG_TAG, "failed to create a content.");
		return;
	}
}

/**
 * @brief Destroys window and frees its resources.
 */
void view_destroy(void)
{
	/* Initialize and free static data. */
	if (s_info.conform) {
		evas_object_del(s_info.conform);
		s_info.conform = NULL;
	}

	if (s_info.layout) {
		evas_object_del(s_info.layout);
		s_info.layout = NULL;
	}

	if (s_info.main_mark) {
		evas_object_del(s_info.main_mark);
		s_info.main_mark = NULL;
	}

	if (s_info.lap_mark) {
		evas_object_del(s_info.lap_mark);
		s_info.lap_mark = NULL;
	}

	if (s_info.progressbar) {
		evas_object_del(s_info.progressbar);
		s_info.progressbar = NULL;
	}

	if (s_info.win == NULL)
		return;

	evas_object_del(s_info.win);
}

/**
 * @brief Layout back key event callback function
 * @param[in] data The data to be passed to the callback function
 * @param[in] obj The Evas object handle to be passed to the callback function
 * @param[in] event_info The system event information
 */
static void _stopwatch_layout_back_cb(void *data, Evas_Object *obj, void *event_info)
{
	dlog_print(DLOG_DEBUG, LOG_TAG, "_stopwatch_layout_back_cb is called");
	ui_app_exit();
}

/**
 * @brief Function will be operated when window is deleted
 * @param[in] data The data to be passed to the callback function
 * @param[in] obj The Evas object handle to be passed to the callback function
 * @param[in] event_info The system event information
 */
static void _win_delete_request_cb(void *data, Evas_Object *obj, void *event_info)
{
	dlog_print(DLOG_DEBUG, LOG_TAG, "_win_delete_request_cb is called");
	ui_app_exit();
}

/**
 * @brief Sets image to given part.
 * @param[in] parent Object has part to which you want to set this image
 * @param[in] part_name Part name to which you want to set this image
 * @param[in] image_path Path of the image file
 */
void view_set_image(Evas_Object *parent, const char *part_name, const char *image_path)
{
	Evas_Object *image = NULL;

	if (parent == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "parent is NULL.");
		return;
	}

	image = elm_object_part_content_get(parent, part_name);
	if (image == NULL) {
		image = elm_image_add(parent);
		if (image == NULL) {
			dlog_print(DLOG_ERROR, LOG_TAG, "failed to create an image object.");
			return;
		}

		elm_object_part_content_set(parent, part_name, image);
	}

	if (EINA_FALSE == elm_image_file_set(image, image_path, NULL)) {
		dlog_print(DLOG_ERROR, LOG_TAG, "failed to set image: %s", image_path);
		return;
	}

	evas_object_show(image);

	return;
}

/**
 * @brief Sets text to the part.
 * @param[in] parent Object has part to which you want to set text
 * @param[in] part_name Part name to which you want to set the text
 * @param[in] text Text you want to set to the part
 */
void view_set_text(Evas_Object *parent, const char *part_name, const char *text)
{
	if (parent == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "parent is NULL.");
		return;
	}

	/* Set text of target part object. */
	elm_object_part_text_set(parent, part_name, text);
}

/**
 * @brief Sets color of the part.
 * @param[in] parent Object has part to which you want to set color
 * @param[in] part_name Name of part to which you want to set color
 * @param[in] r R of RGBA you want to set to the part
 * @param[in] g G of RGBA you want to set to the part
 * @param[in] b B of RGBA you want to set to the part
 * @param[in] a A of RGBA you want to set to the part
 */
void view_set_color(Evas_Object *parent, const char *part_name, int r, int g, int b, int a)
{
	Evas_Object *obj = NULL;

	if (parent == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "parent is NULL.");
		return;
	}

	obj = elm_object_part_content_get(parent, part_name);
	if (obj == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "failed to get parent.");
		return;
	}

	/* Set color of target part object. */
	evas_object_color_set(obj, r, g, b, a);
}

/**
 * @brief Create a part to parent object.
 * @param[in] parent The object to which you want to add this object
 * @param[in] image_path The path of the image file you want to set
 * @param[in] position_x The X coordinate of the part
 * @param[in] position_y The Y coordinate of the part
 * @param[in] size_w The width size of the part
 * @param[in] size_h The height size of the part
 */
Evas_Object *view_create_part(Evas_Object *parent, const char *image_path, int position_x, int position_y, int size_w, int size_h)
{
	Evas_Object *part = NULL;
	Eina_Bool ret = EINA_FALSE;

	if (parent == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "The Target parent object is NULL");
		return NULL;
	}

	part = elm_image_add(parent);
	if (part == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Failed to add a image");
		return NULL;
	}

	ret = elm_image_file_set(part, image_path, NULL);
	if (ret != EINA_TRUE) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Failed to set a image");
		evas_object_del(part);
		return NULL;
	}

	/* Part position setting */
	evas_object_move(part, position_x, position_y);

	/* Part size setting */
	evas_object_resize(part, size_w, size_h);
	evas_object_show(part);

	return part;
}

/**
 * @brief Create part and set color.
 * @param[in] parent The object to which you want to add this object
 * @param[in] image_path The path of the image file you want to set
 * @param[in] type The type of part will be created
 */
void view_stopwatch_set_part(const char *image_path, stopwatch_mark_type_e type)
{
	if (type == STOPWATCH_MARK_TYPE_MAIN) {
		s_info.main_mark = view_create_part(s_info.layout, image_path, 0, 0, STOPWATCH_MARK_WIDTH, STOPWATCH_MARK_HEIGHT);
		evas_object_color_set(s_info.main_mark, 226, 0, 15, 255);
	} else if (type == STOPWATCH_MARK_TYPE_LAP) {
		s_info.lap_mark = view_create_part(s_info.layout, image_path, 0, 0, STOPWATCH_MARK_WIDTH, STOPWATCH_MARK_HEIGHT);
		evas_object_color_set(s_info.lap_mark, 0, 148, 255, 255);
		view_stopwatch_set_lapmark_visibility(false);
	}
}

/**
 * @brief Adds callback function to signal.
 * @param[in] emission The signal name to be used
 * @param[in] source The signal source to be used
 * @param[in] func The callback function to be executed when the signal is emitted
 * @param[in] user_data The user data to be passed to the callback function
 */
void view_stopwatch_add_callback_to_signal(const char *emission, const char *source, Edje_Signal_Cb func, void *data)
{
	elm_object_signal_callback_add(s_info.layout, emission, source, func, data);
}

/**
 * @brief Plays button press animation.
 */
void view_stopwatch_play_press_animation(void)
{
	elm_layout_signal_emit(s_info.layout, "start.touch", "rect.touch.start");
}

/**
 * @brief Sets a button pressed state.
 * @param[in] type The type of button will be changed
 */
void view_stopwatch_set_button_pressed(stopwatch_button_type_e type)
{
	switch (type) {
	case STOPWATCH_BUTTON_TYPE_START:
		elm_layout_signal_emit(s_info.layout, "start_pressed", "rect.touch.start");
		break;
	case STOPWATCH_BUTTON_TYPE_STOP:
		elm_layout_signal_emit(s_info.layout, "stop_pressed", "rect.touch.start");
		break;
	case STOPWATCH_BUTTON_TYPE_RESUME:
		elm_layout_signal_emit(s_info.layout, "resume_pressed", "rect.touch.start");
		break;
	case STOPWATCH_BUTTON_TYPE_LAP:
		elm_layout_signal_emit(s_info.layout, "lap_pressed", "rect.touch.reset");
		break;
	case STOPWATCH_BUTTON_TYPE_RESET:
		elm_layout_signal_emit(s_info.layout, "reset_pressed", "rect.touch.reset");
		break;
	default:
		break;
	}
}

/**
 * @brief Sets a button released state.
 * @param[in] type The type of button will be changed
 */
void view_stopwatch_set_button_released(stopwatch_button_type_e type)
{
	switch (type) {
	case STOPWATCH_BUTTON_TYPE_START:
		elm_layout_signal_emit(s_info.layout, "start_released", "rect.touch.start");
		break;
	case STOPWATCH_BUTTON_TYPE_STOP:
		elm_layout_signal_emit(s_info.layout, "stop_released", "rect.touch.start");
		break;
	case STOPWATCH_BUTTON_TYPE_RESUME:
		elm_layout_signal_emit(s_info.layout, "resume_released", "rect.touch.start");
		break;
	case STOPWATCH_BUTTON_TYPE_LAP:
		elm_layout_signal_emit(s_info.layout, "lap_released", "rect.touch.reset");
		break;
	case STOPWATCH_BUTTON_TYPE_LAP_READY:
		elm_layout_signal_emit(s_info.layout, "lap_removed", "rect.touch.reset");
		break;
	case STOPWATCH_BUTTON_TYPE_RESET:
		elm_layout_signal_emit(s_info.layout, "reset_released", "rect.touch.reset");
		break;
	case STOPWATCH_BUTTON_TYPE_MAX_STOP:
		elm_layout_signal_emit(s_info.layout, "start_removed", "rect.touch.start");
		break;
	default:
		break;
	}
}

/**
 * @brief Rotates mark of stopwatch.
 * @param[in] type The type of button will be rotated
 * @param[in] degree The degree you want to rotate
 * @param[in] cx The rotation's center horizontal position
 * @param[in] cy The rotation's center vertical position
 */
void view_stopwatch_rotate_mark(stopwatch_mark_type_e type, double degree, Evas_Coord cx, Evas_Coord cy)
{
	Evas_Map *m = NULL;
	Evas_Object *target = NULL;

	if (type == STOPWATCH_MARK_TYPE_MAIN)
		target = s_info.main_mark;
	else
		target = s_info.lap_mark;

	/* Use the Evas Map to rotate a target object */

	m = evas_map_new(4);
	evas_map_util_points_populate_from_object(m, target);
	evas_map_util_rotate(m, degree, cx, cy);
	evas_object_map_set(target, m);
	evas_object_map_enable_set(target, EINA_TRUE);

	evas_map_free(m);
}

/**
 * @brief Turns on/off lap mark's visibility.
 * @param[in] on The operation will be executed
 */
void view_stopwatch_set_lapmark_visibility(bool on)
{
	/* Change a opacity of object color to control visibility */

	if (on)
		evas_object_show(s_info.lap_mark);
	else
		evas_object_hide(s_info.lap_mark);
}

/**
 * @brief Sets stop watch lap's status view.
 * @param[in] lap The value of current lap
 */
void view_stopwatch_set_lap_number(int lap)
{
	/* Set a number and the background image visibility. */

	if (lap == 0) {
		/* Set number to initial status(remove number and background)*/
		view_set_text(s_info.layout, "text.main.lap.number", "");
		view_set_color(s_info.layout, "sw.main.lap.number.bg", 63, 63, 63, 0);
	} else {
		char lap_str[3] = {0, };

		if (lap < 10)
			sprintf(lap_str, "0%d", lap);
		else
			sprintf(lap_str, "%d", lap);

		view_set_text(s_info.layout, "text.main.lap.number", lap_str);
		view_set_color(s_info.layout, "sw.main.lap.number.bg", 63, 63, 63, 255);
	}
}

/**
 * @brief Creates a progressbar.
 * @param[in] parent Object has part to which you want to set this progressbar
 * @param[in] radius Radius The radius value of a given circle object
 * @param[in] line_width The line width value of the circle object
 */
Evas_Object *view_create_progressbar(Evas_Object *parent, double radius, int line_width)
{
	Evas_Object *progressbar = NULL;

	if (parent == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "parent is NULL.");
		return NULL;
	}

	progressbar = eext_circle_object_progressbar_add(parent, NULL);

	eext_circle_object_value_min_max_set(progressbar, 0.0, 100.0);
	eext_circle_object_radius_set(progressbar, radius);
	eext_circle_object_line_width_set(progressbar, line_width);
	evas_object_show(progressbar);

	s_info.progressbar = progressbar;
	return progressbar;
}

/**
 * @brief Sets a progressbar to given part.
 * @param[in] parent Object has part to which you want to set
 * @param[in] part_name Part name to which you want to set
 * @param[in] radius Radius The radius value of a given circle object
 * @param[in] line_width The line width value of the circle object
 */
Eina_Bool view_set_progressbar(Evas_Object *parent, const char *part_name, double radius, int line_width)
{
	Evas_Object *progressbar = NULL;

	if (parent == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "parent is NULL.");
		return EINA_FALSE;
	}

	progressbar = view_create_progressbar(parent, radius, line_width);
	if (progressbar == NULL) {
		dlog_print(DLOG_ERROR, LOG_TAG, "parent is NULL.");
		return EINA_FALSE;
	}

	elm_object_part_content_set(parent, part_name, progressbar);
	return EINA_TRUE;
}

/**
 * @brief Creates stopwatch minute progressbar.
 */
Eina_Bool view_stopwatch_set_progressbar(void)
{
	if (!view_set_progressbar(s_info.layout, "sw.progressbar", PROGRESSBAR_RADIUS, PROGRESSBAR_WIDTH)) {
		dlog_print(DLOG_ERROR, LOG_TAG, "Progressbar create fail!");
		return EINA_FALSE;
	}

	/*
	 * A Circle progressbar has the following items:
	 * default : Default circle item that draws the progressbar.
	 * bg : Progressbar background circle item.
	 */

	/* Set color of target part object. */
	eext_circle_object_item_color_set(s_info.progressbar, "default", 17, 179, 255, 255);
	eext_circle_object_item_color_set(s_info.progressbar, "bg", 0, 0, 0, 0);
	return EINA_TRUE;
}

/**
 * @brief Sets stopwatch minute progressbar value.
 * @param[in] val Value to which you want to set
 */
void view_stopwatch_set_progressbar_val(double val)
{
	if (s_info.progressbar)
		eext_circle_object_value_set(s_info.progressbar, val);
}

/**
 * @brief This function just return static layout object.
 */
Evas_Object *view_stopwatch_get_layout_object(void)
{
	return s_info.layout;
}
