import { OWNERS } from '../engine'
import type { Cell } from '../engine'
import { side } from './board'
import type { PublicEvent, View } from './session'

export function describeEvents(view: View, events: PublicEvent[]): string[] {
  const known = new Map(view.board.map(({ card }) => [card.id, card]))
  for (const owner of OWNERS) {
    for (const { card } of view.players[owner].discard) known.set(card.id, card)
  }
  for (const event of view.log) {
    if (event.type === 'REVEAL' && 'card' in event) known.set(event.cardId, event.card)
  }
  const name = (id: string) => {
    const card = known.get(id)
    return card ? `${side(card.owner)} ${card.name}` : 'Unit'
  }
  const cell = ({ x, y }: Cell) => `(${x}, ${y})`
  return events.flatMap(event => {
    switch (event.type) {
      case 'COMMIT': return `${side(event.owner)} sealed their orders`
      case 'REVEAL': return `Beat ${event.beat} · ${name(event.cardId)}${event.lane ? ` → L${event.lane}` : ''}`
      case 'PLAY_OK': return `${name(event.cardId)} played for ${event.cost} R`
      case 'PLAY_FAIL': return `${name(event.cardId)} could not play and spent no Resources`
      case 'WAVE': return `Wave ${event.wave} · ${OWNERS.map(owner => `${side(owner)} ${event.lanes[owner] ? `L${event.lanes[owner]}` : 'idle'}`).join(' / ')}`
      case 'MOVE': return `${name(event.cardId)} moved to ${cell(event.destination)}`
      case 'CLASH': return `Clash · ${event.cardIds.map(name).join(' vs ')}`
      case 'SURPRISE': return `Surprise · ${name(event.attacker)} attacked ${name(event.defender)}`
      case 'PUSH': return `Push · ${name(event.cardId)} displaced to ${cell(event.to)}`
      case 'DESTROY': return `${name(event.cardId)} destroyed`
      case 'BLOCKED': return `${name(event.cardId)} blocked`
      case 'BREACH': return `Breach · ${name(event.cardId)} scored 1 for ${side(event.owner)}`
      case 'DISCARD': return `${name(event.cardId)} discarded (${event.remaining < 0 ? 'permanent' : `TW ${event.remaining}`})`
      case 'CLEANUP': return `Turn ${event.turn} complete`
      case 'WIN': return event.result === 'DRAW' ? 'Match drawn' : `${side(event.result)} wins`
      default: return []
    }
  })
}
