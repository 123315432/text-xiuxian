import type { EventChoice, EventDef, GameState, RealmKey } from '../types'
import { t, tName, tDesc, getLocale, setLocale } from '../i18n'
import {
  attemptBreakthrough,
  canBreakthrough,
  createNewGame,
  explore,
  getBreakthroughChance,
  getBreakthroughNeed,
  getEnemyById,
  getEventById,
  getInventoryItems,
  getLearnedSkills,
  getMaxQi,
  getRealmByKey,
  getRealmName,
  handleEventChoice,
  hasSave,
  hydrateGame,
  persist,
  rollEvent,
  runBattleAction,
  startNewSession,
  enterDungeon,
  getAvailableDungeons,
  isDungeonReady,
  toggleArtifact,
  useInventoryItem,
  getAvailableRecipes,
  canCraftRecipe,
  craftRecipe,
  getAvailableRegions,
  getOfferedBounties,
  acceptBounty,
  abandonBounty,
  claimBountyReward,
  getBountyRefreshInterval,
  checkBountyProgress,
  getAvailableTechniques,
  getLearnedTechDefs,
  learnTechnique,
  upgradeTechnique,
  setActiveTechnique,
  getDaoDisplayName,
} from '../core/game'
import { loadGame } from '../core/save'
import { buyPerk, calcDaoFruit, calcReincarnationBonus, getPerkLevel, loadMeta, saveMeta, PERKS } from '../core/meta'
import { getAffixDesc, getRootNames } from '../core/game'
import { ACHIEVEMENTS, checkAchievements, getUnlockedCount } from '../core/achievements'
import { sectIndex, bountyIndex, itemIndex as gameItemIndex, tribulationIndex } from '../core/gameData'
import { applyIdleGains, calcIdleGains } from '../core/idle'
import {
  assetPath,
  clearCrazyGamesContext,
  finishCrazyGamesLoading,
  setCrazyGamesContext,
  setCrazyGamesGameplay,
  triggerCrazyGamesHappyTime,
} from '../platform/crazygames'

type ModalKind = 'none' | 'event' | 'battle' | 'inventory' | 'log' | 'reincarnation' | 'achievements' | 'dungeons' | 'alchemy' | 'regions' | 'bounties' | 'techniques'
type NoticeTone = 'info' | 'success' | 'warn'

interface NoticeState {
  text: string
  tone: NoticeTone
}

interface UIState {
  game: GameState
  activeEvent?: EventDef
  modal: ModalKind
  previewOnly: boolean
  notice?: NoticeState
  fx?: 'explore' | 'event' | 'battle-hit' | 'battle-guard' | 'victory' | 'breakthrough' | 'item'
}

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('Root element #app not found')
}

const appRoot = root
let noticeTimer = 0
let eventsBound = false
let keyBound = false
let prevQi = -1
let prevCoin = -1
let prevHp = -1
let tickPersistTimer = 0

const state: UIState = {
  game: hydrateGame(loadGame()),
  modal: 'none',
  previewOnly: false,
}

// Apply idle gains on load
const _idleGains = calcIdleGains(state.game)
let idleNotice = ''
if (_idleGains) {
  const appliedIdleGains = applyIdleGains(state.game, _idleGains)
  persist(state.game)
  const hours = Math.floor(appliedIdleGains.realMinutes / 60)
  const mins = appliedIdleGains.realMinutes % 60
  const timeStr = hours > 0 ? t('metric.hourMinute', hours, mins) : t('metric.minute', mins)
  idleNotice = t('notice.idleGain', timeStr, appliedIdleGains.qi, appliedIdleGains.coin)
}

const PLAYER_AVATAR = assetPath('images/avatar/player.jpg')

const REALM_IMAGES: Record<RealmKey, string> = {
  lianqi: assetPath('images/realm/lianqi.jpg'),
  jzhuji: assetPath('images/realm/zhuji.jpg'),
  jindan: assetPath('images/realm/jindan.jpg'),
  yuanying: assetPath('images/realm/yuanying.jpg'),
  huashen: assetPath('images/realm/huashen.jpg'),
  dacheng: assetPath('images/realm/dacheng.jpg'),
  dujie: assetPath('images/realm/dujie.jpg'),
  feisheng: assetPath('images/realm/feisheng.jpg'),
}

const EVENT_IMAGES = {
  battle: assetPath('images/events/battle.jpg'),
  chance: assetPath('images/events/chance.jpg'),
  disaster: assetPath('images/events/disaster.jpg'),
  explore: assetPath('images/events/explore.jpg'),
  mission: assetPath('images/events/mission.jpg'),
} as const

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function clampPercent(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.max(0, Math.min(100, (value / max) * 100))
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(getLocale() === 'en' ? 'en-US' : 'zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const TAG_KEYS: Record<string, string> = {
  修炼: 'tag.cultivation',
  恢复: 'tag.recovery',
  战斗: 'tag.battle',
  劫掠: 'tag.raid',
  危险: 'tag.danger',
  天劫: 'tag.tribulation',
  剧情: 'tag.story',
  商店: 'tag.shop',
  秘境: 'tag.mysticRealm',
  生存: 'tag.survival',
  机缘: 'tag.event',
  传承: 'tag.transmission',
  功法: 'tag.techniques',
  法宝: 'tag.artifact',
  丹药: 'tag.pill',
  善缘: 'tag.goodKarma',
  灵兽: 'tag.spiritBeast',
  灵植: 'tag.herb',
  稳定: 'tag.stable',
}

function getTagLabel(tag: string): string {
  const key = TAG_KEYS[tag]
  return key ? t(key) : tag
}

function getChoiceLabel(choice: EventChoice): string {
  return getLocale() === 'en' && choice.labelEn ? choice.labelEn : choice.label
}

function getChoiceDesc(choice: EventChoice): string {
  return getLocale() === 'en' && choice.descEn ? choice.descEn : choice.desc
}

function hasFailureNotice(text: string): boolean {
  return text.toLowerCase().includes('failed') || text.includes('\u5931\u8d25')
}

function getBattleOpponentName(enemyId: string): string {
  const enemy = getEnemyById(enemyId)
  if (enemy) return tName(enemy)
  const tribulation = tribulationIndex.get(enemyId)
  return tribulation ? tName(tribulation) : enemyId
}

function getRealmTitle(realm: { title: string; titleEn?: string }): string {
  return getLocale() === 'en' && realm.titleEn ? realm.titleEn : realm.title
}


function setNotice(text: string, tone: NoticeTone = 'info'): void {
  state.notice = { text, tone }
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    state.notice = undefined
    renderApp()
  }, 2600)
}

function triggerFx(fx: UIState['fx']): void {
  if (!fx) return
  state.fx = fx
  window.setTimeout(() => {
    if (state.fx === fx) {
      state.fx = undefined
      renderApp()
    }
  }, 720)
}

function appendManualLog(text: string): void {
  state.game.logs.unshift(text)
  state.game.logs = state.game.logs.slice(0, 80)
}

function getFocusState(): { label: string; title: string; desc: string; tone: NoticeTone } {
  if (state.game.gameOver) {
    return {
      label: t('status.end'),
      title: state.game.ending === 'ascended' ? t('focus.ascend') : t('focus.dead'),
      desc: state.game.ending === 'ascended' ? t('focus.ascendDesc') : t('focus.deadDesc'),
      tone: state.game.ending === 'ascended' ? 'success' : 'warn',
    }
  }

  if (state.game.battle) {
    const enemyName = getBattleOpponentName(state.game.battle.enemyId)
    return {
      label: t('tag.combat'),
      title: t('focus.battleTitle', enemyName),
      desc: t('focus.battle'),
      tone: 'warn',
    }
  }

  if (state.previewOnly && state.activeEvent) {
    return {
      label: t('tag.preview'),
      title: t('focus.previewTitle', tName(state.activeEvent)),
      desc: t('focus.previewDesc'),
      tone: 'info',
    }
  }

  if (state.game.pendingEventId || state.activeEvent) {
    const event = state.activeEvent ?? getEventById(state.game.pendingEventId ?? '')
    return {
      label: t('tag.event'),
      title: event ? t('focus.pendingTitle', tName(event)) : t('focus.pendingUnknown'),
      desc: t('focus.event'),
      tone: 'info',
    }
  }

  if (canBreakthrough(state.game)) {
    return {
      label: t('tag.breakthrough'),
      title: t('focus.breakTitle'),
      desc: t('focus.breakDesc', getBreakthroughChance(state.game)),
      tone: 'success',
    }
  }

  return {
    label: t('panel.actions'),
    title: t('focus.idleTitle'),
    desc: t('focus.idleDesc'),
    tone: 'info',
  }
}

function getActionHint(): string {
  if (state.game.gameOver) {
    return state.game.ending === 'ascended' ? t('hint.ascended') : t('hint.gameEnded')
  }
  if (state.game.battle) {
    return t('focus.battle')
  }
  if (state.game.pendingEventId) {
    return t('focus.event')
  }
  if (canBreakthrough(state.game)) {
    return t('hint.breakReady', getBreakthroughChance(state.game))
  }
  return t('hint.needQi', Math.max(0, getBreakthroughNeed(state.game) - state.game.qi))
}

function getDisplayedEvent(): EventDef | undefined {
  return state.activeEvent ?? (state.game.pendingEventId ? getEventById(state.game.pendingEventId) : undefined)
}

function getRealmImage(realm: RealmKey): string {
  return REALM_IMAGES[realm] ?? REALM_IMAGES.lianqi
}

function getEventVisual(event: EventDef): { src: string; label: string } {
  const tags = new Set(event.tags)

  if (tags.has('战斗') || tags.has('劫掠')) {
    return { src: EVENT_IMAGES.battle, label: t('tag.battleEncounter') }
  }

  if (tags.has('危险') || tags.has('天劫')) {
    return { src: EVENT_IMAGES.disaster, label: t('tag.disasterVision') }
  }

  if (tags.has('剧情') || tags.has('商店') || tags.has('秘境') || tags.has('生存')) {
    return { src: EVENT_IMAGES.mission, label: t('tag.travelStory') }
  }

  if (
    tags.has('机缘') ||
    tags.has('传承') ||
    tags.has('功法') ||
    tags.has('法宝') ||
    tags.has('丹药') ||
    tags.has('善缘') ||
    tags.has('灵兽')
  ) {
    return { src: EVENT_IMAGES.chance, label: t('tag.fortuneManifest') }
  }

  return { src: EVENT_IMAGES.explore, label: t('tag.wilderness') }
}

function renderRunSummary(): string {
  if (!state.game.gameOver) return ''
  const ascended = state.game.ending === 'ascended'
  const realmName = getRealmName(state.game.realm)
  const skills = getLearnedSkills(state.game)
  return `
    <div class="run-summary">
      <div class="run-summary-head">
        <span class="story-badge ${ascended ? 'story-badge-success' : 'story-badge-warn'}">${ascended ? t('story.ascendedBadge') : t('story.diedBadge')}</span>
        <strong>${ascended ? t('story.ascendedTitle') : t('story.diedTitle')}</strong>
      </div>
      <div class="run-summary-stats">
        <div class="run-stat"><span>${t('stat.duration')}</span><strong>${t('metric.dayValue', state.game.day)}</strong></div>
        <div class="run-stat"><span>${t('stat.finalRealm')}</span><strong>${escapeHtml(realmName)}</strong></div>
        <div class="run-stat"><span>${t('stat.techniques')}</span><strong>${t('metric.kind', skills.length)}</strong></div>
        <div class="run-stat"><span>${t('stat.totalQi')}</span><strong>${t('metric.points', state.game.exp)}</strong></div>
        <div class="run-stat"><span>${t('stat.remainingCoin')}</span><strong>${state.game.coin}</strong></div>
      </div>
    </div>
  `
}

function storyTitle(): string {
  if (state.game.gameOver) {
    return state.game.ending === 'ascended' ? t('story.title.ascended') : t('story.title.dead')
  }
  if (state.game.battle) {
    return t('story.title.battle', getBattleOpponentName(state.game.battle.enemyId))
  }
  if (state.previewOnly && state.activeEvent) {
    return t('story.title.preview', tName(state.activeEvent))
  }
  if (state.activeEvent) return t('story.title.event', tName(state.activeEvent))
  if (canBreakthrough(state.game)) return t('story.title.break')
  return t('story.title.idle')
}

function endingText(): string {
  if (state.game.ending === 'ascended') return t('game.subtitle.ascend')
  if (state.game.ending === 'died') return t('game.subtitle.dead')
  if (state.game.battle) return t('game.subtitle.battle')
  if (state.game.pendingEventId) return t('game.subtitle.event')
  return t('game.subtitle.idle')
}

function renderChip(label: string, value: string, tone = ''): string {
  const toneClass = tone ? ` chip-${tone}` : ''
  return `
    <div class="info-chip${toneClass}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `
}

function renderMetric(label: string, value: number, max: number, tone: 'gold' | 'crimson' | 'cyan' | 'jade', metricId = ''): string {
  const dataAttr = metricId ? ` data-metric="${metricId}"` : ''
  return `
    <div class="metric metric-${tone}"${dataAttr}>
      <div class="metric-head">
        <span>${escapeHtml(label)}</span>
        <strong data-metric-text>${value}/${max}</strong>
      </div>
      <div class="bar">
        <div class="bar-fill bar-${tone}" style="width:${clampPercent(value, max)}%" data-metric-bar></div>
      </div>
    </div>
  `
}

function renderStatusCell(label: string, value: string, accent = ''): string {
  const accentClass = accent ? ` stat-${accent}` : ''
  return `
    <div class="stat${accentClass}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `
}

function renderSkillsPreview(): string {
  const skills = getLearnedSkills(state.game)
  if (!skills.length) {
    return `<div class="empty-inline">${t('empty.noSkills')}</div>`
  }

  return skills
    .slice(0, 4)
    .map(
      (skill) => `
        <div class="skill-pill">
          <strong>${escapeHtml(tName(skill))}</strong>
          <span>${t('battle.mp')} ${skill.cost}</span>
        </div>
      `,
    )
    .join('')
}

function renderInventoryPreview(): string {
  const items = getInventoryItems(state.game)
  if (!items.length) {
    return `<div class="empty-inline">${t('empty.inventory')}</div>`
  }

  return items
    .slice(0, 4)
    .map(
      (item) => `
        <div class="loot-pill">
          <strong>${escapeHtml(tName(item))}</strong>
          <span>x${item.count}</span>
        </div>
      `,
    )
    .join('')
}

function renderNextStepStrip(): string {
  const steps: string[] = []

  if (state.game.battle) {
    steps.push(t('tip.next.battle'))
  } else if (state.game.pendingEventId || state.activeEvent) {
    steps.push(t('tip.next.event'))
  } else if (canBreakthrough(state.game) && state.game.realm !== 'feisheng') {
    steps.push(t('tip.next.break', getBreakthroughChance(state.game)))
  } else if (!state.game.gameOver) {
    steps.push(t('tip.next.explore'))
  }

  const pills = getInventoryItems(state.game).filter((item) => item.type === 'pill')
  if (state.game.battle && pills.length > 0) {
    steps.push(t('tip.next.pills', pills.length))
  }
  if (!state.game.gameOver && state.game.qi < getBreakthroughNeed(state.game)) {
    steps.push(t('tip.next.qiGap', Math.max(0, getBreakthroughNeed(state.game) - state.game.qi)))
  }

  if (!steps.length) return ''

  return `
    <div class="next-step-strip">
      <span>${t('tip.next.label')}</span>
      ${steps.map((step) => `<strong>${escapeHtml(step)}</strong>`).join('')}
    </div>
  `
}

function renderHeroVisual(): string {
  const realm = getRealmByKey(state.game.realm)
  const detail =
    state.game.realm === 'feisheng'
      ? t('hero.ascendedDetail')
      : canBreakthrough(state.game)
        ? t('hero.breakDetail', getBreakthroughChance(state.game))
        : t('hero.needQiDetail', Math.max(0, getBreakthroughNeed(state.game) - state.game.qi))

  return `
    <aside class="hero-visual-stack">
      <div class="avatar-card">
        <img class="avatar-image" src="${PLAYER_AVATAR}" alt="${t('hero.avatarAlt')}" />
        <div class="avatar-copy">
          <div class="panel-tag">${t('panel.avatar')}</div>
          <strong>${escapeHtml(getDaoDisplayName(state.game.name))}</strong>
          <p>${escapeHtml(getRealmName(state.game.realm))} · ${escapeHtml(getRealmTitle(realm))}</p>
        </div>
      </div>

      <figure class="realm-visual">
        <img src="${getRealmImage(state.game.realm)}" alt="${escapeHtml(getRealmName(state.game.realm))}" />
        <figcaption class="realm-visual-copy">
          <span class="story-badge story-badge-info">${t('panel.realm')}</span>
          <strong>${escapeHtml(getRealmName(state.game.realm))}</strong>
          <p>${escapeHtml(detail)}</p>
        </figcaption>
      </figure>
    </aside>
  `
}

function renderEventSpotlight(event?: EventDef): string {
  if (!event) return ''

  const visual = getEventVisual(event)

  return `
    <div class="story-event-card" data-action="open-event" style="cursor:pointer">
      <img src="${visual.src}" alt="${escapeHtml(tName(event))}" />
      <div class="story-event-copy">
        <div class="story-event-head">
          <span class="story-badge ${state.previewOnly ? 'story-badge-muted' : 'story-badge-info'}">${escapeHtml(visual.label)}</span>
          <span class="story-event-mode">${state.previewOnly ? t('status.previewing') : t('status.awaitingChoice')}</span>
        </div>
        <strong>${escapeHtml(tName(event))}</strong>
        <p>${escapeHtml(tDesc(event))}</p>
      </div>
    </div>
  `
}

function pulseIfChanged(selector: string, currentValue: number, previousValue: number): void {
  if (previousValue >= 0 && currentValue !== previousValue) {
    const el = document.querySelector(selector)
    if (el) {
      el.classList.add('value-changed')
      setTimeout(() => el.classList.remove('value-changed'), 400)
    }
  }
}

function renderApp(): void {
  const snapQi = state.game.qi
  const snapCoin = state.game.coin
  const snapHp = state.game.hp
  const hasPendingEvent = Boolean(state.game.pendingEventId)
  const focus = getFocusState()
  const skills = getLearnedSkills(state.game)
  const inventory = getInventoryItems(state.game)
  const artifactCount = state.game.equippedArtifacts.length
  const latestLogs = state.game.logs.slice(0, 12)
  const displayedEvent = getDisplayedEvent()

  document.body.classList.toggle('has-modal', state.modal !== 'none')

  appRoot.innerHTML = `
    <div class="game-shell ${state.fx ? `fx-${state.fx}` : ''} ${state.game.battle ? 'is-battle' : ''} ${state.game.pendingEventId || state.activeEvent ? 'is-event' : ''}">
      <div class="shell-glow shell-glow-a"></div>
      <div class="shell-glow shell-glow-b"></div>

      <header class="topbar">
        <div class="brand">
          <div class="brand-title-row">
            <div class="brand-mark">${t('game.brandMark')}</div>
            <div>
              <div class="brand-title">${t('game.title')}</div>
              <div class="brand-subtitle">${escapeHtml(getRealmName(state.game.realm))} · ${escapeHtml(endingText())}</div>
            </div>
          </div>
          <div class="brand-meta">
            ${renderChip(t('metric.name'), getDaoDisplayName(state.game.name), 'neutral')}
            ${renderChip(t('metric.day'), `${t('misc.dayPrefix')}${state.game.day} ${t('misc.day')}`, 'neutral')}
            ${renderChip(t('metric.coin'), String(state.game.coin), 'gold')}
          </div>
        </div>

        <div class="top-actions">
          <button class="ghost" data-action="toggle-lang">${t('btn.lang')}</button>
          <button class="ghost" data-action="achievements">${t('btn.achievements')}</button>
          <button class="ghost" data-action="reincarnation">${t('btn.reincarnation')}</button>
          <button class="ghost" data-action="save">${t('btn.saveSlot')}</button>
          <button class="ghost" data-action="load" ${hasSave() ? '' : 'disabled'}>${t('btn.loadSlot')}</button>
          <button class="ghost danger" data-action="new">${t('btn.restart')}</button>
        </div>
      </header>

      <div class="layout-grid">
        <main class="main-column">
          <section class="hero-panel panel">
            <div class="hero-main">
              <div class="hero-copy">
                <div class="panel-tag">${escapeHtml(focus.label)}</div>
                <h1>${escapeHtml(focus.title)}</h1>
                <p>${escapeHtml(focus.desc)}</p>
              </div>
              <div class="hero-metrics">
                ${renderMetric(t('battle.hp'), state.game.hp, state.game.maxHp, 'crimson')}
                ${renderMetric(t('battle.mp'), state.game.mp, state.game.maxMp, 'cyan')}
                ${renderMetric(t('metric.qi'), state.game.qi, getMaxQi(state.game), 'gold', 'qi')}
                ${renderMetric(t('metric.lifespan'), state.game.lifespan, state.game.maxLifespan, 'jade')}
              </div>
            </div>
            ${renderHeroVisual()}
          </section>

          <section class="story-panel panel">
            <div class="story-head">
              <div>
                <div class="panel-tag">${t('panel.log')}</div>
                <h2>${escapeHtml(storyTitle())}</h2>
              </div>
              <button class="ghost small" data-action="log">${t('panel.logBtn')}</button>
            </div>
            <div class="story-meta">
              ${hasPendingEvent ? `<span class="story-badge story-badge-info">${t('status.pendingEvent')}</span>` : ''}
              ${state.previewOnly ? `<span class="story-badge story-badge-muted">${t('status.previewMode')}</span>` : ''}
              ${state.game.battle ? `<span class="story-badge story-badge-warn">${t('status.inBattle')}</span>` : ''}
              ${canBreakthrough(state.game) && !state.game.battle ? `<span class="story-badge story-badge-success">${t('status.breakReady', getBreakthroughChance(state.game))}</span>` : ''}
            </div>
            ${renderRunSummary()}
            ${renderEventSpotlight(displayedEvent)}
            <div class="story-scroll">
              ${latestLogs.length ? latestLogs.map((entry) => `<div class="log-line">${escapeHtml(entry)}</div>`).join('') : `<div class="empty-state">${t('empty.noLogs')}</div>`}
            </div>
          </section>

          <footer class="command-panel panel">
            <div class="command-copy">
              <div class="panel-tag">${t('panel.actions')}</div>
              <p>${escapeHtml(getActionHint())}</p>
            </div>
            ${renderNextStepStrip()}
            <div class="action-grid">
              <div class="action-group">
                  <button class="primary" data-action="explore-menu" data-fx="explore" ${state.game.gameOver || state.game.battle || hasPendingEvent ? 'disabled' : ''}>${t('btn.explore')}</button>
                  <button class="primary" data-action="break" data-fx="breakthrough" ${state.game.gameOver || hasPendingEvent || state.game.battle || !canBreakthrough(state.game) || state.game.realm === 'feisheng' ? 'disabled' : ''}>${t('btn.break')}</button>
              </div>
              <div class="action-group">
                <button class="secondary" data-action="inventory">${t('btn.inventory')}</button>
                <button class="secondary" data-action="battle" ${state.game.battle ? '' : 'disabled'}>${t('btn.battle')}</button>
                <button class="secondary" data-action="dungeons" ${state.game.gameOver || state.game.battle || hasPendingEvent ? 'disabled' : ''}>${t('btn.dungeons')}</button>
                <button class="secondary" data-action="alchemy" ${state.game.gameOver || state.game.battle || hasPendingEvent ? 'disabled' : ''}>${t('btn.alchemy')}</button>
                <button class="secondary" data-action="bounties" ${state.game.gameOver ? 'disabled' : ''}>${t('btn.bounties')}</button>
                <button class="secondary" data-action="techniques" ${state.game.gameOver ? 'disabled' : ''}>${t('btn.techniques')}</button>
              </div>
              <div class="action-group">
                <button class="micro" data-action="peek" data-fx="event" ${state.game.gameOver || hasPendingEvent || state.game.battle ? 'disabled' : ''}>${t('btn.peek')}</button>
                <button class="micro" data-action="autosave">${t('btn.save')}</button>
              </div>
            </div>
          </footer>
        </main>

        <aside class="side-column">
          <section class="status-panel panel">
            <div class="panel-head">
              <div>
                <div class="panel-tag">${t('panel.character')}</div>
                <h3>${t('panel.status')}</h3>
              </div>
            </div>

            <div class="status-grid">
              ${renderStatusCell(t('stat.realm'), getRealmName(state.game.realm), 'gold')}
              ${renderStatusCell(t('stat.progress'), `${state.game.realmProgress}`, 'gold')}
              ${renderStatusCell(t('stat.need'), `${Math.max(1, getBreakthroughNeed(state.game))}`, 'gold')}
              ${renderStatusCell(t('stat.atk'), String(state.game.atk), 'danger')}
              ${renderStatusCell(t('stat.def'), String(state.game.def), 'jade')}
              ${renderStatusCell(t('stat.spirit'), String(state.game.spirit), 'cyan')}
              ${renderStatusCell(t('stat.luck'), String(state.game.luck), 'cyan')}
              ${renderStatusCell(t('stat.techniques'), String(skills.length), 'neutral')}
              ${renderStatusCell(t('stat.items'), String(inventory.length), 'neutral')}
              ${renderStatusCell(t('stat.artifacts'), String(artifactCount), 'neutral')}
              ${renderStatusCell(t('stat.roots'), getRootNames(state.game.spiritualRoots ?? []) || t('misc.none'), 'cyan')}
              ${renderStatusCell(t('stat.sect'), state.game.sect ? (sectIndex.get(state.game.sect) ? tName(sectIndex.get(state.game.sect)!) : t('misc.none')) : t('status.free'), 'gold')}
              ${renderStatusCell(t('stat.saveTime'), formatTime(state.game.lastSavedAt), 'neutral')}
              ${renderStatusCell(t('stat.status'), state.game.gameOver ? t('status.end') : state.game.battle ? t('status.battle') : hasPendingEvent ? t('status.event') : t('status.idle'), 'neutral')}
            </div>

            <div class="progress-block">
              <div class="progress-row">
                <span>${t('panel.breakReady')}</span>
                <span>${state.game.realm === 'feisheng' ? t('status.ascendGateOpen') : t('status.successRate', getBreakthroughChance(state.game))}</span>
              </div>
              <div class="bar">
                <div class="bar-fill bar-gold" style="width:${clampPercent(state.game.qi, getMaxQi(state.game))}%"></div>
              </div>
            </div>
          </section>

          <section class="insight-panel panel">
            <div class="panel-head">
              <div>
                <div class="panel-tag">${t('panel.skills')}</div>
                <h3>${t('panel.currentSkills')}</h3>
              </div>
              <button class="ghost small" data-action="inventory">${t('misc.viewAll')}</button>
            </div>

            <div class="subpanel">
              <div class="subpanel-head">
                <span>${t('panel.learnedSkills')}</span>
                <strong>${skills.length}</strong>
              </div>
              <div class="pill-row">
                ${renderSkillsPreview()}
              </div>
            </div>

            <div class="subpanel">
              <div class="subpanel-head">
                <span>${t('panel.items')}</span>
                <strong>${inventory.length}</strong>
              </div>
              <div class="pill-row">
                ${renderInventoryPreview()}
              </div>
            </div>
          </section>
        </aside>
      </div>

      ${state.notice ? `<div class="notice notice-${state.notice.tone}">${escapeHtml(state.notice.text)}</div>` : ''}
    </div>

    ${renderEventModal()}
    ${renderBattleModal()}
    ${renderInventoryModal()}
    ${renderLogModal()}
    ${renderReincarnationModal()}
    ${renderAchievementsModal()}
    ${renderDungeonModal()}
    ${renderAlchemyModal()}
    ${renderRegionModal()}
    ${renderBountyModal()}
    ${renderTechniqueModal()}
  `

  bindEvents()
  if (state.modal !== 'none') {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  // Value change pulse detection
  pulseIfChanged('[data-metric="qi"] [data-metric-text]', snapQi, prevQi)
  pulseIfChanged('.chip-gold strong', snapCoin, prevCoin)
  pulseIfChanged('.metric-crimson [data-metric-text]', snapHp, prevHp)
  prevQi = snapQi
  prevCoin = snapCoin
  prevHp = snapHp
  syncCrazyGamesState()
}

function isGameplayActive(): boolean {
  if (state.game.gameOver) return false
  return state.modal === 'none' || state.modal === 'event' || state.modal === 'battle'
}

function syncCrazyGamesState(): void {
  setCrazyGamesGameplay(isGameplayActive())
  if (state.game.gameOver) {
    clearCrazyGamesContext()
    return
  }
  setCrazyGamesContext({
    day: state.game.day,
    realm: state.game.realm,
    battle: Boolean(state.game.battle),
    pendingEvent: Boolean(state.game.pendingEventId),
    modal: state.modal,
  })
}

function renderEventModal(): string {
  if (state.modal !== 'event' || !state.activeEvent) return ''

  const visual = getEventVisual(state.activeEvent)

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card-event">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${state.previewOnly ? t('tag.preview') : t('tag.event')}</div>
            <h2>${escapeHtml(tName(state.activeEvent))}</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>

        <div class="tag-row">
          ${state.activeEvent.tags.map((tag) => `<span class="story-badge story-badge-muted">${escapeHtml(getTagLabel(tag))}</span>`).join('')}
        </div>
        <div class="modal-tip">
          <span>${state.previewOnly ? t('event.previewTip') : t('event.choiceTip')}</span>
          <strong>${t('event.choiceCount', state.activeEvent.choices.length)}</strong>
        </div>

        <div class="visual-banner">
          <img src="${visual.src}" alt="${escapeHtml(tName(state.activeEvent))}" />
          <div class="visual-banner-copy">
            <div>
              <span class="story-badge ${state.previewOnly ? 'story-badge-muted' : 'story-badge-info'}">${escapeHtml(visual.label)}</span>
              <p>${escapeHtml(state.previewOnly ? t('event.previewSafe') : t('event.visualReady'))}</p>
            </div>
          </div>
        </div>

        <p class="modal-text">${escapeHtml(tDesc(state.activeEvent))}</p>
        ${state.previewOnly ? `<div class="hint">${t('event.previewHint')}</div>` : ''}

        <div class="choice-list">
          ${state.activeEvent.choices
            .map(
              (choice, index) => `
                <button class="choice-btn" data-choice="${index}" ${state.previewOnly ? 'disabled' : ''}>
                  <strong>${escapeHtml(getChoiceLabel(choice))}</strong>
                  <span>${escapeHtml(getChoiceDesc(choice))}</span>
                </button>
              `,
            )
            .join('')}
        </div>
      </section>
    </div>
  `
}

function renderBattleModal(): string {
  if (state.modal !== 'battle' || !state.game.battle) return ''

  const enemy = getEnemyById(state.game.battle.enemyId)
  const trib = tribulationIndex.get(state.game.battle.enemyId)
  const skills = getLearnedSkills(state.game)
  const pills = getInventoryItems(state.game).filter((item) => item.type === 'pill')
  const isTribulation = state.game.battle.enemyId.startsWith('trib_')
  const usableSkills = skills.filter((skill) => state.game.mp >= skill.cost).length

  return `
    <div class="modal-backdrop${isTribulation ? ' modal-backdrop-tribulation' : ''}">
      <section class="modal-card modal-card-battle">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${isTribulation ? t('tag.tribulation') : t('tag.battle')}</div>
            <h2>${isTribulation ? t('modal.tribulation') : escapeHtml(enemy ? tName(enemy) : state.game.battle.enemyId)}</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>

        <p class="modal-text">${escapeHtml(enemy ? tDesc(enemy) : t('battle.hint'))}</p>
        <div class="battle-summary">
          <span>${t('battle.summary.round', state.game.battle.round)}</span>
          <span>${t('battle.summary.skills', usableSkills, skills.length)}</span>
          <span>${t('battle.summary.pills', pills.length)}</span>
        </div>

        <div class="battle-dual">
          <div class="battle-card">
            <div class="battle-card-head">
              <span>${t('battle.self')}</span>
              <strong>${t('battle.round')} ${state.game.battle.round}</strong>
            </div>
            ${renderMetric(t('battle.hp'), state.game.hp, state.game.maxHp, 'crimson')}
            ${renderMetric(t('battle.mp'), state.game.mp, state.game.maxMp, 'cyan')}
          </div>

          <div class="battle-card">
            <div class="battle-card-head">
              <span>${t('battle.enemy')}</span>
              <strong>${escapeHtml(state.game.battle.status)}</strong>
            </div>
            ${renderMetric(t('battle.enemyHp'), state.game.battle.enemyHp, Math.max(1, enemy?.hp ?? trib?.enemyHp ?? state.game.battle.enemyHp), 'crimson')}
            ${renderMetric(t('battle.enemyMp'), state.game.battle.enemyMp, Math.max(1, enemy?.mp ?? state.game.battle.enemyMp), 'cyan')}
          </div>
        </div>

        <div class="battle-log">
          ${state.game.battle.log.map((line) => `<div class="log-line">${escapeHtml(line)}</div>`).join('')}
        </div>

        <div class="battle-actions">
          <button class="primary battle-attack" data-battle="attack">${t('btn.attack')}</button>
          <button class="secondary battle-guard" data-battle="guard">${t('btn.guard')}</button>
        </div>
        <div class="modal-tip">${t('battle.actionTip')}</div>

        <div class="battle-columns">
          <div class="subpanel">
            <div class="subpanel-head">
              <span>${t('battle.skills')}</span>
              <strong>${skills.length}</strong>
            </div>
            <div class="choice-list compact-list">
              ${
                skills.length
                  ? skills
                      .map(
                        (skill) => `
                            <button class="choice-btn compact battle-skill" data-battle="skill" data-skill-id="${skill.id}" ${state.game.mp < skill.cost ? 'disabled' : ''}>
                            <strong>${escapeHtml(tName(skill))}</strong>
                            <span>${escapeHtml(tDesc(skill))} · ${t('battle.mp')} ${skill.cost}${state.game.mp < skill.cost ? ` · ${t('battle.notEnoughMp')}` : ''}</span>
                          </button>
                        `,
                      )
                      .join('')
                  : `<div class="empty-state">${t('battle.noSkills')}</div>`
              }
            </div>
          </div>

          <div class="subpanel">
            <div class="subpanel-head">
              <span>${t('battle.pills')}</span>
              <strong>${pills.length}</strong>
            </div>
            <div class="choice-list compact-list">
              ${
                pills.length
                  ? pills
                      .map(
                        (item) => `
                          <button class="choice-btn compact battle-item" data-battle="item" data-battle-item="${item.id}">
                            <strong>${escapeHtml(tName(item))}</strong>
                            <span>${escapeHtml(tDesc(item))} · x${item.count}</span>
                          </button>
                        `,
                      )
                      .join('')
                  : `<div class="empty-state">${t('battle.noPills')}</div>`
              }
            </div>
          </div>
        </div>
      </section>
    </div>
  `
}

function renderInventoryModal(): string {
  if (state.modal !== 'inventory') return ''

  const items = getInventoryItems(state.game)
  const equippedCount = state.game.equippedArtifacts.length
  const groups = [
    { key: 'skill', title: t('item.group.skill'), empty: t('item.empty.skill') },
    { key: 'artifact', title: t('item.group.artifact'), empty: t('item.empty.artifact') },
    { key: 'pill', title: t('item.group.pill'), empty: t('item.empty.pill') },
    { key: 'material', title: t('item.group.material'), empty: t('item.empty.material') },
  ]

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card-inventory">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${t('modal.inventory')}</div>
            <h2>${t('modal.inventory')}</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>

        <div class="inventory-groups">
          ${groups
            .map((group) => {
              const entries = items.filter((item) => item.type === group.key)
              return `
                <section class="inventory-group">
                  <div class="subpanel-head inventory-group-head">
                    <span>${group.title}</span>
                    <strong>${entries.length}</strong>
                  </div>
                  <div class="inventory-list">
                    ${
                      entries.length
                        ? entries
                            .map((item) => {
                              const equipped = state.game.equippedArtifacts.includes(item.id)
                              const action =
                                item.type === 'artifact'
                                  ? equipped
                                    ? t('btn.unequip')
                                    : t('btn.equip')
                                  : item.type === 'skill'
                                    ? t('btn.study')
                                    : t('btn.use')

                              const affix = state.game.artifactAffixes?.[item.id]
                              const affixTag = affix ? ` <em class="affix-tag">[${getAffixDesc(affix)}]</em>` : ''

                              return `
                                <button class="inventory-item" data-item="${item.id}">
                                  <div class="inventory-copy">
                                    <strong>${escapeHtml(tName(item))}${affixTag} ${equipped ? `<em>${t('item.equipped')}</em>` : ''}</strong>
                                    <p>${escapeHtml(tDesc(item))}</p>
                                  </div>
                                  <span>${escapeHtml(action)} · x${item.count}</span>
                                </button>
                              `
                            })
                            .join('')
                        : `<div class="empty-state">${group.empty}</div>`
                    }
                  </div>
                </section>
              `
            })
            .join('')}
        </div>
        <div class="modal-tip">
          ${items.length ? t('inventory.summary', items.length, equippedCount) : t('empty.inventory')}
        </div>
      </section>
    </div>
  `
}

function renderLogModal(): string {
  if (state.modal !== 'log') return ''

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card-log">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${t('modal.log')}</div>
            <h2>${t('modal.log')}</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>
        <div class="story-scroll wide">
          ${state.game.logs.length ? state.game.logs.map((line) => `<div class="log-line">${escapeHtml(line)}</div>`).join('') : `<div class="empty-state">${t('empty.noLogs')}</div>`}
        </div>
      </section>
    </div>
  `
}

function renderDungeonModal(): string {
  if (state.modal !== 'dungeons') return ''

  const available = getAvailableDungeons(state.game)

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card-dungeons">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${t('tag.dungeons')}</div>
            <h2>${t('modal.dungeons')}</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>
        ${available.length === 0 ? `<div class="empty-state">${t('empty.noDungeons')}</div>` : ''}
        <div class="dungeon-list">
          ${available.map((dg) => {
            const ready = isDungeonReady(state.game, dg.id)
            const cd = state.game.dungeonCooldowns[dg.id] ?? 0
            const cdLeft = cd > 0 ? Math.max(0, 10 - (state.game.day - cd)) : 0
            return `
              <button class="dungeon-card" data-dungeon="${dg.id}" ${ready ? '' : 'disabled'}>
                <div class="dungeon-info">
                  <strong>${escapeHtml(tName(dg))}</strong>
                  <span>${escapeHtml(tDesc(dg))}</span>
                </div>
                <div class="dungeon-meta">
                  <span>${t('bounty.reward')}${t('punct.colon')}${dg.rewardCoin}${t('metric.coin')} · ${dg.rewardExp}${t('metric.qi')}</span>
                  <span>${ready ? t('dungeon.ready') : t('dungeon.cooldown', cdLeft)}</span>
                </div>
              </button>
            `
          }).join('')}
        </div>
      </section>
    </div>
  `
}

function renderAlchemyModal(): string {
  if (state.modal !== 'alchemy') return ''

  const materials = getInventoryItems(state.game).filter((item) => item.type === 'material')
  const recipes = getAvailableRecipes(state.game)

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card-alchemy">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${t('tag.alchemy')}</div>
            <h2>${t('modal.alchemy')}</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>
        <div class="subpanel">
          <div class="subpanel-head">
            <span>${t('alchemy.materials')}</span>
            <strong>${materials.length}</strong>
          </div>
          <div class="pill-row">
            ${materials.length
              ? materials.map((m) => `<div class="loot-pill"><strong>${escapeHtml(tName(m))}</strong><span>x${m.count}</span></div>`).join('')
              : `<div class="empty-inline">${t('alchemy.noMaterials')}</div>`
            }
          </div>
        </div>
        ${recipes.length === 0 ? `<div class="empty-state">${t('alchemy.noRecipe')}</div>` : ''}
        <div class="recipe-list">
          ${recipes.map((r) => {
            const can = canCraftRecipe(state.game, r.id)
            const outputItem = gameItemIndex.get(r.outputItem)
            const matEntries = Object.entries(r.materials).map(([matId, qty]) => {
              const mat = gameItemIndex.get(matId)
              return `${mat ? tName(mat) : matId} x${qty}`
            }).join(t('punct.listSep'))
            return `
              <button class="recipe-card" data-recipe="${r.id}" ${can ? '' : 'disabled'}>
                <div class="recipe-info">
                  <strong>${escapeHtml(tName(r))}</strong>
                  <span>${t('alchemy.need')}${t('punct.colon')}${escapeHtml(matEntries)}</span>
                  <span>${t('alchemy.output')}${t('punct.colon')}${escapeHtml(outputItem ? tName(outputItem) : r.outputItem)} x${r.outputCount} · ${t('alchemy.success')} ${r.baseSuccessRate}%</span>
                </div>
                <div class="recipe-meta">
                  <span>${can ? t('alchemy.canCraft') : t('alchemy.noMaterial')}</span>
                </div>
              </button>
            `
          }).join('')}
        </div>
      </section>
    </div>
  `
}

function renderRegionModal(): string {
  if (state.modal !== 'regions') return ''

  const regions = getAvailableRegions(state.game)

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card-regions">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${t('tag.regions')}</div>
            <h2>${t('modal.regions')}</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>
        ${regions.length === 0 ? `<div class="empty-state">${t('empty.noRegions')}</div>` : ''}
        <div class="region-list">
          ${regions.map((r) => {
            const exploreCount = state.game.regionExploreCount[r.id] ?? 0
            const dangerStars = '★'.repeat(r.dangerLevel) + '☆'.repeat(Math.max(0, 5 - r.dangerLevel))
            return `
              <button class="region-card" data-region="${r.id}">
                <div class="region-info">
                  <strong>${escapeHtml(tName(r))}</strong>
                  <span>${escapeHtml(tDesc(r))}</span>
                </div>
                <div class="region-meta">
                  <span>${t('metric.qi')}+${r.qiBonus} · ${t('metric.coin')}+${r.coinBonus} · ${t('metric.exp')}+${r.expBonus}</span>
                  <span>${t('misc.danger')}${t('punct.colon')}${dangerStars}</span>
                  <span>${t('misc.explored')} ${exploreCount} ${t('misc.times')}</span>
                </div>
              </button>
            `
          }).join('')}
        </div>
      </section>
    </div>
  `
}

function renderBountyModal(): string {
  if (state.modal !== 'bounties') return ''

  const activeSlots = state.game.bountySlots.filter((s) => s.accepted)
  const offered = getOfferedBounties(state.game)
  const refreshIn = Math.max(0, (state.game.bountyRefreshDay + getBountyRefreshInterval()) - state.game.day)

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card-bounties">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${t('tag.bounties')}</div>
            <h2>${t('modal.bounties')}</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>

        <div class="subpanel">
          <div class="subpanel-head">
            <span>${t('bounty.accepted')}</span>
            <strong>${activeSlots.length}</strong>
          </div>
          <div class="bounty-list">
            ${activeSlots.length
              ? activeSlots.map((slot) => {
                  const def = bountyIndex.get(slot.bountyId)
                  if (!def) return ''
                  const pct = Math.min(100, Math.floor((slot.progress / def.targetCount) * 100))
                  const done = Boolean(slot.completedDay)
                  return `
                    <div class="bounty-card ${done ? 'bounty-done' : ''}">
                      <div class="bounty-info">
                        <strong>${escapeHtml(tName(def))}</strong>
                        <span>${escapeHtml(tDesc(def))}</span>
                        <div class="bar" style="margin-top:6px">
                          <div class="bar-fill bar-gold" style="width:${pct}%"></div>
                        </div>
                        <span>${slot.progress}/${def.targetCount} ${done ? `· ${t('bounty.done')}` : ''}</span>
                      </div>
                      <div class="bounty-actions">
                        ${done ? `<button class="primary small" data-bounty-claim="${slot.bountyId}">${t('btn.claim')}</button>` : ''}
                        <button class="ghost small" data-bounty-abandon="${slot.bountyId}">${t('btn.abandon')}</button>
                      </div>
                    </div>
                  `
                }).join('')
              : `<div class="empty-state">${t('bounty.empty')}</div>`
            }
          </div>
        </div>

        <div class="subpanel">
          <div class="subpanel-head">
            <span>${t('bounty.available')}</span>
            <strong>${offered.length}</strong>
            <span style="margin-left:auto;font-size:0.76rem;color:var(--muted-soft)">${refreshIn > 0 ? `${refreshIn} ${t('bounty.refresh')}` : t('bounty.refreshReady')}</span>
          </div>
          <div class="bounty-list">
            ${offered.length
              ? offered.map((b) => `
                  <button class="bounty-card" data-bounty-accept="${b.id}">
                    <div class="bounty-info">
                      <strong>${escapeHtml(tName(b))}</strong>
                      <span>${escapeHtml(tDesc(b))}</span>
                    </div>
                    <div class="bounty-meta">
                      <span>${t('bounty.reward')}${t('punct.colon')}${b.rewardCoin}${t('metric.coin')} · ${b.rewardExp}${t('metric.qi')}${b.rewardItem ? ` · ${gameItemIndex.get(b.rewardItem) ? tName(gameItemIndex.get(b.rewardItem)!) : b.rewardItem}` : ''}</span>
                    </div>
                  </button>
                `).join('')
              : `<div class="empty-state">${t('bounty.noAvailable')}</div>`
            }
          </div>
        </div>
      </section>
    </div>
  `
}

function renderTechniqueModal(): string {
  if (state.modal !== 'techniques') return ''

  const CATEGORY_LABELS: Record<string, string> = {
    cultivation: t('tech.cultivation'),
    combat: t('tech.combat'),
    alchemy: t('tech.alchemy'),
    movement: t('tech.movement'),
  }

  const learned = getLearnedTechDefs(state.game)
  const available = getAvailableTechniques(state.game)

  function formatEffects(effects: Record<string, number | undefined>): string {
    const parts: string[] = []
    if (effects.qiPerDay) parts.push(t('tech.qiPerDay', effects.qiPerDay))
    if (effects.atk) parts.push(t('tech.atk', effects.atk))
    if (effects.def) parts.push(t('tech.def', effects.def))
    if (effects.alchemyBonus) parts.push(t('tech.alchemyBonus', effects.alchemyBonus))
    if (effects.dodgeChance) parts.push(t('tech.dodgeChance', effects.dodgeChance))
    return parts.join(t('punct.listSep')) || t('tech.noEffect')
  }

  const categories = ['cultivation', 'combat', 'alchemy', 'movement'] as const

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card-techniques">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${t('tag.techniques')}</div>
            <h2>${t('modal.techniques')}</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>

        ${categories.map((cat) => {
          const catLearned = learned.filter((t) => t.category === cat)
          const catAvailable = available.filter((t) => t.category === cat)
          if (catLearned.length === 0 && catAvailable.length === 0) return ''

          return `
            <div class="technique-category-title" data-category="${cat}">${escapeHtml(CATEGORY_LABELS[cat])}</div>
            ${catLearned.length > 0 ? `
              <div class="technique-section-title">${t('tech.learned')}</div>
              ${catLearned.map((td) => {
                const isActive = state.game.activeTechnique === td.id
                const upgradeCost = td.learnCost.coin * td.level
                return `
                  <div class="technique-card ${isActive ? 'technique-active' : ''}">
                    <div class="technique-info">
                      <strong>${escapeHtml(tName(td))}</strong>
                      <span class="technique-level">${'★'.repeat(td.level)}${'☆'.repeat(td.maxLevel - td.level)}</span>
                      <span class="technique-desc">${escapeHtml(tDesc(td))}</span>
                      <span class="technique-effects">${escapeHtml(formatEffects(td.effects))}</span>
                    </div>
                    <div class="technique-actions">
                      ${td.level < td.maxLevel ? `<button class="primary small" data-upgrade-tech="${td.id}">${t('btn.upgrade')} (${upgradeCost}${t('misc.cost')})</button>` : `<span class="technique-maxed">${t('tech.maxed')}</span>`}
                      ${isActive ? `<span class="technique-badge">${t('tech.active')}</span>` : `<button class="ghost small" data-set-active-tech="${td.id}">${t('tech.setActive')}</button>`}
                    </div>
                  </div>
                `
              }).join('')}
            ` : ''}
            ${catAvailable.length > 0 ? `
              <div class="technique-section-title">${t('tech.available')}</div>
              ${catAvailable.map((def) => `
                <div class="technique-card">
                  <div class="technique-info">
                    <strong>${escapeHtml(tName(def))}</strong>
                    <span class="technique-level">${'☆'.repeat(def.maxLevel)}</span>
                    <span class="technique-desc">${escapeHtml(tDesc(def))}</span>
                    <span class="technique-effects">${escapeHtml(formatEffects(def.effects))}</span>
                  </div>
                  <div class="technique-actions">
                    <button class="primary small" data-learn-tech="${def.id}">${t('btn.learn')} (${def.learnCost.coin}${t('misc.cost')} ${def.learnCost.exp}${t('misc.expCost')})</button>
                  </div>
                </div>
              `).join('')}
            ` : ''}
          `
        }).join('')}
      </section>
    </div>
  `
}

function runAchievementCheck(): void {
  const meta = loadMeta()
  const newlyUnlocked = checkAchievements(state.game, meta)
  if (newlyUnlocked.length > 0) {
    saveMeta(meta)
    const localizedNames = newlyUnlocked.map((id) => {
      const achievement = ACHIEVEMENTS.find((a) => a.id === id)
      return achievement ? tName(achievement) : id
    }).join(t('punct.listSep'))
    setNotice(t('notice.achievement', localizedNames), 'success')
  }
}

function renderAchievementsModal(): string {
  if (state.modal !== 'achievements') return ''

  const meta = loadMeta()
  const totalCount = ACHIEVEMENTS.length
  const unlockedCount = getUnlockedCount(meta)

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card-achievements">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${t('btn.achievements')}</div>
            <h2>${t('modal.achievements')} (${unlockedCount}/${totalCount})</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>
        <div class="achievement-grid">
          ${ACHIEVEMENTS.map((ach) => {
            const unlocked = meta.achievements?.[ach.id] ?? false
            return `
              <div class="achievement-card ${unlocked ? 'achievement-unlocked' : 'achievement-locked'}">
                <span class="achievement-icon">${ach.icon}</span>
                <div class="achievement-info">
                  <strong>${escapeHtml(tName(ach))}</strong>
                  <span>${escapeHtml(tDesc(ach))}</span>
                </div>
              </div>
            `
          }).join('')}
        </div>
      </section>
    </div>
  `
}

function renderReincarnationModal(): string {
  if (state.modal !== 'reincarnation') return ''

  const meta = loadMeta()
  const isGameOver = state.game.gameOver
  const fruit = isGameOver ? calcDaoFruit(state.game) : 0
  const realmName = getRealmName(state.game.realm)

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card-reincarnation">
        <div class="modal-head">
          <div>
            <div class="panel-tag">${t('modal.reincarnation')}</div>
            <h2>${t('modal.reincarnation')}</h2>
          </div>
          <button class="ghost small" data-action="close-modal">${t('btn.close')}</button>
        </div>

        <div class="reincarnation-summary">
          <div class="run-summary-stats">
            <div class="run-stat"><span>${t('stat.reincarnations')}</span><strong>${meta.reincarnationCount}</strong></div>
            <div class="run-stat"><span>${t('stat.daoFruit')}</span><strong class="dao-fruit-count">${meta.availableDaoFruit}</strong></div>
            <div class="run-stat"><span>${t('stat.bestRealm')}</span><strong>${escapeHtml(getRealmName(meta.bestRealm))}</strong></div>
            <div class="run-stat"><span>${t('stat.bestDays')}</span><strong>${t('metric.daysValue', meta.bestDays)}</strong></div>
          </div>
          ${isGameOver ? `<div class="hint" style="margin-top:10px">${t('reincarnation.thisRun', escapeHtml(realmName), state.game.day, fruit)}</div>` : ''}
        </div>

        <div class="perk-grid">
          ${PERKS.map((perk) => {
            const level = getPerkLevel(meta, perk.id)
            const maxed = level >= perk.maxLevel
            const canAfford = meta.availableDaoFruit >= perk.cost
            return `
              <button class="perk-card ${maxed ? 'perk-maxed' : ''}" data-perk="${perk.id}" ${maxed || !canAfford ? 'disabled' : ''}>
                <div class="perk-info">
                  <strong>${escapeHtml(tName(perk))}</strong>
                  <span>${escapeHtml(tDesc(perk))}</span>
                </div>
                <div class="perk-meta">
                  <span>Lv.${level}/${perk.maxLevel}</span>
                  <span>${maxed ? t('reincarnation.maxed') : t('reincarnation.cost', perk.cost)}</span>
                </div>
              </button>
            `
          }).join('')}
        </div>

        ${isGameOver ? `
          <div class="reincarnation-actions">
            <button class="primary" data-action="do-reincarnate">${t('btn.reincarnate')}</button>
          </div>
        ` : ''}
      </section>
    </div>
  `
}

function closeModal(): void {
  state.modal = 'none'
  state.activeEvent = state.game.pendingEventId ? getEventById(state.game.pendingEventId) : undefined
  state.previewOnly = false
  renderApp()
}

function bindEvents(): void {
  if (!eventsBound) {
    appRoot.addEventListener('click', handleRootClick)
    eventsBound = true
  }

  if (!keyBound) {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.modal !== 'none') {
        closeModal()
      }
    })
    keyBound = true
  }
}

function handleRootClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) return

  if (target.classList.contains('modal-backdrop')) {
    closeModal()
    return
  }

  const actionButton = target.closest<HTMLElement>('[data-action]')
  if (actionButton) {
    if (!actionButton.matches(':disabled')) triggerFx(actionButton.dataset.fx as UIState['fx'])
    handleAction(actionButton.dataset.action ?? '')
    return
  }

  const choiceButton = target.closest<HTMLElement>('[data-choice]')
  if (choiceButton) {
    if (!choiceButton.matches(':disabled')) triggerFx('event')
    handleChoice(choiceButton.dataset.choice ?? '')
    return
  }

  const battleButton = target.closest<HTMLElement>('[data-battle]')
  if (battleButton) {
    handleBattleAction(battleButton)
    return
  }

  const itemButton = target.closest<HTMLElement>('[data-item]')
  if (itemButton) {
    handleInventoryItem(itemButton.dataset.item ?? '')
    return
  }

  const dungeonButton = target.closest<HTMLElement>('[data-dungeon]')
  if (dungeonButton) {
    const dgId = dungeonButton.dataset.dungeon ?? ''
    const result = enterDungeon(state.game, dgId)
    setNotice(result, state.game.battle ? 'warn' : 'info')
    if (state.game.battle) {
      state.modal = 'battle'
    } else {
      state.modal = 'none'
    }
    renderApp()
    return
  }

  const recipeButton = target.closest<HTMLElement>('[data-recipe]')
  if (recipeButton) {
    const recipeId = recipeButton.dataset.recipe ?? ''
    const result = craftRecipe(state.game, recipeId)
    setNotice(result, result === t('alchemy.failed') ? 'warn' : 'success')
    runAchievementCheck()
    renderApp()
    return
  }

  const regionButton = target.closest<HTMLElement>('[data-region]')
  if (regionButton) {
    const regionId = regionButton.dataset.region ?? ''
    const event = explore(state.game, regionId)
    triggerFx('explore')
    state.activeEvent = state.game.gameOver ? undefined : event
    state.previewOnly = false
    state.modal = state.game.gameOver ? 'none' : 'event'
    setNotice(state.game.gameOver ? t('notice.exploreEnded') : t('notice.encounter', tName(event)), state.game.gameOver ? 'warn' : 'info')
    runAchievementCheck()
    renderApp()
    return
  }

  const bountyAcceptButton = target.closest<HTMLElement>('[data-bounty-accept]')
  if (bountyAcceptButton) {
    const bountyId = bountyAcceptButton.dataset.bountyAccept ?? ''
    const result = acceptBounty(state.game, bountyId)
    setNotice(result, 'info')
    renderApp()
    return
  }

  const bountyClaimButton = target.closest<HTMLElement>('[data-bounty-claim]')
  if (bountyClaimButton) {
    const bountyId = bountyClaimButton.dataset.bountyClaim ?? ''
    checkBountyProgress(state.game)
    const result = claimBountyReward(state.game, bountyId)
    setNotice(result, 'success')
    runAchievementCheck()
    renderApp()
    return
  }

  const bountyAbandonButton = target.closest<HTMLElement>('[data-bounty-abandon]')
  if (bountyAbandonButton) {
    const bountyId = bountyAbandonButton.dataset.bountyAbandon ?? ''
    const result = abandonBounty(state.game, bountyId)
    setNotice(result, 'warn')
    renderApp()
    return
  }

  const learnTechBtn = target.closest<HTMLElement>('[data-learn-tech]')
  if (learnTechBtn) {
    const result = learnTechnique(state.game, learnTechBtn.dataset.learnTech!)
    setNotice(result, state.game.techniques.some((tech) => tech.techId === learnTechBtn.dataset.learnTech) ? 'success' : 'warn')
    runAchievementCheck()
    renderApp()
    return
  }

  const upgradeTechBtn = target.closest<HTMLElement>('[data-upgrade-tech]')
  if (upgradeTechBtn) {
    const beforeLevel = state.game.techniques.find((tech) => tech.techId === upgradeTechBtn.dataset.upgradeTech)?.level ?? 0
    const result = upgradeTechnique(state.game, upgradeTechBtn.dataset.upgradeTech!)
    const afterLevel = state.game.techniques.find((tech) => tech.techId === upgradeTechBtn.dataset.upgradeTech)?.level ?? 0
    setNotice(result, afterLevel > beforeLevel ? 'success' : 'warn')
    renderApp()
    return
  }

  const setActiveTechBtn = target.closest<HTMLElement>('[data-set-active-tech]')
  if (setActiveTechBtn) {
    const result = setActiveTechnique(state.game, setActiveTechBtn.dataset.setActiveTech!)
    setNotice(result, 'info')
    renderApp()
    return
  }

  const perkButton = target.closest<HTMLElement>('[data-perk]')
  if (perkButton) {
    const perkId = perkButton.dataset.perk ?? ''
    const meta = loadMeta()
    if (buyPerk(meta, perkId)) {
      setNotice(t('notice.perkUp'), 'success')
    } else {
      setNotice(t('notice.perkFail'), 'warn')
    }
    renderApp()
  }
}

function handleChoice(rawIndex: string): void {
  if (!state.activeEvent || state.previewOnly) return

  const index = Number(rawIndex)
  const result = handleEventChoice(state.game, state.activeEvent, index)
  setNotice(result, state.game.gameOver ? 'warn' : state.game.battle ? 'warn' : 'success')

  if (state.game.battle) {
    state.modal = 'battle'
  } else {
    state.modal = 'none'
    state.activeEvent = undefined
  }

  renderApp()
}

function handleBattleAction(button: HTMLElement): void {
  const mode = button.dataset.battle
  if (!mode) return

  let result = ''

  if (mode === 'attack') {
    result = runBattleAction(state.game, 'attack')
    triggerFx(state.game.battle ? 'battle-hit' : 'victory')
  } else if (mode === 'guard') {
    result = runBattleAction(state.game, 'guard')
    triggerFx('battle-guard')
  } else if (mode === 'skill') {
    result = runBattleAction(state.game, 'skill', button.dataset.skillId)
    triggerFx(state.game.battle ? 'battle-hit' : 'victory')
  } else if (mode === 'item') {
    result = runBattleAction(state.game, 'use-item', undefined, button.dataset.battleItem)
    triggerFx('item')
  }

  if (!result) return

  setNotice(result, state.game.gameOver ? 'warn' : state.game.battle ? 'info' : 'success')
  runAchievementCheck()

  if (!state.game.battle) {
    state.modal = 'none'
    state.activeEvent = state.game.pendingEventId ? getEventById(state.game.pendingEventId) : undefined
  }

  renderApp()
}

function handleInventoryItem(itemId: string): void {
  if (!itemId) return

  const item = getInventoryItems(state.game).find((entry) => entry.id === itemId)
  if (!item) return

  const result = item.type === 'artifact' ? toggleArtifact(state.game, itemId) : useInventoryItem(state.game, itemId)
  setNotice(result, item.type === 'artifact' ? 'info' : 'success')
  renderApp()
}

function handleAction(action: string): void {
  switch (action) {
    case 'save':
    case 'autosave':
      persist(state.game)
      appendManualLog(t('notice.savedLog'))
      setNotice(t('notice.saved'), 'success')
      renderApp()
      return
    case 'load':
      state.game = hydrateGame(loadGame())
      state.activeEvent = state.game.pendingEventId ? getEventById(state.game.pendingEventId) : undefined
      state.modal = 'none'
      state.previewOnly = false
      setNotice(t('notice.loaded'), 'success')
      renderApp()
      return
    case 'new':
      if (!state.game.gameOver && !window.confirm(t('notice.restartConfirm'))) return
      state.game = startNewSession()
      state.activeEvent = undefined
      state.modal = 'none'
      state.previewOnly = false
      setNotice(t('notice.newRun'), 'info')
      renderApp()
      return
    case 'open-event': {
      if (state.game.pendingEventId || state.activeEvent) {
        state.activeEvent = state.activeEvent ?? getEventById(state.game.pendingEventId ?? '')
        state.previewOnly = false
        state.modal = state.activeEvent ? 'event' : 'none'
        renderApp()
      }
      return
    }
    case 'explore': {
      if (state.game.pendingEventId) {
        state.activeEvent = getEventById(state.game.pendingEventId)
        state.previewOnly = false
        state.modal = state.activeEvent ? 'event' : 'none'
        setNotice(t('notice.handleEventFirst'), 'info')
        renderApp()
        return
      }

      const event = explore(state.game)
      triggerFx('explore')
      state.activeEvent = state.game.gameOver ? undefined : event
      state.previewOnly = false
      state.modal = state.game.gameOver ? 'none' : 'event'
      setNotice(state.game.gameOver ? t('notice.exploreEnded') : t('notice.encounter', tName(event)), state.game.gameOver ? 'warn' : 'info')
      runAchievementCheck()
      renderApp()
      return
    }
    case 'break': {
      const result = attemptBreakthrough(state.game)
      const breakthroughSuccess = !hasFailureNotice(result) && (!state.game.gameOver || state.game.ending === 'ascended')
      triggerFx(breakthroughSuccess ? 'breakthrough' : undefined)
      setNotice(result, breakthroughSuccess ? 'success' : 'warn')
      runAchievementCheck()
      if (state.game.ending === 'ascended') triggerCrazyGamesHappyTime()
      renderApp()
      if (breakthroughSuccess) {
        const overlay = document.createElement('div')
        overlay.className = 'breakthrough-overlay'
        overlay.innerHTML = `<div class="breakthrough-text">${t('notice.breakSuccess')}</div>`
        document.body.appendChild(overlay)
        setTimeout(() => overlay.remove(), 1500)
      }
      return
    }
    case 'inventory':
      state.modal = 'inventory'
      renderApp()
      return
    case 'battle':
      if (state.game.battle) {
        state.modal = 'battle'
        renderApp()
      }
      return
    case 'peek':
      state.activeEvent = rollEvent(state.game)
      state.previewOnly = true
      state.modal = 'event'
      setNotice(t('notice.previewEvent', tName(state.activeEvent)), 'info')
      renderApp()
      return
    case 'log':
      state.modal = 'log'
      renderApp()
      return
    case 'dungeons':
      state.modal = 'dungeons'
      renderApp()
      return
    case 'alchemy':
      state.modal = 'alchemy'
      renderApp()
      return
    case 'bounties':
      checkBountyProgress(state.game)
      getOfferedBounties(state.game)
      persist(state.game)
      state.modal = 'bounties'
      renderApp()
      return
    case 'techniques':
      state.modal = 'techniques'
      renderApp()
      return
    case 'explore-menu': {
      if (state.game.pendingEventId) {
        state.activeEvent = getEventById(state.game.pendingEventId)
        state.previewOnly = false
        state.modal = state.activeEvent ? 'event' : 'none'
        setNotice(t('notice.handleEventFirst'), 'info')
        renderApp()
        return
      }
      state.modal = 'regions'
      renderApp()
      return
    }
    case 'achievements':
      runAchievementCheck()
      state.modal = 'achievements'
      renderApp()
      return
    case 'reincarnation':
      state.modal = 'reincarnation'
      renderApp()
      return
    case 'do-reincarnate': {
      const bonus = calcReincarnationBonus(loadMeta())
      state.game = createNewGame(bonus)
      persist(state.game)
      state.activeEvent = undefined
      state.modal = 'none'
      state.previewOnly = false
      setNotice(t('notice.reincarnated'), 'info')
      renderApp()
      return
    }
    case 'toggle-lang':
      setLocale(getLocale() === 'zh' ? 'en' : 'zh')
      renderApp()
      return
    case 'close-modal':
      closeModal()
      return
    default:
      return
  }
}

// Create particle container
const particleDiv = document.createElement('div')
particleDiv.id = 'particles'
for (let i = 0; i < 8; i++) {
  particleDiv.appendChild(document.createElement('span'))
}
document.body.prepend(particleDiv)

renderApp()
finishCrazyGamesLoading()
if (idleNotice) {
  setNotice(idleNotice, 'success')
  renderApp()
}

// === Real-time cultivation tick ===
window.setInterval(() => {
  if (state.game.gameOver || state.game.battle || state.game.pendingEventId) return
  if (state.modal !== 'none') return

  const gain = 1 + Math.floor(state.game.spirit / 10)
  const maxQi = getMaxQi(state.game)
  if (state.game.qi >= maxQi) return

  state.game.qi = Math.min(state.game.qi + gain, maxQi)

  // Lightweight DOM update instead of full re-render
  const el = document.querySelector('[data-metric="qi"]')
  if (el) {
    const text = el.querySelector('[data-metric-text]')
    const bar = el.querySelector('[data-metric-bar]') as HTMLElement
    if (text) text.textContent = `${state.game.qi}/${maxQi}`
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, (state.game.qi / maxQi) * 100))}%`
  }

  window.clearTimeout(tickPersistTimer)
  tickPersistTimer = window.setTimeout(() => {
    persist(state.game)
  }, 1200)
}, 1000)
