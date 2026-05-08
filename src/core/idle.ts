import type { GameState, IdleGains } from '../types'
import { t } from '../i18n'
import { realmIndex } from './gameData'
import { getTechniqueBonus } from './game'
import { loadMeta, recordRun } from './meta'

export function calcIdleGains(state: GameState): IdleGains | null {
  if (state.gameOver) return null

  const elapsed = Date.now() - state.lastSavedAt
  const offlineMinutes = Math.floor(elapsed / 60000)
  if (offlineMinutes < 2) return null

  const offlineDays = Math.min(offlineMinutes, 480)
  const qiPerDay = 4 + Math.floor(state.spirit / 6) + getTechniqueBonus(state).qiPerDay

  return {
    days: offlineDays,
    qi: offlineDays * qiPerDay,
    coin: offlineDays,
    exp: offlineDays,
    realMinutes: offlineMinutes,
  }
}

function addLog(state: GameState, text: string): void {
  state.logs.unshift(text)
  state.logs = state.logs.slice(0, 80)
}

export function applyIdleGains(state: GameState, gains: IdleGains): IdleGains {
  const realm = realmIndex.get(state.realm)
  const maxQi = realm?.maxQi ?? 100
  const lifespanBefore = Math.max(0, state.lifespan)
  const elapsedDays = Math.min(gains.days, lifespanBefore)
  const ratio = gains.days > 0 ? elapsedDays / gains.days : 0
  const applied: IdleGains = {
    ...gains,
    days: elapsedDays,
    qi: Math.floor(gains.qi * ratio),
    coin: Math.floor(gains.coin * ratio),
    exp: Math.floor(gains.exp * ratio),
  }

  state.day += elapsedDays
  state.lifespan = Math.max(0, state.lifespan - elapsedDays)
  state.qi = Math.min(state.qi + applied.qi, maxQi)
  state.coin += applied.coin
  state.exp += applied.exp
  if (state.lifespan <= 0 && !state.gameOver) {
    state.gameOver = true
    state.ending = 'died'
    addLog(state, t('log.lifespanEnd'))
    recordRun(loadMeta(), state)
  }
  state.lastSavedAt = Date.now()
  return applied
}
