import { useState } from 'react'
import { useHabits } from '@/hooks/useHabits'
import { Timeline } from '@/components/Timeline'
import { StatsPanel } from '@/components/StatsPanel'
import { AddHabitModal } from '@/components/AddHabitModal'
import { getStorageSize } from '@/utils/storage'

type ViewMode = 'timeline' | 'stats'

export function App() {
  const {
    habits,
    records,
    storageWarning,
    addHabit,
    deleteHabit,
    checkIn,
    cancelCheckIn,
    getTodayProgress,
    getTodayMinutes,
    allStats,
  } = useHabits()

  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const storageMB = (getStorageSize() / (1024 * 1024)).toFixed(2)

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && (
            <div className="app-logo">
              <span className="logo-icon">🎯</span>
              <span className="logo-text">习惯追踪</span>
            </div>
          )}
          <button
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开' : '折叠'}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>

        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
            title="今日打卡"
          >
            <span className="tab-icon">📋</span>
            {!sidebarCollapsed && <span className="tab-label">今日打卡</span>}
          </button>
          <button
            className={`sidebar-tab ${viewMode === 'stats' ? 'active' : ''}`}
            onClick={() => setViewMode('stats')}
            title="数据统计"
          >
            <span className="tab-icon">📊</span>
            {!sidebarCollapsed && <span className="tab-label">数据统计</span>}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="habits-nav">
            <h3 className="nav-title">我的习惯</h3>
            <div className="habits-list">
              {habits.length === 0 ? (
                <p className="no-habits">暂无习惯</p>
              ) : (
                habits.map((habit) => {
                  const stats = allStats.find((s) => s.habitId === habit.id)
                  const isActive = activeHabitId === habit.id
                  return (
                    <div
                      key={habit.id}
                      className={`habit-tab ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveHabitId(isActive ? null : habit.id)}
                      title={habit.name}
                    >
                      <span className="habit-tab-icon">{habit.icon}</span>
                      <span className="habit-tab-name">{habit.name}</span>
                      {stats && stats.currentStreak > 0 && (
                        <span className="habit-tab-streak">🔥{stats.currentStreak}</span>
                      )}
                      <button
                        className="habit-tab-delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`确定要删除习惯"${habit.name}"吗？`)) {
                            deleteHabit(habit.id)
                            if (isActive) setActiveHabitId(null)
                          }
                        }}
                        title="删除"
                      >
                        ×
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {storageWarning && !sidebarCollapsed && (
          <div className="storage-warning">
            <span>⚠️</span>
            <span>存储已使用 {storageMB}MB，建议定期清理数据</span>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="app-header">
          <div>
            <h1 className="app-title">
              {viewMode === 'timeline' ? '今日打卡' : '数据统计'}
            </h1>
            <p className="app-subtitle">
              {viewMode === 'timeline'
                ? '坚持每一天，成就更好的自己'
                : '查看你的习惯完成轨迹'}
            </p>
          </div>
          <button
            className="add-habit-btn"
            onClick={() => setShowAddModal(true)}
            title="添加习惯"
          >
            +
          </button>
        </header>

        <div className="content-area" style={{ willChange: 'transform' }}>
          {viewMode === 'timeline' ? (
            <Timeline
              habits={habits}
              records={records}
              allStats={allStats}
              activeHabitId={activeHabitId}
              onSelectHabit={setActiveHabitId}
              onCheckIn={checkIn}
              onCancelCheckIn={cancelCheckIn}
              getTodayProgress={getTodayProgress}
              getTodayMinutes={getTodayMinutes}
            />
          ) : (
            <StatsPanel
              habits={habits}
              records={records}
              allStats={allStats}
              activeHabitId={activeHabitId}
            />
          )}
        </div>
      </main>

      <AddHabitModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={addHabit}
      />
    </div>
  )
}
