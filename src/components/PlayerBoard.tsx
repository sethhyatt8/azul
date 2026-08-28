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
  const tileSize = compact ? 22 : 26

  return (
    <div className={`player-board${compact ? ' compact' : ''}${highlight ? ' highlight' : ''}`}>
      <div className="player-board-header">
        <h3>{name}</h3>
        <span className="score">{board.score} pts</span>
      </div>

      <div className="board-rows">
        {board.patternLines.map((line, row) => {
          const canPick = selectableLines?.includes(row)
          const slotOffset = 5 - (row + 1)
          return (
            <div
              key={row}
              className={`board-row${canPick ? ' selectable' : ''}${picking && !canPick ? ' dimmed' : ''}`}
            >
              <button
                type="button"
                className="pattern-line"
                disabled={!canPick}
                onClick={() => onSelectLine?.(row)}
              >
                <div className="pattern-line-slots">
                  {Array.from({ length: 5 }, (_, col) => {
                    if (col < slotOffset) {
                      return <span key={col} className="pattern-spacer" aria-hidden="true" />
                    }
                    const slot = col - slotOffset
                    return (
                      <span key={col} className="pattern-slot">
                        {slot < line.tiles && line.color ? (
                          <Tile color={line.color} size={tileSize} />
                        ) : null}
                      </span>
                    )
                  })}
                </div>
              </button>

              <div className="wall-row">
                {board.wall[row].map((filled, colIndex) => {
                  const color = WALL_PATTERN[row][colIndex]
                  return (
                    <span key={colIndex} className={`wall-cell${filled ? ' filled' : ' ghost'}`}>
                      <Tile color={color} size={tileSize} faded={!filled} />
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
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
