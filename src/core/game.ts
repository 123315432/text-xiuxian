import { bountyIndex, bountyList, dungeonList, enemyIndex, eventList, itemIndex, realmIndex, realmList, recipeIndex, recipeList, regionIndex, regionList, sectIndex, skillIndex, techniqueIndex, techniqueList, tribulationList } from './gameData'
import { clearSave, loadGame, saveGame } from './save'
import { calcReincarnationBonus, loadMeta, recordRun, type ReincarnationBonus } from './meta'
import { getLocale, t, tName, tDesc } from '../i18n'
import type {
  AlchemyRecipeDef,
  BattleState,
  BountyDef,
  EnemyDef,
  EventDef,
  EventEffect,
  GameState,
  RealmKey,
  RegionDef,
  SpiritualRoot,
  StatBlock,
  TechniqueDef,
} from '../types'

const STORAGE_VERSION = 1
const BASE_STATS: StatBlock = {
  hp: 120,
  mp: 80,
  atk: 12,
  def: 8,
  spirit: 10,
  luck: 6,
}
const BASE_LIFESPAN = 120

const DAO_NAMES = [
  '无名散修', '孤云道人', '白衣剑客', '青云居士', '赤霞散人',
  '玄月道士', '寒星子', '凌风散修', '夜雨行者', '踏霜客',
  '问剑居士', '孤鸿子', '云游散人', '铁骨道人', '望月散修',
  '浮萍子', '清风客', '断剑散人', '霜叶道人', '落雁居士',
]

const DAO_NAMES_EN = [
  'Nameless Wanderer', 'Lone Cloud Daoist', 'White-Robed Swordsman', 'Azure Cloud Adept', 'Crimson Dawn Wanderer',
  'Dark Moon Daoist', 'Cold Star Sage', 'Wind-Riding Wanderer', 'Night Rain Walker', 'Frost-Treading Guest',
  'Sword-Seeking Adept', 'Lone Swan Sage', 'Cloud-Roaming Wanderer', 'Ironbone Daoist', 'Moonwatcher Wanderer',
  'Duckweed Sage', 'Clear Wind Guest', 'Broken Sword Wanderer', 'Frostleaf Daoist', 'Falling Goose Adept',
]

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const rand = () => Math.random()
const randInt = (max: number) => Math.floor(rand() * max)

const ALL_ROOTS: SpiritualRoot[] = ['metal', 'wood', 'water', 'fire', 'earth']
const ROOT_BONUS: Record<SpiritualRoot, Partial<StatBlock>> = {
  metal: { atk: 3 },
  wood: { hp: 10 },
  water: { mp: 8, spirit: 1 },
  fire: { atk: 2, spirit: 1 },
  earth: { def: 2, hp: 6 },
}

function randomRoots(): SpiritualRoot[] {
  const shuffled = [...ALL_ROOTS].sort(() => rand() - 0.5)
  const count = rand() < 0.15 ? 1 : rand() < 0.6 ? 2 : 3
  return shuffled.slice(0, count)
}

export function getRootName(root: SpiritualRoot): string {
  return t(`root.${root}`)
}

export function getRootNames(roots: SpiritualRoot[]): string {
  return roots.map(getRootName).join(getLocale() === 'en' ? ', ' : '')
}

export function getDaoDisplayName(name: string): string {
  const zhIndex = DAO_NAMES.indexOf(name)
  if (zhIndex >= 0) return getLocale() === 'en' ? DAO_NAMES_EN[zhIndex] : DAO_NAMES[zhIndex]
  const enIndex = DAO_NAMES_EN.indexOf(name)
  if (enIndex >= 0) return getLocale() === 'zh' ? DAO_NAMES[enIndex] : DAO_NAMES_EN[enIndex]
  return name
}

function emptyBonus(): StatBlock {
  return { hp: 0, mp: 0, atk: 0, def: 0, spirit: 0, luck: 0 }
}

function addBonus(target: StatBlock, source?: Partial<StatBlock>): void {
  if (!source) return
  target.hp += source.hp ?? 0
  target.mp += source.mp ?? 0
  target.atk += source.atk ?? 0
  target.def += source.def ?? 0
  target.spirit += source.spirit ?? 0
  target.luck += source.luck ?? 0
}

function cloneBonus(source?: Partial<StatBlock>): StatBlock {
  return {
    hp: source?.hp ?? 0,
    mp: source?.mp ?? 0,
    atk: source?.atk ?? 0,
    def: source?.def ?? 0,
    spirit: source?.spirit ?? 0,
    luck: source?.luck ?? 0,
  }
}

function stageIndex(realm: RealmKey): number {
  return Math.max(0, realmList.findIndex((item) => item.key === realm))
}

function getRealm(realm: RealmKey) {
  return realmIndex.get(realm) ?? realmList[0]
}

function realmBonus(realm: RealmKey): StatBlock {
  return realmList.slice(0, stageIndex(realm) + 1).reduce(
    (sum, current) => {
      sum.hp += current.rewardStat.hp ?? 0
      sum.mp += current.rewardStat.mp ?? 0
      sum.atk += current.rewardStat.atk ?? 0
      sum.def += current.rewardStat.def ?? 0
      sum.spirit += current.rewardStat.spirit ?? 0
      sum.luck += current.rewardStat.luck ?? 0
      return sum
    },
    emptyBonus(),
  )
}

function applyStats(state: GameState): void {
  const bonus = emptyBonus()
  addBonus(bonus, realmBonus(state.realm))
  addBonus(bonus, state.permanentBonus)

  for (const id of state.equippedArtifacts) {
    const item = itemIndex.get(id)
    if (item?.stats) addBonus(bonus, item.stats)
    const affix = state.artifactAffixes?.[id]
    if (affix) {
      const affixBonus: Partial<StatBlock> = { [affix.stat]: affix.value }
      addBonus(bonus, affixBonus)
    }
  }
  for (const root of state.spiritualRoots ?? []) {
    addBonus(bonus, ROOT_BONUS[root] ?? {})
  }
  if (state.sect) {
    const sect = sectIndex.get(state.sect)
    if (sect?.bonus) addBonus(bonus, sect.bonus)
  }

  // Technique bonuses
  const techBonus = getTechniqueBonus(state)
  bonus.atk += techBonus.atk
  bonus.def += techBonus.def

  state.maxHp = BASE_STATS.hp + bonus.hp
  state.maxMp = BASE_STATS.mp + bonus.mp
  state.atk = BASE_STATS.atk + bonus.atk
  state.def = BASE_STATS.def + bonus.def
  state.spirit = BASE_STATS.spirit + bonus.spirit
  state.luck = BASE_STATS.luck + bonus.luck
  state.hp = clamp(state.hp, 0, state.maxHp)
  state.mp = clamp(state.mp, 0, state.maxMp)
  state.qi = clamp(state.qi, 0, getRealm(state.realm).maxQi)
  state.lifespan = clamp(state.lifespan, 0, state.maxLifespan)
}

function log(state: GameState, text: string): void {
  state.logs.unshift(text)
  state.logs = state.logs.slice(0, 80)
}

function recordRunWithLatestMeta(state: GameState): void {
  recordRun(loadMeta(), state)
}

function consumeDay(state: GameState, days = 1): void {
  state.day += days
  state.lifespan -= days
  if (state.lifespan <= 0 && !state.gameOver) {
    state.lifespan = 0
    state.gameOver = true
    state.ending = 'died'
    log(state, t('log.lifespanEnd'))
    recordRunWithLatestMeta(state)
    persist(state)
  }
}

function finishDead(state: GameState, message: string): string {
  state.hp = 0
  state.gameOver = true
  state.ending = 'died'
  log(state, message)
  recordRunWithLatestMeta(state)
  persist(state)
  return message
}

function finishAscend(state: GameState, message: string): string {
  state.gameOver = true
  state.ending = 'ascended'
  state.realm = 'feisheng'
  log(state, message)
  recordRunWithLatestMeta(state)
  persist(state)
  return message
}

export function createNewGame(bonus?: ReincarnationBonus): GameState {
  const b = bonus ?? calcReincarnationBonus(loadMeta())
  const startInventory: Record<string, number> = { pill_qi: 1, pill_heal: 1 }
  for (const [id, count] of Object.entries(b.items)) {
    startInventory[id] = (startInventory[id] ?? 0) + count
  }
  const state: GameState = {
    version: STORAGE_VERSION,
    startedAt: Date.now(),
    lastSavedAt: Date.now(),
    gameOver: false,
    name: getLocale() === 'en' ? DAO_NAMES_EN[randInt(DAO_NAMES_EN.length)] : DAO_NAMES[randInt(DAO_NAMES.length)],
    spiritualRoots: randomRoots(),
    day: 1,
    realm: 'lianqi',
    realmProgress: 0,
    qi: 0,
    lifespan: BASE_LIFESPAN + b.lifespan,
    maxLifespan: BASE_LIFESPAN + b.lifespan,
    hp: BASE_STATS.hp + b.hp,
    maxHp: BASE_STATS.hp + b.hp,
    mp: BASE_STATS.mp + b.mp,
    maxMp: BASE_STATS.mp + b.mp,
    atk: BASE_STATS.atk + b.atk,
    def: BASE_STATS.def + b.def,
    spirit: BASE_STATS.spirit + b.spirit,
    luck: BASE_STATS.luck + b.luck,
    coin: 30 + b.coin,
    exp: 0,
    inventory: startInventory,
    learnedSkills: ['skill_breath_sword'],
    equippedArtifacts: [],
    artifactAffixes: {},
    dungeonCooldowns: {},
    alchemyCount: 0,
    currentRegion: undefined,
    regionExploreCount: {},
    bountySlots: [],
    bountyRefreshDay: 0,
    bountyPool: [],
    completedBounties: 0,
    explorationsDone: 0,
    battlesWon: 0,
    techniques: [],
    activeTechnique: undefined,
    tribulationsPassed: [],
    permanentBonus: emptyBonus(),
    breakthroughBonus: b.breakthroughBonus,
    sect: undefined,
    sectReputation: 0,
    flags: {},
    logs: [b.breakthroughBonus > 0 || b.atk > 0
      ? t('log.reincarnatedStart')
      : t('log.newStart')],
  }
  applyStats(state)
  return state
}

function normalizeBattle(data: GameState['battle']): BattleState | undefined {
  if (!data) return undefined
  const enemy = enemyIndex.get(data.enemyId) ?? getTribEnemy(data.enemyId)
  if (!enemy) return undefined
  return {
    active: data.active ?? true,
    enemyId: enemy.id,
    enemyHp: clamp(data.enemyHp, 0, enemy.hp),
    enemyMp: clamp(data.enemyMp, 0, enemy.mp),
    round: Math.max(1, data.round || 1),
    guard: Math.max(0, data.guard || 0),
    status: data.status || t('battle.status.engaged'),
    log: Array.isArray(data.log) ? data.log.slice(0, 12) : [],
  }
}

export function hydrateGame(saveData: ReturnType<typeof loadGame>): GameState {
  if (!saveData || saveData.version !== STORAGE_VERSION) return createNewGame()
  const base = createNewGame(calcReincarnationBonus(loadMeta()))
  const restored: GameState = {
    ...base,
    ...saveData,
    inventory: saveData.inventory ? { ...saveData.inventory } : { ...base.inventory },
    learnedSkills: saveData.learnedSkills ? [...saveData.learnedSkills] : [...base.learnedSkills],
    equippedArtifacts: [...(saveData.equippedArtifacts ?? [])],
    permanentBonus: cloneBonus(saveData.permanentBonus),
    flags: { ...(saveData.flags ?? {}) },
    logs: [...(saveData.logs ?? base.logs)],
    battle: normalizeBattle(saveData.battle),
    gameOver: Boolean(saveData.gameOver),
  }
  applyStats(restored)
  restored.hp = clamp(restored.hp, 0, restored.maxHp)
  restored.mp = clamp(restored.mp, 0, restored.maxMp)
  restored.qi = clamp(restored.qi, 0, getRealm(restored.realm).maxQi)
  restored.lifespan = clamp(restored.lifespan, 0, restored.maxLifespan)
  return restored
}

export function persist(state: GameState): void {
  state.lastSavedAt = Date.now()
  saveGame(state)
}

export function resetGame(): GameState {
  clearSave()
  return createNewGame()
}

export function listAvailableEvents(state: GameState): EventDef[] {
  return eventList.filter((event) => {
    if (event.minRealm && stageIndex(state.realm) < stageIndex(event.minRealm)) return false
    if (event.sectOnly && event.sectOnly !== state.sect) return false
    // Don't show sect invitation if already in a sect
    if (event.id === 'evt_sect_invitation' && state.sect) return false
    return true
  })
}

export function rollEvent(state: GameState, region?: RegionDef): EventDef {
  let pool = listAvailableEvents(state)
  const stage = stageIndex(state.realm)

  // Region filtering
  if (region?.excludeTags?.length) {
    const filtered = pool.filter((e) => !region.excludeTags!.some((t) => e.tags.includes(t)))
    if (filtered.length > 0) pool = filtered
  }

  const weighted = pool.map((event) => {
    let weight = 2
    if (event.tags.includes('战斗') || event.tags.includes('劫掠')) weight += Math.max(0, stage - 1)
    if (event.tags.includes('修炼')) weight += 2
    if (event.tags.includes('机缘') || event.tags.includes('传承')) weight += stage > 0 ? 1 : 0
    if (event.tags.includes('天劫')) weight += state.realm === 'dujie' ? 5 : (stage >= 5 ? 1 : 0)
    if (event.tags.includes('危险')) weight += stage > 2 ? 1 : 0
    // Region tag boosting
    if (region) {
      const matchCount = event.tags.filter((t) => region.tags.includes(t)).length
      weight += matchCount * 3
    }
    return { event, weight }
  })
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  let cursor = randInt(total)
  for (const entry of weighted) {
    cursor -= entry.weight
    if (cursor < 0) return entry.event
  }
  return pool[0]
}

export function explore(state: GameState, regionId?: string): EventDef {
  const region = regionId ? regionIndex.get(regionId) : undefined

  consumeDay(state, 1)
  if (state.gameOver) return rollEvent(state, region)

  state.qi += 8 + Math.floor(state.spirit / 3) + getTechniqueBonus(state).qiPerDay + (region?.qiBonus ?? 0)
  state.exp += 3 + (region?.expBonus ?? 0)
  state.coin += region?.coinBonus ?? 0
  state.explorationsDone = (state.explorationsDone ?? 0) + 1

  // Material drops
  if (region?.materialDrops?.length && region.materialDropRate) {
    if (randInt(100) < region.materialDropRate) {
      const matId = region.materialDrops[randInt(region.materialDrops.length)]
      addItem(state, matId)
      const item = itemIndex.get(matId)
      log(state, t('log.regionDrop', tName(region), item ? tName(item) : matId))
    }
  }

  // Track region exploration
  if (region) {
    state.regionExploreCount[region.id] = (state.regionExploreCount[region.id] ?? 0) + 1
  }

  // Bounty progress
  updateBountyExplore(state, regionId)

  const event = rollEvent(state, region)
  state.pendingEventId = event.id
  const label = region ? t('log.eventRegionPrefix', tName(region)) : ''
  log(state, t('log.eventArrive', state.day, label, tName(event)))
  persist(state)
  return event
}

const AFFIX_POOL: Array<{ name: string; nameEn: string; stat: keyof import('../types').StatBlock; min: number; max: number }> = [
  { name: '锋利', nameEn: 'Sharp', stat: 'atk', min: 2, max: 6 },
  { name: '坚韧', nameEn: 'Tough', stat: 'def', min: 2, max: 5 },
  { name: '灵动', nameEn: 'Agile', stat: 'spirit', min: 1, max: 4 },
  { name: '厚重', nameEn: 'Heavy', stat: 'hp', min: 8, max: 20 },
  { name: '充盈', nameEn: 'Abundant', stat: 'mp', min: 6, max: 16 },
  { name: '幸运', nameEn: 'Lucky', stat: 'luck', min: 1, max: 3 },
]

function rollAffix(): import('../types').ItemAffix {
  const pool = AFFIX_POOL[randInt(AFFIX_POOL.length)]
  return { name: pool.name, nameEn: pool.nameEn, stat: pool.stat, value: pool.min + randInt(pool.max - pool.min + 1) }
}

export function getAffixDesc(affix: import('../types').ItemAffix): string {
  const name = getLocale() === 'en'
    ? affix.nameEn ?? AFFIX_POOL.find((item) => item.name === affix.name)?.nameEn ?? affix.name
    : affix.name
  const statNames: Record<string, string> = {
    atk: t('stat.atk'),
    def: t('stat.def'),
    spirit: t('stat.spirit'),
    hp: t('battle.hp'),
    mp: t('battle.mp'),
    luck: t('stat.luck'),
  }
  return `${name}(${statNames[affix.stat] ?? affix.stat}+${affix.value})`
}

function addItem(state: GameState, id?: string): void {
  if (!id) return
  state.inventory[id] = (state.inventory[id] ?? 0) + 1
  // Generate affix for artifacts
  const item = itemIndex.get(id)
  if (item?.type === 'artifact' && !state.artifactAffixes[id]) {
    state.artifactAffixes[id] = rollAffix()
  }
  checkBountyProgress(state)
}

function removeItem(state: GameState, id?: string): void {
  if (!id) return
  const count = state.inventory[id] ?? 0
  if (count <= 1) delete state.inventory[id]
  else state.inventory[id] = count - 1
  checkBountyProgress(state)
}

function unlockSkill(state: GameState, id?: string): void {
  if (!id || state.learnedSkills.includes(id)) return
  state.learnedSkills.push(id)
  const skill = skillIndex.get(id)
  log(state, t('log.unlockSkill', skill ? tName(skill) : id))
}

function applyEffect(state: GameState, effect: EventEffect): void {
  if ((effect.lifespan ?? 0) > 0) {
    state.maxLifespan += effect.lifespan ?? 0
  }
  state.hp = clamp(state.hp + (effect.hp ?? 0), 0, state.maxHp)
  state.mp = clamp(state.mp + (effect.mp ?? 0), 0, state.maxMp)
  state.coin = Math.max(0, state.coin + (effect.coin ?? 0))
  state.exp += effect.exp ?? 0
  state.qi += effect.qi ?? 0
  state.lifespan = clamp(state.lifespan + (effect.lifespan ?? 0), 0, state.maxLifespan)
  state.realmProgress += effect.realmProgress ?? 0
  state.realmProgress += effect.breakthrough ?? 0
  state.realmProgress += effect.breakChance ?? 0
  state.permanentBonus.atk += effect.atk ?? 0
  state.permanentBonus.def += effect.def ?? 0
  state.permanentBonus.spirit += effect.spirit ?? 0
  state.permanentBonus.luck += effect.luck ?? 0
  addItem(state, effect.item)
  removeItem(state, effect.removeItem)
  unlockSkill(state, effect.unlockSkill)
  if (effect.joinSect) joinSect(state, effect.joinSect)
  if (effect.enemy) startBattle(state, effect.enemy)
}

function finishDeadIfHpDepleted(state: GameState, message: string): boolean {
  if (state.hp > 0 || state.gameOver) return false
  finishDead(state, message)
  return true
}

function finishDeadIfLifespanDepleted(state: GameState, message: string): string | null {
  if (state.lifespan > 0 || state.gameOver) return null
  state.lifespan = 0
  const result = `${message} ${t('log.lifespanEnd')}`
  finishDead(state, result)
  return result
}

function tryBreakthrough(state: GameState): string | null {
  const realm = getRealm(state.realm)
  if (state.realm === 'feisheng' || state.qi < realm.breakthroughNeed) return null
  const chance = clamp(realm.baseSuccess + Math.floor(state.realmProgress / 6) + Math.floor(state.luck / 3) + (state.breakthroughBonus ?? 0), 8, 97)
  if (randInt(100) >= chance) {
    state.qi = Math.max(0, Math.floor(state.qi * 0.6))
    state.realmProgress = Math.max(0, state.realmProgress - 8)
    state.hp = Math.max(1, state.hp - 12)
    state.mp = Math.max(0, state.mp - 10)
    return t('log.breakFail')
  }
  if (state.realm === 'dujie') {
    state.qi -= realm.breakthroughNeed
    state.realmProgress = 0
    const damage = 34 + Math.floor(state.spirit * 0.8) - Math.floor(state.luck / 2)
    state.hp -= damage
    state.mp = Math.max(0, state.mp - 18)
    if (state.hp <= 0) return finishDead(state, t('log.tribDead'))
    const ascendRoll = randInt(100)
    if (ascendRoll < 42) return finishAscend(state, t('log.ascended'))
    log(state, t('log.tribSurvive'))
    return t('log.tribSurvive')
  }
  const next = realmList[stageIndex(state.realm) + 1]
  if (!next) return null
  state.qi = 0
  state.realmProgress = 0
  state.realm = next.key
  state.maxLifespan += 12
  state.hp = state.maxHp
  state.mp = state.maxMp
  applyStats(state)
  state.hp = state.maxHp
  state.mp = state.maxMp
  checkBountyProgress(state)
  // Check for tribulation
  const trib = getTribulationForRealm(next.key)
  if (trib && !state.tribulationsPassed.includes(trib.id)) {
    triggerTribulation(state, trib)
    return t('log.breakTrib', tName(trib))
  }
  log(state, t('log.breakSuccess', tName(next)))
  return t('log.breakSuccess', tName(next))
}

function startBattle(state: GameState, enemyId: string): void {
  const enemy = enemyIndex.get(enemyId)
  if (!enemy) return
  state.battle = {
    active: true,
    enemyId: enemy.id,
    enemyHp: enemy.hp,
    enemyMp: enemy.mp,
    round: 1,
    guard: 0,
    status: t('battle.status.enemyAttack', tName(enemy)),
    log: [t('log.encounterEnemy', tName(enemy)) + ' ' + tDesc(enemy)],
  }
  log(state, t('log.encounterEnemy', tName(enemy)))
}

function endBattle(state: GameState, victory: boolean): string {
  const battle = state.battle
  if (!battle) return ''
  const isTrib = battle.enemyId.startsWith('trib_')
  const enemy = enemyIndex.get(battle.enemyId) ?? getTribEnemy(battle.enemyId)
  if (victory && enemy) {
    if (isTrib) {
      // Tribulation victory
      const trib = tribulationList.find((t) => t.id === battle.enemyId)
      if (trib) {
        state.tribulationsPassed.push(trib.id)
        state.exp += trib.rewardExp
        if (trib.rewardItem) addItem(state, trib.rewardItem)
        const item = trib.rewardItem ? itemIndex.get(trib.rewardItem) : undefined
        const itemName = item ? tName(item) : trib.rewardItem ?? ''
        log(state, t('log.tribVictory', tName(trib), trib.rewardExp, itemName ? t('log.rewardItemSuffix', itemName) : ''))
      }
    } else {
      state.battlesWon = (state.battlesWon ?? 0) + 1
      state.exp += enemy.exp
      state.coin += enemy.coin
      state.qi += 18
      state.realmProgress += 10
      const maybeLoot = randInt(100)
      if (maybeLoot < 50) addItem(state, 'pill_qi')
      if (maybeLoot >= 50 && maybeLoot < 70) addItem(state, 'pill_heal')
      log(state, t('log.defeatEnemy', tName(enemy), enemy.exp, enemy.coin))
      updateBountyKill(state, battle.enemyId)
    }
  }
  state.battle = undefined
  // Check dungeon rewards
  if (victory) {
    const dungeonMsg = claimDungeonReward(state)
    if (dungeonMsg) return `${t('battle.victory')} ${dungeonMsg}`
  } else {
    clearDungeonRun(state)
  }
  return victory ? t('battle.victory') : t('battle.ended')
}

function clearDungeonRun(state: GameState): void {
  delete state.flags['dungeon_active']
  for (const key of Object.keys(state.flags)) {
    if (key.startsWith('dungeon_id_')) delete state.flags[key]
  }
}

export function handleEventChoice(state: GameState, event: EventDef, choiceIndex: number): string {
  const choice = event.choices[choiceIndex]
  if (!choice) return t('event.invalidChoice')
  applyEffect(state, choice.effect)
  let result = getLocale() === 'en' && choice.effect.logEn ? choice.effect.logEn : choice.effect.log
  if (choice.effect.battle || choice.effect.enemy) {
    result += t('event.enterBattle')
  }
  if (state.pendingEventId === event.id) state.pendingEventId = undefined
  if (finishDeadIfHpDepleted(state, result)) return result
  const lifespanDeath = finishDeadIfLifespanDepleted(state, result)
  if (lifespanDeath) return lifespanDeath
  const breakthrough = state.battle ? null : tryBreakthrough(state)
  if (breakthrough) result += ` ${breakthrough}`
  log(state, result)
  applyStats(state)
  persist(state)
  return result
}

export function canBreakthrough(state: GameState): boolean {
  return state.realm !== 'feisheng' && state.qi >= getRealm(state.realm).breakthroughNeed
}

export function attemptBreakthrough(state: GameState): string {
  consumeDay(state, 1)
  if (state.gameOver) return state.ending === 'died' ? t('log.lifespanGone') : t('log.alreadyAscended')
  const result = tryBreakthrough(state)
  if (!result) return t('log.qiInsufficient')
  applyStats(state)
  persist(state)
  return result
}

function consumeBattleTurn(state: GameState): void {
  consumeDay(state, 1)
  if (state.hp <= 0) {
    finishDead(state, t('log.downOnBattlefield'))
  }
}

function enemyTurn(state: GameState, enemy: EnemyDef, guard: number): string {
  if (randInt(100) < clamp(getTechniqueBonus(state).dodgeChance, 0, 80)) {
    return t('log.enemyDamage', 0)
  }
  const raw = enemy.atk + randInt(10) - state.def - guard
  const damage = Math.max(1, raw)
  state.hp -= damage
  if (state.hp <= 0) {
    // Tribulation defeat: don't kill the player, revert realm instead
    if (state.battle && state.battle.enemyId.startsWith('trib_')) {
      state.hp = 1
      const prevIdx = Math.max(0, stageIndex(state.realm) - 1)
      const prevRealm = realmList[prevIdx]
      state.realm = prevRealm.key
      state.realmProgress = 0
      state.battle = undefined
      applyStats(state)
      const msg = t('log.tribFailFallback', tName(prevRealm))
      log(state, msg)
      persist(state)
      return t('log.enemyDamage', damage) + msg
    }
    return finishDead(state, t('log.enemyDefeatPlayer', tName(enemy))) + ' ' + t('log.enemyDamage', damage)
  }
  return t('log.enemyDamage', damage)
}

function damageFromSkill(state: GameState, enemy: EnemyDef, skillId: string): { damage: number; note: string; heal: number; guard: number } {
  const skill = skillIndex.get(skillId)
  if (!skill) return { damage: 0, note: t('log.skillNotFound'), heal: 0, guard: 0 }
  if (!state.learnedSkills.includes(skill.id)) return { damage: 0, note: t('log.skillNotLearned'), heal: 0, guard: 0 }
  if (state.mp < skill.cost) return { damage: 0, note: t('log.mpInsufficient'), heal: 0, guard: 0 }
  state.mp -= skill.cost
  const damage = Math.max(1, Math.floor(state.atk * skill.power + randInt(10)) - enemy.def)
  return {
    damage,
    note: t('log.castSkill', tName(skill), damage),
    heal: skill.heal ?? 0,
    guard: skill.guard ?? 0,
  }
}

export function runBattleAction(state: GameState, action: 'attack' | 'skill' | 'guard' | 'use-item', skillId?: string, itemId?: string): string {
  const battle = state.battle
  if (!battle || !battle.active) return t('battle.noActive')
  const enemy = enemyIndex.get(battle.enemyId) ?? getTribEnemy(battle.enemyId)
  if (!enemy) {
    state.battle = undefined
    return t('battle.enemyLeft')
  }

  let damage = 0
  let guard = 0
  let heal = 0
  let message = ''

  if (action === 'attack') {
    damage = Math.max(1, state.atk + randInt(8) - enemy.def)
    message = t('log.attack', damage)
  } else if (action === 'skill') {
    const outcome = skillId ? damageFromSkill(state, enemy, skillId) : { damage: 0, note: t('battle.selectSkill'), heal: 0, guard: 0 }
    if (outcome.damage === 0) return outcome.note
    damage = outcome.damage
    heal = outcome.heal
    guard = outcome.guard
    message = outcome.note
  } else if (action === 'guard') {
    guard = 8 + Math.floor(state.def / 2)
    heal = 6
    message = t('log.guard')
  } else if (action === 'use-item') {
    if (!itemId) return t('battle.selectItem')
    const item = itemIndex.get(itemId)
    if (!item) return t('item.noSuchBattle')
    const count = state.inventory[itemId] ?? 0
    if (count <= 0) return t('item.noneBattle')
    removeItem(state, itemId)
    const effect = item.effect ?? {}
    if ((effect.lifespan ?? 0) > 0) {
      state.maxLifespan += effect.lifespan ?? 0
    }
    state.hp = clamp(state.hp + (effect.healHp ?? 0), 0, state.maxHp)
    state.mp = clamp(state.mp + (effect.healMp ?? 0), 0, state.maxMp)
    state.realmProgress += effect.breakthrough ?? 0
    state.realmProgress += effect.breakthroughChance ?? 0
    state.lifespan = clamp(state.lifespan + (effect.lifespan ?? 0), 0, state.maxLifespan)
    message = t('log.useItem', tName(item))
  }

  if (heal > 0) state.hp = clamp(state.hp + heal, 0, state.maxHp)
  battle.guard = guard
  battle.enemyHp -= damage
  battle.round += 1
  battle.log.unshift(message)
  battle.log = battle.log.slice(0, 12)

  if (battle.enemyHp <= 0) {
    state.logs.unshift(t('log.enemyDefeated', tName(enemy)))
    const battleResult = endBattle(state, true)
    consumeBattleTurn(state)
    applyStats(state)
    persist(state)
    return `${message} ${t('battle.enemyDown')} ${battleResult}`
  }

  const enemyMessage = enemyTurn(state, enemy, guard)
  battle.log.unshift(enemyMessage)
  battle.log = battle.log.slice(0, 12)
  if (state.gameOver) {
    clearDungeonRun(state)
    state.battle = undefined
    persist(state)
    return `${message} ${enemyMessage}`
  }

  consumeBattleTurn(state)
  if (state.gameOver) {
    clearDungeonRun(state)
    state.battle = undefined
  }
  applyStats(state)
  persist(state)
  return `${message} ${enemyMessage}`
}

export function useInventoryItem(state: GameState, itemId: string): string {
  const item = itemIndex.get(itemId)
  if (!item) return t('item.notFound')
  const count = state.inventory[itemId] ?? 0
  if (count <= 0) return t('item.noneInBag')
  if (item.type === 'pill') {
    removeItem(state, itemId)
    const effect = item.effect ?? {}
    if ((effect.lifespan ?? 0) > 0) state.maxLifespan += effect.lifespan ?? 0
    state.hp = clamp(state.hp + (effect.healHp ?? 0), 0, state.maxHp)
    state.mp = clamp(state.mp + (effect.healMp ?? 0), 0, state.maxMp)
    state.realmProgress += effect.breakthrough ?? 0
    state.realmProgress += effect.breakthroughChance ?? 0
    state.lifespan = clamp(state.lifespan + (effect.lifespan ?? 0), 0, state.maxLifespan)
    applyStats(state)
    const text = t('log.itemUse', tName(item))
    log(state, text)
    persist(state)
    return text
  }
  if (item.type === 'skill') {
    const alreadyLearned = state.learnedSkills.includes(item.id)
    if (!alreadyLearned) {
      state.learnedSkills.push(item.id)
    }
    // Always apply stat bonuses from the item (learning vs obtaining give separate bonuses)
    state.permanentBonus.hp += item.stats?.hp ?? 0
    state.permanentBonus.mp += item.stats?.mp ?? 0
    state.permanentBonus.atk += item.stats?.atk ?? 0
    state.permanentBonus.def += item.stats?.def ?? 0
    state.permanentBonus.spirit += item.stats?.spirit ?? 0
    state.permanentBonus.luck += item.stats?.luck ?? 0
    removeItem(state, itemId)
    applyStats(state)
    const text = alreadyLearned ? t('log.studyDeeper', tName(item)) : t('log.studySkill', tName(item))
    log(state, text)
    persist(state)
    return text
  }
  return toggleArtifact(state, itemId)
}

export function toggleArtifact(state: GameState, itemId: string): string {
  const item = itemIndex.get(itemId)
  if (!item) return t('artifact.notFound')
  if (item.type !== 'artifact') return t('artifact.notArtifact')
  const count = state.inventory[itemId] ?? 0
  if (count <= 0) return t('artifact.noneInBag')
  const equipped = state.equippedArtifacts.includes(itemId)
  state.equippedArtifacts = equipped
    ? state.equippedArtifacts.filter((id) => id !== itemId)
    : [...state.equippedArtifacts, itemId]
  applyStats(state)
  const text = equipped ? t('log.unequip', tName(item)) : t('log.equip', tName(item))
  log(state, text)
  persist(state)
  return text
}

export function getInventoryItems(state: GameState): Array<{ id: string; name: string; type: string; desc: string; count: number }> {
  return Object.entries(state.inventory)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => {
      const item = itemIndex.get(id)
      return { id, count, name: item ? tName(item) : id, type: item?.type ?? 'item', desc: item ? tDesc(item) : '' }
    })
}

export function getLearnedSkills(state: GameState): Array<{ id: string; name: string; cost: number; desc: string }> {
  return state.learnedSkills.map((id) => {
    const skill = skillIndex.get(id)
    return {
      id,
      name: skill ? tName(skill) : id,
      cost: skill?.cost ?? 0,
      desc: skill ? tDesc(skill) : '',
    }
  })
}

export function getRealmName(realm: RealmKey): string {
  const def = realmIndex.get(realm)
  return def ? tName(def) : realm
}

// === Dungeon System ===

export function getAvailableDungeons(state: GameState) {
  return dungeonList.filter((dg) => stageIndex(state.realm) >= stageIndex(dg.minRealm))
}

export function isDungeonReady(state: GameState, dungeonId: string): boolean {
  const lastDay = state.dungeonCooldowns[dungeonId]
  if (!lastDay) return true  // 从未进入过
  return state.day - lastDay >= 10  // 10天冷却
}

export function enterDungeon(state: GameState, dungeonId: string): string {
  const dg = dungeonList.find((d) => d.id === dungeonId)
  if (!dg) return t('dungeon.notFound')
  if (stageIndex(state.realm) < stageIndex(dg.minRealm)) return t('log.realmInsufficient')
  if (!isDungeonReady(state, dungeonId)) return t('dungeon.cooling')
  if (state.battle) return t('dungeon.inBattle')
  if (state.pendingEventId) return t('dungeon.eventPending')

  consumeDay(state, 1)
  if (state.gameOver) return t('log.lifespanGone')

  state.dungeonCooldowns[dungeonId] = state.day
  startBattle(state, dg.enemyId)
  // Store dungeon id in flags so we can give rewards after battle
  state.flags[`dungeon_active`] = true
  state.flags[`dungeon_id_${dungeonId}`] = true
  log(state, t('log.enterDungeon', tName(dg)))
  persist(state)
  const enemy = enemyIndex.get(dg.enemyId)
  return t('log.enterDungeonResult', tName(dg), enemy ? tName(enemy) : t('dungeon.guard'))
}

export function claimDungeonReward(state: GameState): string | null {
  if (!state.flags['dungeon_active']) return null
  delete state.flags['dungeon_active']

  // Find which dungeon was active
  let activeDg = ''
  for (const key of Object.keys(state.flags)) {
    if (key.startsWith('dungeon_id_')) {
      activeDg = key.replace('dungeon_id_', '')
      delete state.flags[key]
    }
  }
  if (!activeDg) return null

  const dg = dungeonList.find((d) => d.id === activeDg)
  if (!dg) return null

  state.coin += dg.rewardCoin
  state.exp += dg.rewardExp
  const rewardItem = dg.rewardPool[randInt(dg.rewardPool.length)]
  addItem(state, rewardItem)
  const item = itemIndex.get(rewardItem)
  const itemName = item ? tName(item) : rewardItem
  const msg = t('reward.dungeon', dg.rewardCoin, itemName)
  log(state, msg)
  persist(state)
  return msg
}

export function joinSect(state: GameState, sectKey: string): string {
  const sect = sectIndex.get(sectKey as import('../types').SectKey)
  if (!sect) return t('log.sectNotFound')
  if (state.sect === sectKey) return t('log.sectAlready', tName(sect))
  if (state.sect) {
    const old = sectIndex.get(state.sect)
    state.sect = undefined
    state.sectReputation = 0
    log(state, t('log.leaveOldSect', old ? tName(old) : t('log.oldSect')))
  }
  state.sect = sect.key
  state.sectReputation = 10
  applyStats(state)
  log(state, t('log.joinSect', tName(sect)))
  persist(state)
  return t('log.joinSectShort', tName(sect))
}

export function leaveSect(state: GameState): string {
  if (!state.sect) return t('log.noSect')
  const old = sectIndex.get(state.sect)
  state.sect = undefined
  state.sectReputation = 0
  applyStats(state)
  const text = t('log.leftSect', old ? tName(old) : t('log.sectGeneric'))
  log(state, text)
  persist(state)
  return text
}

export function getEventById(id: string): EventDef | undefined {
  return eventList.find((event) => event.id === id)
}

export function hasSave(): boolean {
  return loadGame() !== null
}

export function startNewSession(): GameState {
  const state = createNewGame()
  persist(state)
  return state
}

export function getEnemyById(id: string): EnemyDef | undefined {
  return enemyIndex.get(id)
}

export function getRealmByKey(realm: RealmKey) {
  return realmIndex.get(realm) ?? realmList[0]
}

export function getBreakthroughNeed(state: GameState): number {
  return getRealmByKey(state.realm).breakthroughNeed
}

export function getMaxQi(state: GameState): number {
  return getRealmByKey(state.realm).maxQi
}

export function getBreakthroughChance(state: GameState): number {
  const realm = getRealmByKey(state.realm)
  if (state.realm === 'feisheng') return 100
  return clamp(realm.baseSuccess + Math.floor(state.realmProgress / 6) + Math.floor(state.luck / 3) + (state.breakthroughBonus ?? 0), 8, 97)
}

// === Alchemy System (炼丹) ===

export function getAvailableRecipes(state: GameState): AlchemyRecipeDef[] {
  return recipeList.filter((r) => {
    if (r.minRealm && stageIndex(state.realm) < stageIndex(r.minRealm)) return false
    return true
  })
}

export function canCraftRecipe(state: GameState, recipeId: string): boolean {
  const recipe = recipeIndex.get(recipeId)
  if (!recipe) return false
  for (const [matId, needed] of Object.entries(recipe.materials)) {
    if ((state.inventory[matId] ?? 0) < needed) return false
  }
  return true
}

export function craftRecipe(state: GameState, recipeId: string): string {
  const recipe = recipeIndex.get(recipeId)
  if (state.gameOver) return t('log.lifespanGone')
  if (state.battle) return t('dungeon.inBattle')
  if (state.pendingEventId) return t('dungeon.eventPending')
  if (!recipe) return t('alchemy.recipeNotFound')
  if (recipe.minRealm && stageIndex(state.realm) < stageIndex(recipe.minRealm)) return t('log.realmInsufficient')
  if (!canCraftRecipe(state, recipeId)) return t('alchemy.noMaterial')

  let successRate = recipe.baseSuccessRate
  successRate += stageIndex(state.realm) * 3
  successRate += Math.floor(state.spirit / 5)
  if (state.sect === 'dan') successRate += 15
  const techBonusAlchemy = getTechniqueBonus(state)
  successRate += techBonusAlchemy.alchemyBonus
  successRate = clamp(successRate, 5, 98)

  consumeDay(state, 1)
  if (state.gameOver) return t('log.lifespanGone')

  for (const [matId, needed] of Object.entries(recipe.materials)) {
    for (let i = 0; i < needed; i++) removeItem(state, matId)
  }

  if (randInt(100) < successRate) {
    for (let i = 0; i < recipe.outputCount; i++) addItem(state, recipe.outputItem)
    state.alchemyCount = (state.alchemyCount ?? 0) + 1
    checkBountyProgress(state)
    const item = itemIndex.get(recipe.outputItem)
    const itemName = item ? tName(item) : recipe.outputItem
    const msg = t('log.alchemySuccess', itemName, recipe.outputCount)
    log(state, msg)
    persist(state)
    return msg
  } else {
    const msg = t('alchemy.failed')
    log(state, msg)
    persist(state)
    return msg
  }
}

// === Region System (区域探索) ===

export function getAvailableRegions(state: GameState): RegionDef[] {
  return regionList.filter((r) => {
    if (r.minRealm && stageIndex(state.realm) < stageIndex(r.minRealm)) return false
    return true
  })
}

// === Technique System (功法) ===

export function getAvailableTechniques(state: GameState): TechniqueDef[] {
  const idx = stageIndex(state.realm)
  return techniqueList.filter((t) => {
    if (t.minRealm && stageIndex(t.minRealm) > idx) return false
    return !state.techniques.some((lt) => lt.techId === t.id)
  })
}

export function getLearnedTechDefs(state: GameState): (TechniqueDef & { level: number })[] {
  return state.techniques.map((lt) => {
    const def = techniqueIndex.get(lt.techId)
    if (!def) return null
    return { ...def, level: lt.level }
  }).filter(Boolean) as (TechniqueDef & { level: number })[]
}

export function learnTechnique(state: GameState, techId: string): string {
  const def = techniqueIndex.get(techId)
  if (!def) return t('log.techNotFound')
  if (state.techniques.some((lt) => lt.techId === techId)) return t('log.techAlreadyLearned')
  if (def.minRealm && stageIndex(def.minRealm) > stageIndex(state.realm)) return t('log.realmInsufficient')
  if (state.coin < def.learnCost.coin) return t('log.coinInsufficient')
  if (state.exp < def.learnCost.exp) return t('log.expInsufficient')
  state.coin -= def.learnCost.coin
  state.exp -= def.learnCost.exp
  state.techniques.push({ techId, level: 1 })
  if (!state.activeTechnique) state.activeTechnique = techId
  applyStats(state)
  log(state, t('log.learnTech', tName(def)))
  persist(state)
  return t('log.learnTechNotice', tName(def))
}

export function upgradeTechnique(state: GameState, techId: string): string {
  const def = techniqueIndex.get(techId)
  if (!def) return t('log.techNotFound')
  const learned = state.techniques.find((lt) => lt.techId === techId)
  if (!learned) return t('log.techNotLearned')
  if (learned.level >= def.maxLevel) return t('log.techMaxed')
  const cost = def.learnCost.coin * (learned.level + 1)
  if (state.coin < cost) return t('log.coinNeed', cost)
  state.coin -= cost
  learned.level++
  applyStats(state)
  log(state, t('log.upgradeTech', tName(def), learned.level))
  persist(state)
  return t('log.upgradeTechNotice', tName(def), learned.level)
}

export function setActiveTechnique(state: GameState, techId: string | undefined): string {
  if (!techId) {
    state.activeTechnique = undefined
    persist(state)
    return t('log.cancelActiveTech')
  }
  const def = techniqueIndex.get(techId)
  if (!def) return t('log.techNotFound')
  if (!state.techniques.some((lt) => lt.techId === techId)) return t('log.techNotLearned')
  state.activeTechnique = techId
  log(state, t('log.setActiveTech', tName(def)))
  persist(state)
  return t('log.setActiveTechNotice', tName(def))
}

export function getTechniqueBonus(state: GameState): { atk: number; def: number; qiPerDay: number; alchemyBonus: number; dodgeChance: number } {
  const bonus = { atk: 0, def: 0, qiPerDay: 0, alchemyBonus: 0, dodgeChance: 0 }
  for (const lt of state.techniques) {
    const def = techniqueIndex.get(lt.techId)
    if (!def) continue
    const mult = lt.level
    if (def.effects.atk) bonus.atk += def.effects.atk * mult
    if (def.effects.def) bonus.def += def.effects.def * mult
    if (def.effects.qiPerDay) bonus.qiPerDay += def.effects.qiPerDay * mult
    if (def.effects.alchemyBonus) bonus.alchemyBonus += def.effects.alchemyBonus * mult
    if (def.effects.dodgeChance) bonus.dodgeChance += def.effects.dodgeChance * mult
  }
  return bonus
}

// === Tribulation System (天劫) ===

export function getTribulationForRealm(realm: RealmKey): typeof tribulationList[0] | undefined {
  return tribulationList.find((t) => t.triggerRealm === realm)
}

export function triggerTribulation(state: GameState, trib: typeof tribulationList[0]): string {
  const desc = tDesc(trib)
  state.battle = {
    active: true,
    enemyId: trib.id,
    enemyHp: trib.enemyHp,
    enemyMp: 0,
    round: 1,
    guard: 0,
    status: desc,
    log: [desc],
  }
  log(state, t('log.tribDescend', tName(trib)))
  persist(state)
  return desc
}

function getTribEnemy(id: string): EnemyDef | undefined {
  const trib = tribulationList.find(t => t.id === id)
  if (!trib) return undefined
  return {
    id: trib.id, name: trib.name, nameEn: trib.nameEn, realm: trib.triggerRealm,
    hp: trib.enemyHp, mp: 0, atk: trib.enemyAtk, def: trib.enemyDef,
    exp: trib.rewardExp, coin: 0, text: trib.desc, textEn: trib.descEn, skills: [],
  }
}

// === Bounty System (悬赏任务) ===

const BOUNTY_REFRESH_INTERVAL = 15
const MAX_BOUNTY_SLOTS = 3
const BOUNTY_POOL_SIZE = 5

export function getBountyRefreshInterval(): number {
  return BOUNTY_REFRESH_INTERVAL
}

function getEligibleBounties(state: GameState): BountyDef[] {
  const activeIds = new Set((state.bountySlots ?? []).map((s) => s.bountyId))
  return bountyList.filter((b) => {
    if (b.minRealm && stageIndex(state.realm) < stageIndex(b.minRealm)) return false
    if (activeIds.has(b.id)) return false
    return true
  })
}

export function refreshBountyPool(state: GameState): void {
  const eligible = getEligibleBounties(state)
  const shuffled = [...eligible].sort(() => rand() - 0.5)
  state.bountyPool = shuffled.slice(0, BOUNTY_POOL_SIZE).map((b) => b.id)
  state.bountyRefreshDay = state.day
}

export function shouldRefreshBounties(state: GameState): boolean {
  if (!state.bountyPool || state.bountyPool.length === 0) return true
  return state.day - (state.bountyRefreshDay ?? 0) >= BOUNTY_REFRESH_INTERVAL
}

export function getOfferedBounties(state: GameState): BountyDef[] {
  if (shouldRefreshBounties(state)) refreshBountyPool(state)
  return (state.bountyPool ?? []).map((id) => bountyIndex.get(id)).filter((b): b is BountyDef => !!b)
}

export function acceptBounty(state: GameState, bountyId: string): string {
  const slots = state.bountySlots ?? []
  if (slots.length >= MAX_BOUNTY_SLOTS) return t('bounty.slotFull')
  if (slots.some((s) => s.bountyId === bountyId)) return t('bounty.alreadyAccepted')
  const bounty = bountyIndex.get(bountyId)
  if (!bounty) return t('bounty.notFound')
  if (bounty.minRealm && stageIndex(state.realm) < stageIndex(bounty.minRealm)) return t('log.realmInsufficient')

  state.bountySlots.push({ bountyId, progress: 0, accepted: true })
  state.bountyPool = (state.bountyPool ?? []).filter((id) => id !== bountyId)
  checkBountyProgress(state)
  log(state, t('log.acceptBounty', tName(bounty)))
  persist(state)
  return t('log.acceptBounty', tName(bounty))
}

export function abandonBounty(state: GameState, bountyId: string): string {
  const idx = (state.bountySlots ?? []).findIndex((s) => s.bountyId === bountyId)
  if (idx < 0) return t('bounty.noSuch')
  const bounty = bountyIndex.get(bountyId)
  state.bountySlots.splice(idx, 1)
  log(state, t('log.abandonBounty', bounty ? tName(bounty) : bountyId))
  persist(state)
  return t('bounty.abandoned')
}

export function checkBountyProgress(state: GameState): void {
  for (const slot of state.bountySlots ?? []) {
    if (slot.completedDay) continue
    const bounty = bountyIndex.get(slot.bountyId)
    if (!bounty) continue
    switch (bounty.type) {
      case 'gather':
        slot.progress = state.inventory[bounty.target] ?? 0
        break
      case 'realm':
        slot.progress = stageIndex(state.realm) >= stageIndex(bounty.target as RealmKey) ? 1 : 0
        break
      case 'craft':
        slot.progress = state.alchemyCount ?? 0
        break
    }
    if (slot.progress >= bounty.targetCount && !slot.completedDay) {
      slot.completedDay = state.day
    }
  }
}

export function claimBountyReward(state: GameState, bountyId: string): string {
  const idx = (state.bountySlots ?? []).findIndex((s) => s.bountyId === bountyId)
  if (idx < 0) return t('bounty.noSuch')
  const slot = state.bountySlots[idx]
  const bounty = bountyIndex.get(bountyId)
  if (!bounty) return t('bounty.notFound')
  if (!slot.completedDay) return t('bounty.notDone')

  state.coin += bounty.rewardCoin
  state.exp += bounty.rewardExp
  if (bounty.rewardItem) {
    for (let i = 0; i < (bounty.rewardItemCount ?? 1); i++) addItem(state, bounty.rewardItem)
  }
  state.bountySlots.splice(idx, 1)
  state.completedBounties = (state.completedBounties ?? 0) + 1

  const item = bounty.rewardItem ? itemIndex.get(bounty.rewardItem) : undefined
  const itemName = item ? tName(item) : ''
  const msg = t('log.claimBounty', tName(bounty), bounty.rewardCoin, itemName ? t('log.rewardItemSuffix', itemName) : '')
  log(state, msg)
  persist(state)
  return msg
}

function updateBountyKill(state: GameState, enemyId: string): void {
  for (const slot of state.bountySlots ?? []) {
    if (slot.completedDay) continue
    const bounty = bountyIndex.get(slot.bountyId)
    if (bounty?.type === 'kill' && bounty.target === enemyId) slot.progress += 1
  }
  checkBountyProgress(state)
}

function updateBountyExplore(state: GameState, regionId?: string): void {
  if (!regionId) return
  for (const slot of state.bountySlots ?? []) {
    if (slot.completedDay) continue
    const bounty = bountyIndex.get(slot.bountyId)
    if (bounty?.type === 'explore' && bounty.target === regionId) slot.progress += 1
  }
  checkBountyProgress(state)
}
