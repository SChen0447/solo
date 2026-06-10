import { useState, useEffect } from 'react'
import { motion, Reorder } from 'framer-motion'
import type { Yarn } from './types'
import { generatePreview } from './PreviewGenerator'

interface ColorPaletteProps {
  colors: Yarn[]
  onRemoveColor: (id: string) => void
  onReorder: (colors: Yarn[]) => void
  onAddFromDrop: (yarn: Yarn) => void
  onSave: (name: string, note: string) => void
}

export default function ColorPalette({ colors, onRemoveColor, onReorder, onAddFromDrop, onSave }: ColorPaletteProps) {
  const [paletteName, setPaletteName] = useState('')
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState<{ svgBase64: string; warmthIndex: number; contrastScore: number } | null>(null)
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    setPreview(null)
  }, [colors])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    try {
      const yarn = JSON.parse(e.dataTransfer.getData('yarn')) as Yarn
      onAddFromDrop(yarn)
    } catch {
      /* ignore */
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(true)
  }

  const handleDragLeave = () => setIsOver(false)

  const handleGeneratePreview = () => {
    if (colors.length === 0) return
    const hexColors = colors.map((c) => c.color)
    const result = generatePreview(hexColors)
    setPreview(result)
  }

  const handleSave = () => {
    if (colors.length === 0) return
    onSave(paletteName || `未命名方案 ${new Date().toLocaleDateString()}`, note)
    setPaletteName('')
    setNote('')
  }

  return (
    <div className="color-palette">
      <div className="palette-header">
        <h2>配色方案板</h2>
        <div className="color-count">{colors.length}/4</div>
      </div>

      <div
        className={`palette-board ${isOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {colors.length === 0 ? (
          <div className="empty-hint">
            <div className="empty-icon">🧶</div>
            <p>从库存墙拖拽色卡到这里</p>
            <p className="hint-sub">或点击色卡快速添加</p>
          </div>
        ) : (
          <Reorder.Group axis="x" values={colors} onReorder={onReorder} className="swatches-list">
            {colors.map((yarn, index) => (
              <Reorder.Item key={yarn.id} value={yarn} className="swatch-wrapper">
                <motion.div
                  className="swatch"
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  whileTap={{ scale: 1.08 }}
                  style={{ background: yarn.color }}
                >
                  <div className="swatch-label">
                    <div className="swatch-name">{yarn.name}</div>
                    <div className="swatch-hex">{yarn.hexCode}</div>
                  </div>
                  <button
                    className="swatch-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveColor(yarn.id)
                    }}
                  >
                    ×
                  </button>
                  <div className="swatch-index">{index + 1}</div>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <div className="preview-section">
        <button
          className="generate-btn"
          onClick={handleGeneratePreview}
          disabled={colors.length === 0}
        >
          ✨ 生成预览
        </button>

        {preview && (
          <motion.div
            className="preview-result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="preview-image-wrapper">
              <img src={preview.svgBase64} alt="配色预览" className="preview-image" />
            </div>
            <div className="scores">
              <div className="score-item">
                <div className="score-label">温暖指数</div>
                <div className="score-value" style={{ color: preview.warmthIndex > 60 ? '#c97c5d' : '#5d7c97' }}>
                  {preview.warmthIndex}
                </div>
                <div className="score-bar">
                  <div className="score-bar-fill warm" style={{ width: `${preview.warmthIndex}%` }} />
                </div>
              </div>
              <div className="score-item">
                <div className="score-label">对比度</div>
                <div className="score-value" style={{ color: preview.contrastScore > 60 ? '#1e8449' : '#b8860b' }}>
                  {preview.contrastScore}
                </div>
                <div className="score-bar">
                  <div className="score-bar-fill contrast" style={{ width: `${preview.contrastScore}%` }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="save-section">
        <input
          type="text"
          className="name-input"
          placeholder="方案名称..."
          value={paletteName}
          onChange={(e) => setPaletteName(e.target.value)}
        />
        <textarea
          className="note-input"
          placeholder="备注（可选）..."
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={colors.length === 0}
        >
          💾 保存配色方案
        </button>
      </div>

      <style>{`
        .color-palette {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #faf7f2;
          height: 100%;
          overflow-y: auto;
        }
        .palette-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .palette-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #4a3f35;
          margin: 0;
        }
        .color-count {
          font-size: 14px;
          background: #8a7968;
          color: #fff;
          padding: 2px 10px;
          border-radius: 10px;
        }
        .palette-board {
          min-height: 160px;
          background: #fdfaf5;
          border: 2px dashed #c9b8a5;
          border-radius: 14px;
          padding: 16px;
          transition: all 0.2s ease;
        }
        .palette-board.drag-over {
          background: #fdf2ec;
          border-color: #c97c5d;
          border-style: solid;
        }
        .empty-hint {
          text-align: center;
          color: #a89885;
          padding: 30px 10px;
        }
        .empty-icon {
          font-size: 40px;
          margin-bottom: 8px;
        }
        .empty-hint p {
          margin: 4px 0;
          font-size: 14px;
        }
        .hint-sub {
          font-size: 12px;
          opacity: 0.7;
        }
        .swatches-list {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .swatch-wrapper {
          list-style: none;
        }
        .swatch {
          position: relative;
          width: 120px;
          height: 80px;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          cursor: grab;
          overflow: hidden;
          transition: transform 0.2s ease;
        }
        .swatch:active {
          cursor: grabbing;
        }
        .swatch-label {
          position: absolute;
          left: 6px;
          right: 6px;
          bottom: 6px;
          background: rgba(255,255,255,0.92);
          color: #111;
          padding: 4px 6px;
          border-radius: 5px;
          font-size: 10px;
          line-height: 1.3;
        }
        .swatch-name {
          font-weight: 600;
          font-size: 11px;
        }
        .swatch-hex {
          font-family: monospace;
          font-size: 10px;
          opacity: 0.7;
        }
        .swatch-remove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.9);
          color: #c0392b;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .swatch-remove:hover {
          background: #fff;
        }
        .swatch-index {
          position: absolute;
          top: 4px;
          left: 6px;
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        }
        .preview-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .generate-btn {
          padding: 12px;
          background: linear-gradient(135deg, #8a7968, #6f5f50);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .generate-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(138, 121, 104, 0.3);
        }
        .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .preview-result {
          background: #fff;
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        }
        .preview-image-wrapper {
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .preview-image {
          width: 100%;
          height: auto;
          display: block;
        }
        .scores {
          display: flex;
          gap: 16px;
        }
        .score-item {
          flex: 1;
        }
        .score-label {
          font-size: 12px;
          color: #888;
          margin-bottom: 4px;
        }
        .score-value {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .score-bar {
          height: 6px;
          background: #eee;
          border-radius: 3px;
          overflow: hidden;
        }
        .score-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s ease;
        }
        .score-bar-fill.warm {
          background: linear-gradient(90deg, #5d7c97, #c97c5d);
        }
        .score-bar-fill.contrast {
          background: linear-gradient(90deg, #b8860b, #1e8449);
        }
        .save-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .name-input, .note-input {
          padding: 10px 12px;
          border: 1px solid #d8cfc4;
          border-radius: 8px;
          font-size: 13px;
          background: #fff;
          font-family: inherit;
          resize: vertical;
        }
        .name-input:focus, .note-input:focus {
          outline: none;
          border-color: #8a7968;
        }
        .save-btn {
          padding: 11px;
          background: #c97c5d;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .save-btn:hover:not(:disabled) {
          background: #b06a4d;
        }
        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
