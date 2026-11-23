import { describe, expect, it } from 'vitest'
import { gameView } from '../src/engine'
import { board } from '../src/ui/board'
import { describeEvents } from '../src/ui/events'
import { program, sharedPanel } from '../src/ui/panels'
import { commit, createDraft, newSession, nextPlayer, reorder, restore, serialize, step, validateDraft } from '../src/ui/session'
import type { Owner } from '../src/engine'
import type { Session } from '../src/ui/session'

function draftFor(session: Session, owner: Owner) {
  const hand = gameView(session.game, owner).players[owner].hand!
  return createDraft(hand).map(order => ({
    ...order,
    lane: hand.find(card => card.id === order.cardId)?.definition.kind === 'SIGNAL' ? undefined : 1 as const,
  }))
}

describe('interface and session', () => {
  it('requires lanes for all costed cards, keeps a full stack, and reorders without mutating it', () => {
    const session = newSession(42)
    const hand = gameView(session.game, 'WEST').players.WEST.hand!
    const draft = createDraft(hand)
    const infantry = draft.findIndex(order => hand.find(card => card.id === order.cardId)?.name === 'Infantry')
    const moved = reorder(draft, infantry, 0)
    expect(draft[0].cardId).toBe(hand.find(card => card.name === 'END')?.id)
    expect(moved[0]).toEqual(draft[infantry])
    expect(validateDraft(hand, moved)).toMatch(/Choose a lane/)
    expect(validateDraft(hand, moved.slice(1))).toMatch(/every card/)
    expect(program('WEST', hand, moved, moved[0].cardId)).toContain('aria-label="Target lane"')
    expect(validateDraft(hand, draftFor(session, 'WEST'))).toBeUndefined()
  })

  it('rehydrates a committed match through the engine and requires the next private handoff', () => {
    let session = newSession(42)
    session = commit(session, 'WEST', draftFor(session, 'WEST'))
    expect(nextPlayer(gameView(session.game))).toBe('EAST')
    const restored = restore(serialize(session))!
    expect(restored).toEqual(session)
    const view = gameView(restored.game)
    expect(view.players.WEST).not.toHaveProperty('orders')
    expect(view.players.EAST).not.toHaveProperty('hand')
    const panel = sharedPanel(view, nextPlayer(view), [])
    expect(panel).toContain('Pass to East')
    expect(panel).not.toContain('Infantry')
    session = step(commit(restored, 'EAST', draftFor(restored, 'EAST')))
    expect(restore(serialize(session))).toEqual(session)
  })

  it('rejects unsupported or invalid saves before displaying them', () => {
    expect(restore('{broken')).toBeUndefined()
    expect(restore(JSON.stringify({ version: 2, seed: 0, commands: [] }))).toBeUndefined()
    expect(restore(JSON.stringify({ version: 1, seed: -1, commands: [] }))).toBeUndefined()
    expect(restore(JSON.stringify({ version: 1, seed: 4, commands: [{ type: 'advance' }] }))).toBeUndefined()
    expect(restore(JSON.stringify({
      version: 1, seed: 4, commands: [{ type: 'commit', owner: 'WEST', orders: [{ cardId: '<b>', lane: 4 }] }],
    }))).toBeUndefined()
  })

  it('renders exact board edges and labels only public orders and effects', () => {
    let session = newSession(42)
    const west = draftFor(session, 'WEST')
    const infantry = gameView(session.game, 'WEST').players.WEST.hand!.find(card => card.name === 'Infantry')!
    session = commit(session, 'WEST', reorder(west, west.findIndex(order => order.cardId === infantry.id), 0))
    session = step(commit(session, 'EAST', draftFor(session, 'EAST')))
    const view = gameView(session.game)
    const html = board(view, view.log)
    expect(html.match(/class="cell\b/g)).toHaveLength(48)
    expect(html.match(/class="cell [^"]*\bbarrier\b/g)).toHaveLength(21)
    expect(html).toContain('West Infantry at column 2, row 1')
    expect(describeEvents(view, view.log)).toContain('Beat 1 · West Infantry → L1')
    const reveal = sharedPanel(view, undefined, view.log)
    expect(reveal).toContain('Infantry')
    expect(reveal).not.toContain('Move Right')
  })
})
