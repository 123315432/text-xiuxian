import type { GameState, MetaState, ReincarnationPerk, RealmKey, RunRecord } from '../types'
import { realmList } from './gameData'
import { platformGetItem, platformSetItem } from '../platform/crazygames'

const META_KEY = 'text-xiuxian-meta-v1'
const META_VERSION = 1

export const PERKS: ReincarnationPerk[] = [
  { id: 'perk_hp', name: '强体残记', nameEn: 'Body Memory', desc: '初始气血 +8', descEn: 'Starting HP +8', cost: 5, maxLevel: 10, effect: { startHp: 8 } },
  { id: 'perk_atk', name: '杀意残影', nameEn: 'Killing Intent', desc: '初始攻击 +2', descEn: 'Starting ATK +2', cost: 8, maxLevel: 8, effect: { startAtk: 2 } },
  { id: 'perk_def', name: '铁壁残识', nameEn: 'Iron Wall Memory', desc: '初始防御 +2', descEn: 'Starting DEF +2', cost: 8, maxLevel: 8, effect: { startDef: 2 } },
  { id: 'perk_spirit', name: '神识残光', nameEn: 'Spirit Glimmer', desc: '初始神识 +2', descEn: 'Starting Spirit +2', cost: 12, maxLevel: 6, effect: { startSpirit: 2 } },
  { id: 'perk_lifespan', name: '长生残缘', nameEn: 'Longevity Trace', desc: '初始寿元 +8', descEn: 'Starting lifespan +8', cost: 10, maxLevel: 10, effect: { startLifespan: 8 } },
  { id: 'perk_coin', name: '灵石残库', nameEn: 'Coin Cache', desc: '初始灵石 +10', descEn: 'Starting coins +10', cost: 6, maxLevel: 10, effect: { startCoin: 10 } },
  { id: 'perk_pill', name: '丹药残方', nameEn: 'Pill Formula', desc: '开局携带回春丹 ×1', descEn: 'Start with Rejuvenation Pill x1', cost: 15, maxLevel: 3, effect: { startItem: 'pill_heal' } },
  { id: 'perk_break', name: '破境残悟', nameEn: 'Breakthrough Insight', desc: '突破成功率 +2%', descEn: 'Breakthrough chance +2%', cost: 20, maxLevel: 5, effect: { breakthroughBonus: 2 } },
]

function stageIndex(realm: RealmKey): number {
  return Math.max(0, realmList.findIndex((r) => r.key === realm))
}

export function createDefaultMeta(): MetaState {
  return {
    version: META_VERSION,
    reincarnationCount: 0,
    totalDaoFruit: 0,
    availableDaoFruit: 0,
    perkLevels: {},
    bestRealm: 'lianqi',
    bestDays: 0,
    runHistory: [],
    achievements: {},
  }
}

export function loadMeta(): MetaState {
  try {
    const raw = platformGetItem(META_KEY)
    if (!raw) return createDefaultMeta()
    const parsed = JSON.parse(raw) as MetaState
    if (!parsed || parsed.version !== META_VERSION) return createDefaultMeta()
    return parsed
  } catch {
    return createDefaultMeta()
  }
}

export function saveMeta(meta: MetaState): void {
  platformSetItem(META_KEY, JSON.stringify(meta))
}

export function calcDaoFruit(state: GameState): number {
  const base = stageIndex(state.realm) * 10
  const dayBonus = Math.floor(state.day / 10)
  const skillBonus = state.learnedSkills.length * 3
  const ascendBonus = state.ending === 'ascended' ? 50 : 0
  return base + dayBonus + skillBonus + ascendBonus
}

export function recordRun(meta: MetaState, state: GameState): number {
  const fruit = calcDaoFruit(state)
  const record: RunRecord = {
    realm: state.realm,
    day: state.day,
    ending: state.ending ?? 'died',
    daoFruit: fruit,
    timestamp: Date.now(),
  }
  meta.reincarnationCount += 1
  meta.totalDaoFruit += fruit
  meta.availableDaoFruit += fruit
  if (stageIndex(state.realm) > stageIndex(meta.bestRealm)) {
    meta.bestRealm = state.realm
  }
  if (state.day > meta.bestDays) {
    meta.bestDays = state.day
  }
  meta.runHistory.unshift(record)
  meta.runHistory = meta.runHistory.slice(0, 20)
  saveMeta(meta)
  return fruit
}

export function buyPerk(meta: MetaState, perkId: string): boolean {
  const perk = PERKS.find((p) => p.id === perkId)
  if (!perk) return false
  const currentLevel = meta.perkLevels[perkId] ?? 0
  if (currentLevel >= perk.maxLevel) return false
  if (meta.availableDaoFruit < perk.cost) return false
  meta.availableDaoFruit -= perk.cost
  meta.perkLevels[perkId] = currentLevel + 1
  saveMeta(meta)
  return true
}

export function getPerkLevel(meta: MetaState, perkId: string): number {
  return meta.perkLevels[perkId] ?? 0
}

export interface ReincarnationBonus {
  hp: number
  mp: number
  atk: number
  def: number
  spirit: number
  luck: number
  lifespan: number
  coin: number
  items: Record<string, number>
  breakthroughBonus: number
}

export function calcReincarnationBonus(meta: MetaState): ReincarnationBonus {
  const bonus: ReincarnationBonus = {
    hp: 0, mp: 0, atk: 0, def: 0, spirit: 0, luck: 0,
    lifespan: 0, coin: 0, items: {}, breakthroughBonus: 0,
  }
  for (const perk of PERKS) {
    const level = meta.perkLevels[perk.id] ?? 0
    if (level <= 0) continue
    const e = perk.effect
    bonus.hp += (e.startHp ?? 0) * level
    bonus.mp += (e.startMp ?? 0) * level
    bonus.atk += (e.startAtk ?? 0) * level
    bonus.def += (e.startDef ?? 0) * level
    bonus.spirit += (e.startSpirit ?? 0) * level
    bonus.luck += (e.startLuck ?? 0) * level
    bonus.lifespan += (e.startLifespan ?? 0) * level
    bonus.coin += (e.startCoin ?? 0) * level
    bonus.breakthroughBonus += (e.breakthroughBonus ?? 0) * level
    if (e.startItem) {
      bonus.items[e.startItem] = (bonus.items[e.startItem] ?? 0) + level
    }
  }
  return bonus
}
