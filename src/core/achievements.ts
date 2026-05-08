import type { GameState, MetaState, RealmKey } from '../types'
import { realmList, regionList, techniqueIndex } from './gameData'

export interface AchievementDef {
  id: string
  name: string
  nameEn?: string
  desc: string
  descEn?: string
  icon: string
}

function stageIndex(realm: RealmKey): number {
  return Math.max(0, realmList.findIndex((r) => r.key === realm))
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'ach_first_explore', name: '初出茅庐', nameEn: 'First Steps', desc: '完成第一次历练', descEn: 'Complete your first exploration', icon: '🚶' },
  { id: 'ach_first_battle', name: '初临战阵', nameEn: 'First Battle', desc: '完成第一场战斗', descEn: 'Finish your first battle', icon: '⚔️' },
  { id: 'ach_reach_zhuji', name: '筑基成功', nameEn: 'Foundation Built', desc: '突破至筑基境', descEn: 'Reach Foundation realm', icon: '🏗️' },
  { id: 'ach_reach_jindan', name: '丹成一转', nameEn: 'Golden Core Formed', desc: '突破至金丹境', descEn: 'Reach Golden Core realm', icon: '💫' },
  { id: 'ach_reach_yuanying', name: '元婴化形', nameEn: 'Nascent Soul', desc: '突破至元婴境', descEn: 'Reach Nascent Soul realm', icon: '👶' },
  { id: 'ach_reach_huashen', name: '神通广大', nameEn: 'Great Powers', desc: '突破至化神境', descEn: 'Reach Spirit Severing realm', icon: '✨' },
  { id: 'ach_reach_dacheng', name: '道合天地', nameEn: 'One With Heaven', desc: '突破至大乘境', descEn: 'Reach Mahayana realm', icon: '🌏' },
  { id: 'ach_reach_dujie', name: '天劫降临', nameEn: 'Tribulation Descends', desc: '突破至渡劫境', descEn: 'Reach Tribulation realm', icon: '⚡' },
  { id: 'ach_ascended', name: '白日飞升', nameEn: 'Daylight Ascension', desc: '成功飞升成仙', descEn: 'Ascend successfully', icon: '🏔️' },
  { id: 'ach_survive_50', name: '半百修行', nameEn: 'Fifty Days', desc: '存活超过 50 天', descEn: 'Survive over 50 days', icon: '📅' },
  { id: 'ach_survive_100', name: '百日道途', nameEn: 'Hundred-Day Path', desc: '存活超过 100 天', descEn: 'Survive over 100 days', icon: '📆' },
  { id: 'ach_learn_3_skills', name: '博学多才', nameEn: 'Well Learned', desc: '同时掌握 3 种功法', descEn: 'Know 3 arts at once', icon: '📚' },
  { id: 'ach_learn_all_skills', name: '万法归宗', nameEn: 'All Arts Return', desc: '掌握全部 5 种功法', descEn: 'Know all 5 arts', icon: '🌟' },
  { id: 'ach_join_sect', name: '入门弟子', nameEn: 'Sect Disciple', desc: '加入一个门派', descEn: 'Join a sect', icon: '🏛️' },
  { id: 'ach_reincarnate_3', name: '三世轮回', nameEn: 'Three Rebirths', desc: '累计转世 3 次', descEn: 'Reincarnate 3 times', icon: '🔄' },
  { id: 'ach_reincarnate_10', name: '十世修行', nameEn: 'Ten Lives', desc: '累计转世 10 次', descEn: 'Reincarnate 10 times', icon: '♻️' },
  { id: 'ach_rich', name: '富甲一方', nameEn: 'Local Magnate', desc: '持有 200 灵石以上', descEn: 'Hold over 200 coins', icon: '💰' },
  { id: 'ach_collector', name: '法宝收藏家', nameEn: 'Artifact Collector', desc: '同时装备 3 件法宝', descEn: 'Equip 3 artifacts at once', icon: '🗡️' },
  { id: 'ach_first_craft', name: '初学炼丹', nameEn: 'First Alchemy', desc: '成功炼制第一颗丹药', descEn: 'Craft your first pill', icon: '🧪' },
  { id: 'ach_craft_10', name: '丹道精通', nameEn: 'Alchemy Adept', desc: '累计成功炼丹 10 次', descEn: 'Craft pills successfully 10 times', icon: '⚗️' },
  { id: 'ach_bounty_complete', name: '悬赏猎人', nameEn: 'Bounty Hunter', desc: '完成第一个悬赏任务', descEn: 'Complete your first bounty', icon: '📜' },
  { id: 'ach_bounty_10', name: '赏金王', nameEn: 'Bounty King', desc: '累计完成 10 个悬赏', descEn: 'Complete 10 bounties', icon: '🏆' },
  { id: 'ach_explore_regions', name: '踏遍山河', nameEn: 'Across the Land', desc: '在每个区域至少探索 1 次', descEn: 'Explore every region at least once', icon: '🗺️' },
  { id: 'ach_first_technique', name: '初窥门径', nameEn: 'First Art', desc: '学习第一个功法', descEn: 'Learn your first technique', icon: '📖' },
  { id: 'ach_technique_master', name: '功法大成', nameEn: 'Art Mastered', desc: '任意功法修炼至满级', descEn: 'Raise any technique to max level', icon: '🌙' },
]

const REALM_ACH_MAP: Record<string, RealmKey> = {
  'ach_reach_zhuji': 'jzhuji',
  'ach_reach_jindan': 'jindan',
  'ach_reach_yuanying': 'yuanying',
  'ach_reach_huashen': 'huashen',
  'ach_reach_dacheng': 'dacheng',
  'ach_reach_dujie': 'dujie',
}

export function checkAchievements(game: GameState, meta: MetaState): string[] {
  const newlyUnlocked: string[] = []

  function tryUnlock(id: string, condition: boolean): void {
    if (condition && !meta.achievements?.[id]) {
      if (!meta.achievements) meta.achievements = {}
      meta.achievements[id] = true
      newlyUnlocked.push(id)
    }
  }

  // Exploration
  tryUnlock('ach_first_explore', (game.explorationsDone ?? 0) >= 1)

  // Battle
  tryUnlock('ach_first_battle', (game.battlesWon ?? 0) >= 1)

  // Realm milestones
  for (const [achId, realm] of Object.entries(REALM_ACH_MAP)) {
    tryUnlock(achId, stageIndex(game.realm) >= stageIndex(realm))
  }

  // Ascension
  tryUnlock('ach_ascended', game.ending === 'ascended')

  // Survival
  tryUnlock('ach_survive_50', game.day >= 50)
  tryUnlock('ach_survive_100', game.day >= 100)

  // Skills
  tryUnlock('ach_learn_3_skills', game.learnedSkills.length >= 3)
  tryUnlock('ach_learn_all_skills', game.learnedSkills.length >= 5)

  // Sect
  tryUnlock('ach_join_sect', Boolean(game.sect))

  // Reincarnation
  tryUnlock('ach_reincarnate_3', meta.reincarnationCount >= 3)
  tryUnlock('ach_reincarnate_10', meta.reincarnationCount >= 10)

  // Wealth
  tryUnlock('ach_rich', game.coin >= 200)

  // Collector
  tryUnlock('ach_collector', game.equippedArtifacts.length >= 3)

  // Alchemy
  tryUnlock('ach_first_craft', (game.alchemyCount ?? 0) >= 1)
  tryUnlock('ach_craft_10', (game.alchemyCount ?? 0) >= 10)

  // Bounties
  tryUnlock('ach_bounty_complete', (game.completedBounties ?? 0) >= 1)
  tryUnlock('ach_bounty_10', (game.completedBounties ?? 0) >= 10)

  // Region exploration
  tryUnlock('ach_explore_regions', Object.keys(game.regionExploreCount ?? {}).length >= regionList.length)

  // Techniques
  tryUnlock('ach_first_technique', (game.techniques ?? []).length >= 1)
  tryUnlock('ach_technique_master', (game.techniques ?? []).some((t) => {
    const def = techniqueIndex.get(t.techId)
    return def ? t.level >= def.maxLevel : false
  }))

  return newlyUnlocked
}

export function getUnlockedCount(meta: MetaState): number {
  return Object.keys(meta.achievements ?? {}).length
}
