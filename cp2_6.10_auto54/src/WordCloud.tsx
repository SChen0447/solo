import React, { useState, useMemo } from 'react'
import { TagStats, calculateFontSize, getTagColor } from './data'

interface WordCloudProps {
  tags: TagStats[]
  selectedTag: string | null
  onTagClick: (tag: string | null) => void
}

const WordCloud: React.FC<WordCloudProps> = ({ tags, selectedTag, onTagClick }) => {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)

  const shuffledTags = useMemo(() => {
    return [...tags].sort(() => Math.random() - 0.5)
  }, [tags])

  return (
    <div
      style={{
        margin: '20px',
        padding: '30px',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
        borderRadius: '16px',
        border: '2px solid transparent',
        backgroundImage: `linear-gradient(rgba(26, 26, 46, 0.95), rgba(26, 26, 46, 0.95)), linear-gradient(135deg, #667eea, #764ba2)`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        minHeight: '200px'
      }}
    >
      <h2
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#fff',
          marginBottom: '20px',
          textAlign: 'center'
        }}
      >
        🔥 热度词云
        {selectedTag && (
          <button
            onClick={() => onTagClick(null)}
            style={{
              marginLeft: '12px',
              padding: '4px 12px',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: '#667eea',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease-out'
            }}
          >
            清除筛选: {selectedTag}
          </button>
        )}
      </h2>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px 20px',
          padding: '10px',
          minHeight: '150px'
        }}
      >
        {shuffledTags.length === 0 ? (
          <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
            暂无标签数据
          </span>
        ) : (
          shuffledTags.map(tag => {
            const fontSize = calculateFontSize(Math.max(1, tag.totalVotes))
            const isSelected = selectedTag === tag.name
            const isHovered = hoveredTag === tag.name

            return (
              <div
                key={tag.name}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-out',
                  transform: isHovered ? 'scale(1.3)' : isSelected ? 'scale(1.1)' : 'scale(1)',
                  zIndex: isHovered ? 10 : 1
                }}
                onClick={() => onTagClick(isSelected ? null : tag.name)}
                onMouseEnter={() => setHoveredTag(tag.name)}
                onMouseLeave={() => setHoveredTag(null)}
              >
                <span
                  style={{
                    fontSize: `${fontSize}px`,
                    fontWeight: fontSize > 24 ? '700' : fontSize > 18 ? '600' : '500',
                    color: getTagColor(tag.name),
                    textShadow: isSelected ? `0 0 10px ${getTagColor(tag.name)}80` : 'none',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                    transition: 'all 0.2s ease-out',
                    userSelect: 'none'
                  }}
                >
                  {tag.name}
                </span>

                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: '8px',
                      padding: '10px 14px',
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      zIndex: 100,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      animation: 'fadeIn 0.2s ease-out'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{tag.name}</div>
                    <div style={{ color: '#aaa', fontSize: '12px' }}>
                      📋 {tag.count} 张卡片 | 👍 {tag.totalVotes} 票
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        border: '6px solid transparent',
                        borderTopColor: 'rgba(0, 0, 0, 0.9)'
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 5px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @media (max-width: 768px) {
          div[style*="flexWrap: wrap"] {
            gap: 8px 12px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default WordCloud
