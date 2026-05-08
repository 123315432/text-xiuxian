import type { GameState, SerializedGameState } from '../types'
import { platformGetItem, platformRemoveItem, platformSetItem } from '../platform/crazygames'

const SAVE_KEY = 'text-xiuxian-save-v1'

export function saveGame(state: GameState): void {
  const payload: SerializedGameState = {
    ...state,
    timestamp: Date.now(),
  }
  platformSetItem(SAVE_KEY, JSON.stringify(payload))
}

export function loadGame(): SerializedGameState | null {
  const raw = platformGetItem(SAVE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SerializedGameState
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function clearSave(): void {
  platformRemoveItem(SAVE_KEY)
}

export function hasSave(): boolean {
  return platformGetItem(SAVE_KEY) !== null
}
