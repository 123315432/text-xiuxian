# Project Graph Workbench

## 当前结构
- `vite.config.ts`: 生产构建使用 `base: './'`，保证 CrazyGames zip/iframe 子路径下 `dist/index.html` 使用相对资源。
- `src/platform/crazygames.ts`: CrazyGames SDK 适配层，负责 init、loading、gameplay、happytime、game context、Data module 存档和本地降级。
- `src/i18n.ts`: 语言状态、`t()`、`tName()`、`tDesc()`，覆盖主 UI、日志、成就、转世、道号、词缀等文本。
- `src/ui/app.ts`: 单页 UI 渲染与交互入口，包含下一步提示条、事件/战斗/背包/悬赏/功法等 modal，并统一路由到 core API；`UIState.fx` 驱动探索、事件、战斗、胜利、突破、用药等前端反馈态；打开 modal 时会回到页面顶部，避免移动端滚动后弹窗不可见。
- `src/core/game.ts`: 游戏主逻辑，掌控探索、事件、战斗、突破、副本、炼丹、悬赏、功法、天劫和终局状态。
- `src/core/idle.ts`: 离线收益计算，现已纳入功法 `qiPerDay`，并按离线天数推进 `day` / `lifespan` / 寿元耗尽终局记录。
- `src/core/save.ts`: 当前轮存档通过平台存储包装读写；CrazyGames Data module 可用时写穿云端，不可用时退回 localStorage。
- `src/core/achievements.ts`: 成就定义含 `nameEn`/`descEn`，首次探索/首次战斗依赖显式计数字段。
- `src/core/meta.ts`: 转世 perk 定义含 `nameEn`/`descEn`，跨轮 meta 通过平台存储包装读写。
- `src/types.ts`: 数据接口包含英文可选字段，`ItemAffix` 支持 `nameEn`，`GameState` 含 `explorationsDone` / `battlesWon`。

## 已完成阶段
- CrazyGames 适配底座：`index.html` 不直接挂远程 SDK，`src/main.ts` 等待平台初始化后加载 UI，`src/platform/crazygames.ts` 只在 CrazyGames 域或已有 SDK 时加载；未加广告入口，适合 Basic Launch 阶段。
- CrazyGames 生命周期：UI 渲染后发送 loadingStop；可玩态发送 gameplayStart，终局或非玩法菜单发送 gameplayStop；飞升成功触发 happytime。
- CrazyGames 存档/语言：`src/platform/crazygames.ts` 同步 `text-xiuxian-save-v1`、`text-xiuxian-meta-v1`、`text-xiuxian-locale`，SDK Data module 可用时优先读平台数据并写穿，SDK disabled 时本地降级。
- CrazyGames 资源路径：生产构建使用 `./assets/...`，头像/境界/事件图使用 `assetPath('images/...')`，避免部署到子路径时资源 404。
- i18n 收尾：English 模式下主界面和 modal 可见中文已清除；中文模式保留原字段输出。
- 事件系统：事件名、描述、选项、结果日志使用 `nameEn`/`textEn`/`labelEn`/`descEn`/`logEn`。
- 成就与转世：成就和 perk 数据补齐英文并在 UI 使用 `tName()`/`tDesc()`。
- 道号/灵根/词缀：新增英文显示路径，旧中文数据仍可在中文模式使用。
- 图谱完善：`analysis/graph-workbench/*` 已记录入口、模块、数据模型、系统关系和主要调用链。
- Bug 修复：功法收益进入实际收益链；副本失败清旗；飞升成功按成功态提示；悬赏刷新天数取核心常量；战斗用药不再额外回血；天劫 MP 条不再用 HP 上限；副本胜利奖励文案回传。
- Bug 修复追加：离线收益推进天数/寿元并可触发死亡记录；事件扣寿元到 0 立即终局；采集悬赏随物品变化刷新；悬赏 UI 以 `completedDay` 为完成准；炼丹在战斗/事件/终局时阻断且寿元耗尽不先扣材料。
- UI/玩法：参考 idle/incremental 设计，新增下一步提示、事件选择数量、战斗摘要、背包分组和空态反馈，降低玩家判断成本。
- 前端沉浸层：`src/style.css` 增加场景呼吸、事件/战斗氛围、操作水波、按钮按压、战斗受击/防守/胜利、日志滑入等动效；移动端字号、顶部按钮、滚动和 modal 可见性已按 Android 真机截图修正；遵守 `prefers-reduced-motion`。
- Android/APK：通过 Capacitor 生成 `android/` 工程，debug APK 输出到 `android/app/build/outputs/apk/debug/app-debug.apk`，包名 `com.textxiuxian.game`。

## 验证状态
- `npx tsc --noEmit` 通过。
- `npx vite build` 通过。
- `npm run cap:sync` 通过。
- `npm run android:debug` 通过。
- `dist/index.html` 输出 `./assets/...`，扫描无 `src="/..."`、`href="/..."` 或 `/images/...` 绝对资源引用。
- `dist` 当前 21 个文件，总大小约 566 KB，远低于 CrazyGames Basic Launch 包体限制。
- `http://127.0.0.1:5174` 可访问；可见 Chrome 已打开供人工查看。
- 已打开可见 Chrome 到 `http://127.0.0.1:5174` 供人工继续查看。
- Android 真机 `100.98.167.91:5555` 已安装并启动 `com.textxiuxian.game`；截图覆盖首屏、中文、滚动、区域、事件弹窗、事件选择，按 app pid 过滤未见 `FATAL` / `Uncaught` / `net::ERR`。

## 图谱工作规则
- 开始任务前读 `analysis/graph-workbench/inventory.md` 和 `analysis/graph-workbench/handoff.md`。
- 更新图谱只写事实、关系、结论、证据，不粘贴大段源码。
- 常用路径：`analysis/graph-workbench/inventory.md`、`analysis/graph-workbench/questions.md`、`analysis/graph-workbench/handoff.md`、`analysis/graph-workbench/graph-state.json`。
