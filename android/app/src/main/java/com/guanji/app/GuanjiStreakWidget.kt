package com.guanji.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/**
 * 连续记录进度小组件（2x2，#35）：
 * 连续天数大数字 + 到里程碑（7/30 天）的进度条 + 温和文案（非戒断）
 */
class GuanjiStreakWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val openPending = WidgetStatsHelper.openApp(context, OpenMode.OPEN_HOME)   // #37：只进首页
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_streak).apply {
                setOnClickPendingIntent(R.id.streak_root, openPending)
                bindStats(context, this)
            }
            appWidgetManager.updateAppWidget(id, views)
        }
    }

    private fun bindStats(context: Context, views: RemoteViews) {
        val stats = WidgetStatsHelper.loadStats(context)
        val streak = stats?.streak ?: 0
        val milestone = if (streak >= 30) 30 else 7
        val remaining = (milestone - streak).coerceAtLeast(0)

        views.setTextViewText(R.id.streak_num, streak.toString())
        views.setTextViewText(
            R.id.streak_text,
            if (streak == 0) context.getString(R.string.streak_zero)
            else context.getString(R.string.streak_progress, milestone, remaining)
        )
        views.setProgressBar(R.id.streak_bar, milestone, streak.coerceAtMost(milestone), false)
    }
}
