package com.guanji.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 计时通知被用户划掉（#51）：
 * 只写标记，不拉起 App；下次打开 App 时 MainActivity 读取标记 → JS 温和提示一次
 */
class TimerDeleteReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        context.getSharedPreferences(TimerLiveUpdatePlugin.PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(TimerLiveUpdatePlugin.KEY_DISMISSED, true).apply()
    }
}
