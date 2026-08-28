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
  lineIndex: number | null
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
  if (playerCount <= 2) return 5
  if (playerCount === 3) return 7
  return 9
}

function pourLidIntoBag(bag: TileColor[], lid: TileColor[]) {
  if (bag.length > 0 || lid.length === 0) return { bag, lid }
  return { bag: shuffle(lid), lid: [] as TileColor[] }
}

function drawTile(bag: TileColor[], lid: TileColor[]) {
  let nextBag = bag
  let nextLid = lid
  if (nextBag.length === 0) {
    const poured = pourLidIntoBag(nextBag, nextLid)
    nextBag = poured.bag
    nextLid = poured.lid
  }
  if (nextBag.length === 0) return { tile: null, bag: nextBag, lid: nextLid }
  const tile = nextBag[nextBag.length - 1]
  return { tile, bag: nextBag.slice(0, -1), lid: nextLid }
}

export function refillFactories(state: GameState): GameState {
  const count = factoryCount(state.playerOrder.length)
  let bag = [...state.bag]
  let lid = [...state.lid]
  const factories: Factory[] = []
  for (let i = 0; i < count; i += 1) {
    const tiles: TileColor[] = []
    for (let t = 0; t < 4; t += 1) {
      const drawn = drawTile(bag, lid)
      bag = drawn.bag
      lid = drawn.lid
      if (!drawn.tile) break
      tiles.push(drawn.tile)
    }
    factories.push(tiles)
  }
  return {
    ...state,
    bag,
    lid,
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
    lid: [],
    factories: [],
    center: [],
    centerHasStartingMarker: true,
    boards,
    winnerIds: [],
    roundScoringHistory: [],
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

export function validPlacementLines(board: PlayerBoard, color: TileColor): number[] {
  const lines: number[] = []
  for (let i = 0; i < 5; i += 1) {
    if (canPlaceOnLine(board, i, color)) lines.push(i)
  }
  return lines
}

export function factoryColorOptions(factory: Factory): Array<{ color: TileColor; count: number }> {
  const counts = new Map<TileColor, number>()
  for (const color of factory) {
    counts.set(color, (counts.get(color) ?? 0) + 1)
  }
  return TILE_COLORS.filter((color) => counts.has(color)).map((color) => ({
    color,
    count: counts.get(color)!,
  }))
}

export function centerColorOptions(center: TileColor[]): Array<{ color: TileColor; count: number }> {
  const counts = new Map<TileColor, number>()
  for (const color of center) {
    counts.set(color, (counts.get(color) ?? 0) + 1)
  }
  return TILE_COLORS.filter((color) => counts.has(color)).map((color) => ({
    color,
    count: counts.get(color)!,
  }))
}

function takeFromFactory(factory: Factory, color: TileColor) {
  const taken = factory.filter((tile) => tile === color)
  const remainder = factory.filter((tile) => tile !== color)
  return { taken, remainder }
}

function addToFloor(board: PlayerBoard, tiles: TileColor[]) {
  return { ...board, floorLine: [...board.floorLine, ...tiles] }
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

function placeTilesOnBoard(
  board: PlayerBoard,
  color: TileColor,
  count: number,
  lineIndex: number | null,
): PlayerBoard | EngineError {
  const validLines = validPlacementLines(board, color)
  if (validLines.length > 0) {
    if (lineIndex === null || !validLines.includes(lineIndex)) {
      return { error: 'Choose a pattern line for these tiles.' }
    }
    return placeOnPatternLine(board, lineIndex, color, count)
  }
  return addToFloor(board, Array.from({ length: count }, () => color))
}

export type DraftPick = Omit<DraftMove, 'lineIndex'>

export function validDraftMoves(state: GameState, playerId: string): DraftPick[] {
  if (state.phase !== 'drafting' || currentPlayerId(state) !== playerId) return []
  const moves: DraftPick[] = []
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
    factories[index] = []
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

  const placed = placeTilesOnBoard(board, move.color, taken.length, move.lineIndex)
  if ('error' in placed) return placed
  board = placed
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
    return { board, gained: 0, discarded: [] as TileColor[] }
  }
  const col = wallColumnForColor(lineIndex, line.color)
  const wall = board.wall.map((row) => [...row])
  wall[lineIndex][col] = true
  const gained = scorePlacement(wall, lineIndex, col)
  const patternLines = board.patternLines.map((item, index) =>
    index === lineIndex ? { color: null, tiles: 0 } : item,
  )
  const discarded = Array.from({ length: capacity - 1 }, () => line.color!)
  return {
    board: { ...board, wall, patternLines },
    gained,
    discarded,
  }
}

function resolveBoard(board: PlayerBoard) {
  let next: PlayerBoard = { ...board, floorLine: [], hasStartingMarker: false }
  let gained = 0
  const discarded: TileColor[] = [...board.floorLine]
  for (let lineIndex = 0; lineIndex < 5; lineIndex += 1) {
    const result = resolveLine(next, lineIndex)
    next = result.board
    gained += result.gained
    discarded.push(...result.discarded)
  }
  const penalty = floorPenalty(board.floorLine.length)
  if (board.hasStartingMarker) {
    next = { ...next, hasStartingMarker: false }
    gained -= 1
  }
  gained += penalty
  next = { ...next, score: Math.max(0, next.score + gained) }
  return { board: next, gained, discarded }
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
  let lid = [...state.lid]
  const markerHolder = state.playerOrder.find((id) => state.boards[id].hasStartingMarker) ?? null
  const nextStartingPlayerId = markerHolder ?? state.startingPlayerId

  for (const playerId of state.playerOrder) {
    const result = resolveBoard(state.boards[playerId])
    boards[playerId] = result.board
    lastRoundScoring[playerId] = result.gained
    lid.push(...result.discarded)
    if (completedRowCount(result.board.wall) > 0) triggerEnd = true
  }

  if (triggerEnd) {
    const finalBoards: Record<string, PlayerBoard> = {}
    const endGameBonusByPlayer: Record<string, number> = {}
    const lastRoundWithBonus = { ...lastRoundScoring }
    for (const playerId of state.playerOrder) {
      const bonus = endGameBonuses(boards[playerId])
      endGameBonusByPlayer[playerId] = bonus
      finalBoards[playerId] = {
        ...boards[playerId],
        score: boards[playerId].score + bonus,
      }
      lastRoundWithBonus[playerId] += bonus
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
      lid,
      lastRoundScoring: lastRoundWithBonus,
      roundScoringHistory: [...state.roundScoringHistory, lastRoundScoring],
      endGameBonuses: endGameBonusByPlayer,
      winnerIds,
      factories: [],
      center: [],
    }
  }

  const starterIndex = state.playerOrder.indexOf(nextStartingPlayerId)

  const next = refillFactories({
    ...state,
    boards,
    lid,
    lastRoundScoring,
    roundScoringHistory: [...state.roundScoringHistory, lastRoundScoring],
    round: state.round + 1,
    startingPlayerId: nextStartingPlayerId,
    currentPlayerIndex: starterIndex >= 0 ? starterIndex : 0,
    centerHasStartingMarker: true,
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
