# Task: Wire up i18n translations in app.ts and game.ts

## Context
- src/i18n.ts already exists with 170+ translation keys, t(), tName(), tDesc() functions
- All data JSON files already have nameEn/descEn fields
- src/types.ts already has optional English fields on all interfaces
- Language toggle button already works in app.ts header
- Currently switching to English does nothing because Chinese strings are hardcoded

## Goal
Replace ALL hardcoded Chinese strings in app.ts and game.ts with i18n function calls so the language toggle actually works.

## Files to modify
1. src/ui/app.ts (~1600 lines) - ALL UI strings
2. src/core/game.ts (~1100 lines) - ALL log messages

## How to do it

### For app.ts:
1. Import tName, tDesc from '../i18n' (t, getLocale, setLocale are already imported)
2. Replace every hardcoded Chinese string with the corresponding t() call using keys from i18n.ts
3. For data object names (items, recipes, regions, etc.), use tName(obj) instead of obj.name and tDesc(obj) instead of obj.desc
4. For realm names, use t('realm.' + realmKey) or tName(realmDef)

Key patterns to find and replace:
- Button text: '外出历练' → t('btn.explore'), '尝试突破' → t('btn.break'), '背包总览' → t('btn.inventory'), etc.
- Panel labels: '基础状态' → t('panel.status'), '行程指令' → t('panel.actions'), etc.
- Stat labels: '境界' → t('stat.realm'), '攻击' → t('stat.atk'), '防御' → t('stat.def'), etc.
- Modal titles: '功法修炼' → t('modal.techniques'), '丹方一览' → t('modal.alchemy'), etc.
- Tags: '功法' → t('tag.techniques'), '炼丹' → t('tag.alchemy'), etc.
- Metric labels: '气血' → t('battle.hp'), '灵力' → t('battle.mp'), '修为' → t('metric.qi'), etc.
- Status: '空闲' → t('status.idle'), '战斗' → t('status.battle'), etc.
- Close buttons: '关闭' → t('btn.close')

For data-driven content, wrap with tName/tDesc:
- `escapeHtml(def.name)` → `escapeHtml(tName(def))`
- `escapeHtml(def.desc)` → `escapeHtml(tDesc(def))`
- `escapeHtml(dg.name)` → `escapeHtml(tName(dg))`
- Similar for enemy, recipe, region, bounty, technique, tribulation objects

For event rendering:
- event.name → tName(event) (if nameEn exists)
- event.text → currentLocale === 'en' && event.textEn ? event.textEn : event.text
- choice.label → currentLocale === 'en' && choice.labelEn ? choice.labelEn : choice.label
- choice.desc → currentLocale === 'en' && choice.descEn ? choice.descEn : choice.desc

For realm names that come as string keys, use t('realm.' + key) 

### For game.ts:
1. Import { t, tName, tDesc, getLocale } from '../i18n'
2. Replace Chinese log messages with t() calls
3. Add new translation keys to i18n.ts as needed for messages not yet covered

Key patterns in game.ts:
- log(state, '寿元耗尽...') → log(state, t('log.lifespanEnd')) — add these keys to i18n.ts
- log(state, `习得功法「${def.name}」`) → log(state, getLocale() === 'en' ? `Learned art: ${tName(def)}` : `习得功法「${def.name}」`)
- Battle messages, breakthrough messages, alchemy messages, etc.

For game.ts log messages, the simplest approach is:
- Add new keys to i18n.ts for each log message pattern
- Or use inline ternary: getLocale() === 'en' ? englishText : chineseText

## Constraints
- Don't break any existing functionality
- npx tsc --noEmit must pass with zero errors
- npx vite build must pass
- ALL visible Chinese text should be translated when switched to English
- Keep the code readable - don't over-engineer
- Chinese text must still work perfectly (it's the default)

## Done when
- Toggle language to English → all UI shows English
- Toggle back to Chinese → everything Chinese again
- npx tsc --noEmit zero errors
- npx vite build passes
