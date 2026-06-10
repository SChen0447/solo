import React, { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { debounce } from 'lodash'
import ProjectCard from './components/ProjectCard'
import ProgressBoard from './components/ProgressBoard'
import { Project, Chapter, Stage, StageOrder, AppView } from './data/types'

const STORAGE_KEY = 'manga-workshop-data'
const COVER_COLORS = ['#6b7280', '#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2']

const createInitialProgress = (): Record<Stage, number> => ({
  [Stage.Storyboard]: 0,
  [Stage.LineArt]: 0,
  [Stage.Coloring]: 0,
  [Stage.Finished]: 0
})

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [view, setView] = useState<AppView>('project-list')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setProjects(parsed)
        }
      }
    } catch (e) {
      console.error('Failed to load data from localStorage', e)
    }
    setIsLoaded(true)
  }, [])

  const debouncedSave = useCallback(
    debounce((data: Project[]) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (e) {
        console.error('Failed to save data to localStorage', e)
      }
    }, 300),
    []
  )

  useEffect(() => {
    if (isLoaded) {
      debouncedSave(projects)
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [projects, isLoaded, debouncedSave])

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null

  const handleCreateProject = () => {
    if (!newTitle.trim()) return

    const now = Date.now()
    const newProject: Project = {
      id: uuidv4(),
      title: newTitle.trim().slice(0, 30),
      description: newDescription.trim(),
      coverColor: COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)],
      chapters: [],
      createdAt: now,
      updatedAt: now
    }

    setProjects(prev => [...prev, newProject])
    setNewTitle('')
    setNewDescription('')
    setShowCreateModal(false)
  }

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId))
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null)
      setView('project-list')
    }
  }

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    setView('project-detail')
  }

  const handleBack = () => {
    setView('project-list')
    setSelectedProjectId(null)
  }

  const handleAddChapter = () => {
    if (!selectedProjectId) return

    const now = Date.now()
    const project = projects.find(p => p.id === selectedProjectId)
    const nextNumber = project
      ? project.chapters.reduce((max, ch) => Math.max(max, ch.chapterNumber), 0) + 1
      : 1

    const newChapter: Chapter = {
      id: uuidv4(),
      projectId: selectedProjectId,
      chapterNumber: nextNumber,
      title: `第${nextNumber}话`,
      currentStage: Stage.Storyboard,
      stageProgress: createInitialProgress(),
      chengengCount: 0,
      createdAt: now,
      updatedAt: now
    }

    setProjects(prev =>
      prev.map(p =>
        p.id === selectedProjectId
          ? {
              ...p,
              chapters: [...p.chapters, newChapter],
              updatedAt: now
            }
          : p
      )
    )
  }

  const handleChengeng = (chapterId: string) => {
    if (!selectedProjectId) return
    const now = Date.now()

    setProjects(prev =>
      prev.map(p =>
        p.id === selectedProjectId
          ? {
              ...p,
              chapters: p.chapters.map(ch =>
                ch.id === chapterId
                  ? { ...ch, chengengCount: ch.chengengCount + 1, updatedAt: now }
                  : ch
              ),
              updatedAt: now
            }
          : p
      )
    )
  }

  const handleStageChange = (chapterId: string, targetStage: Stage) => {
    if (!selectedProjectId) return
    const now = Date.now()

    setProjects(prev =>
      prev.map(p =>
        p.id === selectedProjectId
          ? {
              ...p,
              chapters: p.chapters.map(ch => {
                if (ch.id !== chapterId) return ch

                const targetIndex = StageOrder.indexOf(targetStage)
                const newProgress = { ...ch.stageProgress }

                for (let i = 0; i < targetIndex; i++) {
                  newProgress[StageOrder[i]] = 100
                }

                if (newProgress[targetStage] < 100) {
                  newProgress[targetStage] = Math.min(newProgress[targetStage] + 25, 100)
                }

                return {
                  ...ch,
                  currentStage: targetStage,
                  stageProgress: newProgress,
                  updatedAt: now
                }
              }),
              updatedAt: now
            }
          : p
      )
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">漫创工坊</h1>
        {view === 'project-list' && (
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>+</button>
        )}
      </header>

      <main className="app-main">
        {view === 'project-list' ? (
          <div className="projects-grid">
            {projects.length === 0 ? (
              <div className="empty-projects">
                <p>还没有漫画项目，点击右上角 + 按钮创建第一个项目吧！</p>
              </div>
            ) : (
              projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => handleSelectProject(project.id)}
                  onDelete={() => handleDeleteProject(project.id)}
                />
              ))
            )}
          </div>
        ) : selectedProject ? (
          <ProgressBoard
            chapters={selectedProject.chapters}
            projectTitle={selectedProject.title}
            onChengeng={handleChengeng}
            onStageChange={handleStageChange}
            onAddChapter={handleAddChapter}
            onBack={handleBack}
          />
        ) : null}
      </main>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content create-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>创建新项目</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>漫画标题 <span className="required">*</span></label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value.slice(0, 30))}
                  placeholder="请输入漫画标题（最多30字）"
                  maxLength={30}
                  autoFocus
                />
                <span className="char-count">{newTitle.length}/30</span>
              </div>
              <div className="form-group">
                <label>简介</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="简单介绍一下这部漫画吧..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>取消</button>
              <button
                className="btn-primary"
                onClick={handleCreateProject}
                disabled={!newTitle.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .app-container {
          min-height: 100vh;
          padding-bottom: 40px;
        }
        .app-header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 32px 24px 24px;
        }
        .app-title {
          font-size: 36px;
          font-weight: 700;
          color: #1f2937;
          letter-spacing: 4px;
          text-align: center;
        }
        .create-btn {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: #3b82f6;
          color: #ffffff;
          font-size: 28px;
          font-weight: 300;
          cursor: pointer;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease, transform 0.2s ease;
          font-family: inherit;
        }
        .create-btn:hover {
          background: #2563eb;
          transform: translateY(-50%) scale(1.05);
        }
        .create-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        .app-main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(2, 340px);
          gap: 28px;
          justify-content: center;
          padding: 20px 0;
        }
        .empty-projects {
          grid-column: 1 / -1;
          background: #ffffff;
          border-radius: 16px;
          padding: 80px 20px;
          text-align: center;
          color: #6b7280;
          font-size: 16px;
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
          max-width: 480px;
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
        .form-group {
          margin-bottom: 20px;
          position: relative;
        }
        .form-group:last-child {
          margin-bottom: 0;
        }
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }
        .form-group .required {
          color: #ef4444;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          color: #1f2937;
          font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          resize: vertical;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .char-count {
          position: absolute;
          right: 0;
          bottom: -18px;
          font-size: 12px;
          color: #9ca3af;
        }
        .modal-footer {
          padding: 16px 20px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid #f3f4f6;
        }
        .btn-cancel, .btn-primary {
          padding: 8px 24px;
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
        .btn-primary {
          background: #3b82f6;
          color: #ffffff;
        }
        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }
        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .app-header {
            padding: 24px 16px 16px;
          }
          .app-title {
            font-size: 28px;
            letter-spacing: 2px;
          }
          .create-btn {
            right: 16px;
            width: 40px;
            height: 40px;
            font-size: 24px;
          }
          .app-main {
            padding: 0 16px;
          }
          .projects-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .modal-overlay {
            align-items: flex-end;
          }
          .modal-content {
            width: 100%;
            max-width: none;
            border-radius: 16px 16px 0 0;
          }
          .create-modal {
            max-height: 90vh;
            overflow-y: auto;
          }
        }
      `}</style>
    </div>
  )
}

export default App
