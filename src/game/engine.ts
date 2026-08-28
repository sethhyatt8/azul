import {
  TILE_COLORS,
  WALL_PATTERN,
  type Factory,
  type GameState,
  type PatternLine,
  type Phase,
  type PlayerBoard,
  type TileColor,
} from './types'

export type DraftMove = {
  source: 'factory' | 'center'
  factoryIndex?: number
  color: TileColor
}

export type EngineError = { error: string }

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function createBag(): TileColor[] {
  const bag: TileColor[] = []
  for (const color of TILE_COLORS) {
    for (let i = 0; i < 20; i += 1) bag.push(color)
  }
  return shuffle(bag)
}

export function emptyBoard(): PlayerBoard {
  return {
    patternLines: Array.from({ length: 5 }, () => ({ color: null, tiles: 0 })),
    wall: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => false)),
    floorLine: [],
    hasStartingMarker: false,
    score: 0,
  }
}

export function factoryCount(playerCount: number) {
  if (playerCount <= 3) return 5
  return 7
}

export function refillFactories(state: GameState): GameState {
  const count = factoryCount(state.playerOrder.length)
  const bag = [...state.bag]
  const factories: Factory[] = []
  for (let i = 0; i < count; i += 1) {
    const tiles: TileColor[] = []
    for (let t = 0; t < 4; t += 1) {
      if (bag.length === 0) break
      tiles.push(bag.pop()!)
    }
    factories.push(tiles)
  }
  return {
    ...state,
    bag,
    factories,
    center: [],
  }
}

export function startGame(playerIds: string[]): GameState {
  const playerOrder = shuffle([...playerIds])
  const boards = Object.fromEntries(playerIds.map((id) => [id, emptyBoard()]))
  const base: GameState = {
    phase: 'drafting',
    playerOrder,
    currentPlayerIndex: 0,
    startingPlayerId: playerOrder[0],
    round: 1,
    bag: createBag(),
    factories: [],
    center: [],
    centerHasStartingMarker: true,
    boards,
    winnerIds: [],
  }
  return refillFactories(base)
}

function currentPlayerId(state: GameState) {
  return state.playerOrder[state.currentPlayerIndex]
}

function lineCapacity(lineIndex: number) {
  return lineIndex + 1
}

function wallColumnForColor(row: number, color: TileColor) {
  return WALL_PATTERN[row].indexOf(color)
}

function canPlaceOnLine(board: PlayerBoard, lineIndex: number, color: TileColor) {
  const line = board.patternLines[lineIndex]
  const col = wallColumnForColor(lineIndex, color)
  if (col < 0) return false
  if (board.wall[lineIndex][col]) return false
  if (line.tiles > 0 && line.color !== color) return false
  return true
}

function targetLine(board: PlayerBoard, color: TileColor): number | null {
  for (let i = 4; i >= 0; i -= 1) {
    if (canPlaceOnLine(board, i, color)) return i
  }
  return null
}

function takeFromFactory(factory: Factory, color: TileColor) {
  const taken = factory.filter((tile) => tile === color)
  const remainder = factory.filter((tile) => tile !== color)
  return { taken, remainder }
}

function addToFloor(board: PlayerBoard, tiles: TileColor[]) {
  const floor = [...board.floorLine, ...tiles]
  return { ...board, floorLine: floor.slice(0, 7) }
}

function placeOnPatternLine(board: PlayerBoard, lineIndex: number, color: TileColor, count: number) {
  const line = board.patternLines[lineIndex]
  const capacity = lineCapacity(lineIndex)
  const existing = line.tiles
  const space = capacity - existing
  const placed = Math.min(count, space)
  const overflow = count - placed
  const nextLine: PatternLine = {
    color: line.color ?? color,
    tiles: existing + placed,
  }
  const patternLines = board.patternLines.map((item, index) =>
    index === lineIndex ? nextLine : item,
  )
  let next = { ...board, patternLines }
  if (overflow > 0) {
    next = addToFloor(next, Array.from({ length: overflow }, () => color))
  }
  return next
}

function distributeTiles(board: PlayerBoard, color: TileColor, count: number) {
  const lineIndex = targetLine(board, color)
  if (lineIndex === null) {
    return addToFloor(board, Array.from({ length: count }, () => color))
  }
  return placeOnPatternLine(board, lineIndex, color, count)
}

export function validDraftMoves(state: GameState, playerId: string): DraftMove[] {
  if (state.phase !== 'drafting' || currentPlayerId(state) !== playerId) return []
  const moves: DraftMove[] = []
  const seen = new Set<string>()

  state.factories.forEach((factory, factoryIndex) => {
    for (const color of factory) {
      const key = `f:${factoryIndex}:${color}`
      if (!seen.has(key)) {
        seen.add(key)
        moves.push({ source: 'factory', factoryIndex, color })
      }
    }
  })

  for (const color of new Set(state.center)) {
    moves.push({ source: 'center', color })
  }

  return moves
}

export function applyDraft(
  state: GameState,
  playerId: string,
  move: DraftMove,
): GameState | EngineError {
  if (state.phase !== 'drafting') return { error: 'Not in drafting phase.' }
  if (currentPlayerId(state) !== playerId) return { error: 'Not your turn.' }

  const valid = validDraftMoves(state, playerId)
  const allowed = valid.some(
    (item) =>
      item.source === move.source &&
      item.color === move.color &&
      (move.source === 'center' || item.factoryIndex === move.factoryIndex),
  )
  if (!allowed) return { error: 'Invalid draft.' }

  let taken: TileColor[] = []
  const factories = state.factories.map((factory) => [...factory])
  let center = [...state.center]
  let centerHasStartingMarker = state.centerHasStartingMarker
  let board = { ...state.boards[playerId] }

  if (move.source === 'factory') {
    const index = move.factoryIndex ?? -1
    const factory = factories[index]
    if (!factory) return { error: 'Factory not found.' }
    const result = takeFromFactory(factory, move.color)
    taken = result.taken
    factories[index] = result.remainder
    center = [...center, ...result.remainder]
  } else {
    taken = center.filter((tile) => tile === move.color)
    center = center.filter((tile) => tile !== move.color)
    if (centerHasStartingMarker) {
      centerHasStartingMarker = false
      board = { ...board, hasStartingMarker: true }
    }
  }

  if (taken.length === 0) return { error: 'No tiles of that color.' }

  board = distributeTiles(board, move.color, taken.length)
  const boards = { ...state.boards, [playerId]: board }
  const startingPlayerId =
    move.source === 'center' && state.centerHasStartingMarker ? playerId : state.startingPlayerId

  const factoriesEmpty = factories.every((factory) => factory.length === 0)
  const centerEmpty = center.length === 0
  if (factoriesEmpty && centerEmpty) {
    return resolveRound({
      ...state,
      factories,
      center,
      centerHasStartingMarker,
      boards,
      startingPlayerId,
    })
  }

  const nextIndex = (state.currentPlayerIndex + 1) % state.playerOrder.length
  return {
    ...state,
    factories,
    center,
    centerHasStartingMarker,
    boards,
    startingPlayerId,
    currentPlayerIndex: nextIndex,
  }
}

function scorePlacement(wall: boolean[][], row: number, col: number) {
  if (!wall[row][col]) return 0
  let horizontal = 1
  for (let c = col - 1; c >= 0 && wall[row][c]; c -= 1) horizontal += 1
  for (let c = col + 1; c < 5 && wall[row][c]; c += 1) horizontal += 1

  let vertical = 1
  for (let r = row - 1; r >= 0 && wall[r][col]; r -= 1) vertical += 1
  for (let r = row + 1; r < 5 && wall[r][col]; r += 1) vertical += 1

  if (horizontal > 1 && vertical > 1) return horizontal + vertical
  if (horizontal > 1) return horizontal
  if (vertical > 1) return vertical
  return 1
}

function floorPenalty(count: number) {
  const penalties = [-1, -1, -2, -2, -2, -3, -3]
  return penalties.slice(0, count).reduce((sum, value) => sum + value, 0)
}

function resolveLine(board: PlayerBoard, lineIndex: number) {
  const line = board.patternLines[lineIndex]
  const capacity = lineCapacity(lineIndex)
  if (line.tiles < capacity || !line.color) {
    return { board, gained: 0 }
  }
  const col = wallColumnForColor(lineIndex, line.color)
  const wall = board.wall.map((row) => [...row])
  wall[lineIndex][col] = true
  const gained = scorePlacement(wall, lineIndex, col)
  const patternLines = board.patternLines.map((item, index) =>
    index === lineIndex ? { color: null, tiles: 0 } : item,
  )
  return {
    board: { ...board, wall, patternLines },
    gained,
  }
}

function resolveBoard(board: PlayerBoard) {
  let next: PlayerBoard = { ...board, floorLine: [], hasStartingMarker: false }
  let gained = 0
  for (let lineIndex = 0; lineIndex < 5; lineIndex += 1) {
    const result = resolveLine(next, lineIndex)
    next = result.board
    gained += result.gained
  }
  const penalty = floorPenalty(board.floorLine.length)
  if (board.hasStartingMarker) {
    next = { ...next, hasStartingMarker: false }
    gained -= 1
  }
  gained += penalty
  next = { ...next, score: Math.max(0, next.score + gained) }
  return { board: next, gained }
}

function completedRowCount(wall: boolean[][]) {
  return wall.filter((row) => row.every(Boolean)).length
}

function endGameBonuses(board: PlayerBoard) {
  let bonus = 0
  for (const row of board.wall) {
    if (row.every(Boolean)) bonus += 2
  }
  for (let col = 0; col < 5; col += 1) {
    if (board.wall.every((row) => row[col])) bonus += 7
  }
  for (const color of TILE_COLORS) {
    let count = 0
    for (let row = 0; row < 5; row += 1) {
      const col = wallColumnForColor(row, color)
      if (board.wall[row][col]) count += 1
    }
    if (count === 5) bonus += 10
  }
  return bonus
}

export function resolveRound(state: GameState): GameState {
  const lastRoundScoring: Record<string, number> = {}
  const boards: Record<string, PlayerBoard> = {}
  let triggerEnd = false
  const markerHolder = state.playerOrder.find((id) => state.boards[id].hasStartingMarker) ?? null
  const nextStartingPlayerId = markerHolder ?? state.startingPlayerId

  for (const playerId of state.playerOrder) {
    const result = resolveBoard(state.boards[playerId])
    boards[playerId] = result.board
    lastRoundScoring[playerId] = result.gained
    if (completedRowCount(result.board.wall) > 0) triggerEnd = true
  }

  if (triggerEnd) {
    const finalBoards: Record<string, PlayerBoard> = {}
    for (const playerId of state.playerOrder) {
      const bonus = endGameBonuses(boards[playerId])
      finalBoards[playerId] = {
        ...boards[playerId],
        score: boards[playerId].score + bonus,
      }
      lastRoundScoring[playerId] += bonus
    }
    const ranked = [...state.playerOrder].sort(
      (a, b) => finalBoards[b].score - finalBoards[a].score,
    )
    const top = finalBoards[ranked[0]].score
    const winnerIds = ranked.filter((id) => finalBoards[id].score === top)
    return {
      ...state,
      phase: 'gameOver',
      boards: finalBoards,
      lastRoundScoring,
      winnerIds,
      factories: [],
      center: [],
    }
  }

  const starterIndex = state.playerOrder.indexOf(nextStartingPlayerId)

  const next = refillFactories({
    ...state,
    boards,
    lastRoundScoring,
    round: state.round + 1,
    startingPlayerId: nextStartingPlayerId,
    currentPlayerIndex: starterIndex >= 0 ? starterIndex : 0,
    centerHasStartingMarker: markerHolder === null && state.centerHasStartingMarker,
    phase: 'drafting',
  })

  return next
}

export function describePhase(phase: Phase) {
  switch (phase) {
    case 'lobby':
      return 'Lobby'
    case 'drafting':
      return 'Draft tiles'
    case 'roundEnd':
      return 'Round scoring'
    case 'gameOver':
      return 'Game over'
    default:
      return phase
  }
}
