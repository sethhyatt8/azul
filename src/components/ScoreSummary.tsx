import type { GameState } from '../game/types'

type ScoreSummaryProps = {
  game: GameState
  playerNames: Record<string, string>
}

function formatDelta(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

export function ScoreSummary({ game, playerNames }: ScoreSummaryProps) {
  const players = game.playerOrder.map((id) => ({
    id,
    name: playerNames[id] ?? 'Player',
  }))

  const roundHistory = game.roundScoringHistory ?? []
  const endBonuses = game.endGameBonuses

  return (
    <div className="score-summary">
      <h3>Score breakdown</h3>
      <div className="score-table-wrap">
        <table className="score-table">
          <thead>
            <tr>
              <th scope="col">Round</th>
              {players.map((player) => (
                <th key={player.id} scope="col">
                  {player.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roundHistory.length === 0 ? (
              <tr>
                <td colSpan={players.length + 1} className="score-empty">
                  Round-by-round scores were not recorded for this game.
                </td>
              </tr>
            ) : (
              roundHistory.map((round, index) => (
                <tr key={index}>
                  <th scope="row">Round {index + 1}</th>
                  {players.map((player) => {
                    const delta = round[player.id] ?? 0
                    return (
                      <td
                        key={player.id}
                        className={
                          delta > 0 ? 'score-positive' : delta < 0 ? 'score-negative' : ''
                        }
                      >
                        {formatDelta(delta)}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
            {endBonuses ? (
              <tr className="score-bonus-row">
                <th scope="row">End-game bonus</th>
                {players.map((player) => {
                  const bonus = endBonuses[player.id] ?? 0
                  return (
                    <td key={player.id} className={bonus > 0 ? 'score-positive' : ''}>
                      {formatDelta(bonus)}
                    </td>
                  )
                })}
              </tr>
            ) : null}
            <tr className="score-total-row">
              <th scope="row">Final total</th>
              {players.map((player) => (
                <td key={player.id}>
                  <strong>{game.boards[player.id]?.score ?? 0}</strong>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
