import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { Question, Player, QuestionPhase, AnswerSubmission } from './types'
import { QuestionPanel } from './components/QuestionPanel'
import { ScoreBoard } from './components/ScoreBoard'
import { PlayerList } from './components/PlayerList'
import { HostPanel } from './components/HostPanel'
import './styles/App.css'

interface AppProps {
  socket: Socket | null
  isHost?: boolean
}

const MOCK_PLAYERS: Player[] = [
  { id: 'p1', name: '张三', score: 0 },
  { id: 'p2', name: '李四', score: 0 },
  { id: 'p3', name: '王五', score: 0 },
  { id: 'p4', name: '赵六', score: 0 },
  { id: 'p5', name: '钱七', score: 0 },
  { id: 'p6', name: '孙八', score: 0 },
  { id: 'p7', name: '周九', score: 0 },
  { id: 'p8', name: '吴十', score: 0 }
]

export const App: React.FC<AppProps> = ({ socket, isHost = true }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [phase, setPhase] = useState<QuestionPhase>('idle')
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS)
  const [answeredPlayerIds, setAnsweredPlayerIds] = useState<Set<string>>(new Set())
  const clearTimerRef = useRef<number | null>(null)

  const handleTimeout = useCallback(() => {
    setPhase('revealed')
    if (clearTimerRef.current !== null) {
      clearTimeout(clearTimerRef.current)
    }
    clearTimerRef.current = window.setTimeout(() => {
      setCurrentQuestion(null)
      setPhase('idle')
      setAnsweredPlayerIds(new Set())
    }, 3000)
  }, [])

  const handleTerminate = useCallback(() => {
    setPhase('revealed')
    if (clearTimerRef.current !== null) {
      clearTimeout(clearTimerRef.current)
    }
    clearTimerRef.current = window.setTimeout(() => {
      setCurrentQuestion(null)
      setPhase('idle')
      setAnsweredPlayerIds(new Set())
    }, 3000)
  }, [])

  const processAnswer = useCallback((submission: AnswerSubmission) => {
    if (!currentQuestion || phase !== 'active') return
    if (answeredPlayerIds.has(submission.playerId)) return

    setAnsweredPlayerIds(prev => {
      const next = new Set(prev)
      next.add(submission.playerId)
      return next
    })

    const isCorrect = submission.answer === currentQuestion.correctAnswer
    const scoreDelta = isCorrect ? 10 : -2

    setPlayers(prev => prev.map(p =>
      p.id === submission.playerId
        ? { ...p, score: Math.max(0, p.score + scoreDelta), lastUpdated: Date.now() }
        : p
    ))
  }, [currentQuestion, phase, answeredPlayerIds])

  const handlePublishQuestion = useCallback((question: Question) => {
    if (clearTimerRef.current !== null) {
      clearTimeout(clearTimerRef.current)
      clearTimerRef.current = null
    }
    setCurrentQuestion(question)
    setPhase('active')
    setAnsweredPlayerIds(new Set())

    if (socket) {
      socket.emit('question:publish', question)
    }
  }, [socket])

  useEffect(() => {
    if (!socket) return

    const handleQuestionPublished = (question: Question) => {
      if (clearTimerRef.current !== null) {
        clearTimeout(clearTimerRef.current)
        clearTimerRef.current = null
      }
      setCurrentQuestion(question)
      setPhase('active')
      setAnsweredPlayerIds(new Set())
    }

    const handleAnswerSubmitted = (submission: AnswerSubmission) => {
      processAnswer(submission)
    }

    const handleQuestionTerminated = () => {
      setPhase('revealed')
      if (clearTimerRef.current !== null) {
        clearTimeout(clearTimerRef.current)
      }
      clearTimerRef.current = window.setTimeout(() => {
        setCurrentQuestion(null)
        setPhase('idle')
        setAnsweredPlayerIds(new Set())
      }, 3000)
    }

    socket.on('question:publish', handleQuestionPublished)
    socket.on('answer:submit', handleAnswerSubmitted)
    socket.on('question:terminate', handleQuestionTerminated)

    return () => {
      socket.off('question:publish', handleQuestionPublished)
      socket.off('answer:submit', handleAnswerSubmitted)
      socket.off('question:terminate', handleQuestionTerminated)
    }
  }, [socket, processAnswer])

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) {
        clearTimeout(clearTimerRef.current)
      }
    }
  }, [])

  const simulateAnswer = useCallback((playerId: string, answer: string) => {
    if (!currentQuestion || phase !== 'active') return
    const submission: AnswerSubmission = {
      playerId,
      questionId: currentQuestion.id,
      answer
    }
    processAnswer(submission)
    if (socket) {
      socket.emit('answer:submit', submission)
    }
  }, [currentQuestion, phase, processAnswer, socket])

  const answeredPlayerIdsMemo = useMemo(() => answeredPlayerIds, [answeredPlayerIds])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🎮 实时竞答监控看板</h1>
        <div className="app-meta">
          {isHost && <span className="role-badge host">主持人模式</span>}
          {socket && (
            <span className={`connection-status ${socket.connected ? 'connected' : 'disconnected'}`}>
              {socket.connected ? '🟢 已连接' : '🔴 断开连接'}
            </span>
          )}
        </div>
      </header>

      <div className="app-layout">
        <div className="column column-left">
          {isHost && phase === 'idle' && (
            <HostPanel
              phase={phase}
              onPublishQuestion={handlePublishQuestion}
            />
          )}
          {(phase !== 'idle' || !isHost) && (
            <QuestionPanel
              question={currentQuestion}
              phase={phase}
              onTimeout={handleTimeout}
              isHost={isHost}
              onTerminate={handleTerminate}
            />
          )}
          {isHost && phase === 'active' && (
            <div className="simulate-panel">
              <h3 className="simulate-title">🧪 模拟答题（测试）</h3>
              <div className="simulate-buttons">
                {players.slice(0, 4).map((p, idx) => (
                  <button
                    key={p.id}
                    className="simulate-btn"
                    onClick={() => simulateAnswer(
                      p.id,
                      ['A', 'B', 'C', 'D'][idx % 4]
                    )}
                    disabled={answeredPlayerIds.has(p.id)}
                  >
                    {p.name} 选 {['A', 'B', 'C', 'D'][idx % 4]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="column column-center">
          <PlayerList
            players={players}
            phase={phase}
            answeredPlayerIds={answeredPlayerIdsMemo}
          />
        </div>

        <div className="column column-right">
          <ScoreBoard players={players} />
        </div>
      </div>
    </div>
  )
}
