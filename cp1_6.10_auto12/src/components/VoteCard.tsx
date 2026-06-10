import { useState, useRef, useEffect } from 'react'
import type { VoteTopic } from '../voteStore'

interface VoteCardProps {
  topic: VoteTopic
  selectedOptionId: string | null
  onSelectOption: (optionId: string | null) => void
  onSubmit: () => void
  hasVoted: boolean
  votedOptionId: string | null
  view?: 'card' | 'detail'
  onEnterDetail?: () => void
}

interface Ripple {
  id: number
  x: number
  y: number
}

export default function VoteCard({
  topic,
  selectedOptionId,
  onSelectOption,
  onSubmit,
  hasVoted,
  votedOptionId,
  view = 'card',
  onEnterDetail,
}: VoteCardProps) {
  const [ripples, setRipples] = useState<Record<string, Ripple[]>>({})
  const [animatingOptions, setAnimatingOptions] = useState<Set<string>>(new Set())
  const [submitPressed, setSubmitPressed] = useState(false)
  const totalVotes = topic.options.reduce((sum, o) => sum + o.votes, 0)
  const rippleIdRef = useRef(0)

  const handleOptionClick = (e: React.MouseEvent<HTMLDivElement>, optionId: string) => {
    if (hasVoted) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const rippleId = rippleIdRef.current++
    setRipples(prev => ({
      ...prev,
      [optionId]: [...(prev[optionId] || []), { id: rippleId, x, y }],
    }))
    setTimeout(() => {
      setRipples(prev => ({
        ...prev,
        [optionId]: (prev[optionId] || []).filter(r => r.id !== rippleId),
      }))
    }, 600)

    if (selectedOptionId === optionId) {
      onSelectOption(null)
    } else {
      setAnimatingOptions(prev => new Set(prev).add(optionId))
      setTimeout(() => {
        setAnimatingOptions(prev => {
          const next = new Set(prev)
          next.delete(optionId)
          return next
        })
      }, 600)
      onSelectOption(optionId)
    }
  }

  const handleSubmitClick = () => {
    setSubmitPressed(true)
    setTimeout(() => setSubmitPressed(false), 150)
    onSubmit()
  }

  const isSelected = (optionId: string) => {
    if (hasVoted) return votedOptionId === optionId
    return selectedOptionId === optionId
  }

  const isAnimating = (optionId: string) => animatingOptions.has(optionId)

  if (view === 'card') {
    return (
      <div
        className="bg-white rounded-xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-[3px] shadow-md hover:shadow-xl"
        style={{ borderRadius: '12px' }}
        onClick={onEnterDetail}
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-gray-800 flex-1 pr-2 line-clamp-2">{topic.title}</h3>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
              topic.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {topic.isActive ? '进行中' : '已结束'}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {topic.options.map(opt => (
            <span key={opt.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {opt.emoji} {opt.text}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <span>👥</span>
            <span>{totalVotes} 人已投票</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔑</span>
            <span className="font-mono">{topic.roomCode}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {topic.options.map(option => {
          const selected = isSelected(option.id)
          const animating = isAnimating(option.id)
          const optionRipples = ripples[option.id] || []

          return (
            <div
              key={option.id}
              onClick={e => handleOptionClick(e, option.id)}
              className={`relative overflow-hidden rounded-xl p-4 transition-all duration-200 select-none ${
                hasVoted && !selected
                  ? 'bg-gray-50 border-2 border-gray-200 opacity-60 cursor-not-allowed'
                  : hasVoted && selected
                  ? 'bg-green-50 cursor-default'
                  : selected
                  ? 'bg-indigo-50 cursor-pointer'
                  : 'bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer'
              }`}
              style={{
                borderRadius: '12px',
                boxShadow: selected ? '0 4px 12px rgba(79, 70, 229, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                animation: animating ? 'flipScale 0.6s ease-in-out' : undefined,
                transform: animating ? undefined : undefined,
              }}
            >
              {selected && !hasVoted && (
                <div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{
                    padding: '2px',
                    background: 'linear-gradient(90deg, #4F46E5, #10B981, #4F46E5, #10B981)',
                    backgroundSize: '300% 300%',
                    animation: 'gradientBorder 1.5s ease infinite',
                    animationIterationCount: 2,
                    borderRadius: '12px',
                    WebkitMask:
                      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
              )}

              <div className="flex flex-col items-center gap-2 relative z-10">
                <span className="text-3xl">{option.emoji}</span>
                <span className={`text-sm font-medium text-center ${selected ? 'text-indigo-700' : 'text-gray-700'}`}>
                  {option.text}
                </span>
                {hasVoted && (
                  <span className="text-xs text-gray-500">
                    {option.votes} 票 ({totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(1) : 0}%)
                  </span>
                )}
              </div>

              {optionRipples.map(ripple => (
                <span
                  key={ripple.id}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: '20px',
                    height: '20px',
                    marginLeft: '-10px',
                    marginTop: '-10px',
                    background: selected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(79, 70, 229, 0.4)',
                    animation: 'ripple 0.6s ease-out forwards',
                  }}
                />
              ))}
            </div>
          )
        })}
      </div>

      {!hasVoted && topic.isActive && (
        <button
          onClick={handleSubmitClick}
          disabled={!selectedOptionId}
          className={`w-full py-3 px-6 rounded-xl font-bold text-white text-lg transition-all duration-150 ${
            selectedOptionId
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
          style={{
            borderRadius: '12px',
            transform: submitPressed && selectedOptionId ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          {selectedOptionId ? '确认提交投票' : '请先选择一个选项'}
        </button>
      )}

      {hasVoted && (
        <div className="text-center py-3 px-6 bg-green-50 rounded-xl border border-green-200">
          <span className="text-green-700 font-medium">✅ 您已成功投票，感谢参与！</span>
        </div>
      )}

      {!topic.isActive && (
        <div className="text-center py-3 px-6 bg-gray-100 rounded-xl border border-gray-200">
          <span className="text-gray-600 font-medium">⏹️ 此投票已结束</span>
        </div>
      )}
    </div>
  )
}
