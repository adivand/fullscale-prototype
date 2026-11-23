import { BARRIERS, BORDERS, cellKey, HEIGHT, LANES, laneOf, WIDTH } from '../engine'
import type { Card, Cell } from '../engine'
import type { PublicEvent, View } from './session'

const barriers = new Set(BARRIERS.map(cellKey))
const tiles = Array.from({ length: WIDTH * HEIGHT }, (_, index) => ({
  x: index % WIDTH + 1, y: Math.floor(index / WIDTH) + 1,
}))

export const side = (owner: 'WEST' | 'EAST') => owner === 'WEST' ? 'West' : 'East'

export function cardMeta({ definition }: Card): string {
  if (definition.kind === 'SIGNAL') return definition.signal === 'END' ? 'Stop revealing orders' : 'Activate lane during resolution'
  if (definition.kind === 'MA') return `${definition.type} · ${definition.cost} R · ${definition.power} Power · TW ${definition.tw}`
  return `${definition.kind === 'ACTION' ? 'ACTION' : 'ASSET'} · ${definition.cost} R · TW ${definition.tw}`
}

export function cardMark({ definition }: Card): string {
  if (definition.kind === 'MA') return { LAND: '◆', SEA: '≈', AIR: '▲' }[definition.type]
  if (definition.kind === 'ACTION') return definition.direction === 'LEFT' ? '←' : '→'
  return definition.kind === 'SIGNAL' && definition.signal === 'END' ? '■' : '⊕'
}

export function board(view: View, events: PublicEvent[], preview?: number): string {
  const occupants = new Map(view.board.map(unit => [cellKey(unit.cell), unit]))
  const routes = new Set<string>()
  const impact = new Set<string>()
  const paths = new Map<string, Cell[]>()
  const intents = new Map<string, Extract<PublicEvent, { type: 'INTENT' }>>()
  const trace = (id: string, cells: readonly Cell[]) => {
    paths.set(id, [...(paths.get(id) ?? []), ...cells])
    for (const cell of cells) routes.add(cellKey(cell))
  }
  const wave = events.find(event => event.type === 'WAVE')

  for (const event of events) {
    if (event.type === 'INTENT') {
      intents.set(event.cardId, event)
    }
    if (event.type === 'MOVE') {
      const intent = intents.get(event.cardId)
      if (intent) trace(event.cardId, intent.origin ? [intent.origin, ...intent.route] : intent.route)
    }
    if (event.type === 'PUSH') trace(event.cardId, [event.from, event.to])
    const hitIds = event.type === 'CLASH' ? event.cardIds : event.type === 'SURPRISE' ? [event.attacker] : []
    for (const id of hitIds) {
      const hit = intents.get(id)?.destination
      if (hit) impact.add(cellKey(hit))
    }
  }

  return `<section class="board-panel panel" id="board-panel" aria-labelledby="board-title">
    <div class="panel-heading"><h2 id="board-title">Battlefield</h2><span class="muted data">6 × 8</span></div>
    <div class="board-wrap">
      <div class="wall west">WEST WALL <span aria-hidden="true">↓</span></div>
      <div class="lane-labels">${LANES.map(lane => `<span class="${preview === lane ? 'preview' : ''}">
        L${lane}${wave?.lanes.WEST === lane ? ' <b class="west">W</b>' : ''}${wave?.lanes.EAST === lane ? ' <b class="east">E</b>' : ''}</span>`).join('')}</div>
      <div class="board" role="img" aria-label="Six columns, eight rows. West Wall at top. ${view.board.map(({ card, cell }) =>
        `${side(card.owner)} ${card.name} at column ${cell.x}, row ${cell.y}`).join('. ') || 'No units on the board.'}">
        ${tiles.map(cell => {
          const key = cellKey(cell)
          const unit = occupants.get(key)
          const card = unit?.card
          const path = unit && paths.get(unit.cardId)
          const shift = path?.map(point => `${point.x - cell.x},${point.y - cell.y}`).join(' ')
          const classes = ['cell', laneOf(cell) === 2 && 'middle-lane', BORDERS.some(x => x === cell.x) && 'border',
            barriers.has(key) && 'barrier', routes.has(key) && 'trace', impact.has(key) && 'impact', preview === laneOf(cell) && 'preview']
          return `<div class="${classes.filter(Boolean).join(' ')}" aria-hidden="true">${card ? `
            <div class="unit-position"${shift ? ` data-path="${shift}"` : ''}><div class="unit ${card.owner.toLowerCase()}">
              <span>${cardMark(card)}</span><small>${card.owner[0]} · ${card.definition.kind === 'MA' ? card.definition.type : 'ASSET'}</small>
            </div></div>` : ''}</div>`
        }).join('')}
      </div>
      <div class="wall east">EAST WALL <span aria-hidden="true">↑</span></div>
    </div>
    <div class="board-key"><span><i class="barrier-key"></i> Barrier</span><span><i class="border-key"></i> Border</span><span><i class="boundary-key"></i> Boundary</span></div>
  </section>`
}
