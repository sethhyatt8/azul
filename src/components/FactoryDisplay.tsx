import type { Factory } from '../game/types'
import type { TileColor } from '../game/types'
import { StartingMarker, Tile } from './Tile'

type FactoryDisplayProps = {
  factories: Factory[]
  center: TileColor[]
  centerHasStartingMarker: boolean
  interactive: boolean
  onPickFactory?: (factoryIndex: number, color: TileColor) => void
  onPickCenter?: (color: TileColor) => void
}

export function FactoryDisplay({
  factories,
  center,
  centerHasStartingMarker,
  interactive,
  onPickFactory,
  onPickCenter,
}: FactoryDisplayProps) {
  return (
    <div className="factory-area">
      <div className="factory-grid">
        {factories.map((factory, index) => (
          <div key={index} className="factory">
            {factory.length === 0 ? (
              <span className="factory-empty">Empty</span>
            ) : (
              factory.map((color, tileIndex) => (
                <Tile
                  key={`${index}-${tileIndex}`}
                  color={color}
                  onClick={
                    interactive && onPickFactory
                      ? () => onPickFactory(index, color)
                      : undefined
                  }
                />
              ))
            )}
          </div>
        ))}
      </div>

      <div className="center-pool">
        <h3>Center</h3>
        <div className="center-tiles">
          {centerHasStartingMarker ? <StartingMarker /> : null}
          {center.length === 0 && !centerHasStartingMarker ? (
            <span className="factory-empty">Empty</span>
          ) : (
            center.map((color, index) => (
              <Tile
                key={`center-${index}`}
                color={color}
                onClick={interactive && onPickCenter ? () => onPickCenter(color) : undefined}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
