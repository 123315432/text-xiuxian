# Questions

## Resolved

- [x] 主入口是什么？当前入口链为 `index.html` -> `src/main.ts` -> `initCrazyGamesPlatform()` -> dynamic import `src/ui/app.ts`。
- [x] `index.html` 是否直接加载 CrazyGames SDK？否。当前 `index.html` 只加载 `/src/main.ts`；CrazyGames SDK 由 `src/platform/crazygames.ts` 在 crazygames 域、已有 SDK 或非 Capacitor 场景下按条件处理。
- [x] 当前轮状态由谁掌控？`src/core/game.ts` 掌控当前轮 `GameState` 主要状态变更，`src/ui/app.ts` 持有 UI 运行态并分发用户动作，`src/core/save.ts` 写当前轮存档。
- [x] 跨轮状态由谁掌控？`src/core/meta.ts` 掌控 `MetaState`，包括转世、道果、perk、历史记录和成就解锁。
- [x] 平台持久化边界在哪里？`src/platform/crazygames.ts` 提供 `platformGetItem()` / `platformSetItem()` / `platformRemoveItem()`，Data module 可用时写穿，不可用时 localStorage fallback。
- [x] CrazyGames lifecycle 落在哪里？`src/platform/crazygames.ts` 封装 SDK init、loading/gameplay/happytime/context；`src/ui/app.ts` 在渲染和终局动作中同步。
- [x] Android/Capacitor 包装事实是什么？`capacitor.config.ts` 指向 `dist`，Android 包名为 `com.textxiuxian.game`，Manifest 有 launcher activity 和 INTERNET 权限；Capacitor native 环境跳过 CrazyGames 远程 SDK。
- [x] 已知核心 bug 修复覆盖哪些点？功法收益、闪避、副本清旗、飞升成功态、成就计数、战斗用药、天劫 MP 显示、悬赏刷新间隔和副本结算反馈。
- [x] 离线收益是否推进寿元？已修复，`applyIdleGains()` 推进 `day/lifespan`，按存活天数折算收益，寿元耗尽会记录死亡 run。
- [x] 悬赏完成态是否依赖 render 写状态？已修复，打开/领取前刷新，采集类随物品增减刷新，UI 以 `completedDay` 为完成准。
- [x] Android 首屏是否可见？已确认 `com.textxiuxian.game` 真机启动非黑屏/白屏，截图 `test-screenshots/apk-final-launch.png`。
- [x] Android 手机端主要 UI bug？已修复顶部按钮截断、字号过大、滚动后弹窗不可见；事件 modal 和事件选择已实机验证。

## Open

- [ ] 未做完整人工长流程 playtest，尤其是普通战斗、死亡、离线返回、悬赏领取、副本失败后再胜利、飞升终局、转世后重开、旧存档兼容。
- [ ] 未在 CrazyGames portal 做真实 iframe QA；SDK enabled/disabled、Data module 登录同步、Basic Launch、Full Launch lifecycle 仍需平台侧验证。
- [ ] Android 已完成局部真机复测；尚未覆盖返回前台、离线存档、战斗、死亡、转世和终局长链路。
- [ ] CrazyGames 封面 `1920x1080`、`800x1200`、`800x800` 和 15-20 秒预览视频未在图谱中确认完成。
- [ ] 未生成函数级完整调用图；目前只记录入口、系统级依赖和关键流程链。
- [ ] 未运行或同步 Axon、CodeGraphContext、Graphify、Graphiti；`graph-state.json` 的工具字段表示图谱配置意图，不表示本轮实际工具运行。
