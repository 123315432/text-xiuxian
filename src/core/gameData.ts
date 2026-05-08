import realms from '../data/realms.json'
import items from '../data/items.json'
import materials from '../data/materials.json'
import skills from '../data/skills.json'
import enemies from '../data/enemies.json'
import events from '../data/events.json'
import sects from '../data/sects.json'
import dungeons from '../data/dungeons.json'
import recipes from '../data/recipes.json'
import regions from '../data/regions.json'
import bounties from '../data/bounties.json'
import techniques from '../data/techniques.json'
import tribulations from '../data/tribulations.json'
import type {
  AlchemyRecipeDef,
  BattleSkillDef,
  BountyDef,
  DungeonDef,
  EnemyDef,
  EventDef,
  ItemDef,
  RealmDef,
  RegionDef,
  SectDef,
  TechniqueDef,
  TribulationDef,
} from '../types'

export const realmList = realms as RealmDef[]
export const itemList = [...(items as ItemDef[]), ...(materials as ItemDef[])]
export const skillList = skills as BattleSkillDef[]
export const enemyList = enemies as EnemyDef[]
export const eventList = events as EventDef[]
export const sectList = sects as SectDef[]
export const dungeonList = dungeons as DungeonDef[]
export const recipeList = recipes as unknown as AlchemyRecipeDef[]
export const regionList = regions as RegionDef[]
export const bountyList = bounties as BountyDef[]

export const realmIndex = new Map(realmList.map((realm) => [realm.key, realm]))
export const itemIndex = new Map(itemList.map((item) => [item.id, item]))
export const skillIndex = new Map(skillList.map((skill) => [skill.id, skill]))
export const enemyIndex = new Map(enemyList.map((enemy) => [enemy.id, enemy]))
export const sectIndex = new Map(sectList.map((sect) => [sect.key, sect]))
export const recipeIndex = new Map(recipeList.map((r) => [r.id, r]))
export const regionIndex = new Map(regionList.map((r) => [r.id, r]))
export const bountyIndex = new Map(bountyList.map((b) => [b.id, b]))

export const techniqueList = techniques as TechniqueDef[]
export const tribulationList = tribulations as TribulationDef[]
export const techniqueIndex = new Map(techniqueList.map((t) => [t.id, t]))
export const tribulationIndex = new Map(tribulationList.map((t) => [t.id, t]))

export const realmOrder = realmList.map((realm) => realm.key)
