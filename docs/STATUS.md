# 当前目标
itch.io Web 上传包与 TapTap Android 签名 APK 已生成并完成最小验证，当前等待平台后台资料补齐与上传。

# 已确认事实
- 项目是 Vite + TypeScript 单页文字修仙游戏，Android 包名 `com.textxiuxian.game`。
- `npm run build`、`npm run cap:sync`、`gradlew assembleRelease` 已按顺序通过。
- itch Web ZIP 已生成：`release/itch/text-xiuxian-itch-web-20260508.zip`。
- itch ZIP 根目录包含 `index.html`，共 21 个文件，ZIP 大小 383583 bytes。
- TapTap 签名 APK 已生成：`release/taptap/text-xiuxian-taptap-v1_0-code1.apk`。
- TapTap APK 信息：`versionCode=1`，`versionName=1.0`，`minSdk=24`，`targetSdk=36`，应用名 `Text Xiuxian`。
- TapTap APK 已通过 `apksigner verify`，使用 v2/v3 签名，证书 SHA-256 为 `d382c6b3961f3f982a23d0912affff2264e1b2e30e3b1b683c136ee2627f3f92`。
- TapTap 签名密钥保存在 `release-private/taptap/text-xiuxian-taptap-release.jks`，签名信息保存在 `release-private/taptap/SIGNING_INFO_LOCAL.txt`。
- `.gitignore` 已忽略 `release-private/`、`*.jks`、`*.keystore`。
- 真机 `100.98.167.91:5555` 已卸载 debug 包并安装签名 release APK。
- 签名 release APK 已冷启动成功，截图：`test-screenshots/taptap-release-launch.png`。
- 签名 release APK 已做一次滚动/点击交互，截图：`test-screenshots/taptap-release-interaction.png`。
- release APK 日志未见 `FATAL`、`AndroidRuntime`、`Uncaught`、`net::ERR`；仅见 WebView first_paint 指标告警。

# 下一步
- itch.io：上传 `release/itch/text-xiuxian-itch-web-20260508.zip`，选择 HTML5/browser game，设置 viewport/fullscreen 与横竖屏策略。
- TapTap：上传 `release/taptap/text-xiuxian-taptap-v1_0-code1.apk`，保存并备份 `release-private/taptap/*`，后续更新必须沿用同一签名密钥。
- 平台提交前补齐商店素材、隐私说明、年龄分级、游戏介绍、截图/宣传图，然后上传 itch.io 与 TapTap。
- 正式大范围发布前继续跑长链路 QA：战斗、死亡、转世、炼丹、悬赏、副本、天劫、飞升、离线存档。

# 阻塞
- 暂无代码级阻塞；平台最终提交还依赖账号后台资料与商店素材。
