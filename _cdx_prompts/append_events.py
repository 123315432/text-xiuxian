import json

NEW_EVENTS = [
  # === 无境界限制（8个）===
  {
    "id": "evt_wandering_monk",
    "name": "云游僧人",
    "text": "一位身披破袈裟的僧人拦下你，说能看出你的命数。",
    "tags": ["剧情", "机缘"],
    "choices": [
      { "label": "请他指点", "desc": "听听天机。", "effect": { "log": "僧人轻叹，赠你一枚护身符。", "item": "artifact_iron_amulet", "lifespan": 2 } },
      { "label": "施舍灵石", "desc": "结下善缘。", "effect": { "log": "僧人合掌，你感到气机清明。", "coin": -8, "mp": 20, "luck": 1 } },
      { "label": "绕道离开", "desc": "不沾因果。", "effect": { "log": "你绕开僧人，莫名感到一丝惋惜。", "lifespan": -1 } }
    ]
  },
  {
    "id": "evt_frozen_spring",
    "name": "冻泉破冰",
    "text": "一处山泉被寒气封冻，冰层下隐约有光。",
    "tags": ["机缘", "危险"],
    "choices": [
      { "label": "破冰取宝", "desc": "可能有收获。", "effect": { "log": "你破冰取出一枚残损法器。", "item": "artifact_spirit_ring", "hp": -8 } },
      { "label": "以掌融化", "desc": "消耗灵力。", "effect": { "log": "寒气入体，但泉水清澈，灵力回升。", "mp": -10, "qi": 20, "hp": -4 } },
      { "label": "留待天晴", "desc": "保守行事。", "effect": { "log": "你选择离去，寒意随风散。", "lifespan": 1 } }
    ]
  },
  {
    "id": "evt_spirit_mushroom",
    "name": "千年灵菇",
    "text": "巨石下长着一株通体发光的巨型灵菇，孢子飘散在空气中。",
    "tags": ["丹药", "机缘"],
    "choices": [
      { "label": "整株采下", "desc": "可能有副作用。", "effect": { "log": "孢子入体，神识一阵晕眩，随后感到无比清明。", "qi": 24, "mp": 20, "hp": -6 } },
      { "label": "摘取一片", "desc": "稳妥收获。", "effect": { "log": "你小心取下一片，炼成丹药。", "item": "pill_qi", "item2": "pill_heal", "exp": 8 } },
      { "label": "拍下孢子", "desc": "另辟蹊径。", "effect": { "log": "孢子结成粉末，你搜集了数份。", "item": "pill_break", "lifespan": -1 } }
    ]
  },
  {
    "id": "evt_iron_furnace",
    "name": "铸剑余炉",
    "text": "一座无主铸剑炉还有余温，地上散落着铁屑与符文残片。",
    "tags": ["传承", "法宝"],
    "choices": [
      { "label": "淬炼自身", "desc": "借炉火强化。", "effect": { "log": "炉火熔炼，你的气血与攻势都有所增强。", "atk": 3, "hp": -12, "exp": 10 } },
      { "label": "拼凑符文", "desc": "尝试参悟。", "effect": { "log": "你从残片中悟出一丝剑意。", "unlockSkill": "skill_breath_sword", "exp": 14 } },
      { "label": "搜刮炉灰", "desc": "务实取利。", "effect": { "log": "炉灰中混着几枚灵石。", "coin": 18, "mp": 10 } }
    ]
  },
  {
    "id": "evt_crow_omen",
    "name": "乌鸦示警",
    "text": "一只通体乌黑的神鸦落在你肩上，喙中衔着一片残损竹简。",
    "tags": ["机缘", "剧情"],
    "choices": [
      { "label": "展开竹简", "desc": "一探究竟。", "effect": { "log": "竹简上只有八个字：死生有命，莫逆天数。", "lifespan": 6, "luck": 1 } },
      { "label": "驱鸦赶走", "desc": "不沾妖气。", "effect": { "log": "乌鸦振翅而去，地上留下几枚灵石。", "coin": 12, "realmProgress": 4 } },
      { "label": "收下竹简", "desc": "留作研究。", "effect": { "log": "竹简自燃，你悟出一丝天道气息。", "realmProgress": 12, "exp": 10 } }
    ]
  },
  {
    "id": "evt_abandoned_shrine",
    "name": "无人神祠",
    "text": "荒野中一座小祠无人祭拜，神像面目模糊，香炉里还有半截残香。",
    "tags": ["剧情", "善缘"],
    "choices": [
      { "label": "点燃残香", "desc": "祭拜神明。", "effect": { "log": "香烟升起，你莫名感到一段寿元回流。", "lifespan": 5, "luck": 1 } },
      { "label": "翻找供品", "desc": "搜刮一番。", "effect": { "log": "供品早已腐烂，只有一枚古铜符。", "item": "artifact_iron_amulet", "luck": -1, "hp": -4 } },
      { "label": "修缮香炉", "desc": "积一段善缘。", "effect": { "log": "神祠显出淡淡金光，你体内气机顺畅。", "qi": 16, "mp": 14, "exp": 8 } }
    ]
  },
  {
    "id": "evt_mirror_pool",
    "name": "镜面幽潭",
    "text": "潭水平静如镜，倒映出一个与你相似却身着仙衣的影像。",
    "tags": ["机缘", "修炼"],
    "choices": [
      { "label": "凝视影像", "desc": "尝试领悟。", "effect": { "log": "影像触动了你对上境的感知，修为微动。", "realmProgress": 14, "qi": 18 } },
      { "label": "投石入潭", "desc": "破除幻境。", "effect": { "log": "幻境碎散，潭底涌出一股灵气。", "qi": 24, "hp": -6 } },
      { "label": "绕潭而行", "desc": "避开奇异。", "effect": { "log": "你平稳绕行，神识未受干扰。", "lifespan": 1, "mp": 12 } }
    ]
  },
  {
    "id": "evt_sword_grave",
    "name": "剑冢遗址",
    "text": "山坡上插满破剑残刃，这里曾是一场大战的终点。",
    "tags": ["传承", "战斗"],
    "choices": [
      { "label": "拔剑感应", "desc": "与遗意共鸣。", "effect": { "log": "千人剑意涌入你体内，气脉震颤。", "atk": 4, "spirit": 2, "hp": -10, "exp": 15 } },
      { "label": "收集残片", "desc": "取材带走。", "effect": { "log": "你熔合碎片，凑成一件残兵器。", "item": "artifact_flying_sword", "lifespan": -1 } },
      { "label": "祭奠先烈", "desc": "结一段因果。", "effect": { "log": "无数残魂平息，你感到气运有所回转。", "luck": 2, "lifespan": 3 } }
    ]
  },
  # === minRealm jzhuji（5个）===
  {
    "id": "evt_sect_inspection",
    "name": "宗门巡察",
    "text": "一支宗门执法队正在盘查散修，为首者腰别令牌，神色冷漠。",
    "tags": ["剧情", "危险"],
    "minRealm": "jzhuji",
    "choices": [
      { "label": "亮明身份", "desc": "坦然应对。", "effect": { "log": "你出示修行凭证，执法队放行，还给了些盘缠。", "coin": 14, "exp": 8 } },
      { "label": "行贿通关", "desc": "花钱保平安。", "effect": { "log": "你悄悄递出灵石，顺利通过。", "coin": -20, "lifespan": 1 } },
      { "label": "强行突围", "desc": "冒险一搏。", "effect": { "log": "你硬闯出包围圈，但受了点伤。", "battle": "sword_bandit", "enemy": "sword_bandit", "qi": 10 } }
    ]
  },
  {
    "id": "evt_mortal_town",
    "name": "凡人集市",
    "text": "一座热闹的凡人小镇，摊贩呼喝，炊烟袅袅，到处都是尘世烟火气。",
    "tags": ["剧情", "商店"],
    "minRealm": "jzhuji",
    "choices": [
      { "label": "购置丹药", "desc": "补充资源。", "effect": { "log": "你在草药摊上凑成一瓶丹药。", "item": "pill_heal", "coin": -12 } },
      { "label": "混入人群", "desc": "放松心神。", "effect": { "log": "你隐去修士气息，感受凡人烟火，心神安定。", "lifespan": 4, "hp": 20, "mp": 16 } },
      { "label": "收购灵材", "desc": "投资长线。", "effect": { "log": "你以低价收购几株不起眼的灵草，提炼成丹。", "item": "pill_break", "coin": -18, "exp": 8 } }
    ]
  },
  {
    "id": "evt_pill_elder",
    "name": "炼丹老翁",
    "text": "山路旁一位白须老者正守着一座小炉，丹香扑鼻。",
    "tags": ["丹药", "剧情"],
    "minRealm": "jzhuji",
    "choices": [
      { "label": "拜师学艺", "desc": "可能领悟炼丹。", "effect": { "log": "老翁授你一道炼气心法，修为微进。", "realmProgress": 10, "qi": 14, "exp": 12 } },
      { "label": "以物换丹", "desc": "互利交换。", "effect": { "log": "你以几枚灵石换得两瓶上品丹药。", "item": "pill_qi", "coin": -16 } },
      { "label": "帮忙守炉", "desc": "耐心等待。", "effect": { "log": "炉火稳住，老翁赠你一枚破境丹。", "item": "pill_break", "lifespan": -2 } }
    ]
  },
  {
    "id": "evt_beast_herd",
    "name": "兽群冲关",
    "text": "一群山兽受了惊吓，从山道冲来，挡路者必遭踩踏。",
    "tags": ["危险", "生存"],
    "minRealm": "jzhuji",
    "choices": [
      { "label": "御剑飞避", "desc": "借飞行躲过。", "effect": { "log": "你腾身而起，兽群从脚下奔涌而过。", "mp": -12, "exp": 10, "qi": 8 } },
      { "label": "以气震退", "desc": "强行阻拦。", "effect": { "log": "你放出灵压，兽群四散，但消耗不小。", "hp": -14, "qi": 18, "coin": 10 } },
      { "label": "顺势驱赶", "desc": "引导方向。", "effect": { "log": "你借势将兽群引走，发现了它们藏匿的旧洞。", "item": "artifact_iron_amulet", "lifespan": -1 } }
    ]
  },
  {
    "id": "evt_cursed_well",
    "name": "诅咒古井",
    "text": "一口古井散发刺鼻的灵气，井沿刻满了封禁符文，大半已碎裂。",
    "tags": ["危险", "秘境"],
    "minRealm": "jzhuji",
    "choices": [
      { "label": "破印取宝", "desc": "冒险解禁。", "effect": { "log": "符印碎裂，一道阴气直冲而来，但你抢到了井底沉宝。", "item": "artifact_spirit_ring", "hp": -18, "mp": -8 } },
      { "label": "加固符文", "desc": "稳住封禁。", "effect": { "log": "你重新加固了符文，诅咒散去，得到了一段感悟。", "realmProgress": 10, "lifespan": 3 } },
      { "label": "绕道而行", "desc": "不碰麻烦。", "effect": { "log": "你绕开古井，保住了清明心神。", "lifespan": 1, "luck": 1 } }
    ]
  },
  # === minRealm jindan（5个）===
  {
    "id": "evt_spirit_contract",
    "name": "灵兽契约",
    "text": "一只通体青翠的灵鹿盘踞山顶，眼中含着契约的光芒。",
    "tags": ["灵兽", "机缘"],
    "minRealm": "jindan",
    "choices": [
      { "label": "订立契约", "desc": "得到灵兽之力。", "effect": { "log": "你与灵鹿订约，其灵力馈入你体。", "mp": 30, "spirit": 2, "lifespan": 4 } },
      { "label": "试图擒拿", "desc": "可能触发战斗。", "effect": { "log": "灵鹿不从，化为妖气袭来。", "battle": "fox_spirit", "enemy": "fox_spirit", "qi": 10 } },
      { "label": "静坐等候", "desc": "耐心感应。", "effect": { "log": "灵鹿主动靠近，在你肩头留下一缕灵息。", "exp": 18, "luck": 2, "qi": 16 } }
    ]
  },
  {
    "id": "evt_ancient_ruin",
    "name": "古迹探索",
    "text": "丛林中一座古代仙门遗址若隐若现，里面的阵法犹有余威。",
    "tags": ["秘境", "危险"],
    "minRealm": "jindan",
    "choices": [
      { "label": "破阵深入", "desc": "可能遇敌。", "effect": { "log": "你破开残阵，深入内部，惊动了沉睡的守卫。", "battle": "corpse_puppet", "enemy": "corpse_puppet" } },
      { "label": "阵外参悟", "desc": "隔阵感知。", "effect": { "log": "你从阵外感悟残留的阵法构造，神识大进。", "realmProgress": 16, "spirit": 2, "exp": 18 } },
      { "label": "搜索外围", "desc": "稳妥探索。", "effect": { "log": "遗址边缘有前人遗留的储物袋。", "item": "artifact_spirit_ring", "coin": 22, "exp": 10 } }
    ]
  },
  {
    "id": "evt_cursed_relic",
    "name": "诅咒法器",
    "text": "路旁一件散发幽光的法器无主悬空，散发着吸引与排斥并存的气息。",
    "tags": ["法宝", "危险"],
    "minRealm": "jindan",
    "choices": [
      { "label": "强行炼化", "desc": "冒险同化。", "effect": { "log": "诅咒暂被压制，法器归你所有，但气血受损。", "item": "artifact_flying_sword", "hp": -22, "atk": 4 } },
      { "label": "解除诅咒", "desc": "先化解再取。", "effect": { "log": "你花了大量灵力解咒，法器随后老实落入手中。", "item": "artifact_spirit_ring", "mp": -25, "exp": 14 } },
      { "label": "就地毁掉", "desc": "不沾因果。", "effect": { "log": "法器毁去时释放出一道灵力，滋养了你的修为。", "qi": 20, "realmProgress": 10, "luck": 1 } }
    ]
  },
  {
    "id": "evt_demon_ambush",
    "name": "魔修伏击",
    "text": "一名老牌魔修从暗处突然现身，气势汹汹，摆明了要劫走你的功法传承。",
    "tags": ["战斗", "危险"],
    "minRealm": "jindan",
    "choices": [
      { "label": "正面迎战", "desc": "硬碰硬。", "effect": { "log": "你拔剑迎敌，大战一场。", "battle": "elder_demon", "enemy": "elder_demon" } },
      { "label": "以幻脱身", "desc": "幻术逃跑。", "effect": { "log": "你以迷雾遮蔽身形，借机遁走。", "mp": -18, "lifespan": -1, "coin": -10 } },
      { "label": "以宝换命", "desc": "破财消灾。", "effect": { "log": "你丢出一件法器转移注意力，乘机逃脱。", "item": "artifact_iron_amulet", "exp": 10, "lifespan": 1 } }
    ]
  },
  {
    "id": "evt_thunder_scroll",
    "name": "雷法残卷",
    "text": "一块岩壁上刻着半残的雷法功诀，已历经数百年风雨。",
    "tags": ["功法", "传承"],
    "minRealm": "jindan",
    "choices": [
      { "label": "强行参悟", "desc": "全力领悟。", "effect": { "log": "你尽力推演，终于领悟了雷法精髓。", "unlockSkill": "skill_thunder_cut", "exp": 20, "mp": -15 } },
      { "label": "拓印带走", "desc": "以后慢慢研究。", "effect": { "log": "你带走了拓印，感觉日后大有用处。", "item": "skill_thunder_cut", "lifespan": -1 } },
      { "label": "毁去痕迹", "desc": "不留后患。", "effect": { "log": "你毁去功诀，却从中感悟到一点天雷之道。", "spirit": 2, "qi": 14, "realmProgress": 8 } }
    ]
  },
  # === minRealm yuanying（4个）===
  {
    "id": "evt_spatial_tear",
    "name": "空间裂隙",
    "text": "天地间突然撕开一道细微的裂隙，里面流出浓郁的异界灵气。",
    "tags": ["机缘", "危险"],
    "minRealm": "yuanying",
    "choices": [
      { "label": "伸手探入", "desc": "冒险取物。", "effect": { "log": "你取出一件来自异界的法器，裂隙随即合拢。", "item": "artifact_flying_sword", "hp": -15, "exp": 20 } },
      { "label": "引气入体", "desc": "趁机修炼。", "effect": { "log": "异界灵气浓郁，短暂的引气让你修为大进。", "qi": 40, "realmProgress": 20, "hp": -8 } },
      { "label": "就地封印", "desc": "维护秩序。", "effect": { "log": "你封住裂隙，天道隐隐给你一段气运回馈。", "luck": 2, "lifespan": 6 } }
    ]
  },
  {
    "id": "evt_great_cultivator",
    "name": "大修路过",
    "text": "一位境界远超你的大修士一掌拂过，留下浓郁气息，似乎有所指点。",
    "tags": ["机缘", "剧情"],
    "minRealm": "yuanying",
    "choices": [
      { "label": "追上请教", "desc": "求点拨。", "effect": { "log": "大修驻足片刻，点拨你几句，神识豁然开朗。", "realmProgress": 24, "spirit": 3, "exp": 24 } },
      { "label": "感应气息", "desc": "默默领悟。", "effect": { "log": "你感悟大修残留气息，悟出一丝更高境界的法则。", "qi": 36, "realmProgress": 16, "mp": 20 } },
      { "label": "恭敬行礼", "desc": "结下善缘。", "effect": { "log": "大修回头微笑，赠你一枚古币，言：此物自有用处。", "luck": 3, "lifespan": 8, "coin": 40 } }
    ]
  },
  {
    "id": "evt_forbidden_art",
    "name": "禁忌功法",
    "text": "机缘巧合，你得到了一卷被列为禁忌的功法，天道异象随之而来。",
    "tags": ["功法", "危险"],
    "minRealm": "yuanying",
    "choices": [
      { "label": "冒险修炼", "desc": "强行参悟。", "effect": { "log": "功法凶险，但威力非凡，修为骤增，身体亦受创。", "atk": 6, "spirit": 3, "hp": -30, "realmProgress": 18 } },
      { "label": "封印收藏", "desc": "留待时机。", "effect": { "log": "你封住功法，天道异象消散，只余一丝机缘在手。", "item": "skill_fire_palm", "lifespan": 2 } },
      { "label": "当场焚毁", "desc": "不沾因果。", "effect": { "log": "功法焚尽，天道给你一段因果清明的奖励。", "luck": 2, "lifespan": 10, "qi": 20 } }
    ]
  },
  {
    "id": "evt_soul_echo",
    "name": "残魂回响",
    "text": "一位飞升未成的强大修士的残魂在此地徘徊，向你传递关于上境的只言片语。",
    "tags": ["传承", "修炼"],
    "minRealm": "yuanying",
    "choices": [
      { "label": "倾心聆听", "desc": "受其指引。", "effect": { "log": "残魂将毕生感悟压缩成一道印记传你，气势大增。", "realmProgress": 28, "spirit": 4, "exp": 28 } },
      { "label": "渡其离去", "desc": "超度善举。", "effect": { "log": "残魂平静散去，留下一道气运为谢。", "luck": 3, "lifespan": 10, "qi": 24 } },
      { "label": "以神识问道", "desc": "主动探问。", "effect": { "log": "你主动问询，残魂给出答案后消散，你对天道有了新的感悟。", "qi": 30, "realmProgress": 20, "mp": 24 } }
    ]
  },
  # === minRealm huashen（2个）===
  {
    "id": "evt_heaven_rift",
    "name": "天穹裂缝",
    "text": "晴空万里中突然出现一道金色裂缝，天道法则从中倾泻而出。",
    "tags": ["天劫", "机缘"],
    "minRealm": "huashen",
    "choices": [
      { "label": "引法则入体", "desc": "极度危险。", "effect": { "log": "天道法则直接冲击你的神识，痛苦万分，但修为骤升。", "realmProgress": 34, "hp": -40, "mp": -20, "spirit": 5 } },
      { "label": "驻足感悟", "desc": "被动领悟。", "effect": { "log": "你立于裂缝之下，神识受天道法则洗礼，大有裨益。", "realmProgress": 20, "spirit": 3, "qi": 40 } },
      { "label": "布阵接引", "desc": "导引法则。", "effect": { "log": "你以阵法接引天道法则，平稳转化为修为与寿元。", "realmProgress": 16, "lifespan": 12, "qi": 30 } }
    ]
  },
  {
    "id": "evt_ancient_immortal",
    "name": "仙人遗迹",
    "text": "远古飞升之处留有不灭印记，传说此地悟道者十中有九可以顺利飞升。",
    "tags": ["机缘", "传承"],
    "minRealm": "huashen",
    "choices": [
      { "label": "盘膝入定", "desc": "在此悟道。", "effect": { "log": "你在遗迹中闭关，感受古仙气息，修为飞速提升。", "realmProgress": 40, "qi": 50, "lifespan": -4 } },
      { "label": "搜寻遗物", "desc": "找找有没有留下的宝物。", "effect": { "log": "遗迹中藏有古仙遗留的法宝与丹药。", "item": "artifact_flying_sword", "item2": "pill_longevity", "exp": 30 } },
      { "label": "感应上境", "desc": "神识接触飞升之门。", "effect": { "log": "你感应到飞升之门，离成仙又近了一步。", "realmProgress": 30, "spirit": 4, "luck": 2 } }
    ]
  },
  # === minRealm dacheng（2个）===
  {
    "id": "evt_celestial_trial",
    "name": "天道试炼",
    "text": "天道降下考验，你面对着一场无法回避的正面试炼。",
    "tags": ["天劫", "危险"],
    "minRealm": "dacheng",
    "choices": [
      { "label": "正面应战", "desc": "硬碰硬。", "effect": { "log": "你正面迎接天罚阴兵的考验。", "battle": "infernal_soldier", "enemy": "infernal_soldier" } },
      { "label": "以法抗衡", "desc": "消耗重宝。", "effect": { "log": "你祭出全力，以重宝抵挡天道考验。", "item": "pill_thunder", "realmProgress": 30, "hp": -30 } },
      { "label": "臣服受罚", "desc": "低头认罚。", "effect": { "log": "你低头受罚，天道给你留下一线生机与警告。", "hp": -24, "mp": -16, "lifespan": -8, "luck": 2 } }
    ]
  },
  {
    "id": "evt_ascension_eve",
    "name": "飞升前夕",
    "text": "漫漫修行已近尾声，天边隐约出现了仙门的轮廓，你站在最后的抉择前。",
    "tags": ["机缘", "剧情"],
    "minRealm": "dacheng",
    "choices": [
      { "label": "全力冲击", "desc": "奋力一搏。", "effect": { "log": "你将毕生积累倾注一处，天道感应，修为大进。", "realmProgress": 40, "qi": 60, "hp": -20 } },
      { "label": "稳固根基", "desc": "先夯实再说。", "effect": { "log": "你放缓步伐，稳固道基，成功率提高。", "realmProgress": 24, "spirit": 4, "lifespan": 8 } },
      { "label": "留书寄怀", "desc": "落笔成真。", "effect": { "log": "你将一生感悟刻入山壁，天地回应，运气逆转。", "luck": 4, "realmProgress": 18, "lifespan": 12 } }
    ]
  }
]

# Load existing events
with open('D:/Code/text-xiuxian/src/data/events.json', encoding='utf-8') as f:
    existing = json.load(f)

# Filter out any duplicates by id
existing_ids = {e['id'] for e in existing}
to_add = [e for e in NEW_EVENTS if e['id'] not in existing_ids]

# Remove invalid fields (item2 is not in the schema, we need to just use item)
# Actually item2 is not a valid effect field - fix those
for evt in to_add:
    for choice in evt['choices']:
        if 'item2' in choice['effect']:
            del choice['effect']['item2']

combined = existing + to_add
with open('D:/Code/text-xiuxian/src/data/events.json', 'w', encoding='utf-8') as f:
    json.dump(combined, f, ensure_ascii=False, indent=2)

print(f"Done: {len(existing)} existing + {len(to_add)} new = {len(combined)} total events")
