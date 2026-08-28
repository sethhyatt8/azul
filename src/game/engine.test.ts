import { describe, expect, it } from 'vitest'
import {
  applyDraft,
  refillFactories,
  resolveRound,
  startGame,
  validDraftMoves,
  validPlacementLines,
} from './engine'
import type { TileColor } from './types'

function withLine(
  state: ReturnType<typeof startGame>,
  playerId: string,
  move: Omit<import('./engine').DraftMove, 'lineIndex'>,
) {
  const lines = validPlacementLines(state.boards[playerId], move.color)
  return { ...move, lineIndex: lines[0] ?? null }
}

function firstMove(state: ReturnType<typeof startGame>) {
  const playerId = state.playerOrder[state.currentPlayerIndex]
  const moves = validDraftMoves(state, playerId)
  return { playerId, move: withLine(state, playerId, moves[0]) }
}

describe('azul engine', () => {
  it('starts with factories and a current player', () => {
    const state = startGame(['a', 'b'])
    expect(state.phase).toBe('drafting')
    expect(state.factories.length).toBe(5)
    expect(state.factories.every((factory) => factory.length <= 4)).toBe(true)
    expect(state.playerOrder).toHaveLength(2)
  })

  it('uses 7 factory pads for 3 players and 9 for 4', () => {
    expect(startGame(['a', 'b', 'c']).factories.length).toBe(7)
    expect(startGame(['a', 'b', 'c', 'd']).factories.length).toBe(9)
  })

  it('starts with 100 tiles in the bag', () => {
    const state = startGame(['a', 'b'])
    const onBoard = state.factories.flat().length
    expect(state.bag.length + onBoard).toBe(100)
    expect(state.lid).toEqual([])
  })

  it('recycles discarded tiles from the lid when the bag is empty', () => {
    const state = startGame(['a', 'b', 'c', 'd'])
    const drawn = state.factories.flat().length
    const next = refillFactories({
      ...state,
      bag: [],
      lid: Array.from({ length: 36 }, () => 'blue' as TileColor),
      factories: [],
      center: [],
    })
    expect(next.factories.flat().length).toBe(36)
    expect(next.lid.length).toBe(0)
    expect(next.bag.length + next.factories.flat().length).toBe(36)
    expect(drawn).toBeGreaterThan(0)
  })

  it('returns floor tiles to the lid at round end', () => {
    let state = startGame(['a', 'b'])
    const playerId = state.playerOrder[0]
    state = {
      ...state,
      boards: {
        ...state.boards,
        [playerId]: {
          ...state.boards[playerId],
          floorLine: ['red', 'blue'],
        },
      },
      factories: state.factories.map(() => []),
      center: [],
    }

    const next = resolveRound(state)
    expect(next.lid).toEqual(expect.arrayContaining(['red', 'blue']))
    expect(next.boards[playerId].floorLine).toEqual([])
  })

  it('allows drafting from a factory', () => {
    const state = startGame(['a', 'b'])
    const { playerId, move } = firstMove(state)
    const next = applyDraft(state, playerId, move)
    expect('error' in next).toBe(false)
    if ('error' in next) return
    expect(next.boards[playerId].patternLines.some((line) => line.tiles > 0)).toBe(true)
  })

  it('rejects out-of-turn drafts', () => {
    const state = startGame(['a', 'b'])
    const currentId = state.playerOrder[state.currentPlayerIndex]
    const otherId = state.playerOrder.find((id) => id !== currentId)!
    const moves = validDraftMoves(state, currentId)
    const result = applyDraft(state, otherId, withLine(state, currentId, moves[0]))
    expect(result).toEqual({ error: 'Not your turn.' })
  })

  it('moves remainder tiles to the center from factories', () => {
    const state = startGame(['a', 'b'])
    const playerId = state.playerOrder[0]
    const factoryIndex = 0
    const color = state.factories[factoryIndex][0] as TileColor
    const next = applyDraft(state, playerId, {
      source: 'factory',
      factoryIndex,
      color,
      lineIndex: validPlacementLines(state.boards[playerId], color)[0] ?? null,
    })
    expect('error' in next).toBe(false)
    if ('error' in next) return
    const remainder = state.factories[factoryIndex].filter((tile) => tile !== color)
    expect(next.factories[factoryIndex]).toEqual([])
    expect(next.center).toEqual(remainder)
  })

  it('requires a pattern line when one is available', () => {
    const state = startGame(['a', 'b'])
    const playerId = state.playerOrder[state.currentPlayerIndex]
    const color = state.factories[0][0] as TileColor
    const result = applyDraft(state, playerId, {
      source: 'factory',
      factoryIndex: 0,
      color,
      lineIndex: null,
    })
    expect(result).toEqual({ error: 'Choose a pattern line for these tiles.' })
  })

  it('gives the starting marker when first to take from center each round', () => {
    const state = startGame(['a', 'b'])
    const playerId = state.playerOrder[state.currentPlayerIndex]
    const color = state.factories[0][0] as TileColor
    const afterFactory = applyDraft(state, playerId, {
      source: 'factory',
      factoryIndex: 0,
      color,
      lineIndex: validPlacementLines(state.boards[playerId], color)[0] ?? null,
    })
    expect('error' in afterFactory).toBe(false)
    if ('error' in afterFactory) return
    expect(afterFactory.center.length).toBeGreaterThan(0)

    const centerColor = afterFactory.center[0] as TileColor
    const nextPlayer = afterFactory.playerOrder[afterFactory.currentPlayerIndex]
    const afterCenter = applyDraft(afterFactory, nextPlayer, {
      source: 'center',
      color: centerColor,
      lineIndex: validPlacementLines(afterFactory.boards[nextPlayer], centerColor)[0] ?? null,
    })
    expect('error' in afterCenter).toBe(false)
    if ('error' in afterCenter) return
    expect(afterCenter.boards[nextPlayer].hasStartingMarker).toBe(true)
    expect(afterCenter.centerHasStartingMarker).toBe(false)
    expect(afterCenter.startingPlayerId).toBe(nextPlayer)
  })

  it('returns marker to center and rotates first player after each round', () => {
    let state = startGame(['a', 'b', 'c'])
    const markerHolder = state.playerOrder[1]
    state = {
      ...state,
      centerHasStartingMarker: false,
      startingPlayerId: markerHolder,
      boards: {
        ...state.boards,
        [markerHolder]: { ...state.boards[markerHolder], hasStartingMarker: true },
      },
      factories: state.factories.map(() => []),
      center: [],
    }

    const next = resolveRound(state)
    expect(next.centerHasStartingMarker).toBe(true)
    expect(next.playerOrder[next.currentPlayerIndex]).toBe(markerHolder)
    expect(next.boards[markerHolder].hasStartingMarker).toBe(false)
    expect(next.roundScoringHistory).toHaveLength(1)
    expect(next.roundScoringHistory[0]).toHaveProperty(markerHolder)
  })
})
