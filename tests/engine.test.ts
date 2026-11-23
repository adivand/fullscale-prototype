import { describe, expect, it } from 'vitest'
import {
  advance, automaticMove, BARRIERS, BORDERS, cellKey, commitOrders, createGame,
  gameView, HEIGHT, inBounds, LANES, manualDestination, OWNERS, progress, route, WIDTH,
} from '../src/engine'
import type { Cell, Definition, Game, Lane, Order, Owner } from '../src/engine'
import { resolvePair } from '../src/engine/combat'
import type { Intent } from '../src/engine/combat'
import { discard } from '../src/engine/state'

const land: Definition = { kind: 'MA', type: 'LAND', cost: 1, power: 2, tw: 0 }
const sea: Definition = { kind: 'MA', type: 'SEA', cost: 2, power: 2, tw: 1 }
const air: Definition = { kind: 'MA', type: 'AIR', cost: 3, power: 3, tw: 2 }
const xy = (x: number, y: number): Cell => ({ x, y })
const step = (owner: Owner, index: number, lane: Lane = 1) => route(owner, lane)[index]

function spawn(game: Game, id: string, owner: Owner, cell: Cell, definition: Definition = land) {
  game.cards[id] = { id, owner, name: id, definition }
  game.board[cellKey(cell)] = { cardId: id, cell, autoMoved: false }
}

function at(game: Game, cell: Cell) {
  return game.board[cellKey(cell)]?.cardId
}

function arrive(cardId: string, origin: Cell, destination: Cell): Intent {
  return { cardId, origin, destination, route: [destination] }
}

function handId(game: Game, owner: Owner, name: string) {
  const id = game.players[owner].hand.find(id => game.cards[id].name === name)
  if (!id) throw new Error(`No ${name} in ${owner} hand`)
  return id
}

type Choice = string | [name: string, lane: Lane]
function stack(game: Game, owner: Owner, choices: Choice[]): Order[] {
  const top = choices.map(choice => {
    const [name, lane] = typeof choice === 'string' ? [choice, undefined] : choice
    return { cardId: handId(game, owner, name), lane }
  })
  return [...top, ...game.players[owner].hand.filter(id => !top.some(order => order.cardId === id))
    .map(cardId => ({ cardId }))]
}

function commit(game: Game, west: Choice[] = ['END'], east: Choice[] = ['END']) {
  return commitOrders(commitOrders(game, 'WEST', stack(game, 'WEST', west)), 'EAST', stack(game, 'EAST', east))
}

function reveal(game: Game) {
  while (game.phase === 'ORDER') game = advance(game)
  return game
}

function finishTurn(game: Game) {
  const turn = game.turn
  while (game.turn === turn && game.phase !== 'FINISHED') game = advance(game)
  return game
}

function resolution(turn = 1) {
  const game = createGame(42)
  game.phase = 'RESOLUTION'
  game.turn = turn
  return game
}

describe('FULLSCALE P1.0 acceptance', () => {
  it('P1-TEST-01: exact reversible routes, Borders and alternating Barriers', () => {
    expect([WIDTH, HEIGHT]).toEqual([6, 8])
    expect(BORDERS).toEqual([2, 4])
    const allCells = new Set<string>()
    for (const lane of LANES) {
      const a = 2 * lane - 1
      const west = route('WEST', lane)
      expect(west).toEqual([
        xy(a, 1), xy(a + 1, 1), xy(a + 1, 2), xy(a, 2),
        xy(a, 3), xy(a + 1, 3), xy(a + 1, 4), xy(a, 4),
        xy(a, 5), xy(a + 1, 5), xy(a + 1, 6), xy(a, 6),
        xy(a, 7), xy(a + 1, 7), xy(a + 1, 8), xy(a, 8),
      ])
      expect(route('EAST', lane)).toEqual([...west].reverse())
      const barriers = BARRIERS.filter(cell => cell.x === a || cell.x === a + 1)
      expect(barriers).toEqual([xy(a, 1), xy(a + 1, 2), xy(a, 3), xy(a + 1, 4), xy(a, 5), xy(a + 1, 6), xy(a, 7)])
      west.forEach((cell, index) => {
        expect(inBounds(cell)).toBe(true)
        allCells.add(cellKey(cell))
        if (index === 0) return
        const previous = west[index - 1]
        expect(Math.abs(cell.x - previous.x) + Math.abs(cell.y - previous.y)).toBe(1)
        if (cell.y !== previous.y) expect(barriers).not.toContainEqual(xy(cell.x, Math.min(cell.y, previous.y)))
      })
    }
    expect(allCells.size).toBe(48)
  })

  it('P1-TEST-02: deploy through the entry and auto-move the same turn', () => {
    const initial = createGame(42)
    const west = handId(initial, 'WEST', 'Infantry')
    const east = handId(initial, 'EAST', 'Infantry')
    const game = reveal(commit(initial, [['Infantry', 1], 'L1', 'END'], [['Infantry', 1], 'END']))
    expect(at(game, xy(2, 1))).toBe(west)
    expect(at(game, xy(2, 8))).toBe(east)
    expect(game.log).toContainEqual(expect.objectContaining({ type: 'INTENT', cardId: west, route: [xy(1, 1), xy(2, 1)] }))
    expect(at(advance(game), xy(1, 2))).toBe(west)
  })

  it('P1-TEST-03: player-facing Sea and Air directions, snake-relative Land', () => {
    expect(manualDestination('WEST', 'SEA', xy(1, 2), 'RIGHT')).toEqual(xy(2, 2))
    expect(manualDestination('EAST', 'SEA', xy(2, 2), 'RIGHT')).toEqual(xy(1, 2))
    expect(manualDestination('WEST', 'AIR', xy(1, 2), 'RIGHT')).toEqual(xy(3, 2))
    expect(manualDestination('EAST', 'AIR', xy(3, 2), 'RIGHT')).toEqual(xy(1, 2))
    for (const owner of OWNERS) {
      expect(manualDestination(owner, 'LAND', step(owner, 1), 'RIGHT')).toEqual(step(owner, 2))
      expect(manualDestination(owner, 'LAND', step(owner, 1), 'LEFT')).toEqual(step(owner, 0))
      expect(manualDestination(owner, 'LAND', step(owner, 0), 'LEFT')).toBeUndefined()
    }
    expect(manualDestination('WEST', 'AIR', xy(5, 2), 'RIGHT')).toBeUndefined()
    expect(manualDestination('EAST', 'SEA', xy(1, 2), 'RIGHT')).toBeUndefined()
  })

  it('P1-TEST-04: auto maneuvers stay on the board and only land on the final cell', () => {
    expect(automaticMove('WEST', 'SEA', xy(2, 2))).toEqual({
      breach: false, destination: xy(1, 4), route: [xy(1, 2), xy(1, 3), xy(1, 4)],
    })
    const move = automaticMove('WEST', 'AIR', xy(4, 2))
    expect(move).toEqual({ breach: false, destination: xy(4, 4), route: [xy(1, 2), xy(1, 3), xy(4, 3), xy(4, 4)] })
    for (const owner of OWNERS) {
      for (const type of ['LAND', 'SEA', 'AIR'] as const) {
        for (const lane of LANES) {
          for (const cell of route(owner, lane)) {
            const intent = automaticMove(owner, type, cell)
            if (!intent.breach) expect(intent.route.every(inBounds)).toBe(true)
          }
        }
      }
    }
    const game = resolution()
    game.players.WEST.lanes = [2]
    spawn(game, 'air', 'WEST', xy(4, 2), air)
    spawn(game, 'enemy', 'EAST', xy(4, 3))
    const moved = advance(game)
    expect(at(moved, xy(4, 3))).toBe('enemy')
    expect(at(moved, xy(4, 4))).toBe('air')
  })

  it('P1-TEST-05: pair lane Signals by ordinal and exclude a Sea unit that switched lanes', () => {
    const paired = finishTurn(commit(createGame(42), ['L3', 'L1', 'END'], ['L1', 'L3', 'END']))
    expect(paired.log.filter(event => event.type === 'WAVE').map(event => event.lanes)).toEqual([
      { WEST: 3, EAST: 1 }, { WEST: 1, EAST: 3 },
    ])

    const initial = createGame(42)
    spawn(initial, 'boat', 'WEST', xy(2, 2), sea)
    spawn(initial, 'crossing', 'WEST', xy(5, 3), sea)
    const game = finishTurn(commit(initial, ['L3', 'L2', 'L1', 'END'], ['L1', 'L3', 'END']))
    expect(game.log.filter(event => event.type === 'WAVE').map(event => event.lanes)).toEqual([
      { WEST: 3, EAST: 1 }, { WEST: 2, EAST: 3 }, { WEST: 1 },
    ])
    expect(at(game, xy(4, 5))).toBe('crossing')
    expect(at(game, xy(1, 4))).toBe('boat')
    expect(game.log.filter(event => event.type === 'INTENT' && event.cardId === 'crossing')).toHaveLength(1)
  })

  it('P1-TEST-06: END seals lower orders and the opponent continues', () => {
    const initial = createGame(42)
    const west = ['L1', ['Infantry', 1], 'END', 'L2', ['Move Right', 3], 'L3'] satisfies Choice[]
    const committed = commit(initial, west, ['L2', 'L3', 'L1', 'END'])
    const eastView = gameView(committed, 'EAST')
    expect(eastView.players.WEST).not.toHaveProperty('orders')
    expect(eastView.players.WEST).not.toHaveProperty('hand')
    expect(eastView.log.some(event => 'privateTo' in event && event.privateTo === 'WEST')).toBe(false)
    const game = finishTurn(committed)
    const westReveals = game.log.filter(event => event.type === 'REVEAL' && event.owner === 'WEST')
    expect(westReveals.map(event => event.type === 'REVEAL' && game.cards[event.cardId].name)).toEqual(['L1', 'Infantry', 'END'])
    expect(game.log).toContainEqual(expect.objectContaining({ type: 'REVEAL', owner: 'EAST', beat: 4 }))
    expect(game.log.filter(event => event.type === 'WAVE' && event.lanes.WEST)).toHaveLength(1)
    for (const name of ['L2', 'Move Right', 'L3']) expect(game.players.WEST.hand).toContain(handId(initial, 'WEST', name))
  })

  it('P1-TEST-07: refresh, charge legal plays, fail for free, and expire the budget', () => {
    let initial = createGame(42)
    initial = finishTurn(commit(initial))
    initial = finishTurn(commit(initial))
    expect(initial.players.WEST.resources).toBe(3)
    const player = initial.players.WEST
    const boats = Object.values(initial.cards).filter(card => card.name === 'Patrol Boat' && card.owner === 'WEST').map(card => card.id)
    player.drawPile = player.drawPile.filter(id => !boats.includes(id))
    player.hand = [...new Set([...player.hand, ...boats])]
    const orders: Order[] = [
      ...boats.map(cardId => ({ cardId, lane: 1 as const })),
      ...stack(initial, 'WEST', ['END']).filter(order => !boats.includes(order.cardId)),
    ]
    let game = commitOrders(commitOrders(initial, 'WEST', orders), 'EAST', stack(initial, 'EAST', ['END']))
    game = advance(game)
    expect(game.players.WEST.resources).toBe(1)
    game = advance(game)
    expect(game.players.WEST.resources).toBe(1)
    expect(game.log).toContainEqual(expect.objectContaining({ type: 'PLAY_FAIL', cardId: boats[1] }))
    expect(finishTurn(game).players.WEST.resources).toBe(4)

    const battle = createGame(42)
    spawn(battle, 'enemy', 'EAST', step('WEST', 1), air)
    const paid = advance(commit(battle, [['Infantry', 1], 'END']))
    expect(paid.players.WEST.resources).toBe(0)
    expect(paid.players.WEST.discard).toContainEqual({ cardId: handId(battle, 'WEST', 'Infantry'), remaining: 0 })

    const terminal = resolution(12)
    terminal.players.WEST.resources = 8
    expect(advance(terminal).players.WEST.resources).toBe(0)
  })

  it('P1-TEST-08: wait counters recover only on the specified turn boundary', () => {
    const game = resolution(2)
    const cards = [
      ['action', { kind: 'ACTION', direction: 'LEFT', cost: 1, tw: 0 }],
      ['boat', sea], ['plane', air], ['permanent', { ...land, tw: -1 }],
    ] as const satisfies readonly (readonly [string, Definition])[]
    for (const [id, definition] of cards) {
      game.cards[id] = { id, owner: 'WEST', name: id, definition }
      discard(game, id)
    }
    expect(game.players.WEST.hand).not.toContain('action')
    const third = advance(game)
    expect(third.players.WEST.hand).toContain('action')
    expect(third.players.WEST.hand).not.toContain('boat')
    expect(third.players.WEST.discard).toContainEqual({ cardId: 'boat', remaining: 0 })
    const fourth = finishTurn(commit(third))
    expect(fourth.players.WEST.hand).toContain('boat')
    expect(fourth.players.WEST.hand).not.toContain('plane')
    const fifth = finishTurn(commit(fourth))
    expect(fifth.players.WEST.hand).toContain('plane')
    expect(fifth.players.WEST.discard).toEqual([{ cardId: 'permanent', remaining: -1 }])
  })

  it('P1-TEST-09: ties kill both in Clash and favor the attacker in Surprise', () => {
    const target = xy(2, 3)
    const clash = resolution()
    spawn(clash, 'west', 'WEST', xy(2, 2))
    spawn(clash, 'east', 'EAST', xy(2, 4))
    resolvePair(clash, [arrive('west', xy(2, 2), target), arrive('east', xy(2, 4), target)])
    expect(Object.keys(clash.board)).toHaveLength(0)
    expect(clash.players.WEST.discard[0].cardId).toBe('west')
    expect(clash.players.EAST.discard[0].cardId).toBe('east')

    for (const power of [1, 2]) {
      const surprise = resolution()
      spawn(surprise, 'west', 'WEST', xy(2, 2), { ...land, power })
      spawn(surprise, 'east', 'EAST', target)
      resolvePair(surprise, [arrive('west', xy(2, 2), target)])
      expect(at(surprise, target)).toBe(power === 1 ? 'east' : 'west')
    }
  })

  it('P1-TEST-10: resolve the Clash before a possible Surprise on a third occupant', () => {
    for (const power of [2, 3]) {
      const game = resolution()
      const target = xy(2, 3)
      spawn(game, 'west', 'WEST', xy(2, 2), { ...land, power })
      spawn(game, 'east', 'EAST', xy(2, 4))
      spawn(game, 'defender', 'EAST', target)
      resolvePair(game, [arrive('west', xy(2, 2), target), arrive('east', xy(2, 4), target)])
      expect(at(game, target)).toBe(power === 2 ? 'defender' : 'west')
      expect(game.log.filter(event => event.type === 'CLASH' || event.type === 'SURPRISE').map(event => event.type))
        .toEqual(power === 2 ? ['CLASH'] : ['CLASH', 'SURPRISE'])
    }
  })

  it('P1-TEST-11: push a chain along the snake or leave it intact when blocked', () => {
    for (const condition of ['empty', 'enemy', 'Wall']) {
      const game = resolution()
      const index = condition === 'Wall' ? 14 : 1
      const path = (i: number) => step('WEST', i)
      spawn(game, 'mover', 'WEST', path(index - 1))
      spawn(game, 'ally1', 'WEST', path(index), air)
      spawn(game, 'ally2', 'WEST', path(index + 1), sea)
      if (condition === 'enemy') spawn(game, 'enemy', 'EAST', path(index + 2))
      resolvePair(game, [arrive('mover', path(index - 1), path(index))])
      if (condition === 'empty') {
        expect(at(game, path(index))).toBe('mover')
        expect(at(game, path(index + 1))).toBe('ally1')
        expect(at(game, path(index + 2))).toBe('ally2')
        expect(game.log.filter(event => event.type === 'PUSH').map(event => event.cardId)).toEqual(['ally2', 'ally1'])
      } else {
        expect(at(game, path(index - 1))).toBe('mover')
        expect(at(game, path(index))).toBe('ally1')
        expect(at(game, path(index + 1))).toBe('ally2')
        expect(game.log.some(event => event.type === 'PUSH' || event.type === 'DESTROY')).toBe(false)
      }
    }
  })

  it('P1-TEST-12: reaching a Wall is distinct from auto-moving at the Wall', () => {
    const first = createGame(42)
    spawn(first, 'land', 'WEST', step('WEST', 14))
    const second = finishTurn(commit(first, ['L1', 'END']))
    expect(at(second, step('WEST', 15))).toBe('land')
    expect(second.players.WEST.breaches).toBe(0)
    spawn(second, 'boat', 'WEST', xy(3, 8), sea)
    spawn(second, 'plane', 'WEST', xy(4, 8), air)
    const result = finishTurn(commit(second, ['L1', 'L2', 'END']))
    expect(result.players.WEST.breaches).toBe(3)
    expect(result.players.WEST.discard.map(entry => entry.cardId)).toEqual(expect.arrayContaining(['land', 'boat', 'plane']))

    const manual = createGame(42)
    spawn(manual, 'land', 'WEST', step('WEST', 14))
    const turn = finishTurn(commit(manual, [['Move Right', 1], 'END']))
    expect(at(turn, step('WEST', 15))).toBe('land')
    expect(turn.players.WEST.breaches).toBe(0)
  })

  it('P1-TEST-13: simultaneous breaches are counted before turn-end victory checks', () => {
    const initial = resolution()
    spawn(initial, 'west', 'WEST', step('WEST', 15))
    spawn(initial, 'east', 'EAST', step('EAST', 15))
    for (const owner of OWNERS) {
      initial.players[owner].breaches = 1
      initial.players[owner].lanes = [1]
    }
    const wave = advance(initial)
    expect(wave.players.WEST.breaches).toBe(2)
    expect(wave.players.EAST.breaches).toBe(2)
    expect(wave.log.filter(event => event.type === 'BREACH')).toHaveLength(2)
    expect(wave.result).toBeNull()
    expect(advance(wave).turn).toBe(2)

    initial.players.EAST.lanes = [2, 1]
    const leader = advance(initial)
    expect(leader.players.WEST.breaches).toBe(2)
    expect(leader.result).toBeNull()
    expect(finishTurn(leader).result).toBeNull()
  })

  it('P1-TEST-14: at turn 12 breaches outrank Power, with a draw on equality', () => {
    const game = resolution(12)
    spawn(game, 'west', 'WEST', step('WEST', 1))
    spawn(game, 'east', 'EAST', step('EAST', 15))
    spawn(game, 'stationary', 'EAST', xy(3, 1), { kind: 'STATIONARY', cost: 0, tw: -1 })
    expect(advance(game).result).toBe('DRAW')
    spawn(game, 'air', 'EAST', xy(4, 8), air)
    expect(advance(game).result).toBe('EAST')
    game.players.WEST.breaches = 1
    expect(advance(game).result).toBe('WEST')
  })

  it('P1-TEST-15: replay identical seed and committed stacks through a complete match', () => {
    function replay(seed: number, recorded?: Record<Owner, Order[]>[]) {
      let game = createGame(seed)
      const orders: Record<Owner, Order[]>[] = []
      while (game.phase !== 'FINISHED') {
        const matching = recorded?.[game.turn - 1]
        const stacks = matching ?? {
          WEST: stack(game, 'WEST', ['L1', ...deploy(game, 'WEST', 1), 'END']),
          EAST: stack(game, 'EAST', [...deploy(game, 'EAST', 1), 'L1', 'END']),
        }
        orders.push(stacks)
        const previous = game
        const snapshot = structuredClone(game)
        game = finishTurn(commitOrders(commitOrders(game, 'WEST', stacks.WEST), 'EAST', stacks.EAST))
        expect(previous).toEqual(snapshot)
      }
      return { game, orders }
    }
    function deploy(game: Game, owner: Owner, lane: Lane): Choice[] {
      return game.players[owner].hand.some(id => game.cards[id].name === 'Infantry') ? [['Infantry', lane]] : []
    }
    const first = replay(12345)
    expect(replay(12345, first.orders).game).toEqual(first.game)
    expect(createGame(12345).players.WEST.drawPile).not.toEqual(createGame(54321).players.WEST.drawPile)
  })
})

describe('P1.0 resolution edge cases', () => {
  it('requires the complete hand and waits for both commitments', () => {
    const game = createGame(5)
    const orders = stack(game, 'WEST', ['END'])
    expect(() => commitOrders(game, 'WEST', orders.slice(1))).toThrow(/each card/)
    expect(() => commitOrders(game, 'WEST', [orders[1], ...orders.slice(1)])).toThrow(/each card/)
    const committed = commitOrders(game, 'WEST', orders)
    expect(() => commitOrders(committed, 'WEST', orders)).toThrow(/cannot commit/)
    expect(() => advance(committed)).toThrow(/Both players/)
  })

  it('reveals both plays before resolving simultaneous deployment versus Action', () => {
    const original = createGame(42)
    spawn(original, 'east-mover', 'EAST', xy(4, 1), { ...air, power: 2 })
    const infantry = handId(original, 'WEST', 'Infantry')
    const action = handId(original, 'EAST', 'Move Right')
    const game = advance(commit(original, [['Infantry', 1], 'END'], [['Move Right', 2], 'END']))
    expect(game.log.filter(event => event.type === 'REVEAL' || event.type === 'PLAY_OK').map(event => event.type))
      .toEqual(['REVEAL', 'REVEAL', 'PLAY_OK', 'PLAY_OK'])
    expect(game.log).toContainEqual(expect.objectContaining({ type: 'CLASH' }))
    expect(Object.keys(game.board)).toHaveLength(0)
    expect(game.players.WEST.resources).toBe(0)
    expect(game.players.EAST.resources).toBe(0)
    expect(game.players.WEST.discard).toContainEqual({ cardId: infantry, remaining: 0 })
    expect(game.players.EAST.discard).toContainEqual({ cardId: action, remaining: 0 })
  })

  it('clashes on a direct swap but allows one-sided entry into a vacated origin', () => {
    const game = resolution()
    const west = xy(1, 2)
    const east = xy(2, 2)
    spawn(game, 'west', 'WEST', west, sea)
    spawn(game, 'east', 'EAST', east, sea)
    const swap = structuredClone(game)
    resolvePair(swap, [arrive('west', west, east), arrive('east', east, west)])
    expect(Object.keys(swap.board)).toHaveLength(0)
    expect(swap.log).toContainEqual(expect.objectContaining({ type: 'CLASH' }))
    resolvePair(game, [arrive('west', west, east), arrive('east', east, xy(2, 3))])
    expect(at(game, east)).toBe('west')
    expect(at(game, xy(2, 3))).toBe('east')
    expect(game.log.some(event => event.type === 'SURPRISE')).toBe(false)
  })

  it('blocks an arrival into the origin of a mover that could not vacate it', () => {
    const game = resolution()
    const eastOrigin = step('EAST', 14)
    const eastDestination = step('EAST', 15)
    const westOrigin = xy(3, 1)
    spawn(game, 'west', 'WEST', westOrigin)
    spawn(game, 'east', 'EAST', eastOrigin)
    spawn(game, 'terminal', 'EAST', eastDestination)
    resolvePair(game, [arrive('west', westOrigin, eastOrigin), arrive('east', eastOrigin, eastDestination)])
    expect(at(game, westOrigin)).toBe('west')
    expect(at(game, eastOrigin)).toBe('east')
    expect(at(game, eastDestination)).toBe('terminal')
    expect(game.log.filter(event => event.type === 'BLOCKED')).toHaveLength(2)
  })

  it('charges a blocked deployment and leaves its occupied entry untouched', () => {
    const game = createGame(42)
    const infantry = handId(game, 'WEST', 'Infantry')
    spawn(game, 'entry', 'EAST', step('WEST', 0))
    spawn(game, 'ally', 'WEST', step('WEST', 1))
    spawn(game, 'blocking-enemy', 'EAST', step('WEST', 2))
    const next = advance(commit(game, [['Infantry', 1], 'END']))
    expect(next.players.WEST.resources).toBe(0)
    expect(next.board).toEqual(game.board)
    expect(next.players.WEST.discard).toContainEqual({ cardId: infantry, remaining: 0 })
    expect(next.log).toContainEqual(expect.objectContaining({ type: 'BLOCKED', cardId: infantry }))
  })

  it('invalid lanes, empty target lanes and off-board Actions fail free', () => {
    for (const choice of [['Move Right', 1], ['Move Right', 3], ['Infantry', 4], 'Infantry'] as Choice[]) {
      const game = createGame(42)
      spawn(game, 'wide', 'WEST', xy(6, 5), sea)
      const next = advance(commit(game, [choice, 'END']))
      expect(next.players.WEST.resources).toBe(1)
      expect(next.board).toEqual(game.board)
      expect(next.players.WEST.discard).toEqual([])
      expect(next.log).toContainEqual(expect.objectContaining({ type: 'PLAY_FAIL' }))
    }
  })

  it('only the frontmost MA is targeted, ignoring stationary Assets', () => {
    const game = createGame(42)
    spawn(game, 'rear', 'WEST', step('WEST', 2))
    spawn(game, 'front', 'WEST', step('WEST', 4))
    spawn(game, 'fixture', 'WEST', step('WEST', 5), { kind: 'STATIONARY', cost: 0, tw: -1 })
    const next = advance(commit(game, [['Move Right', 1], 'END']))
    expect(at(next, step('WEST', 2))).toBe('rear')
    expect(at(next, step('WEST', 5))).toBe('front')
    expect(next.players.WEST.discard).toContainEqual({ cardId: 'fixture', remaining: -1 })
  })

  it('a later rank skips eliminated units', () => {
    const game = resolution()
    game.players.WEST.lanes = [1]
    game.players.EAST.lanes = [1]
    spawn(game, 'west-front', 'WEST', step('WEST', 8))
    spawn(game, 'west-rear', 'WEST', step('WEST', 4))
    spawn(game, 'east-front', 'EAST', step('WEST', 9))
    spawn(game, 'east-rear', 'EAST', step('WEST', 10))
    const wave = advance(game)
    expect(at(wave, step('WEST', 10))).toBe('west-front')
    expect(wave.log.filter(event => event.type === 'INTENT').map(event => event.cardId))
      .toEqual(['east-front', 'west-front', 'west-rear'])
  })
})
