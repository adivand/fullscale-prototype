import type { Card } from './cards'
import type { Cell, Lane, Owner } from './geometry'

export type Order = { cardId: string; lane?: Lane }
export type Unit = { cardId: string; cell: Cell; autoMoved: boolean }
export type Player = {
  hand: string[]
  drawPile: string[]
  discard: { cardId: string; remaining: number }[]
  orders: Order[] | null
  cursor: number
  ended: boolean
  lanes: Lane[]
  resources: number
  breaches: number
}

type EventData = {
  DRAW: { owner: Owner; cardId: string; privateTo: Owner }
  RECOVER: { owner: Owner; cardId: string; privateTo: Owner }
  COMMIT: { owner: Owner }
  REVEAL: { owner: Owner; cardId: string; lane?: Lane; beat: number }
  SIGNAL: { owner: Owner; signal: Lane | 'END' }
  PLAY_OK: { owner: Owner; cardId: string; cost: number }
  PLAY_FAIL: { owner: Owner; cardId: string }
  WAVE: { wave: number; lanes: Partial<Record<Owner, Lane>> }
  INTENT: { cardId: string; origin?: Cell; destination?: Cell; route: readonly Cell[] }
  CLASH: { cardIds: [string, string]; destroyed: string[] }
  SURPRISE: { attacker: string; defender: string; destroyed: string }
  PUSH: { cardId: string; from: Cell; to: Cell }
  BLOCKED: { cardId: string }
  DESTROY: { cardId: string }
  BREACH: { cardId: string; owner: Owner }
  DISCARD: { cardId: string; owner: Owner; remaining: number }
  MOVE: { cardId: string; destination: Cell }
  CLEANUP: Record<never, never>
  WIN: { result: Result }
}
export type Event = { [K in keyof EventData]: { type: K; turn: number } & EventData[K] }[keyof EventData]
type EventInput = { [K in keyof EventData]: { type: K } & EventData[K] }[keyof EventData]
export type Result = Owner | 'DRAW'
export type Game = {
  seed: number
  turn: number
  phase: 'ORDER' | 'RESOLUTION' | 'FINISHED'
  beat: number
  wave: number
  result: Result | null
  players: Record<Owner, Player>
  cards: Record<string, Card>
  board: Record<string, Unit>
  log: Event[]
}

export function record(game: Game, event: EventInput): void {
  game.log.push({ ...event, turn: game.turn })
}

export function discard(game: Game, cardId: string): void {
  const { owner, definition } = game.cards[cardId]
  if (definition.kind === 'SIGNAL') throw new Error('Signals cannot enter discard')
  const remaining = definition.tw
  game.players[owner].discard.push({ cardId, remaining })
  record(game, { type: 'DISCARD', cardId, owner, remaining })
}
