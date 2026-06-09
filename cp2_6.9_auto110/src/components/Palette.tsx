interface PaletteProps {
  colors: string[]
  selectedColor: string
  collapsed: boolean
  onSelect: (color: string) => void
  onToggle: () => void
}

export default function Palette({
  colors,
  selectedColor,
  collapsed,
  onSelect,
  onToggle
}: PaletteProps) {
  return (
    <div className={`palette-container glass ${collapsed ? 'collapsed' : ''}`}>
      <div className="palette-toggle" onClick={onToggle} title={collapsed ? '展开调色板' : '折叠调色板'}>
        {collapsed ? '▼' : '▲'}
      </div>
      {collapsed ? (
        <div
          className="current-color-display"
          style={{ background: selectedColor }}
          title={selectedColor}
        />
      ) : (
        <div className="palette-grid">
          {colors.map((color) => (
            <div
              key={color}
              className={`palette-color ${selectedColor === color ? 'selected' : ''}`}
              style={{ background: color }}
              onClick={() => onSelect(color)}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  )
}
