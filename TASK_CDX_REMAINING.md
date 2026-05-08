# CDX 接手任务：i18n 收尾 + 全面质量检查

## 最终目标
切换语言到English后，游戏里所有可见文本都显示英文。切回中文一切正常。推游戏平台用。

## 当前状态
- src/i18n.ts: 170+翻译key，t()/tName()/tDesc()函数已就位
- src/ui/app.ts: 大部分UI字符串已替换为t()调用（按钮/面板/Modal标题/stat标签/metric标签/数据对象名）
- src/core/game.ts: 60+处log消息已替换为t()调用
- 所有13个JSON数据文件已有nameEn/descEn字段
- types.ts所有接口已有可选English字段
- 语言切换按钮在header已可用
- tsc零错误，vite build通过

## 你需要做的

### 1. 找出并翻译剩余中文硬编码

运行这个命令找出app.ts和game.ts中剩余的中文字符：
```bash
rg -n "[\u4e00-\u9fff]" src/ui/app.ts src/core/game.ts --no-heading | grep -v "^.*://.*" | grep -v "import"
```

对每个剩余的中文字符串：
- 如果是展示给用户的文本 → 加key到i18n.ts + 替换为t()调用
- 如果是数据层ID/tag匹配 → 保留不动
- 如果是注释 → 保留不动

特别注意这些可能遗漏的区域：
- app.ts中的 storyTitle / renderRunSummary / renderHeroVisual 叙事文本
- app.ts中的 setNotice 通知消息
- app.ts中的 getFocusState 的 desc 字段
- app.ts中的 getActionHint 函数的提示文本
- game.ts中的 DAO_NAMES 道号数组（加英文版）
- game.ts中的 ROOT_NAMES 灵根名称
- game.ts中的 AFFIX_POOL / getAffixDesc 词缀名称

### 2. 事件系统的翻译

events.json有62个事件，每个有nameEn/textEn/choices[].labelEn/descEn/effect.logEn。
检查app.ts中渲染事件的地方(renderEventModal等)是否使用了tName/tDesc/getLocale来选择中英文。

关键位置：
- 事件名称: event.name → tName(event) 或 getLocale()==='en' && event.nameEn ? event.nameEn : event.name
- 事件描述: event.text → 同理用textEn
- 选项标签: choice.label → choice.labelEn
- 选项描述: choice.desc → choice.descEn  
- 效果日志: effect.log → effect.logEn

### 3. 成就系统翻译

src/core/achievements.ts 中的 ACHIEVEMENTS 数组有25个成就，每个有name/desc/icon。
需要加nameEn/descEn字段，并在app.ts渲染成就时使用tName。

### 4. 转世系统翻译

src/core/meta.ts 中的 PERKS 数组有8个perk，需要翻译name/desc。
app.ts的renderReincarnationModal渲染perk时需要用tName。

### 5. 道号英文版

game.ts的DAO_NAMES数组是中文道号。加一个英文版：
```typescript
const DAO_NAMES_EN = [
  'Nameless Wanderer', 'Lone Cloud Sage', 'White Robe Swordsman', ...
]
```
createNewGame中根据locale选择。

### 6. 离线挂机通知翻译

app.ts顶部的idle通知文本(大约80-90行)，把中文模板换成t()。

### 7. 最终验证

完成所有替换后：
1. `rg -n "[\u4e00-\u9fff]" src/ui/app.ts src/core/game.ts` 确认只剩注释和数据tag
2. `npx tsc --noEmit` 零错误
3. `npx vite build` 通过
4. 启动dev server，手动切换到English，逐个打开每个Modal确认全英文

## 项目结构快速参考
```
src/i18n.ts          — 翻译系统
src/types.ts         — 类型定义(含En可选字段)
src/ui/app.ts        — UI渲染(~1700行)
src/core/game.ts     — 游戏逻辑(~1200行)
src/core/achievements.ts — 25个成就
src/core/meta.ts     — 转世perk
src/data/*.json      — 所有已有nameEn/descEn
```

## 约束
- npx tsc --noEmit 零错误
- npx vite build 通过
- 中文模式不受影响
- 保持现有代码风格
