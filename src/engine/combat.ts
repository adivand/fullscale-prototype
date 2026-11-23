import { cellKey, pathStep } from './geometry'
import type { Cell } from './geometry'
import { discard, record } from './state'
import type { Game, Unit } from './state'

type Arrival = { cardId: string; origin?: Cell; destination: Cell; route: readonly Cell[] }
type Breach = { cardId: string; origin: Cell; destination?: never; route: readonly Cell[] }
export type Intent = Arrival | Breach

type Push = { cardId: string; from: Cell; to: Cell }

function power(game: Game, cardId: string): number {
  const definition = game.cards[cardId].definition
  if (definition.kind !== 'MA') throw new Error('Only military Assets can submit intents')
  return definition.power
}

function same(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y
}

function clash(a: Arrival, b: Arrival): boolean {
  return same(a.destination, b.destination) || Boolean(
    a.origin && b.origin && same(a.origin, b.destination) && same(b.origin, a.destination),
  )
}

function planPush(
  game: Game, board: Game['board'], cell: Cell, mover: Arrival, reserved: Set<string>,
): Push[] | undefined {
  const occupant = board[cellKey(cell)]
  if (!occupant) return []
  const card = game.cards[occupant.cardId]
  if (card.owner !== game.cards[mover.cardId].owner || card.definition.kind !== 'MA') return
  const next = pathStep(card.owner, cell, 1)
  if (!next || reserved.has(cellKey(next))) return
  const chain = planPush(game, board, next, mover, reserved)
  return chain && [...chain, { cardId: card.id, from: cell, to: next }]
}

function placeArrivals(game: Game, board: Game['board'], arrivals: Arrival[]) {
  // With at most two entrants, try both together, then each alone in card ID order.
  // This lets a mover use a vacated origin without treating a blocked mover as vacated.
  const candidates = [arrivals, ...arrivals.map(arrival => [arrival]), []]
  for (const accepted of candidates) {
    const next = { ...board }
    const reserved = new Set(accepted.map(arrival => cellKey(arrival.destination)))
    const pushes: Push[] = []
    for (const { origin } of accepted) {
      if (origin) delete next[cellKey(origin)]
    }

    for (const mover of accepted) {
      const chain = planPush(game, next, mover.destination, mover, reserved)
      if (!chain) break
      for (const push of chain) {
        const unit = next[cellKey(push.from)]
        delete next[cellKey(push.from)]
        next[cellKey(push.to)] = { ...unit, cell: push.to }
        pushes.push(push)
      }
      const unit: Unit = mover.origin
        ? board[cellKey(mover.origin)]
        : { cardId: mover.cardId, cell: mover.destination, autoMoved: false }
      next[cellKey(mover.destination)] = { ...unit, cell: mover.destination }
      reserved.delete(cellKey(mover.destination))
    }

    if (reserved.size === 0) return { board: next, accepted, pushes }
  }
  throw new Error('Empty arrival set must be placeable')
}

/** Resolve one reveal beat or rank pair on the game's working copy. */
export function resolvePair(game: Game, intents: readonly Intent[]): void {
  const sorted = [...intents].sort((a, b) => a.cardId < b.cardId ? -1 : a.cardId === b.cardId ? 0 : 1)
  const arrivals = sorted.filter((intent): intent is Arrival => intent.destination !== undefined)
  const active = new Set(sorted.map(intent => intent.cardId))
  const destroyed = new Set<string>()
  const removed = new Set<string>()
  const board = { ...game.board }

  for (const intent of sorted) record(game, { type: 'INTENT', ...intent })

  const [first, second] = arrivals
  if (first && second && clash(first, second)) {
    const difference = power(game, first.cardId) - power(game, second.cardId)
    if (difference <= 0) destroyed.add(first.cardId)
    if (difference >= 0) destroyed.add(second.cardId)
    record(game, { type: 'CLASH', cardIds: [first.cardId, second.cardId], destroyed: [...destroyed] })
  }

  function remove(cardId: string, origin?: Cell): void {
    if (origin) delete board[cellKey(origin)]
    removed.add(cardId)
  }

  for (const intent of sorted) {
    const { cardId, origin } = intent
    if (destroyed.has(cardId)) remove(cardId, origin)
    if (!intent.destination) {
      const { owner } = game.cards[cardId]
      game.players[owner].breaches++
      record(game, { type: 'BREACH', cardId, owner })
      remove(cardId, origin)
    }
  }

  for (const mover of arrivals) {
    if (destroyed.has(mover.cardId)) continue
    const occupant = board[cellKey(mover.destination)]
    if (!occupant || active.has(occupant.cardId)) continue
    const defender = game.cards[occupant.cardId]
    if (defender.definition.kind === 'STATIONARY') {
      destroyed.add(defender.id)
      remove(defender.id, occupant.cell)
    } else if (defender.owner !== game.cards[mover.cardId].owner) {
      const attackerWins = power(game, mover.cardId) >= power(game, defender.id)
      const loser = attackerWins ? defender.id : mover.cardId
      record(game, { type: 'SURPRISE', attacker: mover.cardId, defender: defender.id, destroyed: loser })
      destroyed.add(loser)
      remove(loser, attackerWins ? occupant.cell : mover.origin)
    }
  }

  const survivors = arrivals.filter(mover => !destroyed.has(mover.cardId))
  const placed = placeArrivals(game, board, survivors)
  game.board = placed.board
  for (const push of placed.pushes) record(game, { type: 'PUSH', ...push })
  for (const mover of survivors) {
    if (placed.accepted.includes(mover)) {
      record(game, { type: 'MOVE', cardId: mover.cardId, destination: mover.destination })
    } else {
      record(game, { type: 'BLOCKED', cardId: mover.cardId })
      // A deployment has no persistent origin to fall back to.
      if (!mover.origin) removed.add(mover.cardId)
    }
  }

  for (const cardId of removed) {
    if (destroyed.has(cardId)) record(game, { type: 'DESTROY', cardId })
    discard(game, cardId)
  }
}
