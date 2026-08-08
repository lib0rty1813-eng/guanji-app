package com.guanji.app

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat

/**
 * #60：计时通知更新闹钟（AlarmManager 兜底）——
 * OPPO ColorOS 息屏会冻结 App 进程消息队列（前台服务 Handler 也被冻），
 * 系统级闹钟由系统进程触发，可唤醒进程更新通知（每分钟「已计时 X 分钟」）。
 */
class TimerAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val startTimeMs = intent.getLongExtra(TimerService.EXTRA_START_TIME, System.currentTimeMillis())
        try {
            val nmc = NotificationManagerCompat.from(context)
            if (nmc.areNotificationsEnabled()) {
                nmc.notify(
                    TimerLiveUpdatePlugin.NOTIF_ID,
                    TimerService.buildTimerNotification(context, startTimeMs)
                )
            }
        } catch (e: Exception) {
            /* 通知权限被拒等：静默 */
        }
        // 重排下一分钟闹钟（保持更新链）
        TimerService.scheduleAlarm(context, startTimeMs)
    }

    companion object {
        fun alarmPendingIntent(context: Context, startTimeMs: Long): PendingIntent {
            val intent = Intent(context, TimerAlarmReceiver::class.java)
                .putExtra(TimerService.EXTRA_START_TIME, startTimeMs)
            return PendingIntent.getBroadcast(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }
}
