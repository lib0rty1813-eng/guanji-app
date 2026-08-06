package com.guanji.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/**
 * 数据看板小组件（2x2，#33）：本周次数（大数字）+ 较上周环比 + 今日 + 连续天数
 */
class GuanjiStatsWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val openPending = WidgetStatsHelper.openApp(context, OpenMode.OPEN_HOME)   // #37：只进首页
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_stats).apply {
                setOnClickPendingIntent(R.id.stats_root, openPending)
                bindStats(context, this)
            }
            appWidgetManager.updateAppWidget(id, views)
        }
    }

    private fun bindStats(context: Context, views: RemoteViews) {
        val stats = WidgetStatsHelper.loadStats(context)
        val weekCount = stats?.weekCount ?: 0
        val today = stats?.todayCount ?: 0
        val streak = stats?.streak ?: 0
        val delta = stats?.weekDelta

        views.setTextViewText(R.id.stats_week_num, weekCount.toString())
        views.setTextViewText(R.id.stats_today, context.getString(R.string.stats_today, today))
        views.setTextViewText(R.id.stats_streak, context.getString(R.string.stats_streak, streak))
        views.setTextViewText(
            R.id.stats_delta,
            if (delta == null) context.getString(R.string.stats_delta_na)
            else context.getString(R.string.stats_delta, if (delta < 0) delta.toString() else "+$delta")
        )
    }
}
