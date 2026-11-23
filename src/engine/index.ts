import { CARD_REGISTRY, DRAW_SUPPLY, INITIAL_HAND } from './cards'
import { resolvePair } from './combat'
import type { Intent } from './combat'
import { automaticMove, LANES, laneOf, manualDestination, OWNERS, progress, route } from './geometry'
import type { Lane, Owner } from './geometry'
import { discard, record } from './state'
import type { Game, Order, Player, Result, Unit } from './state'

export * from './geometry'
export { CARD_REGISTRY } from './cards'
export type { Card, Definition } from './cards'
export type { Event, Game, Order, Result, Unit } from './state'

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[items[index], items[other]] = [items[other], items[index]]
  }
  return items
}

export function createGame(seed: number): Game {
  if (!Number.isSafeInteger(seed)) throw new RangeError('Seed must be a safe integer')
  let randomState = seed >>> 0
  function random(): number {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0
    return randomState / 2 ** 32
  }
  const cards: Game['cards'] = {}
  function createPlayer(owner: Owner): Player {
    const ids = [...INITIAL_HAND, ...DRAW_SUPPLY].map((name, index) => {
      const id = `${owner}-${String(index + 1).padStart(2, '0')}`
      cards[id] = { id, owner, name, definition: { ...CARD_REGISTRY[name] } }
      return id
    })
    return {
      hand: ids.slice(0, INITIAL_HAND.length),
      drawPile: shuffle(ids.slice(INITIAL_HAND.length), random),
      discard: [], orders: null, cursor: 0, ended: false, lanes: [], resources: 0, breaches: 0,
    }
  }

  const game: Game = {
    seed, turn: 0, phase: 'ORDER', beat: 0, wave: 0, result: null, log: [], board: {}, cards,
    players: { WEST: createPlayer('WEST'), EAST: createPlayer('EAST') },
  }
  startTurn(game)
  return game
}

function startTurn(game: Game): void {
  game.turn++
  game.phase = 'ORDER'
  game.beat = 0
  game.wave = 0

  for (const owner of OWNERS) {
    const player = game.players[owner]
    player.discard = player.discard.filter(({ cardId, remaining }) => {
      if (remaining !== 0) return true
      player.hand.push(cardId)
      record(game, { type: 'RECOVER', owner, cardId, privateTo: owner })
      return false
    })
    for (const entry of player.discard) {
      if (entry.remaining > 0) entry.remaining--
    }
    for (const cardId of player.drawPile.splice(0, game.turn === 1 ? 1 : 2)) {
      player.hand.push(cardId)
      record(game, { type: 'DRAW', owner, cardId, privateTo: owner })
    }

    player.resources = game.turn
    player.lanes = []
    player.orders = null
    player.cursor = 0
    player.ended = false
  }
  for (const unit of Object.values(game.board)) unit.autoMoved = false
}

export function commitOrders(game: Game, owner: Owner, orders: readonly Order[]): Game {
  const player = game.players[owner]
  if (game.phase !== 'ORDER' || player.orders) throw new Error('Player cannot commit now')
  if (orders.length !== player.hand.length || new Set(orders.map(order => order.cardId)).size !== orders.length ||
      orders.some(order => !player.hand.includes(order.cardId))) {
    throw new Error('Orders must contain each card in hand exactly once')
  }
  const next = structuredClone(game)
  next.players[owner].orders = orders.map(({ cardId, lane }) => ({ cardId, lane }))
  record(next, { type: 'COMMIT', owner })
  return next
}

function frontmost(game: Game, owner: Owner, lane: Lane): Unit[] {
  return Object.values(game.board).filter(unit => {
    const card = game.cards[unit.cardId]
    return card.owner === owner && card.definition.kind === 'MA' && laneOf(unit.cell) === lane
  }).sort((a, b) => progress(owner, b.cell) - progress(owner, a.cell) ||
    (a.cardId < b.cardId ? -1 : a.cardId === b.cardId ? 0 : 1))
}

function playIntent(game: Game, owner: Owner, { cardId, lane }: Order): Intent | undefined {
  const { definition } = game.cards[cardId]
  if (!lane || !LANES.includes(lane) || definition.kind === 'SIGNAL' ||
      definition.cost > game.players[owner].resources) return

  if (definition.kind === 'MA') {
    const [entry, destination] = route(owner, lane)
    return { cardId, destination, route: [entry, destination] }
  }
  if (definition.kind !== 'ACTION') return
  const target = frontmost(game, owner, lane)[0]
  if (!target) return
  const { definition: asset } = game.cards[target.cardId]
  if (asset.kind !== 'MA') return
  const destination = manualDestination(owner, asset.type, target.cell, definition.direction)
  if (!destination) return
  return { cardId: target.cardId, origin: target.cell, destination, route: [destination] }
}

function revealBeat(game: Game): void {
  game.beat++
  const reveals = OWNERS.flatMap(owner => {
    const player = game.players[owner]
    if (player.ended) return []
    const order = player.orders![player.cursor++]
    const { cardId, lane } = order
    record(game, { type: 'REVEAL', owner, cardId, lane, beat: game.beat })
    return [{ owner, order }]
  })
  const intents: Intent[] = []
  const actions: string[] = []
  for (const { owner, order } of reveals) {
    const { cardId } = order
    const player = game.players[owner]
    const { definition } = game.cards[cardId]
    if (definition.kind === 'SIGNAL') {
      const { signal } = definition
      if (signal === 'END') player.ended = true
      else player.lanes.push(signal)
      record(game, { type: 'SIGNAL', owner, signal })
      continue
    }

    // The board is unchanged until both players have submitted their intents.
    const intent = playIntent(game, owner, order)
    if (!intent) {
      record(game, { type: 'PLAY_FAIL', owner, cardId })
      continue
    }
    player.resources -= definition.cost
    player.hand = player.hand.filter(id => id !== cardId)
    intents.push(intent)
    if (definition.kind === 'ACTION') actions.push(cardId)
    record(game, { type: 'PLAY_OK', owner, cardId, cost: definition.cost })
  }

  resolvePair(game, intents)
  for (const cardId of actions) discard(game, cardId)
  if (OWNERS.every(owner => game.players[owner].ended)) game.phase = 'RESOLUTION'
}

function resolveWave(game: Game): void {
  const lanes: Partial<Record<Owner, Lane>> = {}
  const lists = OWNERS.map(owner => {
    const lane = game.players[owner].lanes[game.wave]
    if (!lane) return []
    lanes[owner] = lane
    return frontmost(game, owner, lane).filter(unit => !unit.autoMoved).map(unit => unit.cardId)
  })
  game.wave++
  record(game, { type: 'WAVE', wave: game.wave, lanes })
  for (let rank = 0; rank < Math.max(...lists.map(list => list.length)); rank++) {
    const intents: Intent[] = []
    for (const list of lists) {
      const unit = Object.values(game.board).find(unit => unit.cardId === list[rank])
      if (!unit) continue
      const { cardId, cell: origin } = unit
      const { owner, definition } = game.cards[cardId]
      if (definition.kind !== 'MA') continue
      const move = automaticMove(owner, definition.type, origin)
      unit.autoMoved = true
      intents.push(move.breach
        ? { cardId, origin, route: [] }
        : { cardId, origin, destination: move.destination, route: move.route })
    }
    resolvePair(game, intents)
  }
}

function matchResult(game: Game): Result | null {
  const { WEST, EAST } = game.players
  const difference = WEST.breaches - EAST.breaches
  if (difference && (game.turn === 12 || Math.max(WEST.breaches, EAST.breaches) >= 2)) {
    return difference > 0 ? 'WEST' : 'EAST'
  }
  if (game.turn < 12) return null
  const power = { WEST: 0, EAST: 0 }
  for (const { cardId } of Object.values(game.board)) {
    const { owner, definition } = game.cards[cardId]
    if (definition.kind === 'MA') power[owner] += definition.power
  }
  return power.WEST === power.EAST ? 'DRAW' : power.WEST > power.EAST ? 'WEST' : 'EAST'
}

function cleanup(game: Game): void {
  for (const owner of OWNERS) {
    const player = game.players[owner]
    player.resources = 0
    player.orders = null
  }
  record(game, { type: 'CLEANUP' })
  game.result = matchResult(game)
  if (game.result) {
    game.phase = 'FINISHED'
    record(game, { type: 'WIN', result: game.result })
  } else startTurn(game)
}

/** Advance by one reveal beat, one complete lane wave, or cleanup. */
export function advance(game: Game): Game {
  if (game.phase === 'FINISHED') throw new Error('Match has finished')
  if (game.phase === 'ORDER' && OWNERS.some(owner => !game.players[owner].orders)) {
    throw new Error('Both players must commit before revealing')
  }
  const next = structuredClone(game)
  if (next.phase === 'ORDER') revealBeat(next)
  else if (OWNERS.some(owner => next.wave < next.players[owner].lanes.length)) resolveWave(next)
  else cleanup(next)
  return next
}

/** Pass only this projection to a player-facing view. Omit viewer for shared screens. */
export function gameView(game: Game, viewer?: Owner) {
  function playerView(owner: Owner) {
    const { hand, drawPile, discard, orders, resources, breaches, lanes, ended } = game.players[owner]
    return {
      handCount: hand.length, drawCount: drawPile.length, committed: orders !== null,
      discard: discard.map(entry => ({ ...entry, card: game.cards[entry.cardId] })),
      resources, breaches, lanes, ended,
      ...(owner === viewer ? { hand: hand.map(id => game.cards[id]), orders } : {}),
    }
  }

  return structuredClone({
    turn: game.turn, phase: game.phase, beat: game.beat, wave: game.wave, result: game.result,
    players: { WEST: playerView('WEST'), EAST: playerView('EAST') },
    board: Object.values(game.board).map(unit => ({ ...unit, card: game.cards[unit.cardId] })),
    log: game.log.filter(event => !('privateTo' in event) || event.privateTo === viewer)
      .map(event => event.type === 'REVEAL' ? { ...event, card: game.cards[event.cardId] } : event),
  })
}
