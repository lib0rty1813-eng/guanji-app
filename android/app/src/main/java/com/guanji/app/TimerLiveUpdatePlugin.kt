package com.guanji.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * 「就现在」计时通知（#51）：
 * - startTimer：ongoing 计时通知（setUsesChronometer 系统级计时，后台精准跳动）
 * - Android 16+（API 36）请求提升为实况通知（setRequestPromotedOngoing，androidx.core 1.17.0）
 * - 降级链：API 36+ 实况通知 / API 12-15 普通常驻通知 / 权限拒绝纯 App 内计时
 * - deleteIntent 广播标记：用户划掉通知不强行拉起 App，下次打开 App 时温和提示
 */
@CapacitorPlugin(
    name = "TimerLiveUpdate",
    permissions = [
        Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])
    ]
)
class TimerLiveUpdatePlugin : Plugin() {

    companion object {
        const val CHANNEL_ID = "guanji_timer"
        const val NOTIF_ID = 4101          // 计时通知
        const val TEST_NOTIF_ID = 4102     // 测试通知（15s 后自动取消）
        const val PREFS = "guanji_timer_flags"
        const val KEY_DISMISSED = "notif_dismissed"
        private const val API_36 = 36      // Android 16：实况通知起始版本
    }

    /* 通知渠道：IMPORTANCE_LOW（非 MIN，满足实况通知提升条件；不响铃不打扰，温和基调） */
    private fun ensureChannel() {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            val ch = NotificationChannel(CHANNEL_ID, "计时进行中", NotificationManager.IMPORTANCE_LOW)
            ch.description = "「就现在」计时进行中时显示秒数"
            nm.createNotificationChannel(ch)
        }
    }

    /* 通知权限未授予时静默跳过（JS 已走权限流程，拒绝时降级纯 App 内计时） */
    private fun notifyCompat(): NotificationManagerCompat? {
        return try {
            val nmc = NotificationManagerCompat.from(context)
            if (!nmc.areNotificationsEnabled()) return null
            nmc
        } catch (e: Exception) {
            null
        }
    }

    /* 点击通知 → 打开 App（requestCode=3，与小组件 0/1/2 区分） */
    private fun openAppPendingIntent(): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context, 3, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /* 划掉通知 → 写标记，下次打开 App 时 JS 提示一次（不强行拉起 App） */
    private fun deletePendingIntent(): PendingIntent {
        val intent = Intent(context, TimerDeleteReceiver::class.java)
        return PendingIntent.getBroadcast(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun baseBuilder(title: String, text: String): NotificationCompat.Builder {
        ensureChannel()
        val b = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_timer)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setWhen(System.currentTimeMillis())
            .setUsesChronometer(true)          // 系统级计时：后台不依赖 JS，切回用时间戳校准
            .setProgress(0, 0, true)           // indeterminate ProgressStyle（实况通知要求样式之一）
            .setContentIntent(openAppPendingIntent())
        if (Build.VERSION.SDK_INT >= API_36) {
            b.setRequestPromotedOngoing(true)  // Android 16+ 请求提升为实况通知
        }
        return b
    }

    @PluginMethod
    fun startTimer(call: PluginCall) {
        val startTimeMs = call.getLong("startTimeMs", System.currentTimeMillis()) ?: System.currentTimeMillis()
        val b = baseBuilder("观己 · 计时中", "回到 App 记录结束时刻即可")
            .setWhen(startTimeMs)              // chronometer 从开始时刻起算
            .setDeleteIntent(deletePendingIntent())
        // #52：魅族私有胶囊（仅魅族附加——自定义 contentView 会破坏标准 Live Updates 提升条件）
        if (isFlyme()) b.addExtras(buildFlymeLiveBundle(startTimeMs))
        val notification = b.build()
        if (isFlyme()) notification.contentView = buildFlymeContentRv(startTimeMs)
        notifyCompat()?.notify(NOTIF_ID, notification)
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun stopTimer(call: PluginCall) {
        notifyCompat()?.cancel(NOTIF_ID)
        call.resolve(JSObject().put("ok", true))
    }

    /** 实况通知测试：发一条示例计时通知，seconds 秒后自动取消 */
    @PluginMethod
    fun testLiveUpdate(call: PluginCall) {
        val seconds = (call.getInt("seconds", 15) ?: 15).toLong()
        val startTimeMs = System.currentTimeMillis()
        val b = baseBuilder("观己 · 实况通知测试", "$seconds 秒后自动消失")
            .setWhen(startTimeMs)
        if (isFlyme()) b.addExtras(buildFlymeLiveBundle(startTimeMs))
        val notification = b.build()
        if (isFlyme()) notification.contentView = buildFlymeContentRv(startTimeMs)
        notifyCompat()?.notify(TEST_NOTIF_ID, notification)
        Handler(Looper.getMainLooper()).postDelayed({
            NotificationManagerCompat.from(context).cancel(TEST_NOTIF_ID)
        }, seconds * 1000L)
        call.resolve(JSObject().put("ok", true))
    }

    /* ---------- #52：魅族（Flyme）私有胶囊实况通知 ----------
       参考 Ruyue-Kinsenka/Flyme-Live-Notification-Demo：
       标准通知 addExtras 注入魅族私有 key，Flyme 识别后渲染锁屏/悬浮胶囊。
       私有 API 无官方文档（Demo 作者自述参数靠试），兼容性需真机验证；
       非魅族设备这些未知 extras 会被系统忽略（无副作用）。 */

    private fun isFlyme(): Boolean =
        Build.MANUFACTURER.equals("Meizu", ignoreCase = true)

    /** Chronometer 的 base 是 elapsedRealtime 基准：换算自 wall-clock 开始时间 */
    private fun chronoBaseOf(startTimeMs: Long): Long {
        val elapsed = System.currentTimeMillis() - startTimeMs
        return SystemClock.elapsedRealtime() - elapsed
    }

    /** 胶囊布局（RemoteViews + Chronometer：系统级走秒，后台精准） */
    private fun buildFlymeCapsuleRv(startTimeMs: Long): RemoteViews {
        val rv = RemoteViews(context.packageName, R.layout.flyme_live_capsule)
        rv.setChronometer(R.id.capsule_chronometer, chronoBaseOf(startTimeMs), "计时 %s", true)
        return rv
    }

    /** 主通知内容布局 */
    private fun buildFlymeContentRv(startTimeMs: Long): RemoteViews {
        val rv = RemoteViews(context.packageName, R.layout.flyme_live_content)
        rv.setChronometer(R.id.content_chronometer, chronoBaseOf(startTimeMs), "已计时 %s", true)
        return rv
    }

    /** 魅族私有 extras：is_live + capsule 配置（值来自 Demo，capsuleType=5/status=1/operation=0/type=2） */
    private fun buildFlymeLiveBundle(startTimeMs: Long): Bundle {
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
            putParcelable("notification.live.capsule.content.remote.view", buildFlymeCapsuleRv(startTimeMs))
        }
        return Bundle().apply {
            putBoolean("is_live", true)
            putInt("notification.live.operation", 0)
            putInt("notification.live.type", 2)
            putBundle("notification.live.capsule", capsule)
        }
    }

    /** 设备状态（设置页「实况通知」测试用）：系统版本 / 通知权限 / 是否可提升 */
    @PluginMethod
    fun getLiveUpdateStatus(call: PluginCall) {
        val out = JSObject()
        out.put("sdkInt", Build.VERSION.SDK_INT)
        out.put("permissionGranted", hasNotificationPermission())
        var canPromote = false
        if (Build.VERSION.SDK_INT >= API_36) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            canPromote = nm.canPostPromotedNotifications()
        }
        out.put("canPostPromoted", canPromote)
        out.put("supported", Build.VERSION.SDK_INT >= API_36 && hasNotificationPermission() && canPromote)
        call.resolve(out)
    }

    @PluginMethod
    fun checkNotificationPermission(call: PluginCall) {
        call.resolve(JSObject().put("granted", hasNotificationPermission()))
    }

    @PluginMethod
    fun requestNotificationPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT < 33) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        if (hasNotificationPermission()) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        requestPermissionForAlias("notifications", call, "notificationPermsCallback")
    }

    @PermissionCallback
    private fun notificationPermsCallback(call: PluginCall) {
        call.resolve(JSObject().put("granted", hasNotificationPermission()))
    }

    private fun hasNotificationPermission(): Boolean {
        return Build.VERSION.SDK_INT < 33 || NotificationManagerCompat.from(context).areNotificationsEnabled()
    }
}
