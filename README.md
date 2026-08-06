# 观己（Guanji）

> 一个温和、非评判的习惯记录 App。记录自己的节奏，看清自己的模式，不评判、不焦虑、不打卡式逼迫。

「观己」帮助你记录与觉察自己的行为习惯（频率、时段、情绪、诱因），用温和的 AI 分析找出藏在数据里的模式。**数据只保存在你自己的手机里；AI 只看到聚合统计，永远看不到你的单条记录。**

## 功能特性

- **记录**：一键快速记录、完整记录面板（情绪 / 诱因 / 时长 / 看片 / 备注）、补记历史日期、编辑与删除
- **首页**：今日概览、时段分布环图、次数趋势（14 / 30 天）、本月对比、最近记录
- **历史日历**：月历角标、选天明细、补记直达
- **AI 分析**：仅上传聚合特征，生成温和非评判的报告（模式识别 / 情绪观察 / 诱因分布 / 温和建议），支持追问
- **AI 多提供商**：默认 DeepSeek，可选 OpenAI 或自定义（Base URL / 模型 / API 密钥按提供商分别保存，含连接测试）
- **桌面小组件（2x2，共 5 个）**：一键快速记录、数据看板、本周节奏、连续进度、今日卡片
- **每日温和提醒**：可选，默认关闭
- **深色模式**：跟随系统 + 手动覆盖
- **记录编辑后报告自动刷新**：保证分析时效性

## 隐私设计（核心承诺）

- **数据仅存本地**：所有记录保存在设备本地（Capacitor Preferences / WebView 存储），不注册账号、不上传云端
- **AI 只接收聚合特征**：发送给 AI 的只有统计摘要（本周次数、时段分布、情绪/诱因占比、连续天数等），**不含任何单条记录**，更不含时间、备注等原始内容
- **密钥也只在本地**：API 密钥按提供商分别保存在本机，连接测试与调用均从设备直连
- 分析报告附隐私说明，App 内「我的」页可随时查看

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | 原生 HTML / CSS / JavaScript（Apple 风格 UI，无框架依赖） |
| 壳 | Capacitor 8（Android WebView 包装） |
| 原生 | Kotlin / Java（自定义插件 + 5 个 AppWidgetProvider） |
| 存储 | @capacitor/preferences（本地） |
| AI | OpenAI 兼容接口（DeepSeek 默认 / OpenAI / 自定义） |
| 持久化同步 | WebView → SharedPreferences（自定义 Capacitor 插件，驱动小组件） |

## 环境要求

- Node.js 18+
- JDK 17 或 21
- Android SDK（`ANDROID_HOME` 环境变量）
- 安卓 7.0（API 24）以上设备（本地安装需开启「允许安装未知来源」）

## 构建

```bash
# 1. 安装依赖
npm install

# 2. 同步 Web 资源到安卓工程（首次 clone 后必须执行）
npx cap sync android

# 3. 构建 APK
cd android
gradlew.bat assembleDebug        # Windows
./gradlew assembleDebug           # macOS / Linux

# 4. 产物
# android/app/build/outputs/apk/debug/app-debug.apk

# 5. 安装到已连接设备
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

浏览器调试（无需安卓环境）：

```bash
python -m http.server 8123 --directory www
# 打开 http://localhost:8123
```

## 目录结构

```
guanji-app/
├── www/                  # 前端源码（index.html / styles.css / app.js）
├── android/              # Capacitor 安卓工程
│   └── app/src/main/java/com/guanji/app/
│       ├── MainActivity.java        # 启动 + 小组件意图处理
│       ├── WidgetStatsPlugin.kt     # WebView → 原生统计同步插件
│       └── Guanji*Widget.kt         # 5 个桌面小组件
├── assets/               # 应用图标源文件
├── debug/                # 真机验证脚本（WebView DevTools）
├── IMPROVEMENTS.md       # 改进意见清单（需求 → 方案 → 实施记录）
└── CHANGELOG.md          # 更新日志
```

## 版本历史

见 [CHANGELOG.md](./CHANGELOG.md)——从 v1.0 到 v2.5，共 15 个版本迭代。

## 免责声明

App 内所有 AI 分析仅基于聚合统计提供习惯参考，**不构成医疗诊断或建议**。如有持续困扰，建议与专业医生或心理咨询师聊聊。

---

*观己 · 数据仅存本地 · AI 只看聚合，不看单条*
