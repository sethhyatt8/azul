export const TILE_COLORS = ['blue', 'yellow', 'red', 'black', 'white'] as const
export type TileColor = (typeof TILE_COLORS)[number]

export const WALL_PATTERN: TileColor[][] = [
  ['blue', 'yellow', 'red', 'black', 'white'],
  ['white', 'blue', 'yellow', 'red', 'black'],
  ['black', 'white', 'blue', 'yellow', 'red'],
  ['red', 'black', 'white', 'blue', 'yellow'],
  ['yellow', 'red', 'black', 'white', 'blue'],
]

export type PatternLine = {
  color: TileColor | null
  tiles: number
}

export type PlayerBoard = {
  patternLines: PatternLine[]
  wall: boolean[][]
  floorLine: TileColor[]
  hasStartingMarker: boolean
  score: number
}

export type Factory = TileColor[]

export type Phase = 'lobby' | 'drafting' | 'roundEnd' | 'gameOver'

export type GameState = {
  phase: Phase
  playerOrder: string[]
  currentPlayerIndex: number
  startingPlayerId: string
  round: number
  bag: TileColor[]
  factories: Factory[]
  center: TileColor[]
  centerHasStartingMarker: boolean
  boards: Record<string, PlayerBoard>
  lastRoundScoring?: Record<string, number>
  winnerIds: string[]
}
