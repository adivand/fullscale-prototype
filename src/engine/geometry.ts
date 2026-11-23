export const WIDTH = 6
export const HEIGHT = 8
export const OWNERS = ['WEST', 'EAST'] as const
export const LANES = [1, 2, 3] as const
// Perimeter and Border coordinates are grid vertices, not cell indices.
export const BORDERS = [2, 4] as const
export const WALLS = { WEST: 0, EAST: HEIGHT } as const
export const BOUNDARIES = { NORTH: 0, SOUTH: WIDTH } as const
export type Owner = typeof OWNERS[number]
export type Lane = typeof LANES[number]
export type Cell = Readonly<{ x: number; y: number }>
export type Military = 'LAND' | 'SEA' | 'AIR'
export type Direction = 'LEFT' | 'RIGHT'

export function cellKey({ x, y }: Cell): string {
  return `${x},${y}`
}

export function inBounds({ x, y }: Cell): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 1 && x <= WIDTH && y >= 1 && y <= HEIGHT
}

export function laneOf({ x }: Cell): Lane {
  return Math.ceil(x / 2) as Lane
}

// Each Barrier identifies the blocked column and the separator after row y.
export const BARRIERS = LANES.flatMap(lane =>
  Array.from({ length: HEIGHT - 1 }, (_, row) => ({
    x: 2 * lane - (row % 2 === 0 ? 1 : 0),
    y: row + 1,
  })),
)

const westRoutes = LANES.map(lane => Array.from({ length: HEIGHT }, (_, row) => {
  const north = 2 * lane - 1
  const columns = row % 2 === 0 ? [north, north + 1] : [north + 1, north]
  return columns.map(x => Object.freeze({ x, y: row + 1 }))
}).flat())
const eastRoutes = westRoutes.map(route => [...route].reverse())
for (const route of [...westRoutes, ...eastRoutes]) Object.freeze(route)

export function route(owner: Owner, lane: Lane): readonly Cell[] {
  return (owner === 'WEST' ? westRoutes : eastRoutes)[lane - 1]
}

export function progress(owner: Owner, cell: Cell): number {
  return route(owner, laneOf(cell)).findIndex(step => step.x === cell.x && step.y === cell.y)
}

export function pathStep(owner: Owner, cell: Cell, offset: number): Cell | undefined {
  return route(owner, laneOf(cell))[progress(owner, cell) + offset]
}

export function manualDestination(owner: Owner, type: Military, cell: Cell, direction: Direction): Cell | undefined {
  const offset = direction === 'RIGHT' ? 1 : -1
  if (type === 'LAND') return pathStep(owner, cell, offset)
  const facing = owner === 'WEST' ? 1 : -1
  const destination = { x: cell.x + offset * facing * (type === 'AIR' ? 2 : 1), y: cell.y }
  return inBounds(destination) ? destination : undefined
}

export type AutoMove = { breach: true } | { breach: false; destination: Cell; route: readonly Cell[] }

export function automaticMove(owner: Owner, type: Military, cell: Cell): AutoMove {
  if (type === 'LAND') {
    const path = route(owner, laneOf(cell))
    const index = progress(owner, cell)
    if (index === path.length - 1) return { breach: true }
    const steps = path.slice(index + 1, index + 3)
    return { breach: false, destination: steps[steps.length - 1], route: steps }
  }

  const wall = owner === 'WEST' ? HEIGHT : 1
  if (cell.y === wall) return { breach: true }
  const direction = owner === 'WEST' ? 1 : -1
  const firstRow = cell.y + direction
  const lastRow = firstRow === wall ? wall : firstRow + direction
  const north = type === 'SEA' ? (cell.x === 1 ? 2 : cell.x - 1) : Math.max(1, cell.x - 3)
  const landing = { x: type === 'SEA' ? north : cell.x, y: lastRow }
  const steps = [{ x: north, y: cell.y }, { x: north, y: firstRow }]
  if (type === 'AIR') steps.push({ x: cell.x, y: firstRow })
  steps.push(landing)
  return { breach: false, destination: landing, route: steps }
}
