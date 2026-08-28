import { FactoryDisplay } from '../components/FactoryDisplay'
import { PlayerBoardView } from '../components/PlayerBoard'
import { emptyBoard } from '../game/engine'
import { MIN_PLAYERS } from '../room/protocol'
import type { RoomState } from '../room/roomLogic'
import type { ClientMessage } from '../room/protocol'
import type { TileColor } from '../game/types'

type RoomScreenProps = {
  state: RoomState
  error: string | null
  onSend: (message: ClientMessage) => void
  onLeave: () => void
}

function playerName(state: RoomState, id: string) {
  return state.players.find((player) => player.id === id)?.name ?? 'Player'
}

export function RoomScreen({ state, error, onSend, onLeave }: RoomScreenProps) {
  const game = state.game
  const currentName = state.currentPlayerId ? playerName(state, state.currentPlayerId) : null

  function pickFactory(factoryIndex: number, color: TileColor) {
    if (!state.isMyTurn) return
    onSend({ type: 'draft', source: 'factory', factoryIndex, color })
  }

  function pickCenter(color: TileColor) {
    if (!state.isMyTurn) return
    onSend({ type: 'draft', source: 'center', color })
  }

  return (
    <section className="screen room">
      <header className="room-header">
        <div>
          <p className="eyebrow">Room</p>
          <p className="room-code">{state.roomCode}</p>
        </div>
        <button type="button" className="btn ghost compact" onClick={onLeave}>
          Leave
        </button>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      <ul className="player-list">
        {state.players.map((player) => (
          <li key={player.id}>
            <span>{player.name}</span>
            <span className="player-tags">
              {player.id === state.hostId ? <span className="tag">Host</span> : null}
              {state.currentPlayerId === player.id && state.phase === 'drafting' ? (
                <span className="tag ready">Turn</span>
              ) : null}
              {game ? <span className="tag">{game.boards[player.id]?.score ?? 0} pts</span> : null}
            </span>
          </li>
        ))}
      </ul>

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
          <div className="status-bar">
            <p>
              Round {game.round} ·{' '}
              {state.isMyTurn ? <strong>Your turn</strong> : <span>{currentName}&apos;s turn</span>}
            </p>
          </div>

          <FactoryDisplay
            factories={game.factories ?? []}
            center={game.center ?? []}
            centerHasStartingMarker={game.centerHasStartingMarker}
            interactive={state.isMyTurn}
            onPickFactory={pickFactory}
            onPickCenter={pickCenter}
          />

          <div className="boards-stack">
            {state.players.map((player) => (
              <PlayerBoardView
                key={player.id}
                name={player.name}
                board={game.boards[player.id] ?? emptyBoard()}
                compact={player.id !== state.selfId}
                highlight={player.id === state.selfId}
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
