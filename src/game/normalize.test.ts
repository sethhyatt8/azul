import { describe, expect, it } from 'vitest'
import { normalizeGameState } from './normalize'

const firebaseGame = {
  bag: ['black', 'blue'],
  boards: {
    a: {
      hasStartingMarker: false,
      patternLines: [{ tiles: 0 }, { tiles: 0 }, { tiles: 0 }, { tiles: 0 }, { tiles: 0 }],
      score: 0,
      wall: [
        [false, false, false, false, false],
        [false, false, false, false, false],
        [false, false, false, false, false],
        [false, false, false, false, false],
        [false, false, false, false, false],
      ],
    },
  },
  centerHasStartingMarker: true,
  currentPlayerIndex: 0,
  factories: [['yellow', 'red'], ['blue', 'white']],
  phase: 'drafting',
  playerOrder: ['a', 'b'],
  round: 1,
  startingPlayerId: 'a',
}

describe('normalizeGameState', () => {
  it('fills in missing center and winnerIds from Firebase payloads', () => {
    const game = normalizeGameState(firebaseGame)
    expect(game).not.toBeNull()
    expect(game?.center).toEqual([])
    expect(game?.winnerIds).toEqual([])
    expect(game?.boards.a.patternLines[0]).toEqual({ color: null, tiles: 0 })
  })

  it('reads array-like objects from Firebase', () => {
    const game = normalizeGameState({
      ...firebaseGame,
      playerOrder: { '0': 'a', '1': 'b' },
      center: { '0': 'red' },
    })
    expect(game?.playerOrder).toEqual(['a', 'b'])
    expect(game?.center).toEqual(['red'])
  })
})
