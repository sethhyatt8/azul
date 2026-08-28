import { WALL_PATTERN, type PlayerBoard } from '../game/types'
import { StartingMarker, Tile } from './Tile'

type PlayerBoardViewProps = {
  board: PlayerBoard
  name: string
  compact?: boolean
  highlight?: boolean
  selectableLines?: number[]
  onSelectLine?: (lineIndex: number) => void
}

export function PlayerBoardView({
  board,
  name,
  compact,
  highlight,
  selectableLines,
  onSelectLine,
}: PlayerBoardViewProps) {
  const picking = Boolean(onSelectLine && selectableLines)

  return (
    <div className={`player-board${compact ? ' compact' : ''}${highlight ? ' highlight' : ''}`}>
      <div className="player-board-header">
        <h3>{name}</h3>
        <span className="score">{board.score} pts</span>
      </div>

      <div className="board-grid">
        <div className="pattern-lines">
          {board.patternLines.map((line, row) => {
            const canPick = selectableLines?.includes(row)
            return (
              <button
                key={row}
                type="button"
                className={`pattern-line${canPick ? ' selectable' : ''}${picking && !canPick ? ' dimmed' : ''}`}
                disabled={!canPick}
                onClick={() => onSelectLine?.(row)}
              >
                {Array.from({ length: row + 1 }, (_, slot) => (
                  <span key={slot} className="pattern-slot">
                    {slot < line.tiles && line.color ? (
                      <Tile color={line.color} size={compact ? 20 : 24} />
                    ) : null}
                  </span>
                ))}
                {canPick ? <span className="line-pick-label">Place here</span> : null}
              </button>
            )
          })}
        </div>

        <div className="wall">
          {board.wall.map((row, rowIndex) => (
            <div key={rowIndex} className="wall-row">
              {row.map((filled, colIndex) => {
                const color = WALL_PATTERN[rowIndex][colIndex]
                return (
                  <span key={colIndex} className={`wall-cell${filled ? ' filled' : ' ghost'}`}>
                    <Tile color={color} size={compact ? 18 : 22} faded={!filled} />
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="floor-line">
        <span className="floor-label">Floor</span>
        {board.hasStartingMarker ? <StartingMarker size={compact ? 20 : 24} /> : null}
        {board.floorLine.map((color, index) => (
          <Tile key={index} color={color} size={compact ? 20 : 24} />
        ))}
      </div>
    </div>
  )
}
