import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { groupBy } from 'lodash'
import type { Yarn, YarnCategory } from './types'

interface InventoryPanelProps {
  yarns: Yarn[]
  onSelectYarn: (yarn: Yarn) => void
}

const categoryConfig: Record<YarnCategory, { name: string; borderColor: string; titleBg: string }> = {
  warm: { name: '暖色系', borderColor: '#c97c5d', titleBg: '#fdf2ec' },
  cool: { name: '冷色系', borderColor: '#5d7c97', titleBg: '#ecf2f7' },
  neutral: { name: '中性色系', borderColor: '#8a7968', titleBg: '#f0ece7' },
  monochrome: { name: '黑白灰', borderColor: '#6e6e6e', titleBg: '#f0f0f0' }
}

const categoryOrder: YarnCategory[] = ['warm', 'cool', 'neutral', 'monochrome']

export default function InventoryPanel({ yarns, onSelectYarn }: InventoryPanelProps) {
  const [selectedDetail, setSelectedDetail] = useState<Yarn | null>(null)
  const grouped = groupBy(yarns, 'category')

  const handleCardClick = (yarn: Yarn, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-detail-trigger]')) {
      setSelectedDetail(yarn)
    } else {
      onSelectYarn(yarn)
    }
  }

  const handleDragStart = (e: React.DragEvent | MouseEvent | TouchEvent | PointerEvent, yarn: Yarn) => {
    if ('dataTransfer' in e) {
      e.dataTransfer.setData('yarn', JSON.stringify(yarn))
      e.dataTransfer.effectAllowed = 'copy'
    }
  }

  return (
    <div className="inventory-panel">
      {categoryOrder.map((cat) => {
        const config = categoryConfig[cat]
        const items = grouped[cat] || []
        return (
          <motion.div
            key={cat}
            className="category-section"
            style={{ borderColor: config.borderColor }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="category-title" style={{ background: config.titleBg, color: config.borderColor }}>
              {config.name}
              <span className="category-count">{items.length}</span>
            </div>
            <div className="cards-grid">
              {items.map((yarn, idx) => (
                <motion.div
                  key={yarn.id}
                  className="yarn-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, yarn)}
                  onClick={(e) => handleCardClick(yarn, e)}
                  whileHover={{ y: -6, scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                >
                  <motion.div
                    className="halo"
                    initial={false}
                    animate={{ scale: [1, 1.4, 1], opacity: [0, 0.4, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 + idx * 0.1 }}
                    style={{ background: yarn.color }}
                  />
                  <div className="color-circle" style={{ background: yarn.color, border: '1px solid rgba(0,0,0,0.12)' }} />
                  <div className="yarn-name">{yarn.name}</div>
                  <div className="yarn-meta">
                    <span>{yarn.grams}g</span>
                    <span className="batch">{yarn.batch}</span>
                  </div>
                  <button
                    className="detail-trigger"
                    data-detail-trigger
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedDetail(yarn)
                    }}
                  >
                    详情
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )
      })}

      <AnimatePresence>
        {selectedDetail && (
          <>
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedDetail(null)}
            />
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <button className="modal-close" onClick={() => setSelectedDetail(null)}>×</button>
              <div className="modal-header">
                <div className="detail-circle" style={{ background: selectedDetail.color }} />
                <div>
                  <h2>{selectedDetail.name}</h2>
                  <div className="detail-hex">{selectedDetail.hexCode}</div>
                </div>
              </div>
              <div className="modal-body">
                <div className="detail-row">
                  <span className="label">品牌</span>
                  <span>{selectedDetail.brand || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">剩余克数</span>
                  <span>{selectedDetail.grams}g</span>
                </div>
                <div className="detail-row">
                  <span className="label">批次号</span>
                  <span>{selectedDetail.batch}</span>
                </div>
                {selectedDetail.usageHistory && selectedDetail.usageHistory.length > 0 && (
                  <div className="detail-section">
                    <span className="label">使用记录</span>
                    <ul>
                      {selectedDetail.usageHistory.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedDetail.purchaseLink && (
                  <div className="detail-row">
                    <span className="label">购买链接</span>
                    <a href={selectedDetail.purchaseLink} target="_blank" rel="noreferrer">
                      {selectedDetail.purchaseLink}
                    </a>
                  </div>
                )}
              </div>
              <button
                className="add-to-palette-btn"
                onClick={() => {
                  onSelectYarn(selectedDetail)
                  setSelectedDetail(null)
                }}
              >
                + 添加到配色板
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .inventory-panel {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-height: 100%;
          overflow-y: auto;
        }
        .category-section {
          background: #ffffff;
          border-radius: 12px;
          border: 2px solid;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          overflow: hidden;
        }
        .category-title {
          padding: 10px 16px;
          font-weight: 600;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .category-count {
          font-size: 12px;
          font-weight: 400;
          opacity: 0.7;
          background: rgba(255,255,255,0.6);
          padding: 2px 8px;
          border-radius: 10px;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 12px;
          padding: 14px;
        }
        .yarn-card {
          position: relative;
          background: #fafaf7;
          border-radius: 10px;
          padding: 12px 10px 10px;
          text-align: center;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          user-select: none;
        }
        .halo {
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
        }
        .color-circle {
          width: 3cm;
          height: 3cm;
          max-width: 60px;
          max-height: 60px;
          border-radius: 50%;
          margin: 0 auto 8px;
        }
        .yarn-name {
          font-size: 13px;
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }
        .yarn-meta {
          font-size: 11px;
          color: #888;
          display: flex;
          justify-content: center;
          gap: 6px;
        }
        .yarn-meta .batch {
          opacity: 0.7;
        }
        .detail-trigger {
          margin-top: 6px;
          font-size: 11px;
          padding: 3px 8px;
          border: none;
          background: rgba(0,0,0,0.05);
          border-radius: 6px;
          cursor: pointer;
          color: #666;
        }
        .detail-trigger:hover {
          background: rgba(0,0,0,0.1);
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 100;
        }
        .modal-content {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #fff;
          width: 90%;
          max-width: 400px;
          border-radius: 14px;
          padding: 20px;
          z-index: 101;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        }
        .modal-close {
          position: absolute;
          top: 10px;
          right: 14px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
        }
        .modal-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid #eee;
        }
        .detail-circle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid rgba(0,0,0,0.1);
        }
        .modal-header h2 {
          font-size: 18px;
          margin: 0 0 4px;
        }
        .detail-hex {
          font-family: monospace;
          color: #888;
          font-size: 13px;
        }
        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .detail-row .label {
          color: #999;
        }
        .detail-row a {
          color: #5d7c97;
          text-decoration: none;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .detail-section {
          font-size: 13px;
        }
        .detail-section .label {
          color: #999;
          display: block;
          margin-bottom: 4px;
        }
        .detail-section ul {
          margin: 0;
          padding-left: 18px;
          color: #555;
        }
        .detail-section li {
          margin-bottom: 2px;
        }
        .add-to-palette-btn {
          width: 100%;
          padding: 10px;
          background: #8a7968;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
        }
        .add-to-palette-btn:hover {
          background: #6f5f50;
        }
        @media (max-width: 768px) {
          .color-circle {
            width: 2.4cm;
            height: 2.4cm;
            max-width: 48px;
            max-height: 48px;
          }
          .cards-grid {
            grid-template-columns: repeat(auto-fill, minmax(95px, 1fr));
            gap: 10px;
          }
        }
      `}</style>
    </div>
  )
}
