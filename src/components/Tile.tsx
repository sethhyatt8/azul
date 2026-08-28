import type { TileColor } from '../game/types'

const LABELS: Record<TileColor, string> = {
  blue: 'Blue',
  yellow: 'Yellow',
  red: 'Red',
  black: 'Black',
  white: 'White',
}

type TileProps = {
  color: TileColor
  size?: number
  onClick?: () => void
  selected?: boolean
}

export function Tile({ color, size = 28, onClick, selected }: TileProps) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`tile tile-${color}${selected ? ' selected' : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      title={LABELS[color]}
      aria-label={LABELS[color]}
    />
  )
}

export function StartingMarker({ size = 28 }: { size?: number }) {
  return (
    <span className="starting-marker" style={{ width: size, height: size }} title="First player marker">
      1
    </span>
  )
}
