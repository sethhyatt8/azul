import type { Factory } from '../game/types'
import type { TileColor } from '../game/types'
import { StartingMarker, Tile } from './Tile'

type FactoryDisplayProps = {
  factories: Factory[]
  center: TileColor[]
  centerHasStartingMarker: boolean
  interactive: boolean
  selectedFactoryIndex: number | null
  onSelectFactory?: (factoryIndex: number) => void
  onSelectCenter?: () => void
}

export function FactoryDisplay({
  factories,
  center,
  centerHasStartingMarker,
  interactive,
  selectedFactoryIndex,
  onSelectFactory,
  onSelectCenter,
}: FactoryDisplayProps) {
  return (
    <div className="factory-area">
      <p className="hint">Tap a factory or the center, then choose a color and pattern line.</p>
      <div className="factory-grid">
        {factories.map((factory, index) => (
          <button
            key={index}
            type="button"
            className={`factory${selectedFactoryIndex === index ? ' selected' : ''}`}
            disabled={!interactive || factory.length === 0}
            onClick={() => onSelectFactory?.(index)}
          >
            {factory.length === 0 ? (
              <span className="factory-empty">Empty</span>
            ) : (
              factory.map((color, tileIndex) => <Tile key={`${index}-${tileIndex}`} color={color} />)
            )}
          </button>
        ))}
      </div>

      <div className="center-pool">
        <h3>Center</h3>
        {centerHasStartingMarker ? (
          <p className="hint center-marker-hint">
            First player to take from the center also gets the <strong>1</strong> marker (−1 point).
          </p>
        ) : null}
        <button
          type="button"
          className={`center-tiles center-select${selectedFactoryIndex === -1 ? ' selected' : ''}`}
          disabled={!interactive || (center.length === 0 && !centerHasStartingMarker)}
          onClick={() => onSelectCenter?.()}
        >
          {centerHasStartingMarker ? <StartingMarker /> : null}
          {center.length === 0 && !centerHasStartingMarker ? (
            <span className="factory-empty">Empty</span>
          ) : (
            center.map((color, index) => <Tile key={`center-${index}`} color={color} />)
          )}
        </button>
      </div>
    </div>
  )
}
