import { useState, useRef, useEffect, useCallback } from 'react'
import TodoPanel from './components/TodoPanel'
import TimerPanel from './components/TimerPanel'
import StatsBar from './components/StatsBar'

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: number
  completedAt?: number
}

const POMODORO_DURATION = 25 * 60

function App() {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', text: '完成项目需求文档', completed: false, createdAt: Date.now() },
    { id: '2', text: '设计UI原型稿', completed: true, createdAt: Date.now() - 86400000, completedAt: Date.now() - 3600000 },
    { id: '3', text: '代码审查与优化', completed: false, createdAt: Date.now() - 3600000 },
  ])

  const [timerSeconds, setTimerSeconds] = useState(POMODORO_DURATION)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const addTodo = useCallback((text: string) => {
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: Date.now(),
    }
    setTodos(prev => [...prev, newTodo])
  }, [])

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id
          ? {
              ...todo,
              completed: !todo.completed,
              completedAt: !todo.completed ? Date.now() : undefined,
            }
          : todo
      )
    )
  }, [])

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id))
  }, [])

  const tick = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp
    }

    const delta = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp

    setTimerSeconds(prev => {
      if (prev <= 0) {
        setIsTimerRunning(false)
        playAlarm()
        return 0
      }
      const newTime = prev - delta / 1000
      return Math.max(0, newTime)
    })

    timerRef.current = requestAnimationFrame(tick)
  }, [])

  const playAlarm = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 880
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (e) {
      console.log('Audio not supported')
    }
  }

  const startTimer = useCallback(() => {
    if (isTimerRunning) return
    setIsTimerRunning(true)
    lastTimeRef.current = 0
    timerRef.current = requestAnimationFrame(tick)
  }, [isTimerRunning, tick])

  const pauseTimer = useCallback(() => {
    setIsTimerRunning(false)
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false)
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current)
      timerRef.current = null
    }
    setTimerSeconds(POMODORO_DURATION)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current)
      }
    }
  }, [])

  const total = todos.length
  const completed = todos.filter(t => t.completed).length
  const inProgress = total - completed

  const todayCompleted = todos.filter(t => {
    if (!t.completedAt) return false
    const today = new Date()
    const completedDate = new Date(t.completedAt)
    return (
      today.getFullYear() === completedDate.getFullYear() &&
      today.getMonth() === completedDate.getMonth() &&
      today.getDate() === completedDate.getDate()
    )
  }).length

  return (
    <div className="app">
      <div className="background-gradient"></div>
      <div className="container">
        <h1 className="title">
          <span className="title-gradient">个人效率看板</span>
        </h1>

        <StatsBar
          todayCompleted={todayCompleted}
          inProgress={inProgress}
          total={total}
        />

        <div className="main-content">
          <TodoPanel
            todos={todos}
            onAdd={addTodo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
          <TimerPanel
            seconds={timerSeconds}
            totalSeconds={POMODORO_DURATION}
            isRunning={isTimerRunning}
            onStart={startTimer}
            onPause={pauseTimer}
            onReset={resetTimer}
          />
        </div>
      </div>
    </div>
  )
}

export default App
