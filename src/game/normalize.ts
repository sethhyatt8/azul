import { TILE_COLORS, type Factory, type GameState, type PatternLine, type PlayerBoard, type TileColor } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (!isRecord(value)) return []
  return Object.keys(value)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => value[key] as T)
}

function sanitizeColor(raw: unknown): TileColor | null {
  return typeof raw === 'string' && TILE_COLORS.includes(raw as TileColor) ? (raw as TileColor) : null
}

function normalizePatternLine(raw: unknown): PatternLine {
  if (!isRecord(raw)) return { color: null, tiles: 0 }
  return {
    color: sanitizeColor(raw.color),
    tiles: typeof raw.tiles === 'number' ? raw.tiles : 0,
  }
}

function normalizeWall(raw: unknown): boolean[][] {
  const rows = asArray<unknown>(raw)
  return Array.from({ length: 5 }, (_, row) => {
    const cols = asArray<unknown>(rows[row])
    return Array.from({ length: 5 }, (_, col) => cols[col] === true)
  })
}

function normalizePlayerBoard(raw: unknown): PlayerBoard {
  if (!isRecord(raw)) {
    return {
      patternLines: Array.from({ length: 5 }, () => ({ color: null, tiles: 0 })),
      wall: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => false)),
      floorLine: [],
      hasStartingMarker: false,
      score: 0,
    }
  }
  const patternLines = asArray<unknown>(raw.patternLines).map(normalizePatternLine)
  while (patternLines.length < 5) patternLines.push({ color: null, tiles: 0 })
  return {
    patternLines: patternLines.slice(0, 5),
    wall: normalizeWall(raw.wall),
    floorLine: asArray<unknown>(raw.floorLine)
      .map(sanitizeColor)
      .filter((color): color is TileColor => color !== null),
    hasStartingMarker: raw.hasStartingMarker === true,
    score: typeof raw.score === 'number' ? raw.score : 0,
  }
}

function normalizeFactories(raw: unknown): Factory[] {
  return asArray<unknown>(raw).map((factory) =>
    asArray<unknown>(factory)
      .map(sanitizeColor)
      .filter((color): color is TileColor => color !== null),
  )
}

function isGamePhase(value: unknown): value is GameState['phase'] {
  return value === 'drafting' || value === 'roundEnd' || value === 'gameOver'
}

export function normalizeGameState(raw: unknown): GameState | null {
  if (!isRecord(raw)) return null
  if (!isGamePhase(raw.phase)) return null

  const playerOrder = asArray<unknown>(raw.playerOrder).filter(
    (id): id is string => typeof id === 'string',
  )
  if (playerOrder.length === 0) return null

  const boards: Record<string, PlayerBoard> = {}
  if (!isRecord(raw.boards)) return null
  for (const [id, boardRaw] of Object.entries(raw.boards)) {
    boards[id] = normalizePlayerBoard(boardRaw)
  }

  const startingPlayerId =
    typeof raw.startingPlayerId === 'string' ? raw.startingPlayerId : playerOrder[0]

  const lastRoundScoring =
    isRecord(raw.lastRoundScoring) ?
      Object.fromEntries(
        Object.entries(raw.lastRoundScoring).filter(
          (entry): entry is [string, number] => typeof entry[1] === 'number',
        ),
      )
    : undefined

  return {
    phase: raw.phase,
    playerOrder,
    currentPlayerIndex:
      typeof raw.currentPlayerIndex === 'number' ? raw.currentPlayerIndex : 0,
    startingPlayerId,
    round: typeof raw.round === 'number' ? raw.round : 1,
    bag: asArray<unknown>(raw.bag)
      .map(sanitizeColor)
      .filter((color): color is TileColor => color !== null),
    factories: normalizeFactories(raw.factories),
    center: asArray<unknown>(raw.center)
      .map(sanitizeColor)
      .filter((color): color is TileColor => color !== null),
    centerHasStartingMarker: raw.centerHasStartingMarker !== false,
    boards,
    lastRoundScoring,
    winnerIds: asArray<unknown>(raw.winnerIds).filter(
      (id): id is string => typeof id === 'string',
    ),
  }
}
