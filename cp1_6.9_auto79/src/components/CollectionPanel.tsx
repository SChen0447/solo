import React from 'react'
import { Gradient } from '../data/presets'
import GradientCard from './GradientCard'

interface CollectionPanelProps {
  collections: Gradient[]
  onDelete: (id: string) => void
  isDark: boolean
}

const CollectionPanel: React.FC<CollectionPanelProps> = ({ collections, onDelete, isDark }) => {
  return (
    <div className={`collection-panel ${isDark ? 'dark' : ''}`}>
      <h3 className="panel-title">收藏夹</h3>
      {collections.length === 0 ? (
        <p className="empty-tip">暂无收藏，点击心形图标保存当前配色</p>
      ) : (
        <div className="collection-grid">
          {collections.map((item) => (
            <div key={item.id} className="collection-item">
              <GradientCard
                startColor={item.startColor}
                endColor={item.endColor}
                angle={item.angle}
                name={item.name}
              />
              <button
                className="delete-btn"
                onClick={() => onDelete(item.id)}
                title="删除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CollectionPanel
