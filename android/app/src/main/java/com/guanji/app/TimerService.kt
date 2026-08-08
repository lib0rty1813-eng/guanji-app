package com.guanji.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.util.TypedValue
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * #60：计时前台服务（运动 App 标准做法）——
 * OEM（OPPO 等）在息屏/后台会冻结 App 进程，导致 Handler 定时更新停摆（#59 AOD 不刷新）；
 * 前台服务保证进程常驻，计时通知的「已计时 X 分钟」每 60s 持续刷新（AOD/通知栏/折叠态实时）。
 * 通知构建逻辑（含魅族胶囊/快捷操作/短文本）静态化于此，插件只负责启停服务。
 */
class TimerService : Service() {

    companion object {
        const val EXTRA_START_TIME = "start_time_ms"
        private const val API_36 = 36
        private const val UPDATE_INTERVAL_MS = 60000L

        fun start(context: Context, startTimeMs: Long) {
            val intent = Intent(context, TimerService::class.java).putExtra(EXTRA_START_TIME, startTimeMs)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, TimerService::class.java))
        }

        /** #60：系统级闹钟兜底（每分钟更新 contentText）——ColorOS 息屏冻结进程消息队列，AlarmManager 由系统触发不受影响 */
        fun scheduleAlarm(context: Context, startTimeMs: Long) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
            try {
                am.setExactAndAllowWhileIdle(
                    android.app.AlarmManager.RTC_WAKEUP,
                    System.currentTimeMillis() + UPDATE_INTERVAL_MS,
                    TimerAlarmReceiver.alarmPendingIntent(context, startTimeMs)
                )
            } catch (e: Exception) {
                /* 高频闹钟被系统拦截时静默（降级为亮屏纠正） */
            }
        }

        fun cancelAlarm(context: Context) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
            try {
                am.cancel(TimerAlarmReceiver.alarmPendingIntent(context, System.currentTimeMillis()))
            } catch (e: Exception) { /* 忽略 */ }
        }

        /* ---------- 通知构建（startTimer 与 60s 更新共用） ---------- */

        fun isFlyme(): Boolean =
            Build.MANUFACTURER.equals("Meizu", ignoreCase = true)

        private fun ensureChannel(context: Context) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel(TimerLiveUpdatePlugin.CHANNEL_ID) == null) {
                val ch = NotificationChannel(TimerLiveUpdatePlugin.CHANNEL_ID, "计时进行中", NotificationManager.IMPORTANCE_LOW)
                ch.description = "「就现在」计时进行中时显示秒数"
                nm.createNotificationChannel(ch)
            }
        }

        private fun notifyCompat(context: Context): NotificationManagerCompat? {
            return try {
                val nmc = NotificationManagerCompat.from(context)
                if (!nmc.areNotificationsEnabled()) return null
                nmc
            } catch (e: Exception) {
                null
            }
        }

        private fun openAppPendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            return PendingIntent.getActivity(
                context, 3, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        private fun deletePendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, TimerDeleteReceiver::class.java)
            return PendingIntent.getBroadcast(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        /** #57：通知操作按钮 PendingIntent（4=结束并记录 / 5=取消） */
        private fun timerActionPendingIntent(context: Context, finish: Boolean): PendingIntent {
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                if (finish) putExtra(MainActivity.EXTRA_GUANJI_TIMER_FINISH, true)
                else putExtra(MainActivity.EXTRA_GUANJI_TIMER_CANCEL, true)
            }
            return PendingIntent.getActivity(
                context, if (finish) 4 else 5, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        /** #59：动态 contentText——AOD 息屏卡片/通知栏折叠态显示「已计时 X 分钟」 */
        fun progressText(startTimeMs: Long): String {
            val minutes = Math.max(1, ((System.currentTimeMillis() - startTimeMs) / 60000).toInt())
            return "已计时 $minutes 分钟"
        }

        /** Chronometer base：elapsedRealtime 基准（换算自 wall-clock 开始时间） */
        private fun chronoBaseOf(startTimeMs: Long): Long {
            val elapsed = System.currentTimeMillis() - startTimeMs
            return SystemClock.elapsedRealtime() - elapsed
        }

        private fun flymeCapsuleRv(context: Context, startTimeMs: Long): RemoteViews {
            val rv = RemoteViews(context.packageName, R.layout.flyme_live_capsule)
            rv.setChronometer(R.id.capsule_chronometer, chronoBaseOf(startTimeMs), "计时 %s", true)
            return rv
        }

        private fun flymeContentRv(context: Context, startTimeMs: Long): RemoteViews {
            val rv = RemoteViews(context.packageName, R.layout.flyme_live_content)
            rv.setInt(R.id.logo_box, "setBackgroundResource", R.drawable.flyme_live_logo_bg)
            rv.setImageViewResource(R.id.logo_icon, R.drawable.flyme_live_heart)
            rv.setTextColor(R.id.content_title, Color.rgb(0, 0, 0))
            rv.setTextViewTextSize(R.id.content_title, TypedValue.COMPLEX_UNIT_SP, 14f)
            rv.setChronometer(R.id.content_chronometer, chronoBaseOf(startTimeMs), "已计时 %s", true)
            rv.setTextColor(R.id.content_chronometer, Color.rgb(0, 122, 255))
            rv.setTextViewTextSize(R.id.content_chronometer, TypedValue.COMPLEX_UNIT_SP, 25f)
            rv.setImageViewResource(R.id.status_dot, R.drawable.flyme_live_dot)
            rv.setTextColor(R.id.status_text, Color.rgb(142, 142, 147))
            rv.setTextViewTextSize(R.id.status_text, TypedValue.COMPLEX_UNIT_SP, 11f)
            rv.setInt(R.id.btn_finish, "setBackgroundResource", R.drawable.flyme_btn_primary)
            rv.setTextColor(R.id.btn_finish, Color.WHITE)
            rv.setTextViewTextSize(R.id.btn_finish, TypedValue.COMPLEX_UNIT_SP, 14f)
            rv.setInt(R.id.btn_cancel, "setBackgroundResource", R.drawable.flyme_btn_secondary)
            rv.setTextColor(R.id.btn_cancel, Color.rgb(0, 0, 0))
            rv.setTextViewTextSize(R.id.btn_cancel, TypedValue.COMPLEX_UNIT_SP, 14f)
            rv.setOnClickPendingIntent(R.id.btn_finish, timerActionPendingIntent(context, true))
            rv.setOnClickPendingIntent(R.id.btn_cancel, timerActionPendingIntent(context, false))
            return rv
        }

        private fun flymeLiveBundle(context: Context, startTimeMs: Long): Bundle {
            val capsule = Bundle().apply {
                putInt("notification.live.capsuleStatus", 1)
                putInt("notification.live.capsuleType", 5)
                putString("notification.live.capsuleContent", "观己 · 计时中")
                putParcelable(
                    "notification.live.capsuleIcon",
                    Icon.createWithResource(context, R.drawable.ic_stat_timer)
                )
                putInt("notification.live.capsuleBgColor", Color.parseColor("#007AFF"))
                putInt("notification.live.capsuleContentColor", Color.WHITE)
                putParcelable("notification.live.capsule.content.remote.view", flymeCapsuleRv(context, startTimeMs))
            }
            return Bundle().apply {
                putBoolean("is_live", true)
                putInt("notification.live.operation", 0)
                putInt("notification.live.type", 2)
                putBundle("notification.live.capsule", capsule)
            }
        }

        /** 基础构建（短文本 #58 / 提升 / chronometer / ProgressStyle） */
        private fun baseBuilder(context: Context, title: String): NotificationCompat.Builder {
            ensureChannel(context)
            val b = NotificationCompat.Builder(context, TimerLiveUpdatePlugin.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_timer)
                .setContentTitle(title)
                .setOngoing(true)
                .setWhen(System.currentTimeMillis())
                .setUsesChronometer(true)
                .setProgress(0, 0, true)
                .setContentIntent(openAppPendingIntent(context))
            if (Build.VERSION.SDK_INT >= API_36) {
                b.setRequestPromotedOngoing(true)
            }
            return b
        }

        /** #58：构建后注入状态条状标签短文本（extras key 实测 android.shortCriticalText） */
        private fun NotificationCompat.Builder.buildAndShort(): Notification {
            val n = build()
            if (Build.VERSION.SDK_INT >= 31) {
                n.extras.putCharSequence("android.shortCriticalText", "计时中")
            }
            return n
        }

        /** 计时通知（startTimer 与 60s 更新共用，属性/胶囊/chronometer/按钮/短文本完整） */
        fun buildTimerNotification(context: Context, startTimeMs: Long): Notification {
            val b = baseBuilder(context, "观己 · 计时中")
                .setWhen(startTimeMs)
                .setContentText(progressText(startTimeMs))
                .setDeleteIntent(deletePendingIntent(context))
            b.addAction(R.drawable.ic_stat_timer, "结束并记录", timerActionPendingIntent(context, true))
            b.addAction(R.drawable.ic_stat_timer, "取消", timerActionPendingIntent(context, false))
            if (isFlyme()) b.addExtras(flymeLiveBundle(context, startTimeMs))
            val notification = b.buildAndShort()
            if (isFlyme()) notification.contentView = flymeContentRv(context, startTimeMs)
            return notification
        }

        /** 测试通知（15s 自消，无操作按钮，不需要前台服务） */
        fun buildTestNotification(context: Context, startTimeMs: Long): Notification {
            val b = baseBuilder(context, "观己 · 实况通知测试")
                .setWhen(startTimeMs)
            if (isFlyme()) b.addExtras(flymeLiveBundle(context, startTimeMs))
            val notification = b.buildAndShort()
            if (isFlyme()) notification.contentView = flymeContentRv(context, startTimeMs)
            return notification
        }
    }

    private var updateHandler: Handler? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val startTimeMs = intent?.getLongExtra(EXTRA_START_TIME, System.currentTimeMillis())
            ?: System.currentTimeMillis()
        // 前台服务：复用计时通知（类型 specialUse，Android 14+ 要求）
        val notification = TimerService.buildTimerNotification(this, startTimeMs)
        ServiceCompat.startForeground(
            this, TimerLiveUpdatePlugin.NOTIF_ID, notification,
            if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        )
        startUpdates(startTimeMs)
        return START_NOT_STICKY
    }

    /** #59/#60：每分钟更新 contentText——Handler（前台）+ AlarmManager（息屏兜底，系统级触发）双保险 */
    private fun startUpdates(startTimeMs: Long) {
        updateHandler?.removeCallbacksAndMessages(null)
        val h = Handler(Looper.getMainLooper())
        updateHandler = h
        h.post(object : Runnable {
            override fun run() {
                notifyCompat(this@TimerService)?.notify(
                    TimerLiveUpdatePlugin.NOTIF_ID,
                    TimerService.buildTimerNotification(this@TimerService, startTimeMs)
                )
                h.postDelayed(this, UPDATE_INTERVAL_MS)
            }
        })
        TimerService.scheduleAlarm(this, startTimeMs)   // 息屏兜底（系统级闹钟）
    }

    override fun onDestroy() {
        updateHandler?.removeCallbacksAndMessages(null)
        updateHandler = null
        TimerService.cancelAlarm(this)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
