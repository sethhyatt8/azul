import { describe, expect, it } from 'vitest'
import {
  applyDraft,
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
})
