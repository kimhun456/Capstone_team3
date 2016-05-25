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
#include <app.h>
#include <efl_extension.h>
#include <dlog.h>
#include "stopwatch.h"
#include "data.h"

/*
 * @brief Initialization function for data module
 */
void data_initialize(void)
{
	/*
	 * If you need to initialize managing data,
	 * please use this function.
	 */
}

/*
 * @brief Finalization function for data module
 */
void data_finalize(void)
{
	/*
	 * If you need to finalize managing data,
	 * please use this function.
	 */
}

/*
 * @brief Get full path of resource
 * @param[in] file_path File path of target file
 * @param[out] full_path Full file path concatenated with resource path
 * @param[in] path_max Max length of full file path
 */
void data_get_full_path(const char *file_path, char *full_path, int path_max)
{
	char *res_path = app_get_resource_path();
	if (res_path) {
		snprintf(full_path, path_max, "%s%s", res_path, file_path);
		free(res_path);
	}
}

/*
 * @brief Get path of image file for part
 * @param[in] part_name Part name of the target image path
 */
char *data_get_image_path(const char *part_name)
{
	/*
	 * You can use this function to retrieve data.
	 */
	char *ret = NULL;
	char full_path[PATH_MAX] = { 0, };
	char *res_path = app_get_resource_path();

	if (res_path) {
		if (!strcmp("sw.number.bg", part_name))
			snprintf(full_path, sizeof(full_path) - 1, "%s%s", res_path, "images/b_stopwatch_unit_numder.png");
		else if (!strcmp("sw.mark.main", part_name))
			snprintf(full_path, sizeof(full_path) - 1, "%s%s", res_path, "images/b_stopwatch_mark.png");
		else if (!strcmp("sw.mark.lap", part_name))
			snprintf(full_path, sizeof(full_path) - 1, "%s%s", res_path, "images/b_stopwatch_lap_mark.png");
		else if (!strcmp("sw.main.lap.number.bg", part_name))
			snprintf(full_path, sizeof(full_path) - 1, "%s%s", res_path, "images/b_stopwatch_number_bg.png");
		else {
			dlog_print(DLOG_ERROR, LOG_TAG, "failed to get image.");
			free(res_path);
			return NULL;
		}

		ret = strdup(full_path);
		free(res_path);
	}

	return ret;
}
