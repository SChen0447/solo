import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { students as initialStudents } from './data/students'
import QuestionEditor, { QuestionData } from './components/QuestionEditor'
import StudentGrid, { AnswerKey } from './components/StudentGrid'

const OPTION_COLORS: Record<string, string> = {
  A: '#d63031',
  B: '#0984e3',
  C: '#00b894',
  D: '#fdcb6e'
}

const App: React.FC = () => {
  const [students] = useState(initialStudents)
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null)
  const [answers, setAnswers] = useState<Record<string, AnswerKey>>({})
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [editorCollapsed, setEditorCollapsed] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handlePublish = useCallback((question: QuestionData) => {
    setCurrentQuestion(question)
    setAnswers({})
    if (question.timeLimit) {
      setCountdown(question.timeLimit)
    } else {
      setCountdown(null)
    }
    setTimeout(() => {
      students.forEach((student, idx) => {
        const delay = 100 + Math.random() * 1500 + idx * 50
        setTimeout(() => {
          if (!question.timeLimit || (countdown !== null && countdown > 0)) {
            const randomOption = question.options[Math.floor(Math.random() * question.options.length)]
            setAnswers(prev => {
              if (prev[student.id]) return prev
              return { ...prev, [student.id]: randomOption.label as AnswerKey }
            })
          }
        }, delay)
      })
    }, 50)
  }, [students, countdown])

  const handleAnswer = useCallback((studentId: string, answer: AnswerKey) => {
    setAnswers(prev => ({ ...prev, [studentId]: answer }))
  }, [])

  const handleReset = useCallback(() => {
    setCurrentQuestion(null)
    setAnswers({})
    setCountdown(null)
  }, [])

  const stats = useMemo(() => {
    const answeredCount = Object.keys(answers).length
    const totalCount = students.length
    let correctCount = 0
    if (currentQuestion) {
      Object.values(answers).forEach(a => {
        if (a === currentQuestion.correctAnswer) correctCount++
      })
    }
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

    const optionCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
    Object.values(answers).forEach(a => {
      optionCounts[a]++
    })

    const pieData = Object.entries(optionCounts)
      .filter(([key]) => currentQuestion?.options.find(o => o.label === key))
      .map(([name, value]) => ({ name, value }))

    return {
      answeredCount,
      totalCount,
      correctCount,
      accuracy,
      optionCounts,
      pieData
    }
  }, [answers, currentQuestion, students.length])

  const countdownPercent = useMemo(() => {
    if (!currentQuestion?.timeLimit || countdown === null) return 100
    return Math.max(0, Math.round((countdown / currentQuestion.timeLimit) * 100))
  }, [countdown, currentQuestion])

  const isCountdownWarning = countdown !== null && countdown <= 5 && countdown > 0

  const renderCircularProgress = (percent: number, color: string, size: number = 48, warning: boolean = false) => {
    const radius = (size - 6) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percent / 100) * circumference
    return (
      <svg
        width={size}
        height={size}
        style={{
          animation: warning ? 'blink 0.5s infinite' : undefined
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={warning ? '#d63031' : color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>
    )
  }

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: '#0c0c1d',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }

  const dataBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: '#1a1a2e',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexWrap: 'wrap',
    gap: '12px'
  }

  const statItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  }

  const statValueStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    ...(isMobile && editorCollapsed ? { flexDirection: 'column' } : {}),
    ...(isMobile && !editorCollapsed ? { flexDirection: 'column' } : {})
  }

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @media (max-width: 768px) {
          .student-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
      `}</style>

      <div style={dataBarStyle}>
        <div style={{ ...statItemStyle, gap: '16px' }}>
          <div style={statItemStyle}>
            <span style={{ color: '#dfe6e9', fontSize: '13px' }}>已回答</span>
            <span style={statValueStyle}>
              <span style={{ color: '#00b894' }}>{stats.answeredCount}</span>
              <span style={{ color: '#dfe6e9', fontWeight: 'normal' }}>/</span>
              <span>{stats.totalCount}</span>
            </span>
          </div>

          <div style={statItemStyle}>
            <span style={{ color: '#dfe6e9', fontSize: '13px' }}>正确率</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {renderCircularProgress(stats.accuracy, '#00b894', 48)}
              <span style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '12px'
              }}>
                {stats.accuracy}%
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {currentQuestion && stats.pieData.length > 0 && (
            <div style={{
              width: '120px',
              height: '50px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={12}
                    outerRadius={20}
                    paddingAngle={2}
                  >
                    {stats.pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={OPTION_COLORS[entry.name]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {countdown !== null && currentQuestion && (
            <div style={statItemStyle}>
              <span style={{ color: '#dfe6e9', fontSize: '13px' }}>倒计时</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {renderCircularProgress(
                  countdownPercent,
                  '#0984e3',
                  48,
                  isCountdownWarning
                )}
                <span style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: isCountdownWarning ? '#d63031' : '#fff',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  animation: isCountdownWarning ? 'blink 0.5s infinite' : undefined
                }}>
                  {countdown}s
                </span>
              </div>
            </div>
          )}

          {isMobile && (
            <button
              onClick={() => setEditorCollapsed(!editorCollapsed)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: '#0984e3',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              {editorCollapsed ? '展开编辑' : '收起编辑'}
            </button>
          )}
        </div>
      </div>

      <div style={mainContentStyle}>
        {(!isMobile || !editorCollapsed) && (
          <div
            style={{
              width: isMobile ? '100%' : '340px',
              minWidth: isMobile ? 'auto' : '300px',
              padding: '16px',
              flexShrink: 0,
              overflow: 'auto',
              maxHeight: isMobile ? '50vh' : 'none'
            }}
          >
            <QuestionEditor
              onPublish={handlePublish}
              isPublished={currentQuestion !== null}
            />
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
            background: '#0f0f23'
          }}
        >
          {currentQuestion && (
            <div
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, rgba(9,132,227,0.3), rgba(0,184,148,0.2))',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <div style={{ color: '#dfe6e9', fontSize: '12px', marginBottom: '4px' }}>当前题目</div>
              <div style={{ color: '#fff', fontSize: '15px', fontWeight: '500' }}>
                {currentQuestion.question}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                {currentQuestion.options.map(opt => (
                  <div
                    key={opt.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      fontSize: '13px',
                      color: '#dfe6e9'
                    }}
                  >
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: OPTION_COLORS[opt.label],
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    >
                      {opt.label}
                    </span>
                    {opt.text}
                    {opt.label === currentQuestion.correctAnswer && (
                      <span style={{ color: '#00b894', fontSize: '11px' }}>✓</span>
                    )}
                    <span style={{
                      color: '#a0a0a0',
                      fontSize: '12px',
                      marginLeft: '4px'
                    }}>
                      ({stats.optionCounts[opt.label] || 0}人)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!currentQuestion ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dfe6e9',
                gap: '12px'
              }}
            >
              <div style={{ fontSize: '48px' }}>📝</div>
              <div style={{ fontSize: '16px' }}>请在左侧编辑区创建并发布题目</div>
              <div style={{ fontSize: '13px', color: '#a0a0a0' }}>
                点击学生头像可模拟作答
              </div>
            </div>
          ) : (
            <StudentGrid
              students={students}
              answers={answers}
              question={currentQuestion}
              onAnswer={handleAnswer}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
