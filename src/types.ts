export type RealmKey =
  | 'lianqi'
  | 'jzhuji'
  | 'jindan'
  | 'yuanying'
  | 'huashen'
  | 'dacheng'
  | 'dujie'
  | 'feisheng'

export type ItemType = 'skill' | 'artifact' | 'pill' | 'material'

export type ItemId = string

export interface ItemDef {
  id: ItemId
  name: string
  nameEn?: string
  type: ItemType
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  desc: string
  descEn?: string
  stats?: Partial<StatBlock>
  effect?: {
    healHp?: number
    healMp?: number
    exp?: number
    breakthrough?: number
    lifespan?: number
    breakthroughChance?: number
  }
}

export interface StatBlock {
  hp: number
  mp: number
  atk: number
  def: number
  spirit: number
  luck: number
}

export interface RealmDef {
  key: RealmKey
  name: string
  nameEn?: string
  maxQi: number
  breakthroughNeed: number
  baseSuccess: number
  rewardStat: Partial<StatBlock>
  title: string
  titleEn?: string
}

export interface EventChoice {
  label: string
  labelEn?: string
  desc: string
  descEn?: string
  effect: EventEffect
}

export interface EventDef {
  id: string
  name: string
  nameEn?: string
  text: string
  textEn?: string
  tags: string[]
  minRealm?: RealmKey
  sectOnly?: string
  choices: EventChoice[]
}

export interface BattleSkillDef {
  id: string
  name: string
  nameEn?: string
  cost: number
  power: number
  desc: string
  descEn?: string
  heal?: number
  guard?: number
  bleed?: number
}

export interface EnemyDef {
  id: string
  name: string
  nameEn?: string
  realm: RealmKey
  hp: number
  mp: number
  atk: number
  def: number
  exp: number
  coin: number
  text: string
  textEn?: string
  skills: string[]
}

export interface EventEffect {
  log: string
  logEn?: string
  hp?: number
  mp?: number
  exp?: number
  coin?: number
  qi?: number
  lifespan?: number
  realmProgress?: number
  breakChance?: number
  breakthrough?: number
  atk?: number
  def?: number
  spirit?: number
  luck?: number
  item?: string
  removeItem?: string
  battle?: string
  enemy?: string
  unlockSkill?: string
  joinSect?: string
  reveal?: string
}

export interface BattleState {
  active: boolean
  enemyId: string
  enemyHp: number
  enemyMp: number
  round: number
  guard: number
  status: string
  log: string[]
}

export interface GameState {
  version: number
  startedAt: number
  lastSavedAt: number
  gameOver: boolean
  ending?: 'ascended' | 'died'
  name: string
  day: number
  realm: RealmKey
  realmProgress: number
  qi: number
  lifespan: number
  maxLifespan: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  atk: number
  def: number
  spirit: number
  luck: number
  coin: number
  exp: number
  inventory: Record<string, number>
  learnedSkills: string[]
  equippedArtifacts: string[]
  permanentBonus: StatBlock
  breakthroughBonus: number
  spiritualRoots: SpiritualRoot[]
  artifactAffixes: AffixMap
  dungeonCooldowns: Record<string, number>  // dungeonId → last cleared day
  alchemyCount: number
  currentRegion?: string
  regionExploreCount: Record<string, number>
  bountySlots: ActiveBounty[]
  bountyRefreshDay: number
  bountyPool: string[]
  completedBounties: number
  explorationsDone: number
  battlesWon: number
  techniques: LearnedTechnique[]
  activeTechnique?: string
  tribulationsPassed: string[]
  pendingEventId?: string
  sect?: SectKey
  sectReputation: number
  flags: Record<string, boolean>
  logs: string[]
  battle?: BattleState
}

export interface SerializedGameState extends GameState {
  timestamp: number
}

// === Reincarnation (转世) ===

export interface PerkEffect {
  startHp?: number
  startMp?: number
  startAtk?: number
  startDef?: number
  startSpirit?: number
  startLuck?: number
  startLifespan?: number
  startCoin?: number
  startItem?: string
  breakthroughBonus?: number
}

export interface ReincarnationPerk {
  id: string
  name: string
  nameEn?: string
  desc: string
  descEn?: string
  cost: number
  maxLevel: number
  effect: PerkEffect
}

export interface RunRecord {
  realm: RealmKey
  day: number
  ending: 'ascended' | 'died'
  daoFruit: number
  timestamp: number
}

export interface MetaState {
  version: number
  reincarnationCount: number
  totalDaoFruit: number
  availableDaoFruit: number
  perkLevels: Record<string, number>
  bestRealm: RealmKey
  bestDays: number
  runHistory: RunRecord[]
  achievements: Record<string, boolean>
}

// === Idle (离线挂机) ===

export interface IdleGains {
  days: number
  qi: number
  coin: number
  exp: number
  realMinutes: number
}

// === Sect (门派) ===

// === Spiritual Root (灵根) ===

export type SpiritualRoot = 'metal' | 'wood' | 'water' | 'fire' | 'earth'

// === Affix (词缀) ===

export interface ItemAffix {
  name: string
  nameEn?: string
  stat: keyof StatBlock
  value: number
}

export type AffixMap = Record<string, ItemAffix>  // itemId → affix

// === Dungeon (副本) ===

export interface DungeonDef {
  id: string
  name: string
  nameEn?: string
  desc: string
  descEn?: string
  minRealm: RealmKey
  enemyId: string
  rewardPool: string[]
  rewardCoin: number
  rewardExp: number
}

export type SectKey = 'jian' | 'dan' | 'fu'

export interface SectDef {
  key: SectKey
  name: string
  nameEn?: string
  desc: string
  descEn?: string
  bonus: Partial<StatBlock>
}

// === Alchemy (炼丹) ===

export interface AlchemyRecipeDef {
  id: string
  name: string
  nameEn?: string
  desc: string
  descEn?: string
  materials: Record<string, number>
  outputItem: string
  outputCount: number
  baseSuccessRate: number
  minRealm?: RealmKey
}

// === Region (区域探索) ===

export interface RegionDef {
  id: string
  name: string
  nameEn?: string
  desc: string
  descEn?: string
  minRealm?: RealmKey
  tags: string[]
  excludeTags?: string[]
  qiBonus: number
  coinBonus: number
  expBonus: number
  dangerLevel: number
  materialDrops?: string[]
  materialDropRate?: number
}

// === Bounty (悬赏任务) ===

export type BountyType = 'kill' | 'gather' | 'explore' | 'craft' | 'realm'

export interface BountyDef {
  id: string
  name: string
  nameEn?: string
  desc: string
  descEn?: string
  type: BountyType
  target: string
  targetCount: number
  minRealm?: RealmKey
  rewardCoin: number
  rewardExp: number
  rewardItem?: string
  rewardItemCount?: number
}

export interface ActiveBounty {
  bountyId: string
  progress: number
  accepted: boolean
  completedDay?: number
}

// === Technique (功法) ===

export interface TechniqueDef {
  id: string
  name: string
  nameEn?: string
  desc: string
  descEn?: string
  category: 'cultivation' | 'combat' | 'alchemy' | 'movement'
  minRealm?: RealmKey
  maxLevel: number
  effects: {
    qiPerDay?: number
    atk?: number
    def?: number
    alchemyBonus?: number
    dodgeChance?: number
  }
  learnCost: { coin: number; exp: number }
}

export interface LearnedTechnique {
  techId: string
  level: number
}

// === Tribulation (天劫) ===

export interface TribulationDef {
  id: string
  name: string
  nameEn?: string
  triggerRealm: RealmKey
  enemyHp: number
  enemyAtk: number
  enemyDef: number
  rewardExp: number
  rewardItem?: string
  desc: string
  descEn?: string
}
