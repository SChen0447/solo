import React, { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { db } from './db'
import { Task, TeamData, Member, Column, Priority, MEMBER_COLORS } from './types'
import Board from './Board'
import Timeline from './Timeline'
import TaskDetailPanel from './TaskCard'

type ViewMode = 'board' | 'timeline'

const App: React.FC = () => {
  const [team, setTeam] = useState<TeamData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const savedTeam = await db.getTeam()
    const savedTasks = await db.getAllTasks()
    setTeam(savedTeam || null)
    setTasks(savedTasks)
    setIsLoading(false)
  }

  const handleSetupTeam = async (name: string, memberNames: string[]) => {
    const members: Member[] = memberNames.map((name, index) => ({
      id: uuidv4(),
      name,
      color: MEMBER_COLORS[index % MEMBER_COLORS.length],
      avatar: name.charAt(0).toUpperCase()
    }))
    const newTeam: TeamData = { name, members }
    await db.saveTeam(newTeam)
    setTeam(newTeam)

    if (tasks.length === 0 && members.length > 0) {
      const today = new Date()
      const sampleTasks: Task[] = [
        {
          id: uuidv4(),
          title: '产品需求分析',
          description: '<p>分析用户需求，整理产品功能列表</p>',
          column: Column.TODO,
          priority: Priority.HIGH,
          assigneeId: members[0].id,
          startDate: formatDate(today),
          dueDate: formatDate(addDays(today, 2)),
          subtasks: [
            { id: uuidv4(), title: '收集用户反馈', completed: false },
            { id: uuidv4(), title: '整理需求文档', completed: false }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: uuidv4(),
          title: 'UI 界面设计',
          description: '<p>完成主要页面的 <strong>UI 设计</strong>稿</p><ul><li>首页设计</li><li>详情页设计</li></ul>',
          column: Column.IN_PROGRESS,
          priority: Priority.MEDIUM,
          assigneeId: members[1].id,
          startDate: formatDate(addDays(today, 1)),
          dueDate: formatDate(addDays(today, 4)),
          subtasks: [
            { id: uuidv4(), title: '设计风格确定', completed: true },
            { id: uuidv4(), title: '原型图绘制', completed: false }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: uuidv4(),
          title: '前端开发',
          description: '<p>基于设计稿实现前端页面</p>',
          column: Column.IN_PROGRESS,
          priority: Priority.HIGH,
          assigneeId: members[2].id,
          startDate: formatDate(addDays(today, 2)),
          dueDate: formatDate(addDays(today, 7)),
          subtasks: [
            { id: uuidv4(), title: '项目搭建', completed: true },
            { id: uuidv4(), title: '组件开发', completed: false },
            { id: uuidv4(), title: '接口联调', completed: false }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: uuidv4(),
          title: '测试用例编写',
          description: '<p>编写功能测试用例</p>',
          column: Column.TODO,
          priority: Priority.LOW,
          assigneeId: members[3].id,
          startDate: formatDate(addDays(today, 3)),
          dueDate: formatDate(addDays(today, 5)),
          subtasks: [{ id: uuidv4(), title: '覆盖核心流程', completed: false }],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: uuidv4(),
          title: '项目初始化',
          description: '<p>已完成项目初始化工作</p>',
          column: Column.DONE,
          priority: Priority.MEDIUM,
          assigneeId: members[0].id,
          startDate: formatDate(addDays(today, -3)),
          dueDate: formatDate(addDays(today, -1)),
          subtasks: [
            { id: uuidv4(), title: '代码仓库创建', completed: true },
            { id: uuidv4(), title: '开发环境配置', completed: true }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
      for (const t of sampleTasks) {
        await db.addTask(t)
      }
      setTasks(sampleTasks)
    }
  }

  const handleTaskUpdate = async (task: Task) => {
    await db.updateTask(task.id, task)
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...task, updatedAt: Date.now() } : t)))
  }

  const handleTaskMove = async (taskId: string, newColumn: Column) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const updated = { ...task, column: newColumn, updatedAt: Date.now() }
    await db.updateTask(taskId, { column: newColumn, updatedAt: Date.now() })
    setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)))
  }

  const handleTaskDragUpdate = async (taskId: string, updates: Partial<Task>) => {
    await db.updateTask(taskId, { ...updates, updatedAt: Date.now() })
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t)))
  }

  const handleAddTask = async (column: Column) => {
    if (!team || team.members.length === 0) return
    const today = new Date()
    const newTask: Task = {
      id: uuidv4(),
      title: '新任务',
      description: '',
      column,
      priority: Priority.MEDIUM,
      assigneeId: team.members[0].id,
      startDate: formatDate(today),
      dueDate: formatDate(addDays(today, 3)),
      subtasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    await db.addTask(newTask)
    setTasks(prev => [...prev, newTask])
    setSelectedTask(newTask)
  }

  const handleDeleteTask = async (taskId: string) => {
    await db.deleteTask(taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    if (selectedTask?.id === taskId) {
      setSelectedTask(null)
    }
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    )
  }

  if (!team) {
    return <TeamSetup onSetup={handleSetupTeam} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="team-name">{team.name}</h1>
          <div className="team-members">
            {team.members.map(m => (
              <div
                key={m.id}
                className="member-avatar"
                style={{ backgroundColor: m.color }}
                title={m.name}
              >
                {m.avatar}
              </div>
            ))}
          </div>
        </div>
        <div className="header-right">
          <button
            className={`view-toggle ${viewMode === 'board' ? 'active' : ''}`}
            onClick={() => setViewMode('board')}
          >
            📋 看板
          </button>
          <button
            className={`view-toggle ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            📅 时间线
          </button>
        </div>
      </header>

      <main className="app-main">
        {viewMode === 'board' ? (
          <Board
            tasks={tasks}
            members={team.members}
            onTaskClick={setSelectedTask}
            onTaskMove={handleTaskMove}
            onAddTask={handleAddTask}
          />
        ) : (
          <Timeline
            tasks={tasks}
            members={team.members}
            onTaskClick={setSelectedTask}
            onTaskUpdate={handleTaskDragUpdate}
          />
        )}
      </main>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          members={team.members}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  )
}

const formatDate = (d: Date): string => d.toISOString().split('T')[0]

const addDays = (d: Date, days: number): Date => {
  const date = new Date(d)
  date.setDate(date.getDate() + days)
  return date
}

interface TeamSetupProps {
  onSetup: (name: string, members: string[]) => void
}

const TeamSetup: React.FC<TeamSetupProps> = ({ onSetup }) => {
  const [teamName, setTeamName] = useState('我的团队')
  const [memberInputs, setMemberInputs] = useState(['张三', '李四', '王五', '赵六', '钱七'])

  const updateMember = (idx: number, value: string) => {
    setMemberInputs(prev => prev.map((m, i) => (i === idx ? value : m)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validMembers = memberInputs.filter(m => m.trim().length > 0)
    if (teamName.trim() && validMembers.length >= 2) {
      onSetup(teamName.trim(), validMembers)
    }
  }

  return (
    <div className="setup-container">
      <form className="setup-form" onSubmit={handleSubmit}>
        <h2>创建团队</h2>
        <div className="form-group">
          <label>团队名称</label>
          <input
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="输入团队名称"
            required
          />
        </div>
        <div className="form-group">
          <label>团队成员 (至少2人)</label>
          {memberInputs.map((name, idx) => (
            <input
              key={idx}
              type="text"
              value={name}
              onChange={e => updateMember(idx, e.target.value)}
              placeholder={`成员 ${idx + 1}`}
              className="member-input"
            />
          ))}
        </div>
        <button type="submit" className="primary-btn">
          开始使用
        </button>
      </form>
    </div>
  )
}

export default App
