import type { Direction, Lane, Military, Owner } from './geometry'

type Costed = { cost: number; tw: number }
export type Definition =
  | { kind: 'SIGNAL'; cost: 0; signal: Lane | 'END' }
  | (Costed & { kind: 'ACTION'; direction: Direction })
  | (Costed & { kind: 'MA'; type: Military; power: number })
  | (Costed & { kind: 'STATIONARY' })

export const CARD_REGISTRY = {
  L1: { kind: 'SIGNAL', cost: 0, signal: 1 },
  L2: { kind: 'SIGNAL', cost: 0, signal: 2 },
  L3: { kind: 'SIGNAL', cost: 0, signal: 3 },
  END: { kind: 'SIGNAL', cost: 0, signal: 'END' },
  Infantry: { kind: 'MA', type: 'LAND', cost: 1, power: 2, tw: 0 },
  'Patrol Boat': { kind: 'MA', type: 'SEA', cost: 2, power: 2, tw: 1 },
  Aircraft: { kind: 'MA', type: 'AIR', cost: 3, power: 3, tw: 2 },
  'Move Left': { kind: 'ACTION', direction: 'LEFT', cost: 1, tw: 0 },
  'Move Right': { kind: 'ACTION', direction: 'RIGHT', cost: 1, tw: 0 },
} as const satisfies Record<string, Definition>

export type Card = { id: string; owner: Owner; name: string; definition: Definition }
export const INITIAL_HAND = ['L1', 'L2', 'L3', 'END', 'Infantry', 'Move Right'] as const
export const DRAW_SUPPLY = [
  'Infantry', 'Infantry', 'Infantry', 'Patrol Boat', 'Patrol Boat',
  'Aircraft', 'Aircraft', 'Move Left', 'Move Left', 'Move Right',
] as const
