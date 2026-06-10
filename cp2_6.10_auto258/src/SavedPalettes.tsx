import { motion } from 'framer-motion'
import type { Palette } from './types'

interface SavedPalettesProps {
  palettes: Palette[]
  onLoad: (palette: Palette) => void
  onDelete: (id: string) => void
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day} ${hour}:${minute}`
}

export default function SavedPalettes({ palettes, onLoad, onDelete }: SavedPalettesProps) {
  const sorted = [...palettes].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="saved-palettes">
      <div className="saved-header">
        <h2>已保存方案</h2>
        <span className="saved-count">{palettes.length}</span>
      </div>

      {sorted.length === 0 ? (
        <div className="saved-empty">
          <div className="saved-empty-icon">📋</div>
          <p>还没有保存的配色方案</p>
          <p className="saved-empty-sub">完成配色后点击保存按钮</p>
        </div>
      ) : (
        <div className="saved-list">
          {sorted.map((palette, idx) => (
            <motion.div
              key={palette.id}
              className="saved-card"
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -3 }}
              onClick={() => onLoad(palette)}
            >
              <div className="saved-thumb">
                {palette.colors.length > 0 ? (
                  palette.colors.map((c, i) => (
                    <div
                      key={c.id}
                      className="thumb-color"
                      style={{
                        background: c.color,
                        width: `${100 / palette.colors.length}%`
                      }}
                    />
                  ))
                ) : (
                  <div className="thumb-empty" />
                )}
              </div>
              <div className="saved-info">
                <div className="saved-name">{palette.name}</div>
                <div className="saved-meta">
                  <span>{palette.colors.length}色</span>
                  <span>·</span>
                  <span>{formatDate(palette.createdAt)}</span>
                </div>
              </div>
              {palette.note && <div className="saved-note">{palette.note}</div>}
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(palette.id)
                }}
              >
                删除
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <style>{`
        .saved-palettes {
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #f7f3ec;
          height: 100%;
          overflow-y: auto;
        }
        .saved-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .saved-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: #4a3f35;
          margin: 0;
        }
        .saved-count {
          font-size: 13px;
          background: #c9b8a5;
          color: #fff;
          padding: 1px 9px;
          border-radius: 10px;
        }
        .saved-empty {
          text-align: center;
          color: #a89885;
          padding: 40px 10px;
        }
        .saved-empty-icon {
          font-size: 36px;
          margin-bottom: 10px;
        }
        .saved-empty p {
          margin: 4px 0;
          font-size: 13px;
        }
        .saved-empty-sub {
          font-size: 12px;
          opacity: 0.7;
        }
        .saved-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .saved-card {
          position: relative;
          background: #fff;
          border-radius: 10px;
          padding: 10px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          transition: box-shadow 0.2s;
        }
        .saved-card:hover {
          box-shadow: 0 4px 14px rgba(0,0,0,0.1);
        }
        .saved-thumb {
          display: flex;
          height: 36px;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 8px;
          border: 1px solid rgba(0,0,0,0.06);
        }
        .thumb-color {
          height: 100%;
        }
        .thumb-empty {
          width: 100%;
          height: 100%;
          background: #eee;
        }
        .saved-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 4px;
        }
        .saved-name {
          font-size: 13px;
          font-weight: 500;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .saved-meta {
          font-size: 11px;
          color: #999;
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .saved-note {
          font-size: 11px;
          color: #888;
          line-height: 1.4;
          max-height: 30px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          padding-right: 40px;
        }
        .delete-btn {
          position: absolute;
          right: 8px;
          bottom: 8px;
          font-size: 11px;
          padding: 3px 8px;
          border: 1px solid #e5c5be;
          background: #fdf2ef;
          color: #c0392b;
          border-radius: 5px;
          cursor: pointer;
        }
        .delete-btn:hover {
          background: #f8d7d0;
        }
      `}</style>
    </div>
  )
}
