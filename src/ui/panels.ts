import { LANES, OWNERS } from '../engine'
import type { Card, Order, Owner } from '../engine'
import { cardMark, cardMeta, side } from './board'
import { describeEvents } from './events'
import { validateDraft } from './session'
import type { PublicEvent, View } from './session'

export function scoreboard(view: View, programming: boolean, waiting: boolean): string {
  const phase = view.phase === 'FINISHED' ? 'Match complete' :
    view.phase === 'RESOLUTION' ? 'Resolution' : programming || waiting ? 'Order phase' : 'Reveal beats'
  return `<section class="scoreboard" aria-label="Turn and player status">
    ${OWNERS.map(owner => {
      const state = view.players[owner]
      return `<div class="score panel ${owner.toLowerCase()}"><b><i></i>${side(owner)}</b>
        <span><strong>${state.resources}</strong> Resources</span>
        <span><strong>${state.breaches}</strong> Breaches</span></div>`
    }).join('')}
    <div class="turn-block"><span class="data">TURN ${String(view.turn).padStart(2, '0')}<span class="muted"> / 12</span></span><strong>${phase}</strong></div>
  </section>`
}

export function program(owner: Owner, hand: Card[], draft: Order[], selection: string): string {
  const cards = new Map(hand.map(card => [card.id, card]))
  const index = draft.findIndex(order => order.cardId === selection)
  const selected = cards.get(selection)
  const endIndex = draft.findIndex(order => {
    const definition = cards.get(order.cardId)?.definition
    return definition?.kind === 'SIGNAL' && definition.signal === 'END'
  })
  const hasReserve = draft.some((order, index) => index > endIndex && !order.lane &&
    cards.get(order.cardId)?.definition.kind !== 'SIGNAL')
  const error = validateDraft(hand, draft)

  return `<section class="operations panel ${owner.toLowerCase()}" aria-labelledby="phase-title">
    <div class="panel-heading"><span class="phase-tag"><i></i> ${side(owner)} · PRIVATE</span><a href="#board-panel">View board ↓</a></div>
    <h2 id="phase-title" tabindex="-1">Program your orders</h2>
    <p class="muted">Select a card, set its lane, and order the stack top to bottom. Cards below END stay hidden.</p>
    <div class="draft-tools">
      <div class="selection"><span class="card-mark">${selected ? cardMark(selected) : '⊕'}</span><strong>${selected?.name ?? 'Select a card'}</strong></div>
      <div class="reorder">
        <button data-action="up" ${index <= 0 ? 'disabled' : ''} aria-label="Move up">↑ Up</button>
        <button data-action="down" ${index < 0 || index >= draft.length - 1 ? 'disabled' : ''} aria-label="Move down">↓ Down</button>
        <button data-action="queue" ${index <= endIndex ? 'disabled' : ''}>Before END</button>
      </div>
      ${selected && selected.definition.kind !== 'SIGNAL' ? `<div class="target-row" role="group" aria-label="Target lane">
        <span>Target lane</span>${LANES.map(lane => `<button data-action="lane" data-value="${lane}" aria-pressed="${draft[index]?.lane === lane}">L${lane}</button>`).join('')}
      </div>` : ''}
    </div>
    <ol class="stack" aria-label="Order stack">${draft.map((order, index) => {
      const card = cards.get(order.cardId)!
      const end = index === endIndex
      return `<li class="${end ? 'end-card' : index > endIndex ? 'reserve-card' : ''}">
        <button class="order-card" data-action="select" data-value="${card.id}" aria-pressed="${selection === card.id}">
          <span class="card-index">${index + 1}</span><span class="card-mark">${cardMark(card)}</span>
          <span class="card-label"><strong>${card.name}</strong><small>${cardMeta(card)}</small></span>
          ${card.definition.kind !== 'SIGNAL' ? `<span class="lane-badge ${order.lane ? '' : 'unset'}">${order.lane ? `L${order.lane}` : 'Set lane'}</span>` : ''}
        </button>
      </li>`
    }).join('')}</ol>
    <div class="commit-footer">
      ${hasReserve ? '<button class="secondary" data-action="reserve">Set unassigned reserve cards to L1</button>' : ''}
      <p class="muted validation" role="status">${error ?? 'Stack ready to seal.'}</p>
      <button class="primary" data-action="commit" ${error ? 'disabled' : ''}>Commit orders <span aria-hidden="true">→</span></button>
    </div>
  </section>`
}

export function sharedPanel(view: View, player: Owner | undefined, events: PublicEvent[]): string {
  if (player) return `<section class="operations panel handoff ${player.toLowerCase()}" aria-labelledby="phase-title">
    <span class="phase-tag"><i></i> PRIVATE HANDOFF</span>
    <div class="handoff-mark" aria-hidden="true"><i></i><i></i><i></i></div>
    <h2 id="phase-title" tabindex="-1">Pass to ${side(player)}</h2>
    <p class="muted">${side(player)} can unlock their hand when they have the device. Keep the screen to yourself while programming.</p>
    <button class="primary" data-action="unlock">I’m ${side(player)} <span aria-hidden="true">→</span></button>
  </section>`

  const westBreaches = view.players.WEST.breaches
  const eastBreaches = view.players.EAST.breaches
  const power = { WEST: 0, EAST: 0 }
  if (view.result && view.turn === 12 && westBreaches === eastBreaches) {
    for (const { card } of view.board) {
      if (card.definition.kind === 'MA') power[card.owner] += card.definition.power
    }
  }

  if (view.result) return `<section class="operations panel handoff ${view.result === 'DRAW' ? '' : view.result.toLowerCase()}" aria-labelledby="phase-title">
    <span class="phase-tag"><i></i> MATCH COMPLETE</span>
    <h2 id="phase-title" tabindex="-1">${view.result === 'DRAW' ? 'Draw' : `${side(view.result)} wins`}</h2>
    <p class="muted">Final breaches · West ${westBreaches} / East ${eastBreaches}</p>
    ${view.turn === 12 && westBreaches === eastBreaches ?
      `<p class="muted">Surviving Power · West ${power.WEST} / East ${power.EAST}</p>` : ''}
    <button class="primary" data-action="new">New Game <span aria-hidden="true">→</span></button>
  </section>`

  const reveals = events.filter(event => event.type === 'REVEAL' && 'card' in event)
  const wave = events.find(event => event.type === 'WAVE')
  const title = reveals.length ? `Reveal beat ${view.beat}` : wave ? `Lane wave ${wave.wave}` :
    view.phase === 'ORDER' ? 'Orders sealed' : 'Resolve lane Signals'
  const nextWave = OWNERS.some(owner => view.players[owner].lanes.length > view.wave)
  const next = view.phase === 'ORDER' ? (view.beat ? 'Next reveal beat' : 'Reveal first beat') :
    nextWave ? `Resolve wave ${view.wave + 1}` : 'Finish turn'
  const effects = describeEvents(view, events.filter(event => event.type !== 'REVEAL' && event.type !== 'WAVE'))
  return `<section class="operations panel" aria-labelledby="phase-title">
    <span class="phase-tag"><i></i> SHARED VIEW</span>
    <h2 id="phase-title" tabindex="-1">${title}</h2>
    ${!reveals.length && !wave ? '<p class="muted">Both players can watch the orders resolve together.</p>' : ''}
    ${reveals.length || wave ? `<div class="pair">${OWNERS.map(owner => {
      const reveal = reveals.find(event => event.owner === owner)
      return `<div class="${owner.toLowerCase()}"><span>${side(owner)}</span><strong>${wave ?
        (wave.lanes[owner] ? `Lane ${wave.lanes[owner]}` : 'Idle') :
        reveal && 'card' in reveal ? reveal.card.name : 'Already ended'}</strong>
        ${reveal && 'card' in reveal && reveal.lane ? `<small>Target L${reveal.lane}</small>` : ''}</div>`
    }).join('')}</div>` : ''}
    ${effects.length ? `<ul class="effects">${effects.map(line => `<li>${line}</li>`).join('')}</ul>` : ''}
    ${wave && !effects.length ? '<p class="muted">No units moved in this wave.</p>' : ''}
    <button class="primary" data-action="advance">${next} <span aria-hidden="true">→</span></button>
  </section>`
}

export function eventLog(view: View, expanded: boolean): string {
  const lines = describeEvents(view, view.log)
  return `<details class="feed panel" ${expanded ? 'open' : ''}>
    <summary>Event log <span class="muted data">${lines.length} ENTRIES</span></summary>
    ${lines.length ? `<ol reversed>${lines.reverse().map(line => `<li>${line}</li>`).join('')}</ol>` :
      '<p class="muted">Reveals, movement and combat will appear here.</p>'}
  </details>`
}
