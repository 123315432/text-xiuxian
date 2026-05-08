# text-xiuxian 交接文档 (2026-05-07)

## 本轮完成内容 (Session 4 — 功法+天劫+CSS动画)

### 新增系统

| 系统 | 文件 | 说明 |
|------|------|------|
| **功法系统** | `techniques.json` + `game.ts` + `app.ts` + `gameData.ts` + `types.ts` + `achievements.ts` | 12功法(修炼4/战斗3/炼丹2/身法3)，5级升级，主修设置，属性/炼丹/闪避加成 |
| **天劫系统** | `tribulations.json` + `game.ts` + `app.ts` | 3天劫boss(金丹雷劫/元婴心魔/化神天火)，突破触发，失败降级不死，复用battle modal |
| **CSS动画升级** | `style.css` + `app.ts` | 11项视觉增强：灵气粒子/按钮光扫/弹窗弹性入场/卡片交错/进度条辉光/通知增强/数值脉冲/突破闪光/滚动条/hover/减少动效 |

### Session 3 系统

| 系统 | 文件 | 说明 |
|------|------|------|
| **炼丹** | `recipes.json` + `materials.json` + `game.ts` + `app.ts` | 8种材料 + 6个配方，成功率=base+realm*3+spirit/5+丹宗15%+功法bonus，失败丢材料 |
| **区域探索** | `regions.json` + `game.ts` + `app.ts` | 5个区域(灵山/坊市/荒野/秘境/妖域)，各有独立bonus/事件权重/材料掉落率 |
| **悬赏任务** | `bounties.json` + `game.ts` + `app.ts` | 10个悬赏(kill/gather/explore/craft/realm)，3槽位，15天刷新，自动追踪进度 |

### Bug 修复 (Session 2)

| Bug | 文件 | 修复 |
|-----|------|------|
| 副本冷却误判 | `game.ts:isDungeonReady` | 从未进入的副本误判冷却中，改为 `!lastDay` 返回 true |
| 寿元耗尽不记录道果 | `game.ts:consumeDay` | 自然老死补上 `recordRun()` + `persist()` |

### Session 1-2 已有系统

- 转世(8 perk) / 离线挂机 / 门派(剑丹符) / 成就(25个) / 灵根 / 法宝词缀 / 副本(5个)
- 随机道号 / 战绩摘要 / 重开确认 / 事件境界权重 / 实时修炼tick

## 文件清单

```
src/
├── types.ts          — 全部类型 (含 TechniqueDef/LearnedTechnique/TribulationDef)
├── main.ts           — 入口 (2行)
├── style.css         — ~2000行，含11项CSS动画+technique/tribulation样式
├── core/
│   ├── game.ts       — 全部游戏逻辑 (~1100行)，含功法6函数+天劫3函数+炼丹3函数+区域1函数+悬赏8函数
│   ├── gameData.ts   — 数据索引 (realm/item/skill/enemy/event/sect/dungeon/recipe/region/bounty/technique/tribulation)
│   ├── save.ts       — localStorage save/load/clear
│   ├── meta.ts       — 转世系统
│   ├── idle.ts       — 离线挂机
│   └── achievements.ts — 25个成就 (含功法2个新成就)
├── ui/
│   └── app.ts        — 全部UI (~1600行)，12个modal，粒子/突破闪光/数值脉冲
└── data/
    ├── events.json     — 62个事件
    ├── items.json      — 15个道具
    ├── materials.json  — 8种炼丹材料
    ├── recipes.json    — 6个炼丹配方
    ├── regions.json    — 5个探索区域
    ├── bounties.json   — 10个悬赏任务
    ├── techniques.json — 12个功法 (新)
    ├── tribulations.json — 3个天劫 (新)
    ├── enemies.json    — 8个敌人
    ├── skills.json     — 5个战斗技能
    ├── realms.json     — 8个境界
    ├── sects.json      — 3个门派
    └── dungeons.json   — 5个副本
```

## Build 状态

- `npx tsc --noEmit` → 零错误
- `npx vite build` → 125.88KB JS (gzip 38.78KB) + 28.50KB CSS (gzip 6.68KB)
- 25 modules，325ms build

## 已验证 (Playwright)

### Session 4 验证 (11/11 全通过)

| # | 验证项 | 结果 | 验证细节 |
|---|--------|------|---------|
| 1 | **功法Modal(4分类)** | ✅ | 修炼/战斗/炼丹/身法正确分组，卡片式显示 |
| 2 | **学习功法** | ✅ | 吐纳术学习，灵石632→622(扣10石)，日志"习得功法「吐纳术」" |
| 3 | **成就触发(初窥门径)** | ✅ | Toast显示"成就解锁：初窥门径" |
| 4 | **功法升级** | ✅ | ★★☆☆☆(2级)，费用10→20石递增 |
| 5 | **主修功法标记** | ✅ | "主修中"标签显示，首个功法自动设主修 |
| 6 | **天劫触发(金丹突破)** | ✅ | 筑基→金丹突破后日志"天劫降临——金丹雷劫！"，进入战斗 |
| 7 | **天劫战斗Modal** | ✅ | 标题"天劫降临"(非普通"战斗")，敌方HP 200/200 |
| 8 | **天劫战斗选项** | ✅ | 普攻/防守/功法/丹药全部可用 |
| 9 | **CSS灵气粒子** | ✅ | 主页截图可见金/翡翠色飘浮粒子 |
| 10 | **Modal入场动画** | ✅ | scale弹性动画生效 |
| 11 | **卡片交错淡入** | ✅ | 功法卡片递增延迟出现 |

### Session 3 验证 (3/3 全通过)

| # | 验证项 | 结果 | 验证细节 |
|---|--------|------|---------|
| 1 | **区域探索** | ✅ | 3区域显示→选荒野→触发战斗事件→区域标签权重生效 |
| 2 | **炼丹系统** | ✅ | 注入材料→炼丹Modal→炼制聚气丹→灵草-2/聚气丹+1→消耗1天 |
| 3 | **悬赏任务** | ✅ | 接取"采集灵草"→库存3/3完成→领取奖励→灵石+25 |

### Session 2 验证 (9/9 全通过)

| # | 验证项 | 结果 |
|---|--------|------|
| 1 | 完整转世流程 | ✅ |
| 2 | 副本流程 | ✅ |
| 3 | 成就解锁 + toast | ✅ |
| 4 | 灵根显示 + 属性加成 | ✅ |
| 5 | 法宝词缀 | ✅ |
| 6 | 实时 tick | ✅ |
| 7 | 离线挂机 | ✅ |
| 8 | 移动端 375px | ✅ |
| 9 | hydrateGame 兼容 | ✅ |

## 待验证 (下轮需做)

- [ ] 天劫胜利路径：击败金丹雷劫→tribulationsPassed记录→奖励pill_break到账
- [ ] 天劫失败路径：HP归零→不死，境界降回筑基→realmProgress=0
- [ ] 元婴天劫/化神天劫触发
- [ ] 功法属性加成生效：战斗类功法atk加成体现在面板
- [ ] 功法炼丹加成：初级丹诀学习后炼丹成功率提升
- [ ] 功法满级(5级)→成就"功法大成"触发
- [ ] 高阶功法境界锁定：聚灵诀需筑基，万剑归宗需金丹
- [ ] 炼丹失败路径
- [ ] 悬赏 kill/explore/craft/realm 类型
- [ ] 移动端：375px下功法Modal显示
- [ ] 旧存档兼容：缺少techniques/tribulationsPassed字段正常加载
- [ ] CSS动画：突破闪光效果、数值脉冲效果、进度条辉光
- [ ] prefers-reduced-motion：动画禁用

## 功法系统详情

### 12个功法

| 分类 | ID | 名称 | 境界 | 效果 | 学习费 |
|------|-----|------|------|------|--------|
| 修炼 | tech_tuna | 吐纳术 | 练气 | qi/日+2 | 10石5修 |
| 修炼 | tech_juling | 聚灵诀 | 筑基 | qi/日+4 | 30石15修 |
| 修炼 | tech_guiyuan | 归元功 | 金丹 | qi/日+8 | 80石40修 |
| 修炼 | tech_taixu | 太虚真经 | 元婴 | qi/日+15 | 200石100修 |
| 战斗 | tech_jianjue | 基础剑诀 | 练气 | atk+3 | 15石8修 |
| 战斗 | tech_lieyan | 烈焰掌 | 筑基 | atk+5 | 40石20修 |
| 战斗 | tech_wanjian | 万剑归宗 | 金丹 | atk+10 | 100石50修 |
| 炼丹 | tech_chuji_dan | 初级丹诀 | 练气 | 炼丹+5% | 20石10修 |
| 炼丹 | tech_gaoji_dan | 高级丹诀 | 金丹 | 炼丹+12% | 80石40修 |
| 身法 | tech_qingshen | 轻身术 | 练气 | 闪避+5% | 12石6修 |
| 身法 | tech_suodi | 缩地成寸 | 筑基 | 闪避+10% | 35石18修 |
| 身法 | tech_shunyi | 瞬移术 | 元婴 | 闪避+20% | 150石75修 |

- 每个功法最高5级，效果=基础*等级
- 升级费=学习费coin*(当前等级+1)
- 可设一个主修功法（目前主修仅做标记，未绑定特殊效果）

### 3个天劫

| ID | 名称 | 触发境界 | HP/ATK/DEF | 奖励 |
|----|------|---------|------------|------|
| trib_jindan | 金丹雷劫 | 金丹 | 200/25/15 | 80exp + pill_break |
| trib_yuanying | 元婴心魔 | 元婴 | 400/45/25 | 150exp + pill_longevity |
| trib_huashen | 化神天火 | 化神 | 800/80/45 | 300exp + pill_immortal |

- 突破成功后自动触发（如未通过）
- 天劫失败：不死(HP=1)，境界降回前一级，realmProgress=0
- 天劫成功：记录tribulationsPassed，给奖励
- 战斗复用battle modal，标题改为"天劫降临"

## CSS动画清单 (11项)

| 效果 | 实现 |
|------|------|
| 灵气粒子 | #particles 8个span，gold/jade双色，particle-float 15-25s |
| 按钮光扫 | .action-btn::after shine sweep on hover |
| 弹窗入场 | modal-enter scale(0.92)→1 cubic-bezier弹性 |
| 卡片交错 | card-stagger nth-child递增delay 0.06s |
| 进度条辉光 | .bar-* box-shadow glow |
| 通知增强 | backdrop-filter:blur(8px) + 彩色border-top |
| 数值脉冲 | .value-changed value-pulse scale(1.15) |
| 突破闪光 | .breakthrough-overlay 全屏白→金→淡出 1.5s |
| 滚动条 | ::-webkit-scrollbar 6px gold |
| 按钮hover | translateY(-2px) + shadow增强 |
| 减少动效 | prefers-reduced-motion 禁用所有动画+隐藏粒子 |

## 关键注意事项

1. **功法属性通过 getTechniqueBonus()** 在 applyStats() 中叠加，战斗类加atk/def，修炼类qiPerDay在idle计算中应用。

2. **天劫敌人不在 enemyIndex 中**：用 `getTribEnemy()` 函数从 tribulationList 构造 EnemyDef，battle函数中用 `enemyIndex.get(id) ?? getTribEnemy(id)` fallback。

3. **天劫失败不杀玩家**：在 enemyTurn 中检测 trib_ 前缀，HP<=0 时设HP=1 + 降级，而非触发死亡。

4. **炼丹成功率现在叠加功法bonus**：craftRecipe 中 `getTechniqueBonus(state).alchemyBonus` 加入计算。

5. **CSS粒子在 app.ts mount() 中创建**：8个span prepend到body，纯CSS动画，pointer-events:none。

6. **向后兼容**：10个新 GameState 字段在 createNewGame 有默认值，hydrateGame 的 spread 自动处理。

7. **dev server**: 端口 5180，`npx vite --port 5180` 从 `D:/Code/text-xiuxian/` 启动。

## localStorage 键

| Key | 用途 | 清除时机 |
|-----|------|---------|
| `text-xiuxian-save-v1` | 当前局游戏状态 | clearSave() / 重开 |
| `text-xiuxian-meta-v1` | 转世元数据(道果/perk/成就/历史) | 永不自动清除 |

## 下一步方向

- 补充 events.json 材料掉落事件（药谷采药/灵矿探索/坊市交易）
- 宗门声望+任务系统（门派专属周期任务）
- 弟子系统（高境界收徒，弟子自动历练带回资源）
- 五行相生相克（灵根→战斗属性克制）
- NPC机缘（随机NPC遭遇，交易/切磋/结交）
- 灵兽/宠物（妖域捕获，辅助战斗）
- 排行榜/分享
