import React, { useState, useCallback } from 'react'
import { Question, QuestionPhase } from '../types'
import '../styles/HostPanel.css'

interface HostPanelProps {
  phase: QuestionPhase
  onPublishQuestion: (question: Question) => void
}

export const HostPanel: React.FC<HostPanelProps> = React.memo(({
  phase,
  onPublishQuestion
}) => {
  const [questionText, setQuestionText] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionD, setOptionD] = useState('')
  const [correctAnswer, setCorrectAnswer] = useState<string>('A')
  const [duration, setDuration] = useState(30)

  const handlePublish = useCallback(() => {
    if (!questionText.trim() || !optionA.trim() || !optionB.trim() ||
        !optionC.trim() || !optionD.trim()) {
      alert('请填写完整的题目和所有选项')
      return
    }

    const question: Question = {
      id: `q_${Date.now()}`,
      text: questionText.trim(),
      options: [
        { key: 'A', text: optionA.trim() },
        { key: 'B', text: optionB.trim() },
        { key: 'C', text: optionC.trim() },
        { key: 'D', text: optionD.trim() }
      ],
      correctAnswer,
      duration
    }

    onPublishQuestion(question)

    setQuestionText('')
    setOptionA('')
    setOptionB('')
    setOptionC('')
    setOptionD('')
    setCorrectAnswer('A')
  }, [questionText, optionA, optionB, optionC, optionD, correctAnswer, duration, onPublishQuestion])

  const isDisabled = phase === 'active'

  return (
    <div className="host-panel">
      <div className="host-panel-header">
        <h2 className="host-panel-title">🎯 主持人控制台</h2>
        <div className={`phase-badge phase-${phase}`}>
          {phase === 'idle' ? '空闲' : phase === 'active' ? '答题中' : '揭晓答案'}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">题目内容</label>
        <textarea
          className="form-textarea"
          placeholder="请输入题目内容..."
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          disabled={isDisabled}
          rows={3}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">选项 A</label>
          <input
            type="text"
            className="form-input"
            placeholder="选项 A 内容"
            value={optionA}
            onChange={(e) => setOptionA(e.target.value)}
            disabled={isDisabled}
          />
        </div>
        <div className="form-group">
          <label className="form-label">选项 B</label>
          <input
            type="text"
            className="form-input"
            placeholder="选项 B 内容"
            value={optionB}
            onChange={(e) => setOptionB(e.target.value)}
            disabled={isDisabled}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">选项 C</label>
          <input
            type="text"
            className="form-input"
            placeholder="选项 C 内容"
            value={optionC}
            onChange={(e) => setOptionC(e.target.value)}
            disabled={isDisabled}
          />
        </div>
        <div className="form-group">
          <label className="form-label">选项 D</label>
          <input
            type="text"
            className="form-input"
            placeholder="选项 D 内容"
            value={optionD}
            onChange={(e) => setOptionD(e.target.value)}
            disabled={isDisabled}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">正确答案</label>
          <div className="correct-answer-options">
            {['A', 'B', 'C', 'D'].map((key) => (
              <button
                key={key}
                type="button"
                className={`answer-option-btn ${correctAnswer === key ? 'selected' : ''}`}
                onClick={() => setCorrectAnswer(key)}
                disabled={isDisabled}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">答题时间（秒）</label>
          <input
            type="number"
            className="form-input"
            min={5}
            max={120}
            value={duration}
            onChange={(e) => setDuration(Math.max(5, Math.min(120, parseInt(e.target.value) || 30)))}
            disabled={isDisabled}
          />
        </div>
      </div>

      <button
        className="publish-btn"
        onClick={handlePublish}
        disabled={isDisabled}
      >
        {isDisabled ? '⏳ 答题进行中...' : '🚀 发布题目'}
      </button>
    </div>
  )
})

HostPanel.displayName = 'HostPanel'
