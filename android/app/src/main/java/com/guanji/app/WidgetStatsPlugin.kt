package com.guanji.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * 小组件统计同步：#32-#36 共用
 * WebView 在记录变化后调用 syncStats，把聚合统计（管道分隔字符串）写入 SharedPreferences，
 * 并广播 APPWIDGET_UPDATE 让所有已添加的小组件刷新显示。
 */
@CapacitorPlugin(name = "WidgetStats")
class WidgetStatsPlugin : Plugin() {

    @PluginMethod
    fun syncStats(call: PluginCall) {
        val stats = call.getString("stats") ?: ""
        val prefs = context.getSharedPreferences(WidgetStatsHelper.PREFS, Context.MODE_PRIVATE)
        prefs.edit().putString(WidgetStatsHelper.KEY_STATS, stats).apply()
        refreshAllWidgets()
        call.resolve(JSObject().put("ok", true))
    }

    private fun refreshAllWidgets() {
        val appContext = context.applicationContext
        val manager = AppWidgetManager.getInstance(appContext)
        val providers = listOf(
            GuanjiWidget::class.java,
            GuanjiStatsWidget::class.java,
            GuanjiWeekWidget::class.java,
            GuanjiStreakWidget::class.java,
            GuanjiTodayWidget::class.java,
        )
        providers.forEach { cls ->
            val ids = manager.getAppWidgetIds(ComponentName(appContext, cls))
            if (ids.isNotEmpty()) {
                val intent = Intent(appContext, cls).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                }
                appContext.sendBroadcast(intent)
            }
        }
    }
}

/** 小组件统计数据（管道分隔解析，零 JSON 依赖） */
data class WidgetStats(
    val todayCount: Int,
    val weekCount: Int,
    val streak: Int,
    val weekDelta: Int?,
    val week: IntArray,
    val monthCount: Int,
    val monthDelta: Int?,
) {
    companion object {
        /** 解析 "today|week|streak|delta|w0,w1,...|month|mDelta" */
        fun parse(raw: String): WidgetStats? {
            val parts = raw.split('|')
            if (parts.size < 6) return null
            return try {
                WidgetStats(
                    todayCount = parts[0].toInt(),
                    weekCount = parts[1].toInt(),
                    streak = parts[2].toInt(),
                    weekDelta = parts[3].ifBlank { null }?.toInt(),
                    week = parts[4].split(',').map { it.toInt() }.toIntArray(),
                    monthCount = parts[5].toInt(),
                    monthDelta = if (parts.size > 6) parts[6].ifBlank { null }?.toInt() else null,
                )
            } catch (e: Exception) {
                null
            }
        }
    }
}

/** 打开 App 的模式（#37：requestCode 区分，避免 PendingIntent 互相覆盖） */
enum class OpenMode {
    /** 正常进首页，不弹面板、不自动记录（统计类小组件点击） */
    OPEN_HOME,
    /** 打开记录面板（预留） */
    OPEN_RECORD,
    /** 一键快速记录（快速记录小组件整卡点击） */
    QUICK_RECORD,
}

/** 小组件公共工具：读统计 / 构造打开 App 的 PendingIntent */
object WidgetStatsHelper {
    const val PREFS = "guanji_widget_stats"
    const val KEY_STATS = "stats"

    fun loadStats(context: Context): WidgetStats? {
        val prefs: SharedPreferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_STATS, null) ?: return null
        return WidgetStats.parse(raw)
    }

    fun openApp(context: Context, mode: OpenMode): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            when (mode) {
                OpenMode.QUICK_RECORD -> putExtra(MainActivity.EXTRA_GUANJI_QUICK_RECORD, true)
                OpenMode.OPEN_RECORD -> putExtra(MainActivity.EXTRA_GUANJI_RECORD, true)
                OpenMode.OPEN_HOME -> { /* 无 extra：正常进首页 */ }
            }
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val requestCode = when (mode) {
            OpenMode.OPEN_HOME -> 2
            OpenMode.OPEN_RECORD -> 0
            OpenMode.QUICK_RECORD -> 1
        }
        // 不同 requestCode 避免 PendingIntent 冲突
        return PendingIntent.getActivity(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
