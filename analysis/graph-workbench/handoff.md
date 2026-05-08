# Handoff

## 当前焦点

本轮已完成逻辑 bug 修复、APK 打包、Android 真机验证和图谱/状态文档更新。快照重点是入口链、`src/core/game.ts` 核心状态、`src/platform/crazygames.ts` 平台边界、Android/Capacitor 包装、已修逻辑 bug、移动端 UI 修复和剩余长流程 QA。

## 已确认事实

- 项目是 Vite + TypeScript 单页文字修仙游戏，并已有 Capacitor Android 包装。
- 入口链为 `index.html` -> `src/main.ts` -> `initCrazyGamesPlatform()` -> dynamic import `src/ui/app.ts`。
- `index.html` 当前不直接挂 CrazyGames SDK script，只提供 `#app` 和 Vite module 入口。
- `src/main.ts` 先导入全局样式，再等待平台初始化，最后加载 UI。
- `src/ui/app.ts` 是 UI 编排中心，持有 `UIState`，负责渲染、modal、事件委托、通知、语言切换、成就检查、动效状态和 CrazyGames 状态同步。
- `src/core/game.ts` 是当前轮 `GameState` 的权威状态变更中心，覆盖探索、事件、战斗、突破、副本、门派、炼丹、区域、悬赏、功法、天劫、背包、装备和终局。
- `src/core/idle.ts` 现在会让离线收益推进天数和寿元，并在寿元耗尽时记录死亡 run。
- `src/core/game.ts` 现在会在事件扣 HP 或寿元到 0 时立刻终局；采集悬赏会随物品增减刷新；炼丹在战斗/待处理事件/终局时被阻断。
- `src/ui/app.ts` 在打开 modal 时回到页面顶部，修复 Android WebView 滚动后弹窗不可见。
- `src/style.css` 已针对 Android 手机修正根字号、顶部按钮、按钮换行、页面滚动和指标布局。
- `src/platform/crazygames.ts` 是 CrazyGames SDK 边界，封装 SDK 初始化、Data module、本地 fallback、loading/gameplay/happytime/context 和相对资源路径。
- `src/platform/crazygames.ts` 会在 Capacitor native 平台跳过 CrazyGames 远程 SDK，Android 包装走本地 WebView 路径。
- `vite.config.ts` 使用 `base: './'`，`assetPath()` 生成相对资源路径，适配 CrazyGames zip/iframe 和 Capacitor `dist`。
- 当前轮存档 key 为 `text-xiuxian-save-v1`，跨轮 meta key 为 `text-xiuxian-meta-v1`，locale key 为 `text-xiuxian-locale`。
- `capacitor.config.ts` 配置 `appId: com.textxiuxian.game`、`appName: Text Xiuxian`、`webDir: dist`。
- Android Manifest 声明 launcher `MainActivity` 和 `android.permission.INTERNET`。
- APK 输出路径为 `android/app/build/outputs/apk/debug/app-debug.apk`，已安装到 `100.98.167.91:5555`，最后安装时间 `2026-05-08 11:30:16`。
- 已知 bug 修复包括：功法 `qiPerDay`/`dodgeChance` 生效、副本失败清旗、飞升成功态、首次探索/战斗成就计数、战斗用药、天劫 MP 显示、悬赏刷新间隔和副本结算反馈。
- 本轮追加验证：首屏、中文切换、滚动、区域选择、事件弹窗、事件选择；按 app pid 过滤未见 `FATAL`、`Uncaught`、`net::ERR`。

## 交接给下一位

- 想快速理解运行流，先读 `index.html`、`src/main.ts`、`src/platform/crazygames.ts`、`src/ui/app.ts` 顶部启动区。
- 想追状态写入，优先读 `src/core/game.ts` 的 `hydrateGame()`、`persist()`、`explore()`、`handleEventChoice()`、`runBattleAction()`、`attemptBreakthrough()`、`enterDungeon()`、`craftRecipe()`、`learnTechnique()`、`triggerTribulation()`、`acceptBounty()`。
- 想追平台存档，读 `src/platform/crazygames.ts` 的 `syncKnownStorage()`、`syncStorageKey()`、`platformGetItem()`、`platformSetItem()`，再看 `src/core/save.ts`、`src/core/meta.ts`、`src/i18n.ts`。
- 想追 Android 包装，读 `capacitor.config.ts`、`package.json` scripts、`android/app/build.gradle`、`android/app/src/main/AndroidManifest.xml`。

## 剩余验证

- 完整人工长流程 playtest：探索、事件、战斗、副本失败后再胜利、炼丹失败/成功、悬赏多类型、天劫胜败、飞升、转世。
- CrazyGames portal / iframe QA：Basic Launch、Full Launch lifecycle、SDK enabled/disabled、Data module 登录同步、移动尺寸、zip 子路径资源。
- Android 真机长流程补测：返回前台、离线存档、普通战斗、死亡、转世、副本胜败、天劫胜败、飞升。
- 旧存档兼容：缺字段存档水合后继续游戏，不触发假成就或状态异常。
- 函数级调用图：当前快照只到系统级和主要流程级，后续可用 TypeScript AST 或实时图工具展开。
