import { useState, useEffect, useCallback } from 'react'
import { Vote, formatTime, getWinner } from '../utils/dataGenerator'

interface VotePanelProps {
  vote: Vote | null
  hasVoted: boolean
  onVote: (optionId: string) => void
  onCreateVote: (title: string, options: string[], duration: number) => void
  userId: string
}

function VotePanel({ vote, hasVoted, onVote, onCreateVote, userId }: VotePanelProps) {
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [duration, setDuration] = useState(30)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (!vote || vote.status !== 'active') {
      setTimeLeft(0)
      return
    }

    const updateTime = () => {
      const remaining = Math.max(0, (vote.endTime - Date.now()) / 1000)
      setTimeLeft(remaining)
    }

    updateTime()
    const timer = setInterval(updateTime, 100)
    return () => clearInterval(timer)
  }, [vote])

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ''])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validOptions = options.filter(o => o.trim())
    if (title.trim() && validOptions.length >= 2) {
      onCreateVote(title.trim(), validOptions, duration)
      setTitle('')
      setOptions(['', ''])
      setDuration(30)
    }
  }

  const totalVotes = vote ? vote.options.reduce((sum, opt) => sum + opt.votes, 0) : 0
  const winner = vote && vote.status === 'ended' ? getWinner(vote) : null

  const sortedVoters = vote
    ? [...vote.voters].sort((a, b) => b.timestamp - a.timestamp)
    : []

  const isUrgent = timeLeft < 5 && timeLeft > 0 && vote?.status === 'active'

  if (!vote) {
    return (
      <div className="card vote-panel">
        <h2 className="card-title">🗳️ 发起投票</h2>
        <form onSubmit={handleSubmit} className="vote-form">
          <div className="form-group">
            <label>投票标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入投票标题..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>投票选项</label>
            <div className="options-list">
              {options.map((opt, index) => (
                <div key={index} className="option-input-row">
                  <span className="option-index">{index + 1}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`选项 ${index + 1}`}
                    className="form-input"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="btn-remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button type="button" onClick={addOption} className="btn-add-option">
                + 添加选项
              </button>
            )}
          </div>

          <div className="form-group">
            <label>投票时长: {duration} 秒</label>
            <input
              type="range"
              min="10"
              max="120"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="duration-slider"
            />
            <div className="duration-labels">
              <span>10秒</span>
              <span>2分钟</span>
            </div>
          </div>

          <button type="submit" className="btn-primary">
            🚀 发起投票
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="card vote-panel">
      <div className="vote-header">
        <h2 className="card-title">🗳️ {vote.title}</h2>
        {vote.status === 'active' && (
          <div className={`countdown ${isUrgent ? 'urgent' : ''}`}>
            <span className="countdown-label">剩余</span>
            <span className="countdown-time">{formatTime(timeLeft)}</span>
          </div>
        )}
        {vote.status === 'ended' && (
          <div className="status-badge ended">已结束</div>
        )}
      </div>

      <div className="vote-options">
        {vote.options.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0
          const isWinner = winner && winner.id === option.id
          const userVotedThis = vote.voters.some(
            (v) => v.userId === userId && v.optionId === option.id
          )

          return (
            <div
              key={option.id}
              className={`vote-option ${isWinner ? 'winner' : ''} ${userVotedThis ? 'voted' : ''}`}
              onClick={() => vote.status === 'active' && !hasVoted && onVote(option.id)}
            >
              <div className="option-info">
                <span className="option-text">{option.text}</span>
                <span className="option-votes">
                  {option.votes} 票 ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="option-bar-container">
                <div
                  className="option-bar"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {userVotedThis && <span className="voted-badge">✓ 已投</span>}
              {isWinner && <span className="winner-badge">👑 胜出</span>}
            </div>
          )
        })}
      </div>

      <div className="vote-footer">
        <span className="total-votes">总票数: {totalVotes}</span>
        {vote.status === 'active' && hasVoted && (
          <span className="vote-status">感谢您的投票！</span>
        )}
      </div>

      {vote.status === 'ended' && sortedVoters.length > 0 && (
        <div className="voters-list">
          <h3>投票记录</h3>
          <div className="voters-scroll">
            {sortedVoters.map((voter) => {
              const option = vote.options.find((o) => o.id === voter.optionId)
              return (
                <div key={voter.userId + voter.timestamp} className="voter-item">
                  <span className="voter-avatar">{voter.avatar}</span>
                  <span className="voter-name">{voter.userName}</span>
                  <span className="voter-option">投给「{option?.text}」</span>
                  <span className="voter-time">
                    {new Date(voter.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default VotePanel
