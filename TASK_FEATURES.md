# text-xiuxian 新功能开发任务

## 项目结构
- src/types.ts — 全部类型
- src/core/game.ts — 游戏逻辑(~980行)
- src/core/gameData.ts — 数据索引
- src/core/achievements.ts — 成就系统
- src/ui/app.ts — UI渲染(~1450行)
- src/style.css — 样式(~1650行)
- src/data/*.json — 数据文件
- 技术栈：TypeScript + Vite 8，无框架，字符串模板UI + 事件委托

## Feature 1: 功法系统 (Cultivation Techniques)

### 1.1 创建 src/data/techniques.json
12个功法，每个结构: `{ id, name, desc, category, minRealm, maxLevel: 5, effects: {...}, learnCost: { coin, exp } }`

修炼类(4个):
- tech_tuna: 吐纳术, lianqi, qiPerDay: 2
- tech_juling: 聚灵诀, jzhuji, qiPerDay: 4
- tech_guiyuan: 归元功, jindan, qiPerDay: 8
- tech_taixu: 太虚真经, yuanying, qiPerDay: 15

战斗类(3个):
- tech_jianjue: 基础剑诀, lianqi, atk: 3
- tech_lieyan: 烈焰掌, jzhuji, atk: 5
- tech_wanjian: 万剑归宗, jindan, atk: 10

炼丹类(2个):
- tech_chuji_dan: 初级丹诀, lianqi, alchemyBonus: 5
- tech_gaoji_dan: 高级丹诀, jindan, alchemyBonus: 12

身法类(3个):
- tech_qingshen: 轻身术, lianqi, dodgeChance: 5
- tech_suodi: 缩地成寸, jzhuji, dodgeChance: 10
- tech_shunyi: 瞬移术, yuanying, dodgeChance: 20

### 1.2 修改 src/types.ts
新增:
```typescript
export interface TechniqueDef {
  id: string; name: string; desc: string;
  category: 'cultivation' | 'combat' | 'alchemy' | 'movement';
  minRealm?: RealmKey; maxLevel: number;
  effects: { qiPerDay?: number; atk?: number; def?: number; alchemyBonus?: number; dodgeChance?: number; };
  learnCost: { coin: number; exp: number; };
}
export interface LearnedTechnique { techId: string; level: number; }
```
GameState新增: `techniques: LearnedTechnique[]`, `activeTechnique?: string`

### 1.3 修改 src/core/gameData.ts
import techniques.json, 新增 techniqueList / techniqueIndex

### 1.4 修改 src/core/game.ts
新增函数:
- `getAvailableTechniques(state)` — 按境界过滤
- `learnTechnique(state, techId)` — 消耗coin+exp学习
- `upgradeTechnique(state, techId)` — 消耗coin升级(cost*level倍)
- `setActiveTechnique(state, techId)` — 设置主修功法
- `getTechniqueBonus(state)` — 计算功法总加成

修改现有:
- applyStats() 中调用 getTechniqueBonus 加入属性
- craftRecipe 中: alchemy类功法的成功率加成
- createNewGame 加默认值: techniques: [], activeTechnique: undefined

### 1.5 修改 src/ui/app.ts
- ModalKind 加 'techniques'
- 操作栏加"功法"按钮
- renderTechniqueModal(): 分4类显示，卡片式，显示等级星星/效果/升级按钮/设为主修
- handleRootClick 加 data-learn-tech, data-upgrade-tech, data-set-active-tech

### 1.6 修改 src/style.css
- .modal-card-techniques, .technique-card 样式(复用现有卡片模式)
- 功法等级用小圆点或星星显示

### 1.7 修改 src/core/achievements.ts
新增: ach_first_technique(学习第一个功法), ach_technique_master(任意功法满级)

## Feature 2: 天劫系统 (Heavenly Tribulation)

### 2.1 创建 src/data/tribulations.json
3个天劫:
```json
[
  { "id": "trib_jindan", "name": "金丹雷劫", "triggerRealm": "jindan", "enemyHp": 200, "enemyAtk": 25, "enemyDef": 15, "rewardExp": 80, "rewardItem": "pill_break", "desc": "九天雷霆降下，金丹雷劫已至！" },
  { "id": "trib_yuanying", "name": "元婴心魔", "triggerRealm": "yuanying", "enemyHp": 400, "enemyAtk": 45, "enemyDef": 25, "rewardExp": 150, "rewardItem": "pill_longevity", "desc": "心魔化形而出，元婴劫数将至！" },
  { "id": "trib_huashen", "name": "化神天火", "triggerRealm": "huashen", "enemyHp": 800, "enemyAtk": 80, "enemyDef": 45, "rewardExp": 300, "rewardItem": "pill_immortal", "desc": "三昧真火焚天炼地，化神之劫降临！" }
]
```

### 2.2 修改 src/types.ts
```typescript
export interface TribulationDef {
  id: string; name: string; triggerRealm: RealmKey;
  enemyHp: number; enemyAtk: number; enemyDef: number;
  rewardExp: number; rewardItem?: string; desc: string;
}
```
GameState新增: `tribulationsPassed: string[]`

### 2.3 修改 src/core/gameData.ts
import tribulations.json, 新增 tribulationList / tribulationIndex

### 2.4 修改 src/core/game.ts
- 在 tryBreakthrough 成功后: 检查目标realm是否有天劫 && 未通过 → 触发天劫战斗
- triggerTribulation(state, tribDef) — 创建BattleState(enemyId用特殊前缀如"trib_xxx")
- 天劫战斗复用现有battle系统，但enemy数据从tribulation定义取
- 天劫失败: realm降回前一个, realmProgress=0, log("天劫失败，境界跌落...")
- 天劫成功: tribulationsPassed.push(tribId), 给奖励, log("天劫已过！")
- createNewGame 加: tribulationsPassed: []

### 2.5 修改 src/ui/app.ts
- 天劫战斗复用battle modal，识别enemy前缀"trib_"显示特殊标题"天劫降临"
- 天劫结果用特殊样式显示

## 重要约束
- npx tsc --noEmit 必须零错误
- npx vite build 必须通过
- 不要破坏现有功能
- createNewGame 中给新字段默认值(hydrateGame的spread会自动处理旧存档)
- 保持现有代码风格(中文日志, camelCase函数名)
- 完成后运行 npx tsc --noEmit 和 npx vite build 验证
