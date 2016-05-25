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

#if !defined(_VIEW_H)
#define _VIEW_H

#define EDJ_FILE "edje/main.edj"
#define GRP_MAIN "main"

#define STOPWATCH_MARK_WIDTH 360
#define STOPWATCH_MARK_HEIGHT 360

#define STOPWATCH_ANIMATION_INIT 0
#define STOPWATCH_ANIMATION_START 1
#define STOPWATCH_ANIMATION_STOP 2
#define STOPWATCH_ANIMATION_RESUME 3

Eina_Bool view_create(void);
void view_stopwatch_create_layout(const char *file_path);
Evas_Object *view_create_win(const char *pkg_name);
Evas_Object *view_create_conformant_without_indicator(Evas_Object *win);
Evas_Object *view_create_layout(Evas_Object *parent, const char *file_path, const char *group_name, Eext_Event_Cb cb_function, void *user_data);
Evas_Object *view_create_layout_for_conformant(Evas_Object *parent, const char *file_path, const char *group_name, Eext_Event_Cb cb_function, void *user_data);
Evas_Object *view_create_layout_by_theme(Evas_Object *parent, const char *class_name, const char *group_name, const char *style);
void view_destroy(void);
void view_set_image(Evas_Object *parent, const char *part_name, const char *image_path);
void view_set_text(Evas_Object *parent, const char *part_name, const char *text);
void view_set_color(Evas_Object *parent, const char *part_name, int r, int g, int b, int a);
Evas_Object *view_create_part(Evas_Object *parent, const char *image_path, int position_x, int position_y, int size_w, int size_h);
void view_stopwatch_set_part(const char *image_path, stopwatch_mark_type_e type);
void view_stopwatch_add_callback_to_signal(const char *emission, const char *source, Edje_Signal_Cb func, void *data);
void view_stopwatch_play_press_animation(void);
void view_stopwatch_set_button_pressed(stopwatch_button_type_e type);
void view_stopwatch_set_button_released(stopwatch_button_type_e type);
void view_stopwatch_rotate_mark(stopwatch_mark_type_e type, double degree, Evas_Coord cx, Evas_Coord cy);
void view_stopwatch_set_lapmark_visibility(bool on);
void view_stopwatch_set_lap_number(int lap);
Evas_Object *view_create_progressbar(Evas_Object *parent, double radius, int line_width);
Eina_Bool view_set_progressbar(Evas_Object *parent, const char *part_name, double radius, int line_width);
Eina_Bool view_stopwatch_set_progressbar(void);
void view_stopwatch_set_progressbar_val(double val);
Evas_Object *view_stopwatch_get_layout_object(void);
#endif
