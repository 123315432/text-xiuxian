# text-xiuxian graph inventory

**路径**: `D:\Code\text-xiuxian`  
**技术栈**: TypeScript ESM + Vite + Capacitor Android  
**快照范围**: 入口链、核心状态、CrazyGames 平台层、Android/Capacitor 包装、已知 bug 修复、移动端 UI 修复和真机验证点。  
**更新依据**: 本地源码、构建产物、APK 安装结果、adb 截图和 app pid logcat 过滤。

## 入口与启动链

- `index.html` 是浏览器入口，提供 `#app` 容器，并通过 `<script type="module" src="/src/main.ts">` 加载 Vite 入口。
- `src/main.ts` 导入 `src/style.css`，随后 `await initCrazyGamesPlatform()`，再动态导入 `src/ui/app.ts`。
- `src/ui/app.ts` 具备模块级启动逻辑：`hydrateGame(loadGame())` 初始化 `UIState.game`，应用离线收益，首轮 `renderApp()`，调用 `finishCrazyGamesLoading()`，绑定事件，并启动 1 秒实时修炼 interval。
- `src/ui/app.ts` 在 modal 打开时执行 `window.scrollTo({ top: 0 })`，避免 Android WebView 中滚动后弹窗出现在不可见位置。
- 入口关系为：`index.html` -> `src/main.ts` -> `src/platform/crazygames.ts:initCrazyGamesPlatform()` -> dynamic import `src/ui/app.ts`。

## 核心状态与状态流

- `src/core/game.ts` 是当前轮 `GameState` 的状态变更中心，覆盖新局、存档水合、探索、事件、战斗、突破、终局、副本、门派、炼丹、区域、功法、天劫、悬赏、背包、装备和持久化入口。
- `src/core/idle.ts` 离线收益现在会推进 `day` 和 `lifespan`，按存活天数折算收益，寿元耗尽时写入死亡终局和 meta run 记录。
- `src/ui/app.ts` 持有唯一前端运行态 `UIState`，包含 `game`、modal、通知、日志展示数、确认状态、上次数值快照和 `fx` 动效状态。
- 当前轮存档由 `persist(state)` -> `saveGame(state)` 写入 `text-xiuxian-save-v1`；跨轮转世/成就元数据由 `src/core/meta.ts` 写入 `text-xiuxian-meta-v1`。
- `src/core/save.ts`、`src/core/meta.ts`、`src/i18n.ts` 均通过 `src/platform/crazygames.ts` 的 `platformGetItem()` / `platformSetItem()` / `platformRemoveItem()` 访问持久化。
- `src/core/gameData.ts` 是 JSON 内容聚合层，导出列表和索引：realm、item、skill、enemy、event、sect、dungeon、recipe、region、bounty、technique、tribulation。
- `src/types.ts` 定义 `GameState`、`MetaState`、事件/战斗/内容数据模型、功法、天劫、悬赏、词缀和 i18n 可选英文段。

## UI 编排关系

- 用户输入统一通过 `src/ui/app.ts` 的事件委托进入 `handleRootClick()`，再分发到 `handleAction()`、`handleChoice()`、`handleBattleAction()`、`handleInventoryItem()` 等处理函数。
- UI 主要动作调用 `src/core/game.ts` 导出的纯规则函数，规则函数内部按需 `persist()`；UI 负责 modal、toast、动效和成就检查。
- `renderApp()` 根据当前 modal、终局状态和游戏进度同步 CrazyGames gameplay/context 状态；飞升成功时 `triggerCrazyGamesHappyTime()`。
- 图片路径通过 `assetPath('images/...')` 生成相对路径，配合 `vite.config.ts` 的 `base: './'` 适配 zip/iframe 与 Android WebView。

## CrazyGames 平台层

- `src/platform/crazygames.ts` 是 CrazyGames SDK 的唯一边界，核心玩法代码不直接访问 `window.CrazyGames`。
- `shouldLoadCrazyGamesSdk()` 规则：已有 `window.CrazyGames.SDK` 时启用；Capacitor native 平台直接跳过；hostname 包含 `crazygames` 时尝试加载远程 SDK。
- 平台初始化调用 `sdk.init()`；若 `sdk.environment === 'disabled'` 或初始化失败，则回退到本地路径。
- SDK lifecycle 封装包括 `loadingStart()` / `loadingStop()`、`gameplayStart()` / `gameplayStop()`、`happytime()`、`setGameContext()` / `clearGameContext()`。
- Data module 适配会同步已知 key：`text-xiuxian-save-v1`、`text-xiuxian-meta-v1`、`text-xiuxian-locale`；当前轮存档冲突以 `timestamp` / `lastSavedAt` 较新者为准。
- Data module 调用包在 `callRemote()` 内，模块禁用或异常时保持 localStorage fallback。

## Android / Capacitor 包装

- `capacitor.config.ts` 配置 `appId: com.textxiuxian.game`、`appName: Text Xiuxian`、`webDir: dist`。
- `package.json` 包含 `cap:sync` (`cap sync android`) 和 `android:debug` (`cd android && gradlew.bat assembleDebug`)。
- `android/app/build.gradle` 使用 Android application plugin，`namespace` / `applicationId` 为 `com.textxiuxian.game`，依赖 `@capacitor/android` 生成的 `capacitor-android` 工程和 `capacitor-cordova-android-plugins`。
- `android/app/src/main/AndroidManifest.xml` 声明 `MainActivity` 为 launcher activity，并包含 `android.permission.INTERNET`。
- `src/platform/crazygames.ts` 检测 `window.Capacitor?.isNativePlatform?.()` 后不加载 CrazyGames 远程 SDK，避免 Android native 包装误拉平台脚本。
- Android debug APK 输出为 `android/app/build/outputs/apk/debug/app-debug.apk`；已安装到 `100.98.167.91:5555`，包名 `com.textxiuxian.game`，最后安装时间 `2026-05-08 11:30:16`。
- 已保留最新真机截图用于验证：`test-screenshots/apk-final-launch.png`、`apk-final-scrolled.png`、`apk-final-eventmodal.png`、`apk-final-choice-wait.png` 等。

## 已知 bug 修复事实

- 功法收益已接入实际规则：`getTechniqueBonus()` 的 `qiPerDay` 进入在线探索和 `src/core/idle.ts` 离线收益；`dodgeChance` 进入敌方回合命中判定。
- 副本失败/死亡路径会清理 `dungeon_active` / `dungeon_id_*` flags，避免后续普通战斗胜利误领奖励。
- 飞升成功终局已与失败态区分，UI 可触发 CrazyGames happytime。
- 首次探索/首次战斗成就改为依赖显式计数，避免旧状态误触发。
- 战斗用药、天劫 MP 显示、悬赏刷新间隔 UI 文案与核心常量已对齐。
- 防守/击杀反馈保留副本结算文案，战斗胜利路径仍可回传奖励结果。
- 旧存档水合不再把新手初始丹药/技能合并回已有存档。
- 多条操作日志改为先写日志再持久化，避免日志丢失。
- 事件扣 HP 或寿元到 0 会立即进入死亡终局，不再等下一天。
- 事件进入战斗后不会继续自动突破覆盖战斗状态。
- 战斗、待处理事件、终局状态会阻断炼丹；炼丹寿元耗尽时不再先扣材料。
- 采集类悬赏随 `addItem()` / `removeItem()` 刷新，悬赏面板打开和领取前也会刷新，UI 完成态以 `completedDay` 为准。
- 移动端 CSS 降低根字号、修正顶部按钮 3 列布局、允许按钮换行、恢复页面滚动，并保持 HP/MP/Qi/寿元双列指标。

## 剩余验证点

- 需要完整人工长流程 playtest：探索 -> 事件 -> 战斗 -> 副本失败后再胜利 -> 炼丹失败/成功 -> 悬赏多类型 -> 天劫胜败 -> 飞升 -> 转世。
- 需要旧存档兼容验证：缺少 `techniques`、`tribulationsPassed`、`bountySlots`、`artifactAffixes` 等字段的存档能否稳定 hydrate。
- 需要 CrazyGames portal / iframe QA：SDK enabled/disabled、Data module 登录同步、Basic Launch、Full Launch lifecycle、移动 iframe 尺寸和 zip 子路径资源。
- Android 首启、语言切换、滚动、区域 modal、事件 modal、事件选择已在真机验证；仍需补返回前台、离线存档、战斗和终局长链路。
- 需要素材交付检查：CrazyGames 封面 `1920x1080`、`800x1200`、`800x800` 和 15-20 秒预览视频。
- 尚未生成函数级完整调用图；当前图谱为系统级与关键流程级快照。

## 关键调用链

- 启动链：`index.html` -> `src/main.ts` -> `initCrazyGamesPlatform()` -> `import('./ui/app')` -> `hydrateGame(loadGame())` -> `calcIdleGains()` / `applyIdleGains()` -> `persist()` -> `renderApp()` -> `finishCrazyGamesLoading()`。
- 探索链：`handleAction('explore')` / 区域按钮 -> `explore()` -> `consumeDay()` -> 掉落/悬赏进度/事件投骰 -> `pendingEventId` -> `persist()` -> event modal。
- 事件链：`handleChoice()` -> `handleEventChoice()` -> `applyEffect()` -> 可触发战斗/入门派/习得技能/物品变化 -> `tryBreakthrough()` -> `persist()`。
- 离线链：`calcIdleGains()` -> `applyIdleGains()` -> 按存活天数折算资源 -> 推进 `day/lifespan` -> 可触发 `recordRun(loadMeta(), state)` -> `persist()`。
- 战斗链：`handleBattleAction()` -> `runBattleAction()` -> 普攻/技能/防守/用药 -> `enemyTurn()` -> `endBattle()` -> 敌人/天劫/副本/悬赏结算 -> `runAchievementCheck()`。
- 突破链：`handleAction('break')` -> `attemptBreakthrough()` -> `tryBreakthrough()` -> 升境/天劫/死亡/飞升 -> `persist()` -> UI 终局或战斗 modal。
- 转世链：终局 modal -> `calcDaoFruit()` 展示收益 -> `recordRun()` 更新 meta -> `calcReincarnationBonus(loadMeta())` -> `createNewGame()` -> `persist()`。
