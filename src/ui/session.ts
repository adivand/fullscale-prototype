import { advance, commitOrders, createGame, gameView, LANES, OWNERS } from '../engine'
import type { Card, Game, Lane, Order, Owner } from '../engine'

export const SAVE_KEY = 'fullscale.p1.session'
type Command = { type: 'commit'; owner: Owner; orders: Order[] } | { type: 'advance' }
export type Session = { game: Game; commands: Command[] }
export type View = ReturnType<typeof gameView>
export type PublicEvent = View['log'][number]

export function newSession(seed: number): Session {
  return { game: createGame(seed), commands: [] }
}

export function nextPlayer(view: View): Owner | undefined {
  if (view.phase === 'ORDER') return OWNERS.find(owner => !view.players[owner].committed)
}

export function createDraft(hand: Card[]): Order[] {
  // Start with END on top so any reveal above it is a deliberate choice.
  const end = hand.find(card => card.definition.kind === 'SIGNAL' && card.definition.signal === 'END')
  return [...(end ? [end] : []), ...hand.filter(card => card !== end)].map(card => ({ cardId: card.id }))
}

export function reorder(orders: Order[], index: number, destination: number): Order[] {
  if (!orders[index] || !Number.isInteger(destination) || destination < 0 || destination >= orders.length) return orders
  const next = [...orders]
  const [order] = next.splice(index, 1)
  next.splice(destination, 0, order)
  return next
}

export function validateDraft(hand: Card[], draft: Order[]): string | undefined {
  if (draft.length !== hand.length || new Set(draft.map(order => order.cardId)).size !== hand.length ||
      hand.some(card => !draft.some(order => order.cardId === card.id))) {
    return 'Include every card exactly once.'
  }

  const missing = hand.filter(card => card.definition.kind !== 'SIGNAL' &&
    !LANES.some(lane => draft.find(order => order.cardId === card.id)?.lane === lane)).length
  if (missing) return `Choose a lane for ${missing} ${missing === 1 ? 'card' : 'cards'}.`
}

export function commit(session: Session, owner: Owner, draft: Order[]): Session {
  if (nextPlayer(gameView(session.game)) !== owner) throw new Error('It is the other player’s turn to commit.')
  const hand = gameView(session.game, owner).players[owner].hand ?? []
  const error = validateDraft(hand, draft)
  if (error) throw new Error(error)
  const orders = draft.map(({ cardId, lane }) => ({ cardId, lane }))
  return { game: commitOrders(session.game, owner, orders), commands: [...session.commands, { type: 'commit', owner, orders }] }
}

export function step(session: Session): Session {
  return { game: advance(session.game), commands: [...session.commands, { type: 'advance' }] }
}

export function serialize(session: Session): string {
  return JSON.stringify({ version: 1, seed: session.game.seed, commands: session.commands })
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readOrder(value: unknown): Order {
  if (!object(value) || typeof value.cardId !== 'string' ||
      (value.lane !== undefined && !LANES.includes(value.lane as Lane))) throw new Error('Invalid saved order.')
  return { cardId: value.cardId, lane: value.lane as Lane | undefined }
}

export function restore(raw: string): Session | undefined {
  // Replay only validated commands. Board, private projections and logs always come from the engine.
  if (raw.length > 100_000) return
  try {
    const save: unknown = JSON.parse(raw)
    if (!object(save) || save.version !== 1 || typeof save.seed !== 'number' ||
        !Number.isSafeInteger(save.seed) || save.seed < 0 || save.seed > 0xffffffff ||
        !Array.isArray(save.commands) || save.commands.length > 288) return
    let session = newSession(save.seed)
    for (const command of save.commands as unknown[]) {
      if (!object(command)) return
      if (command.type === 'advance') session = step(session)
      else if (command.type === 'commit' && (command.owner === 'WEST' || command.owner === 'EAST') &&
          Array.isArray(command.orders) && command.orders.length <= 16) {
        session = commit(session, command.owner, command.orders.map(readOrder))
      } else return
    }
    return session
  } catch {
    return undefined
  }
}
