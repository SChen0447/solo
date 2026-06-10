import React, { useState } from 'react'

export interface QuestionOption {
  label: string
  text: string
}

export interface QuestionData {
  id: string
  question: string
  options: QuestionOption[]
  correctAnswer: string
  timeLimit?: number
  published: boolean
}

interface QuestionEditorProps {
  onPublish: (question: QuestionData) => void
  isPublished: boolean
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ onPublish, isPublished }) => {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<QuestionOption[]>([
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' }
  ])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [timeLimit, setTimeLimit] = useState<number | ''>('')
  const [error, setError] = useState('')

  const handleOptionChange = (index: number, text: string) => {
    if (text.length <= 20) {
      const newOptions = [...options]
      newOptions[index].text = text
      setOptions(newOptions)
    }
  }

  const handleAddOption = () => {
    if (options.length < 4) {
      const labels = ['A', 'B', 'C', 'D']
      setOptions([...options, { label: labels[options.length], text: '' }])
    }
  }

  const handleRemoveOption = (index: number) => {
    if (options.length > 3) {
      const newOptions = options.filter((_, i) => i !== index).map((opt, i) => ({
        ...opt,
        label: ['A', 'B', 'C', 'D'][i]
      }))
      setOptions(newOptions)
      if (correctAnswer && !newOptions.find(o => o.label === correctAnswer)) {
        setCorrectAnswer('')
      }
    }
  }

  const validate = (): boolean => {
    if (!question.trim() || question.length > 100) {
      setError('请输入问题（最多100字）')
      return false
    }
    const filledOptions = options.filter(o => o.text.trim())
    if (filledOptions.length < 3) {
      setError('至少需要3个有效选项')
      return false
    }
    if (!correctAnswer) {
      setError('请选择正确答案')
      return false
    }
    setError('')
    return true
  }

  const handlePublish = () => {
    if (!validate()) return
    const validOptions = options.filter(o => o.text.trim())
    const adjustedOptions = validOptions.map((opt, i) => ({
      ...opt,
      label: ['A', 'B', 'C', 'D'][i]
    }))
    const adjustedCorrect = adjustedOptions.find(
      (_, i) => ['A', 'B', 'C', 'D'][i] === correctAnswer
    )?.label || adjustedOptions[0].label

    onPublish({
      id: `q-${Date.now()}`,
      question: question.trim(),
      options: adjustedOptions,
      correctAnswer: adjustedCorrect,
      timeLimit: timeLimit || undefined,
      published: true
    })
  }

  const handleReset = () => {
    setQuestion('')
    setOptions([
      { label: 'A', text: '' },
      { label: 'B', text: '' },
      { label: 'C', text: '' },
      { label: 'D', text: '' }
    ])
    setCorrectAnswer('')
    setTimeLimit('')
    setError('')
  }

  return (
    <div
      style={{
        background: isPublished ? '#0984e3' : '#2d3436',
        transition: 'background-color 0.5s ease-out',
        borderRadius: '12px',
        padding: '20px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto'
      }}
    >
      <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '18px' }}>
        题目编辑区
      </h2>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ color: '#dfe6e9', fontSize: '14px', display: 'block', marginBottom: '6px' }}>
          问题内容（{question.length}/100）
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 100))}
          placeholder="请输入问题..."
          disabled={isPublished}
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            background: '#1a1a2e',
            color: '#fff',
            fontSize: '14px',
            opacity: isPublished ? 0.7 : 1
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ color: '#dfe6e9', fontSize: '14px', display: 'block', marginBottom: '6px' }}>
          选项设置
        </label>
        {options.map((opt, index) => (
          <div
            key={opt.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}
          >
            <label
              onClick={() => !isPublished && setCorrectAnswer(['A', 'B', 'C', 'D'][index])}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: correctAnswer === ['A', 'B', 'C', 'D'][index]
                  ? { A: '#d63031', B: '#0984e3', C: '#00b894', D: '#fdcb6e' }[['A', 'B', 'C', 'D'][index]]
                  : '#4a4a6a',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                cursor: isPublished ? 'default' : 'pointer',
                fontSize: '13px',
                flexShrink: 0,
                transition: 'all 0.2s ease'
              }}
            >
              {opt.label}
            </label>
            <input
              type="text"
              value={opt.text}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              placeholder={`选项 ${opt.label}（最多20字）`}
              disabled={isPublished}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                outline: 'none',
                background: '#1a1a2e',
                color: '#fff',
                fontSize: '13px',
                opacity: isPublished ? 0.7 : 1
              }}
            />
            {options.length > 3 && !isPublished && (
              <button
                onClick={() => handleRemoveOption(index)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#d63031',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {options.length < 4 && !isPublished && (
          <button
            onClick={handleAddOption}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              border: '1px dashed #4a4a6a',
              background: 'transparent',
              color: '#dfe6e9',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            + 添加选项
          </button>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ color: '#dfe6e9', fontSize: '14px', display: 'block', marginBottom: '6px' }}>
          答题限时（秒，选填）
        </label>
        <input
          type="number"
          value={timeLimit}
          onChange={(e) => setTimeLimit(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="不填则不限时"
          disabled={isPublished}
          min="0"
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: 'none',
            outline: 'none',
            background: '#1a1a2e',
            color: '#fff',
            fontSize: '13px',
            opacity: isPublished ? 0.7 : 1
          }}
        />
      </div>

      {error && (
        <div style={{
          color: '#ff7675',
          fontSize: '13px',
          marginBottom: '12px',
          padding: '8px',
          background: 'rgba(214, 48, 49, 0.2)',
          borderRadius: '6px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
        {isPublished ? (
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: '#d63031',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            结束答题 / 新建题目
          </button>
        ) : (
          <button
            onClick={handlePublish}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: '#00b894',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            🚀 发布题目
          </button>
        )}
      </div>
    </div>
  )
}

export default QuestionEditor
