import json

SECT_EVENTS = [
  # Sect invitation event
  {
    "id": "evt_sect_invitation",
    "name": "三宗来使",
    "text": "一座茶楼里坐着三位修士，分别来自剑宗、丹宗和符宗。他们都对你展现了招揽之意。",
    "tags": ["剧情", "机缘"],
    "minRealm": "jzhuji",
    "choices": [
      { "label": "加入剑宗", "desc": "攻伐为先。", "effect": { "log": "你选择了剑宗，以剑入道。", "joinSect": "jian", "atk": 2, "qi": 10 } },
      { "label": "加入丹宗", "desc": "续命为本。", "effect": { "log": "你选择了丹宗，炼丹悟药。", "joinSect": "dan", "hp": 10, "mp": 10 } },
      { "label": "加入符宗", "desc": "万法归宗。", "effect": { "log": "你选择了符宗，画符布阵。", "joinSect": "fu", "def": 2, "luck": 1 } }
    ]
  },
  # Jian sect events
  {
    "id": "evt_jian_sparring",
    "name": "剑道切磋",
    "text": "剑宗同门邀你切磋剑法，剑光交织间暗藏指点。",
    "tags": ["功法", "修炼"],
    "minRealm": "jindan",
    "sectOnly": "jian",
    "choices": [
      { "label": "全力比试", "desc": "拼尽全力。", "effect": { "log": "你在切磋中悟出新的剑招。", "atk": 4, "spirit": 2, "hp": -12, "exp": 16 } },
      { "label": "请教前辈", "desc": "虚心学习。", "effect": { "log": "前辈指点，你的剑意更加凝练。", "realmProgress": 14, "qi": 20, "exp": 12 } },
      { "label": "旁观悟道", "desc": "从旁领悟。", "effect": { "log": "你在旁观中有所感悟。", "spirit": 2, "qi": 14, "luck": 1 } }
    ]
  },
  {
    "id": "evt_jian_legacy",
    "name": "剑意传承",
    "text": "剑宗秘阁开放一日，你有机会进入参悟上古剑意残卷。",
    "tags": ["传承", "功法"],
    "minRealm": "yuanying",
    "sectOnly": "jian",
    "choices": [
      { "label": "强行参悟", "desc": "冒险领悟。", "effect": { "log": "你悟出了上古剑意的一缕真谛。", "unlockSkill": "skill_thunder_cut", "atk": 3, "hp": -20 } },
      { "label": "缓慢研读", "desc": "稳扎稳打。", "effect": { "log": "你细细品读，剑道根基更加深厚。", "realmProgress": 22, "spirit": 3, "exp": 20 } },
      { "label": "抄录带走", "desc": "日后再看。", "effect": { "log": "你抄下要点，带回细细钻研。", "item": "skill_thunder_cut", "lifespan": -2 } }
    ]
  },
  # Dan sect events
  {
    "id": "evt_dan_brewing",
    "name": "炼丹大会",
    "text": "丹宗举办年度炼丹大会，你被分到一批上品灵草和一座灵炉。",
    "tags": ["丹药", "修炼"],
    "minRealm": "jindan",
    "sectOnly": "dan",
    "choices": [
      { "label": "炼制上品丹", "desc": "冒险冲击高品。", "effect": { "log": "你成功炼出上品丹药！", "item": "pill_break", "exp": 16, "mp": -15 } },
      { "label": "炼制回春丹", "desc": "稳妥产出。", "effect": { "log": "你顺利炼成数瓶回春丹。", "item": "pill_heal", "exp": 10, "qi": 12 } },
      { "label": "研究药理", "desc": "积累理论。", "effect": { "log": "你在药理上有了新的认识。", "spirit": 2, "realmProgress": 12, "lifespan": 4 } }
    ]
  },
  {
    "id": "evt_dan_herb_garden",
    "name": "药田采集",
    "text": "丹宗药田灵草成熟，你有资格采集一批。",
    "tags": ["丹药", "机缘"],
    "minRealm": "jzhuji",
    "sectOnly": "dan",
    "choices": [
      { "label": "采集灵草", "desc": "直接收获。", "effect": { "log": "你采到几株上品灵草。", "item": "pill_qi", "item2": "pill_heal", "exp": 8 } },
      { "label": "寻找珍稀品种", "desc": "碰碰运气。", "effect": { "log": "你在角落发现了一株极品灵草。", "item": "pill_longevity", "hp": -6 } },
      { "label": "帮忙除草", "desc": "积累善缘。", "effect": { "log": "药田管理者感谢你的帮忙，赠你一枚延寿丹。", "item": "pill_longevity", "lifespan": -1, "exp": 6 } }
    ]
  },
  # Fu sect events
  {
    "id": "evt_fu_array",
    "name": "阵法研究",
    "text": "符宗阵法室开放实验，你可以参与一场阵法推演。",
    "tags": ["修炼", "传承"],
    "minRealm": "jindan",
    "sectOnly": "fu",
    "choices": [
      { "label": "主导推演", "desc": "独挑大梁。", "effect": { "log": "你成功推演出新的阵法变体。", "def": 3, "spirit": 2, "exp": 16, "mp": -12 } },
      { "label": "协助运算", "desc": "配合团队。", "effect": { "log": "你在协作中积累了阵法经验。", "realmProgress": 14, "luck": 2, "qi": 16 } },
      { "label": "记录数据", "desc": "务实积累。", "effect": { "log": "你详细记录了推演数据，日后大有用处。", "exp": 12, "coin": 18, "spirit": 1 } }
    ]
  },
  {
    "id": "evt_fu_talisman",
    "name": "符箓制作",
    "text": "符宗前辈传授你制作高阶符箓的技巧。",
    "tags": ["法宝", "传承"],
    "minRealm": "jzhuji",
    "sectOnly": "fu",
    "choices": [
      { "label": "制作攻击符", "desc": "威力型。", "effect": { "log": "你成功制作了一张攻击符箓。", "atk": 3, "mp": -10, "exp": 10 } },
      { "label": "制作防御符", "desc": "稳固型。", "effect": { "log": "你制成防御符，加固己身。", "item": "artifact_iron_amulet", "exp": 8 } },
      { "label": "制作运势符", "desc": "玄学型。", "effect": { "log": "运势符成型，你感到气运微妙变化。", "luck": 3, "lifespan": 4, "exp": 6 } }
    ]
  }
]

# Remove invalid fields
for evt in SECT_EVENTS:
    for choice in evt['choices']:
        eff = choice['effect']
        if 'item2' in eff:
            del eff['item2']

with open('D:/Code/text-xiuxian/src/data/events.json', encoding='utf-8') as f:
    events = json.load(f)

existing_ids = {e['id'] for e in events}
to_add = [e for e in SECT_EVENTS if e['id'] not in existing_ids]
events.extend(to_add)

with open('D:/Code/text-xiuxian/src/data/events.json', 'w', encoding='utf-8') as f:
    json.dump(events, f, ensure_ascii=False, indent=2)
print(f"Events: {len(events)} total (+{len(to_add)} sect events)")
