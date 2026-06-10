import React, { useState } from 'react'
import { Chapter, Stage, StageColors, StageLabels, StageOrder } from '../data/types'

interface ProgressBoardProps {
  chapters: Chapter[]
  onChengeng: (chapterId: string) => void
  onStageChange: (chapterId: string, stage: Stage) => void
  onAddChapter: () => void
  onBack: () => void
  projectTitle: string
}

const ProgressBoard: React.FC<ProgressBoardProps> = ({
  chapters,
  onChengeng,
  onStageChange,
  onAddChapter,
  onBack,
  projectTitle
}) => {
  const [animatingChengeng, setAnimatingChengeng] = useState<string | null>(null)
  const [countAnimating, setCountAnimating] = useState<string | null>(null)

  const sortedChapters = [...chapters].sort((a, b) => b.chengengCount - a.chengengCount)

  const handleChengeng = (chapterId: string) => {
    onChengeng(chapterId)
    setAnimatingChengeng(chapterId)
    setCountAnimating(chapterId)
    setTimeout(() => setAnimatingChengeng(null), 300)
    setTimeout(() => setCountAnimating(null), 300)
  }

  const handleStageClick = (chapter: Chapter, clickedStage: Stage) => {
    const currentIndex = StageOrder.indexOf(chapter.currentStage)
    const clickedIndex = StageOrder.indexOf(clickedStage)

    if (clickedIndex <= currentIndex) {
      if (clickedStage === chapter.currentStage && chapter.stageProgress[clickedStage] < 100) {
        onStageChange(chapter.id, clickedStage)
      } else if (clickedIndex < currentIndex) {
        onStageChange(chapter.id, clickedStage)
      }
    } else if (clickedIndex === currentIndex + 1 && chapter.stageProgress[chapter.currentStage] === 100) {
      onStageChange(chapter.id, clickedStage)
    }
  }

  return (
    <div className="progress-board">
      <div className="board-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h2 className="board-title">{projectTitle}</h2>
        <button className="add-chapter-btn" onClick={onAddChapter}>+ 新章节</button>
      </div>

      <div className="chapters-list">
        {sortedChapters.length === 0 ? (
          <div className="empty-state">
            <p>还没有章节，点击右上角按钮创建第一章吧！</p>
          </div>
        ) : (
          sortedChapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className={`chapter-card ${index < 3 ? 'top-heat' : ''}`}
              style={index < 3 ? { borderLeft: '4px solid #ef4444' } : {}}
            >
              <div className="chapter-header">
                <div className="chapter-title-section">
                  <span className="chapter-number">第{chapter.chapterNumber}话</span>
                  <span className="chapter-name">{chapter.title}</span>
                </div>
                <div className={`chengeng-count ${countAnimating === chapter.id ? 'count-animate' : ''}`}>
                  🔨 催更：{chapter.chengengCount}
                </div>
              </div>

              <div className="current-stage">
                当前阶段：
                <span
                  className="stage-badge"
                  style={{ backgroundColor: StageColors[chapter.currentStage] }}
                >
                  {StageLabels[chapter.currentStage]}
                </span>
              </div>

              <div className="progress-segments">
                {StageOrder.map((stage) => {
                  const stageIndex = StageOrder.indexOf(stage)
                  const currentIndex = StageOrder.indexOf(chapter.currentStage)
                  const isCompleted = stageIndex < currentIndex || (stageIndex === currentIndex && chapter.stageProgress[stage] === 100)
                  const isActive = stageIndex === currentIndex

                  return (
                    <div
                      key={stage}
                      className="stage-segment"
                      onClick={() => handleStageClick(chapter, stage)}
                    >
                      <div
                        className="stage-label"
                        style={{
                          color: isCompleted || isActive ? StageColors[stage] : '#9ca3af',
                          fontWeight: isActive ? 600 : 400
                        }}
                      >
                        {StageLabels[stage]}
                      </div>
                      <div className="segment-track">
                        <div
                          className="segment-fill"
                          style={{
                            width: isCompleted
                              ? '100%'
                              : isActive
                              ? `${chapter.stageProgress[stage]}%`
                              : '0%',
                            backgroundColor: StageColors[stage],
                            transition: 'width 0.5s ease'
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="chapter-actions">
                <button
                  className={`chengeng-btn ${animatingChengeng === chapter.id ? 'hammer-animate' : ''}`}
                  onClick={() => handleChengeng(chapter.id)}
                  title="催更"
                >
                  🔨
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .progress-board {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
        }
        .board-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          padding: 16px 20px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        .back-btn {
          padding: 8px 16px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          color: #4b5563;
          cursor: pointer;
          transition: background-color 0.2s ease;
          font-family: inherit;
        }
        .back-btn:hover {
          background: #e5e7eb;
        }
        .board-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }
        .add-chapter-btn {
          padding: 8px 20px;
          background: #3b82f6;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          color: #ffffff;
          cursor: pointer;
          transition: background-color 0.2s ease;
          font-family: inherit;
        }
        .add-chapter-btn:hover {
          background: #2563eb;
        }
        .chapters-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .empty-state {
          background: #ffffff;
          border-radius: 12px;
          padding: 60px 20px;
          text-align: center;
          color: #6b7280;
          font-size: 15px;
        }
        .chapter-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          position: relative;
        }
        .chapter-card.top-heat {
          background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, #ffffff 8%);
        }
        .chapter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .chapter-title-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .chapter-number {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        .chapter-name {
          font-size: 14px;
          color: #6b7280;
        }
        .chengeng-count {
          font-size: 14px;
          color: #ef4444;
          font-weight: 500;
          transition: opacity 0.3s ease;
        }
        .chengeng-count.count-animate {
          opacity: 0.5;
        }
        .current-stage {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          color: #4b5563;
        }
        .stage-badge {
          padding: 4px 12px;
          border-radius: 6px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 500;
        }
        .progress-segments {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        .stage-segment {
          flex: 1;
          cursor: pointer;
        }
        .stage-label {
          font-size: 12px;
          margin-bottom: 6px;
          transition: color 0.2s ease;
        }
        .segment-track {
          width: 100%;
          height: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
        }
        .segment-fill {
          height: 100%;
          border-radius: 4px;
        }
        .chapter-actions {
          display: flex;
          justify-content: flex-end;
        }
        .chengeng-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: #fef2f2;
          font-size: 22px;
          cursor: pointer;
          transition: transform 0.3s ease, background-color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chengeng-btn:hover {
          background: #fee2e2;
        }
        .chengeng-btn.hammer-animate {
          animation: hammerBounce 0.3s ease;
        }
        @keyframes hammerBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        @media (max-width: 768px) {
          .progress-board {
            padding: 16px;
          }
          .board-header {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
          .progress-segments {
            flex-wrap: wrap;
          }
          .stage-segment {
            min-width: calc(50% - 6px);
          }
        }
      `}</style>
    </div>
  )
}

export default ProgressBoard
