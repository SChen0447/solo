import { useState } from 'react'
import { SymmetryMode } from './App'
import './Toolbar.css'

interface ToolbarProps {
  currentColor: string
  setCurrentColor: (color: string) => void
  brushSize: number
  setBrushSize: (size: number) => void
  canvasSize: number
  setCanvasSize: (size: number) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onExport: () => void
  symmetryMode: SymmetryMode
  setSymmetryMode: (mode: SymmetryMode) => void
  showGrid: boolean
  setShowGrid: (show: boolean) => void
  defaultColors: string[]
  canUndo: boolean
  canRedo: boolean
}

function Toolbar({
  currentColor,
  setCurrentColor,
  brushSize,
  setBrushSize,
  canvasSize,
  setCanvasSize,
  onUndo,
  onRedo,
  onClear,
  onExport,
  symmetryMode,
  setSymmetryMode,
  showGrid,
  setShowGrid,
  defaultColors,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const canvasSizes = [16, 24, 32, 48, 64]
  const brushSizes = [1, 2, 3]
  const symmetryModes: { value: SymmetryMode; label: string; icon: string }[] = [
    { value: 'none', label: '关闭', icon: '○' },
    { value: 'horizontal', label: '水平对称', icon: '⇔' },
    { value: 'vertical', label: '垂直对称', icon: '⇕' },
    { value: 'center', label: '中心对称', icon: '✦' },
  ]

  return (
    <>
      <div className="toolbar-top">
        <div className="toolbar-left">
          <div className="logo">
            <span className="logo-icon">🎨</span>
            <span className="logo-text">像素画编辑器</span>
          </div>
        </div>

        <div className="toolbar-center">
          <div className="tool-group">
            <button
              className={`tool-btn undo-btn ${!canUndo ? 'disabled' : ''}`}
              onClick={onUndo}
              disabled={!canUndo}
              title="撤销 (Ctrl+Z)"
            >
              <span className="btn-icon">↶</span>
              <span className="btn-label">撤销</span>
            </button>
            <button
              className={`tool-btn redo-btn ${!canRedo ? 'disabled' : ''}`}
              onClick={onRedo}
              disabled={!canRedo}
              title="重做 (Ctrl+Y)"
            >
              <span className="btn-icon">↷</span>
              <span className="btn-label">重做</span>
            </button>
          </div>

          <div className="divider" />

          <div className="tool-group">
            <span className="group-label">笔刷</span>
            <div className="brush-sizes">
              {brushSizes.map((size) => (
                <button
                  key={size}
                  className={`size-btn ${brushSize === size ? 'active' : ''}`}
                  onClick={() => setBrushSize(size)}
                  title={`${size}x${size} 像素`}
                >
                  <span className="brush-preview" style={{ width: size * 6 + 4, height: size * 6 + 4 }} />
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          <div className="tool-group">
            <span className="group-label">对称</span>
            <div className="symmetry-modes">
              {symmetryModes.map((mode) => (
                <button
                  key={mode.value}
                  className={`symmetry-btn ${symmetryMode === mode.value ? 'active' : ''}`}
                  onClick={() => setSymmetryMode(mode.value)}
                  title={mode.label}
                >
                  <span className="symmetry-icon">{mode.icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          <div className="tool-group">
            <span className="group-label">画布</span>
            <select
              className="size-select"
              value={canvasSize}
              onChange={(e) => setCanvasSize(Number(e.target.value))}
            >
              {canvasSizes.map((size) => (
                <option key={size} value={size}>
                  {size}x{size}
                </option>
              ))}
            </select>
          </div>

          <div className="divider" />

          <div className="tool-group">
            <button
              className={`tool-btn grid-btn ${showGrid ? 'active' : ''}`}
              onClick={() => setShowGrid(!showGrid)}
              title="显示网格"
            >
              <span className="btn-icon">⊞</span>
              <span className="btn-label">网格</span>
            </button>
          </div>
        </div>

        <div className="toolbar-right">
          <button className="tool-btn clear-btn" onClick={onClear} title="清空画布">
            <span className="btn-icon">🗑</span>
            <span className="btn-label">清空</span>
          </button>
          <button className="tool-btn export-btn" onClick={onExport} title="导出PNG">
            <span className="btn-icon">💾</span>
            <span className="btn-label">导出</span>
          </button>
        </div>

        <button
          className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-section">
          <h3 className="sidebar-title">调色板</h3>
          <div className="color-picker-wrapper">
            <input
              type="color"
              className="color-picker"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
            />
            <span className="color-hex">{currentColor.toUpperCase()}</span>
          </div>
          <div className="color-palette">
            {defaultColors.map((color, index) => (
              <button
                key={index}
                className={`color-swatch ${currentColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
                title={color}
              >
                {currentColor === color && <span className="check-mark">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">操作提示</h3>
          <ul className="tips-list">
            <li><span className="tip-key">左键</span> 绘制</li>
            <li><span className="tip-key">右键</span> 擦除</li>
            <li><span className="tip-key">滚轮</span> 缩放</li>
            <li><span className="tip-key">Shift+拖拽</span> 平移</li>
            <li><span className="tip-key">Ctrl+Z</span> 撤销</li>
            <li><span className="tip-key">Ctrl+Y</span> 重做</li>
          </ul>
        </div>
      </div>
    </>
  )
}

export default Toolbar
