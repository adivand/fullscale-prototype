import './style.css'
import { gameView, LANES } from './engine'
import type { Lane, Order, Owner } from './engine'
import { board } from './ui/board'
import { eventLog, program, scoreboard, sharedPanel } from './ui/panels'
import { commit, createDraft, newSession, nextPlayer, reorder, restore, SAVE_KEY, serialize, step } from './ui/session'
import type { PublicEvent } from './ui/session'

const app = document.querySelector<HTMLElement>('#app')!
const dialog = document.querySelector<HTMLDialogElement>('#game-dialog')!
const dialogContent = dialog.querySelector<HTMLElement>('.dialog-content')!
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]

let notice = ''
const saved = load()
const session = saved ? restore(saved) : undefined
if (saved && !session) notice = 'The saved match was invalid. A new match has started.'
let current = session ?? newSession(randomSeed())
let viewer: Owner | undefined
let draft: Order[] = []
let selection = ''
let latest: PublicEvent[] = []

function load() {
  try {
    return localStorage.getItem(SAVE_KEY)
  } catch {
    notice = 'Local storage is unavailable. This match will last until the page closes.'
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, serialize(current))
  } catch {
    notice = 'Local storage is unavailable. This match will last until the page closes.'
  }
}

function render(focus?: 'phase' | HTMLButtonElement) {
  const expanded = app.querySelector('details')?.open ?? false
  const stackScroll = app.querySelector('.stack')?.scrollTop ?? 0
  const publicView = gameView(current.game)
  const player = nextPlayer(publicView)
  const privateHand = viewer && viewer === player ? gameView(current.game, viewer).players[viewer].hand : undefined
  const preview = draft.find(order => order.cardId === selection)?.lane
  app.innerHTML = `${scoreboard(publicView, Boolean(privateHand), Boolean(player))}
    ${notice ? `<p class="storage-notice" role="status">${notice}</p>` : ''}
    <div class="game-grid ${privateHand ? 'programming' : ''}">
      ${board(publicView, latest, preview)}
      <div class="command-column">
        ${privateHand && viewer ? program(viewer, privateHand, draft, selection) : sharedPanel(publicView, player, latest)}
        ${eventLog(publicView, expanded)}
      </div>
    </div>`

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const unit of app.querySelectorAll<HTMLElement>('.unit-position[data-path]')) {
      const shifts = unit.dataset.path!.split(' ').map(point => {
        const [x, y] = point.split(',').map(Number)
        return { transform: `translate(${x * 100}%, ${y * 100}%)` }
      })
      unit.animate(shifts, { duration: Math.min(800, 140 * shifts.length), easing: 'ease-out' })
    }
  }

  if (focus === 'phase') {
    document.querySelector<HTMLElement>('#phase-title')?.focus({ preventScroll: true })
    if (app.getBoundingClientRect().top < 0) app.scrollIntoView({ block: 'start' })
  } else if (focus) {
    const list = app.querySelector('.stack')
    if (list) list.scrollTop = stackScroll
    // Restore focus to the equivalent control after rendering, including during keyboard reordering.
    const replacement = [...app.querySelectorAll<HTMLButtonElement>('button[data-action]')].find(
      button => !button.disabled && button.dataset.action === focus.dataset.action && button.dataset.value === focus.dataset.value,
    )
    const selected = app.querySelector<HTMLButtonElement>('.order-card[aria-pressed="true"]')
    const target = replacement ?? selected
    target?.focus({ preventScroll: true })
    if (focus.dataset.action === 'up' || focus.dataset.action === 'down' || focus.dataset.action === 'queue') {
      selected?.scrollIntoView({ block: 'nearest' })
    }
  }
}

function hidePrivate() {
  viewer = undefined
  draft = []
  selection = ''
}

function confirmRestart(mode: 'new' | 'reset') {
  const isNew = mode === 'new'
  dialogContent.innerHTML = `<h2 id="dialog-title">${isNew ? 'Start a new game?' : 'Reset this game?'}</h2>
    <p class="muted">${isNew ? 'Replace the current match with a fresh shuffle.' : 'Return to turn one with the same starting shuffle.'} Current progress will be cleared.</p>
    <div class="dialog-actions"><button value="cancel" autofocus>Cancel</button>
    <button class="primary" value="${mode}">${isNew ? 'New Game' : 'Reset game'}</button></div>`
  dialog.returnValue = ''
  dialog.showModal()
}

dialog.addEventListener('close', () => {
  if (dialog.returnValue !== 'new' && dialog.returnValue !== 'reset') return
  current = newSession(dialog.returnValue === 'new' ? randomSeed() : current.game.seed)
  hidePrivate()
  latest = []
  save()
  render('phase')
})

document.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')
  if (!button || button.disabled) return
  const action = button.dataset.action
  const value = button.dataset.value

  if (action === 'rules') {
    dialogContent.innerHTML = `<h2 id="dialog-title">How to play</h2>
      <ol class="rules-list">
        <li>Program your hand top to bottom. Cards after END remain secret. Resources refresh each turn.</li>
        <li>Deploy units and use Move Actions by choosing a lane. A Move Action targets the frontmost friendly unit in that lane.</li>
        <li>Once both stacks are sealed, reveal paired beats. Then revealed Signals advance units in paired lane waves.</li>
        <li>Land follows the snake. Sea shifts North then forward. Air sweeps North and returns before landing two rows forward.</li>
        <li>An auto-move from the enemy Wall scores a breach. Lead with at least two breaches at turn end to win. Turn 12 breaks ties by surviving Power.</li>
      </ol>
      <button class="primary" value="close" autofocus>Close</button>`
    dialog.returnValue = ''
    dialog.showModal()
    return
  }
  if (action === 'new' || action === 'reset') {
    confirmRestart(action)
    return
  }
  if (action === 'unlock') {
    viewer = nextPlayer(gameView(current.game))
    if (!viewer) return
    draft = createDraft(gameView(current.game, viewer).players[viewer].hand ?? [])
    selection = draft[1]?.cardId ?? ''
    render('phase')
    return
  }
  if (action === 'advance') {
    const before = gameView(current.game).log.length
    current = step(current)
    latest = gameView(current.game).log.slice(before)
    save()
    render('phase')
    return
  }
  if (!viewer) return
  const index = draft.findIndex(order => order.cardId === selection)
  if (action === 'select' && draft.some(order => order.cardId === value)) selection = value!
  if (action === 'up') draft = reorder(draft, index, index - 1)
  if (action === 'down') draft = reorder(draft, index, index + 1)
  const hand = gameView(current.game, viewer).players[viewer].hand ?? []
  const end = hand.find(card => card.definition.kind === 'SIGNAL' && card.definition.signal === 'END')?.id
  const endIndex = draft.findIndex(order => order.cardId === end)
  if (action === 'queue' && index > endIndex) draft = reorder(draft, index, endIndex)
  if (action === 'lane' && LANES.includes(Number(value) as Lane)) {
    draft = draft.map((order, i) => i === index ? { ...order, lane: Number(value) as Lane } : order)
  }
  if (action === 'reserve') {
    const costed = new Set(hand.filter(card => card.definition.kind !== 'SIGNAL').map(card => card.id))
    draft = draft.map((order, i) => i > endIndex && !order.lane && costed.has(order.cardId) ? { ...order, lane: 1 } : order)
  }
  if (action === 'commit') {
    current = commit(current, viewer, draft)
    hidePrivate()
    latest = []
    save()
    render('phase')
    return
  }
  render(button)
})

function lockOnLeave() {
  if (!viewer) return
  hidePrivate()
  render()
}
window.addEventListener('pagehide', lockOnLeave)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') lockOnLeave()
})

if (!session) save()
// A resumed public step can be advanced immediately. Entering a private hand always requires a handoff.
if (session && !nextPlayer(gameView(current.game))) {
  const log = gameView(current.game).log
  let lastStep = log.length - 1
  while (lastStep >= 0 && log[lastStep].type !== 'WAVE' && log[lastStep].type !== 'REVEAL') lastStep--
  const event = log[lastStep]?.turn === current.game.turn ? log[lastStep] : undefined
  if (event?.type === 'WAVE') latest = log.slice(lastStep)
  if (event?.type === 'REVEAL') {
    const first = log.findIndex(item => item.type === 'REVEAL' && item.turn === event.turn && item.beat === event.beat)
    latest = log.slice(first)
  }
}
render()
