import React, { useRef, useState } from 'react'
import { Project, Stage, StageColors, StageOrder } from '../data/types'

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onDelete: () => void
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)

  const totalChengeng = project.chapters.reduce((sum, ch) => sum + ch.chengengCount, 0)
  const latestChapter = project.chapters.length > 0
    ? project.chapters.reduce((latest, ch) => ch.chapterNumber > latest.chapterNumber ? ch : latest)
    : null

  const overallProgress = project.chapters.length > 0
    ? project.chapters.reduce((sum, ch) => {
        const stageIndex = StageOrder.indexOf(ch.currentStage)
        const stageProgress = ch.stageProgress[ch.currentStage] / 100
        return sum + (stageIndex + stageProgress) / StageOrder.length
      }, 0) / project.chapters.length * 100
    : 0

  const handleMouseDown = () => {
    isLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      setShowDeleteConfirm(true)
    }, 1500)
  }

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleClick = () => {
    if (!isLongPress.current) {
      onClick()
    }
  }

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false)
    onDelete()
  }

  const heatColor = totalChengeng > 100 ? '#ef4444' : totalChengeng > 30 ? '#f59e0b' : '#6b7280'
  const heatWidth = Math.min((totalChengeng / 100) * 100, 100)

  return (
    <>
      <div
        className="project-card"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        <div
          className="project-cover"
          style={{ backgroundColor: project.coverColor || '#6b7280' }}
        >
          <span className="cover-text">漫画封面</span>
        </div>
        <div className="project-info">
          <h3 className="project-title">{project.title}</h3>
          {latestChapter && (
            <p className="project-latest">最新：第{latestChapter.chapterNumber}话</p>
          )}
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${overallProgress}%`,
                background: `linear-gradient(90deg, ${StageColors[Stage.Storyboard]}, ${StageColors[Stage.Finished]})`
              }}
            />
          </div>
          <div className="heat-bar">
            <div className="heat-track">
              <div
                className="heat-fill"
                style={{ width: `${heatWidth}%`, backgroundColor: heatColor }}
              />
            </div>
            <span className="heat-count">🔥 {totalChengeng}</span>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认删除</h3>
            </div>
            <div className="modal-body">
              <p>确定要删除漫画项目「{project.title}」吗？此操作不可恢复。</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>取消</button>
              <button className="btn-danger" onClick={handleConfirmDelete}>删除</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .project-card {
          width: 340px;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          user-select: none;
        }
        .project-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 10px 24px #aaa;
        }
        .project-cover {
          width: 220px;
          height: 160px;
          margin: 20px auto 0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cover-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 16px;
        }
        .project-info {
          padding: 16px 20px 20px;
        }
        .project-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .project-latest {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 12px;
        }
        .progress-track {
          width: 100%;
          height: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        .heat-bar {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .heat-track {
          flex: 1;
          height: 6px;
          background: #f3f4f6;
          border-radius: 3px;
          overflow: hidden;
        }
        .heat-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .heat-count {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #ffffff;
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
          overflow: hidden;
        }
        .modal-header {
          background: #f3f4f6;
          padding: 16px 20px;
        }
        .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        .modal-body {
          padding: 20px;
        }
        .modal-body p {
          font-size: 15px;
          color: #4b5563;
          line-height: 1.6;
        }
        .modal-footer {
          padding: 16px 20px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid #f3f4f6;
        }
        .btn-cancel, .btn-danger {
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s ease;
          font-family: inherit;
        }
        .btn-cancel {
          background: #f3f4f6;
          color: #4b5563;
        }
        .btn-cancel:hover {
          background: #e5e7eb;
        }
        .btn-danger {
          background: #ef4444;
          color: #ffffff;
        }
        .btn-danger:hover {
          background: #dc2626;
        }
        @media (max-width: 768px) {
          .project-card {
            width: 100%;
          }
          .modal-overlay {
            align-items: flex-end;
          }
          .modal-content {
            width: 100%;
            max-width: none;
            border-radius: 16px 16px 0 0;
          }
        }
      `}</style>
    </>
  )
}

export default ProjectCard
