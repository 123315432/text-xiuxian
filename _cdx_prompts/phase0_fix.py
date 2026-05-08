import json

# === Fix 1: Add events for unreachable enemies + dujie events ===
NEW_EVENTS = [
  # shadow_cultivator (yuanying) - currently unreachable
  {
    "id": "evt_shadow_ambush",
    "name": "暗影魔修",
    "text": "一股阴冷的魂魄波动从地底涌出，一名黑袍魔修缓缓现形，双眼没有瞳孔。",
    "tags": ["战斗", "危险"],
    "minRealm": "yuanying",
    "choices": [
      { "label": "直面交锋", "desc": "正面硬刚。", "effect": { "log": "你感应到对方的魂魄压制，拔剑迎战。", "battle": "shadow_cultivator", "enemy": "shadow_cultivator" } },
      { "label": "以魂御魂", "desc": "拼精神力。", "effect": { "log": "你以神识对抗阴影，灵魂震颤。", "battle": "shadow_cultivator", "enemy": "shadow_cultivator", "spirit": 2 } },
      { "label": "燃符退敌", "desc": "消耗法宝。", "effect": { "log": "你祭出护符，阴影暂退，你夺路而走。", "mp": -20, "hp": -10, "lifespan": -2 } }
    ]
  },
  # ancient_beast (huashen) - currently unreachable
  {
    "id": "evt_beast_awakening",
    "name": "上古异兽苏醒",
    "text": "大地震颤，远古封印崩裂，一只体型如山的异兽从沉睡中醒来，灵压覆盖数里。",
    "tags": ["战斗", "危险"],
    "minRealm": "huashen",
    "choices": [
      { "label": "迎战异兽", "desc": "正面一搏。", "effect": { "log": "你祭出全力，与远古存在对决。", "battle": "ancient_beast", "enemy": "ancient_beast" } },
      { "label": "借势感悟", "desc": "在灵压下突破。", "effect": { "log": "你借异兽灵压锤炼己身，痛苦中有所突破。", "hp": -35, "realmProgress": 30, "spirit": 4 } },
      { "label": "远遁避其锋芒", "desc": "保命要紧。", "effect": { "log": "你全力遁走，异兽并未追击。", "mp": -25, "lifespan": -3, "qi": 20 } }
    ]
  },
  # dujie tier event 1
  {
    "id": "evt_tribulation_forge",
    "name": "劫雷锤炼",
    "text": "天际劫云翻涌，紫色雷霆隐现。这不是天劫本体，但劫雷余波足以锤炼修士肉身。",
    "tags": ["天劫", "修炼"],
    "minRealm": "dujie",
    "choices": [
      { "label": "引雷淬体", "desc": "以劫雷强化肉身。", "effect": { "log": "劫雷贯体，你咬牙承受，肉身更加坚韧。", "hp": -40, "atk": 5, "def": 4, "realmProgress": 24 } },
      { "label": "以阵接雷", "desc": "布阵转化雷力。", "effect": { "log": "你布下引雷阵，将劫雷转化为纯净灵力。", "qi": 60, "mp": 30, "realmProgress": 16 } },
      { "label": "静观天象", "desc": "感悟天道规则。", "effect": { "log": "你远观劫云运行，对天道法则有了更深领悟。", "spirit": 4, "luck": 2, "realmProgress": 20 } }
    ]
  },
  # dujie tier event 2
  {
    "id": "evt_heart_demon",
    "name": "心魔试探",
    "text": "突然间，你看到了过去修行中所有的遗憾——未救之人、错失之缘、背弃之盟。心魔化形，与你对坐。",
    "tags": ["天劫", "剧情"],
    "minRealm": "dujie",
    "choices": [
      { "label": "直面心魔", "desc": "接受一切遗憾。", "effect": { "log": "你坦然面对过往，心魔在你的坦诚前消散。道心更加坚固。", "spirit": 6, "realmProgress": 30, "luck": 3 } },
      { "label": "以力镇压", "desc": "强行压制心魔。", "effect": { "log": "你以绝对修为压制心魔，虽然粗暴但有效。", "hp": -30, "mp": -20, "realmProgress": 22, "atk": 4 } },
      { "label": "与心魔对话", "desc": "试着理解它。", "effect": { "log": "你与心魔交谈，发现它是你自己的一部分。两者合一，你的神识空前清明。", "spirit": 8, "realmProgress": 26, "lifespan": 8 } }
    ]
  },
  # dujie tier event 3
  {
    "id": "evt_nine_heaven_path",
    "name": "九天引路",
    "text": "一道金色光柱从天而降，照亮了通往九天的道路。这是飞升前的最后指引。",
    "tags": ["天劫", "机缘"],
    "minRealm": "dujie",
    "choices": [
      { "label": "踏入光柱", "desc": "接受天道指引。", "effect": { "log": "光柱灌注全身，你距离飞升又近了一大步。", "realmProgress": 40, "qi": 80, "hp": -20 } },
      { "label": "在光中修炼", "desc": "借天道之力提升。", "effect": { "log": "你在金光中盘膝，所有属性都得到了提升。", "atk": 3, "def": 3, "spirit": 3, "luck": 2, "realmProgress": 20 } },
      { "label": "记录天道轨迹", "desc": "留存感悟。", "effect": { "log": "你将天道轨迹刻入神识，这份感悟将在关键时刻助你一臂之力。", "realmProgress": 34, "lifespan": 12, "exp": 40 } }
    ]
  }
]

# Load existing events
with open('D:/Code/text-xiuxian/src/data/events.json', encoding='utf-8') as f:
    events = json.load(f)

existing_ids = {e['id'] for e in events}
to_add = [e for e in NEW_EVENTS if e['id'] not in existing_ids]
events.extend(to_add)

with open('D:/Code/text-xiuxian/src/data/events.json', 'w', encoding='utf-8') as f:
    json.dump(events, f, ensure_ascii=False, indent=2)
print(f"Events: {len(events)} total (+{len(to_add)} new)")

# === Fix 2: Add legendary items ===
with open('D:/Code/text-xiuxian/src/data/items.json', encoding='utf-8') as f:
    items = json.load(f)

item_ids = {i['id'] for i in items}
new_items = [
  { "id": "artifact_heavenly_sword", "name": "天罚神剑", "type": "artifact", "rarity": "legendary", "desc": "传说中天道执法者所用之剑，攻伐之力冠绝天下。", "stats": { "atk": 12, "spirit": 5 }, "effect": { "breakthroughChance": 6 } },
  { "id": "pill_immortal", "name": "仙灵丹", "type": "pill", "rarity": "legendary", "desc": "以九天灵液凝炼而成，服之可续命百岁。", "effect": { "healHp": 200, "lifespan": 60 } }
]
for item in new_items:
    if item['id'] not in item_ids:
        items.append(item)

with open('D:/Code/text-xiuxian/src/data/items.json', 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)
print(f"Items: {len(items)} total")

# === Validate ===
skills = json.load(open('D:/Code/text-xiuxian/src/data/skills.json', encoding='utf-8'))
enemies = json.load(open('D:/Code/text-xiuxian/src/data/enemies.json', encoding='utf-8'))
item_ids = {i['id'] for i in items}
skill_ids = {s['id'] for s in skills}
enemy_ids = {e['id'] for e in enemies}

issues = []
for evt in events:
    for choice in evt['choices']:
        eff = choice['effect']
        if 'item' in eff and eff['item'] not in item_ids:
            issues.append(f'{evt["id"]}: bad item {eff["item"]}')
        if 'enemy' in eff and eff['enemy'] not in enemy_ids:
            issues.append(f'{evt["id"]}: bad enemy {eff["enemy"]}')
        if 'unlockSkill' in eff and eff['unlockSkill'] not in skill_ids:
            issues.append(f'{evt["id"]}: bad skill {eff["unlockSkill"]}')

if issues:
    for i in issues:
        print(f'BUG: {i}')
else:
    print("All references valid!")
