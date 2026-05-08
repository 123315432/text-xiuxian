const CRAZYGAMES_SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'
const KNOWN_STORAGE_KEYS = ['text-xiuxian-save-v1', 'text-xiuxian-meta-v1', 'text-xiuxian-locale']

interface CrazyGamesData {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

interface CrazyGamesGame {
  loadingStart(): void
  loadingStop(): void
  gameplayStart(): void
  gameplayStop(): void
  happytime(): void
  setGameContext?(context: Record<string, string | number | boolean>): void
  clearGameContext?(): void
}

interface CrazyGamesSystemInfo {
  locale?: string
}

interface CrazyGamesUser {
  systemInfo?: CrazyGamesSystemInfo
  isUserAccountAvailable?: boolean
}

interface CrazyGamesSDK {
  init(): Promise<void>
  data?: CrazyGamesData
  game?: Partial<CrazyGamesGame>
  user?: CrazyGamesUser
  environment?: string
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: CrazyGamesSDK
    }
    Capacitor?: {
      isNativePlatform?: () => boolean
    }
  }
}

let sdk: CrazyGamesSDK | undefined
let sdkReady = false
let loadingOpen = false
let loadingClosed = false
let desiredGameplay = false
let gameplayActive = false
let lastContext = ''

function remoteData(): CrazyGamesData | undefined {
  return sdkReady ? sdk?.data : undefined
}

function shouldLoadCrazyGamesSdk(): boolean {
  if (window.CrazyGames?.SDK) return true
  if (window.Capacitor?.isNativePlatform?.()) return false
  return window.location.hostname.toLowerCase().includes('crazygames')
}

function loadCrazyGamesScript(): Promise<void> {
  if (!shouldLoadCrazyGamesSdk()) return Promise.resolve()
  if (window.CrazyGames?.SDK || isCrazyGamesSdkConfigured()) return Promise.resolve()

  return new Promise((resolve) => {
    const script = document.createElement('script')
    const timer = window.setTimeout(resolve, 2500)
    script.src = CRAZYGAMES_SDK_URL
    script.async = true
    script.onload = () => {
      window.clearTimeout(timer)
      resolve()
    }
    script.onerror = () => {
      window.clearTimeout(timer)
      resolve()
    }
    document.head.appendChild(script)
  })
}

function readRemoteItem(key: string): string | null | undefined {
  let value: string | null | undefined
  const data = remoteData()
  if (!data) return value
  callRemote(() => {
    value = data.getItem(key)
  })
  return value
}

function callRemote(action: () => void): void {
  try {
    action()
  } catch {
    // CrazyGames modules can be disabled per submission; local storage remains the fallback.
  }
}

function timestampOf(raw: string | null): number {
  if (!raw) return 0
  try {
    const parsed = JSON.parse(raw) as { timestamp?: unknown; lastSavedAt?: unknown }
    const timestamp = typeof parsed.timestamp === 'number' ? parsed.timestamp : 0
    const lastSavedAt = typeof parsed.lastSavedAt === 'number' ? parsed.lastSavedAt : 0
    return Math.max(timestamp, lastSavedAt)
  } catch {
    return 0
  }
}

function syncStorageKey(key: string): void {
  const data = remoteData()
  if (!data) return

  callRemote(() => {
    const remote = data.getItem(key)
    const local = localStorage.getItem(key)

    if (remote === null && local !== null) {
      data.setItem(key, local)
      return
    }

    if (remote !== null && local === null) {
      localStorage.setItem(key, remote)
      return
    }

    if (remote !== null && local !== null && key === 'text-xiuxian-save-v1') {
      const winner = timestampOf(local) > timestampOf(remote) ? local : remote
      localStorage.setItem(key, winner)
      data.setItem(key, winner)
    }
  })
}

function syncKnownStorage(): void {
  for (const key of KNOWN_STORAGE_KEYS) {
    syncStorageKey(key)
  }
}

function localeFromSystem(): 'zh' | 'en' | null {
  const locale = sdk?.user?.systemInfo?.locale?.toLowerCase()
  if (!locale) return null
  return locale.startsWith('zh') ? 'zh' : 'en'
}

function applySystemLocale(): void {
  if (localStorage.getItem('text-xiuxian-locale')) return
  const locale = localeFromSystem()
  if (locale) platformSetItem('text-xiuxian-locale', locale)
}

function applyGameplayState(): void {
  if (!sdkReady || !loadingClosed || desiredGameplay === gameplayActive) return

  if (desiredGameplay) {
    callRemote(() => sdk?.game?.gameplayStart?.())
  } else {
    callRemote(() => sdk?.game?.gameplayStop?.())
  }

  gameplayActive = desiredGameplay
}

export async function initCrazyGamesPlatform(): Promise<void> {
  await loadCrazyGamesScript()
  sdk = window.CrazyGames?.SDK
  if (!sdk) return

  try {
    await sdk.init()
    if (sdk.environment === 'disabled') {
      sdk = undefined
      return
    }
    sdkReady = true
    callRemote(() => sdk?.game?.loadingStart?.())
    loadingOpen = true
    syncKnownStorage()
    applySystemLocale()
  } catch {
    sdk = undefined
    sdkReady = false
  }
}

export function finishCrazyGamesLoading(): void {
  if (!sdkReady || loadingClosed) return
  if (loadingOpen) {
    callRemote(() => sdk?.game?.loadingStop?.())
  }
  loadingClosed = true
  applyGameplayState()
}

export function setCrazyGamesGameplay(active: boolean): void {
  desiredGameplay = active
  applyGameplayState()
}

export function triggerCrazyGamesHappyTime(): void {
  if (!sdkReady) return
  callRemote(() => sdk?.game?.happytime?.())
}

export function setCrazyGamesContext(context: Record<string, string | number | boolean>): void {
  if (!sdkReady) return
  const nextContext = JSON.stringify(context)
  if (nextContext === lastContext) return
  lastContext = nextContext
  callRemote(() => sdk?.game?.setGameContext?.(context))
}

export function clearCrazyGamesContext(): void {
  if (!sdkReady || !lastContext) return
  lastContext = ''
  callRemote(() => sdk?.game?.clearGameContext?.())
}

export function platformGetItem(key: string): string | null {
  const remote = readRemoteItem(key)
  if (remote !== undefined) return remote
  return localStorage.getItem(key)
}

export function platformSetItem(key: string, value: string): void {
  localStorage.setItem(key, value)
  const data = remoteData()
  if (data) callRemote(() => data.setItem(key, value))
}

export function platformRemoveItem(key: string): void {
  localStorage.removeItem(key)
  const data = remoteData()
  if (data) callRemote(() => data.removeItem(key))
}

export function assetPath(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  return `${base}${path.replace(/^\/+/, '')}`
}

export function isCrazyGamesSdkConfigured(): boolean {
  return document.querySelector(`script[src="${CRAZYGAMES_SDK_URL}"]`) !== null
}
