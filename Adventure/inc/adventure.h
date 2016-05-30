#ifndef __adventure_H__
#define __adventure_H__

#include <app.h>
#include <Elementary.h>
#include <system_settings.h>
#include <efl_extension.h>
#include <dlog.h>

#ifdef  LOG_TAG
#undef  LOG_TAG
#endif
#define LOG_TAG "adventure"

#if !defined(PACKAGE)
#define PACKAGE "org.example.adventure"
#endif

#define EDJ_FILE "edje/adventure.edj"
#define GRP_MAIN "main"


#endif /* __adventure_H__ */
