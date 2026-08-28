import { useMemo, useState } from 'react'
import { FactoryDisplay } from '../components/FactoryDisplay'
import { PlayerBoardView } from '../components/PlayerBoard'
import { ScoreSummary } from '../components/ScoreSummary'
import { Tile } from '../components/Tile'
import {
  centerColorOptions,
  emptyBoard,
  factoryColorOptions,
  validPlacementLines,
} from '../game/engine'
import type { TileColor } from '../game/types'
import { MIN_PLAYERS } from '../room/protocol'
import type { RoomState } from '../room/roomLogic'
import type { ClientMessage } from '../room/protocol'

type RoomScreenProps = {
  state: RoomState
  error: string | null
  onSend: (message: ClientMessage) => void
  onLeave: () => void
}

type DraftStep =
  | { kind: 'pick-source' }
  | { kind: 'pick-color'; source: 'factory' | 'center'; factoryIndex?: number }
  | { kind: 'pick-line'; source: 'factory' | 'center'; factoryIndex?: number; color: TileColor }

function playerName(state: RoomState, id: string) {
  return state.players.find((player) => player.id === id)?.name ?? 'Player'
}

function colorLabel(color: TileColor) {
  return color.charAt(0).toUpperCase() + color.slice(1)
}

export function RoomScreen({ state, error, onSend, onLeave }: RoomScreenProps) {
  const game = state.game
  const currentName = state.currentPlayerId ? playerName(state, state.currentPlayerId) : null
  const [draftStep, setDraftStep] = useState<DraftStep>({ kind: 'pick-source' })
  const turnToken = `${game?.round ?? 0}-${state.currentPlayerId ?? ''}`
  const [draftTurn, setDraftTurn] = useState('')
  const inGame = state.phase !== 'lobby'
  const showTurnFlash = state.isMyTurn && state.phase === 'drafting'

  const boardPlayers = useMemo(() => {
    const self = state.players.find((player) => player.id === state.selfId)
    const others = state.players.filter((player) => player.id !== state.selfId)
    return self ? [self, ...others] : state.players
  }, [state.players, state.selfId])

  const myBoard = game?.boards[state.selfId] ?? emptyBoard()
  const activeDraftStep = useMemo(
    () =>
      state.isMyTurn && draftTurn === turnToken ? draftStep : { kind: 'pick-source' as const },
    [state.isMyTurn, draftTurn, turnToken, draftStep],
  )

  const colorChoices = useMemo(() => {
    if (!game || activeDraftStep.kind !== 'pick-color') return []
    if (activeDraftStep.source === 'factory' && activeDraftStep.factoryIndex !== undefined) {
      return factoryColorOptions(game.factories[activeDraftStep.factoryIndex] ?? [])
    }
    if (activeDraftStep.source === 'center') {
      return centerColorOptions(game.center ?? [])
    }
    return []
  }, [activeDraftStep, game])

  const lineChoices = useMemo(() => {
    if (!game || activeDraftStep.kind !== 'pick-line') return []
    return validPlacementLines(myBoard, activeDraftStep.color)
  }, [activeDraftStep, game, myBoard])

  function resetDraft() {
    setDraftTurn('')
    setDraftStep({ kind: 'pick-source' })
  }

  function updateDraftStep(step: DraftStep) {
    setDraftTurn(turnToken)
    setDraftStep(step)
  }

  function selectFactory(factoryIndex: number) {
    if (!state.isMyTurn) return
    updateDraftStep({ kind: 'pick-color', source: 'factory', factoryIndex })
  }

  function selectCenter() {
    if (!state.isMyTurn) return
    updateDraftStep({ kind: 'pick-color', source: 'center' })
  }

  function selectColor(color: TileColor) {
    if (!state.isMyTurn || activeDraftStep.kind !== 'pick-color') return
    const lines = validPlacementLines(myBoard, color)
    if (lines.length === 0) {
      submitDraft({
        source: activeDraftStep.source,
        factoryIndex: activeDraftStep.factoryIndex,
        color,
        lineIndex: null,
      })
      return
    }
    if (lines.length === 1) {
      submitDraft({
        source: activeDraftStep.source,
        factoryIndex: activeDraftStep.factoryIndex,
        color,
        lineIndex: lines[0],
      })
      return
    }
    updateDraftStep({
      kind: 'pick-line',
      source: activeDraftStep.source,
      factoryIndex: activeDraftStep.factoryIndex,
      color,
    })
  }

  function selectLine(lineIndex: number) {
    if (!state.isMyTurn || activeDraftStep.kind !== 'pick-line') return
    submitDraft({
      source: activeDraftStep.source,
      factoryIndex: activeDraftStep.factoryIndex,
      color: activeDraftStep.color,
      lineIndex,
    })
  }

  function submitDraft(
    message: Omit<Extract<ClientMessage, { type: 'draft' }>, 'type'>,
  ) {
    onSend({ type: 'draft', ...message })
    resetDraft()
  }

  const selectedFactoryIndex =
    activeDraftStep.kind === 'pick-color' && activeDraftStep.source === 'factory'
      ? (activeDraftStep.factoryIndex ?? null)
      : activeDraftStep.kind === 'pick-line' && activeDraftStep.source === 'factory'
        ? (activeDraftStep.factoryIndex ?? null)
        : activeDraftStep.kind !== 'pick-source' && activeDraftStep.source === 'center'
          ? -1
          : null

  return (
    <section className={`screen room${inGame ? ' in-game' : ''}`}>
      {showTurnFlash ? <div key={turnToken} className="turn-flash-overlay" aria-hidden="true" /> : null}
      <header className={`room-header${inGame ? ' compact' : ''}`}>
        <div>
          {!inGame ? <p className="eyebrow">Room</p> : null}
          <p className="room-code">{state.roomCode}</p>
        </div>
        <button type="button" className="btn ghost compact" onClick={onLeave}>
          Leave
        </button>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      {!inGame ? (
        <ul className="player-list">
          {state.players.map((player) => (
            <li key={player.id}>
              <span>{player.name}</span>
              <span className="player-tags">
                {player.id === state.hostId ? <span className="tag">Host</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {state.phase === 'lobby' ? (
        <div className="panel">
          {state.isHost ? (
            <>
              <p>When everyone has joined, start the game.</p>
              <button
                type="button"
                className="btn primary"
                disabled={state.players.length < MIN_PLAYERS}
                onClick={() => onSend({ type: 'start' })}
              >
                Start game ({state.players.length}/{MIN_PLAYERS}+)
              </button>
            </>
          ) : (
            <p>Waiting for the host to start.</p>
          )}
        </div>
      ) : null}

      {game && state.phase === 'drafting' ? (
        <>
          <div
            key={showTurnFlash ? turnToken : 'waiting'}
            className={`status-bar${showTurnFlash ? ' your-turn' : ''}`}
          >
            <div className="status-main">
              <span className="status-round">Round {game.round}</span>
              {state.isMyTurn ? (
                <strong className="your-turn-label">Your turn</strong>
              ) : (
                <span>{currentName}&apos;s turn</span>
              )}
            </div>
            <div className="player-chips" aria-label="Scores">
              {state.players.map((player) => (
                <span
                  key={player.id}
                  className={`player-chip${player.id === state.currentPlayerId ? ' active' : ''}${player.id === state.selfId ? ' you' : ''}`}
                >
                  {player.name} · {game.boards[player.id]?.score ?? 0}
                </span>
              ))}
            </div>
            {state.isMyTurn ? (
              <p className="hint draft-hint">
                {activeDraftStep.kind === 'pick-source' && 'Step 1: choose a factory or the center.'}
                {activeDraftStep.kind === 'pick-color' && 'Step 2: choose which color to take (all tiles of that color).'}
                {activeDraftStep.kind === 'pick-line' &&
                  `Step 3: choose a pattern line for your ${colorLabel(activeDraftStep.color)} tiles.`}
              </p>
            ) : null}
          </div>

          {state.isMyTurn && activeDraftStep.kind === 'pick-color' ? (
            <div className="panel draft-panel">
              <p>Take all tiles of one color. Other colors from this factory go to the center.</p>
              <div className="color-choices">
                {colorChoices.map(({ color, count }) => (
                  <button
                    key={color}
                    type="button"
                    className="color-choice"
                    onClick={() => selectColor(color)}
                  >
                    <Tile color={color} size={32} />
                    <span>
                      {colorLabel(color)} ×{count}
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" className="btn ghost compact" onClick={resetDraft}>
                Back
              </button>
            </div>
          ) : null}

          {state.isMyTurn && activeDraftStep.kind === 'pick-line' ? (
            <div className="panel draft-panel">
              <p>Pattern lines that can hold {colorLabel(activeDraftStep.color)} tiles are highlighted.</p>
              <button
                type="button"
                className="btn ghost compact"
                onClick={() =>
                  updateDraftStep({
                    kind: 'pick-color',
                    source: activeDraftStep.source,
                    factoryIndex: activeDraftStep.factoryIndex,
                  })
                }
              >
                Back
              </button>
            </div>
          ) : null}

          <FactoryDisplay
            factories={game.factories ?? []}
            center={game.center ?? []}
            centerHasStartingMarker={game.centerHasStartingMarker}
            interactive={state.isMyTurn && activeDraftStep.kind === 'pick-source'}
            selectedFactoryIndex={selectedFactoryIndex}
            onSelectFactory={selectFactory}
            onSelectCenter={selectCenter}
          />

          <div className="boards-stack">
            {boardPlayers.map((player) => (
              <PlayerBoardView
                key={player.id}
                name={player.name}
                board={game.boards[player.id] ?? emptyBoard()}
                compact={player.id !== state.selfId}
                highlight={player.id === state.selfId}
                selectableLines={
                  state.isMyTurn && player.id === state.selfId && activeDraftStep.kind === 'pick-line'
                    ? lineChoices
                    : undefined
                }
                onSelectLine={
                  state.isMyTurn && player.id === state.selfId && activeDraftStep.kind === 'pick-line'
                    ? selectLine
                    : undefined
                }
              />
            ))}
          </div>
        </>
      ) : null}

      {game && state.phase === 'gameOver' ? (
        <div className="panel finale">
          <h2>Game over</h2>
          <p>
            {game.winnerIds?.length > 1
              ? 'Tie game!'
              : `${playerName(state, game.winnerIds[0])} wins!`}
          </p>
          <ScoreSummary
            game={game}
            playerNames={Object.fromEntries(
              state.players.map((player) => [player.id, player.name]),
            )}
          />
          <ul className="leaderboard">
            {[...state.players]
              .sort((a, b) => (game.boards[b.id]?.score ?? 0) - (game.boards[a.id]?.score ?? 0))
              .map((player, index) => (
                <li key={player.id} className={player.id === state.selfId ? 'you' : ''}>
                  <span className="rank">{index + 1}</span>
                  <span>{player.name}</span>
                  <span>{game.boards[player.id]?.score ?? 0}</span>
                </li>
              ))}
          </ul>
          {state.isHost ? (
            <button type="button" className="btn primary" onClick={() => onSend({ type: 'backToLobby' })}>
              Back to lobby
            </button>
          ) : (
            <p className="hint">Waiting for the host to start a new game.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}
