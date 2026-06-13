import { useState, useEffect, useRef } from 'react'
import type { Plant, HybridResult } from '../types'
import { createHybrid } from '../services/api'
import './HybridSimulator.css'

interface HybridSimulatorProps {
  selectedPlants: string[]
  plants: Plant[]
  onHybridComplete: (result: HybridResult) => void
  hybridResult: HybridResult | null
}

function HybridSimulator({
  selectedPlants,
  plants,
  onHybridComplete,
  hybridResult
}: HybridSimulatorProps) {
  const [isHybridizing, setIsHybridizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isTimeout, setIsTimeout] = useState(false)
  const [animatedScore, setAnimatedScore] = useState(0)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const parent1 = plants.find(p => p.id === selectedPlants[0]) || null
  const parent2 = plants.find(p => p.id === selectedPlants[1]) || null

  useEffect(() => {
    if (hybridResult) {
      setAnimatedScore(0)
      const duration = 1500
      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        setAnimatedScore(Math.round(hybridResult.similarityScore * easeOut))
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    }
  }, [hybridResult])

  const clearTimers = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current)
      timeoutTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  const handleStartHybrid = async () => {
    if (selectedPlants.length !== 2 || !parent1 || !parent2) return

    setIsHybridizing(true)
    setProgress(0)
    setIsTimeout(false)

    progressTimerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev < 85) {
          return prev + Math.random() * 8
        }
        return prev
      })
    }, 300)

    timeoutTimerRef.current = setTimeout(() => {
      setIsTimeout(true)
    }, 3000)

    try {
      const result = await createHybrid(parent1.id, parent2.id)
      clearTimers()
      setProgress(100)
      setTimeout(() => {
        setIsHybridizing(false)
        onHybridComplete(result)
      }, 300)
    } catch (error) {
      clearTimers()
      setIsHybridizing(false)
      alert('杂交失败，请重试')
    }
  }

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const ripple = document.createElement('span')
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    ripple.style.width = ripple.style.height = size + 'px'
    ripple.style.left = x + 'px'
    ripple.style.top = y + 'px'
    ripple.classList.add('ripple')

    button.appendChild(ripple)
    setTimeout(() => ripple.remove(), 400)
  }

  const renderProgressRing = (score: number) => {
    const radius = 45
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference

    return (
      <svg className="progress-ring" width="120" height="120">
        <circle
          className="progress-ring-bg"
          stroke="#e0e0e0"
          strokeWidth="8"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
        />
        <circle
          className="progress-ring-fill"
          stroke="url(#gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4caf50" />
            <stop offset="100%" stopColor="#2e7d32" />
          </linearGradient>
        </defs>
        <text
          x="60"
          y="65"
          textAnchor="middle"
          className="progress-ring-text"
        >
          {score}
        </text>
      </svg>
    )
  }

  return (
    <div className="hybrid-simulator">
      <h2 className="section-title">🧬 杂交模拟器</h2>

      <div className="selected-plants">
        <div className="parent-slot">
          {parent1 ? (
            <div className="parent-card">
              <img
                src={parent1.thumbnailUrl}
                alt={parent1.name}
                className="parent-image"
              />
              <p className="parent-name">{parent1.name}</p>
            </div>
          ) : (
            <div className="parent-slot-empty">
              <span className="slot-icon">🌱</span>
              <p>选择亲本 1</p>
            </div>
          )}
        </div>

        <div className="hybrid-symbol">
          {isHybridizing ? (
            <div className="loading-dna">
              <span>🧬</span>
            </div>
          ) : (
            <span className="plus-sign">×</span>
          )}
        </div>

        <div className="parent-slot">
          {parent2 ? (
            <div className="parent-card">
              <img
                src={parent2.thumbnailUrl}
                alt={parent2.name}
                className="parent-image"
              />
              <p className="parent-name">{parent2.name}</p>
            </div>
          ) : (
            <div className="parent-slot-empty">
              <span className="slot-icon">🌿</span>
              <p>选择亲本 2</p>
            </div>
          )}
        </div>
      </div>

      {isHybridizing && (
        <div className={`hybrid-progress ${isTimeout ? 'timeout' : ''}`}>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="progress-text">
            {isTimeout ? '⚠️ 杂交正在进行中，可能需要更长时间...' : '正在进行基因重组...'}
          </p>
        </div>
      )}

      {!isHybridizing && (
        <button
          className="start-hybrid-btn"
          disabled={selectedPlants.length !== 2}
          onClick={(e) => {
            createRipple(e)
            handleStartHybrid()
          }}
        >
          🧬 开始杂交
        </button>
      )}

      {hybridResult && !isHybridizing && (
        <div className="hybrid-result fade-in">
          <h3 className="result-title">✨ 杂交结果</h3>

          <div className="result-display">
            <div className="result-parent">
              <p className="result-label">亲本 1</p>
              <img
                src={`/api/plants/${hybridResult.parent1Id}/image`}
                alt={hybridResult.parent1Name}
                className="result-thumb"
              />
              <p className="result-name">{hybridResult.parent1Name}</p>
            </div>

            <div className="result-hybrid">
              <div className="hybrid-image-wrapper">
                <img
                  src={hybridResult.hybridImageUrl}
                  alt="杂交结果"
                  className="hybrid-image"
                />
              </div>
              <div className="score-ring-wrapper">
                {renderProgressRing(animatedScore)}
                <p className="score-label">相似度评分</p>
              </div>
            </div>

            <div className="result-parent">
              <p className="result-label">亲本 2</p>
              <img
                src={`/api/plants/${hybridResult.parent2Id}/image`}
                alt={hybridResult.parent2Name}
                className="result-thumb"
              />
              <p className="result-name">{hybridResult.parent2Name}</p>
            </div>
          </div>

          <div className="hybrid-description">
            <p className="description-text">「{hybridResult.description}」</p>
          </div>
        </div>
      )}

      {!hybridResult && !isHybridizing && selectedPlants.length < 2 && (
        <div className="hybrid-hint">
          <p>👆 从左侧画廊选择两株植物开始杂交</p>
          <p className="hint-sub">点击植物卡片选中，支持跨阶段杂交</p>
        </div>
      )}
    </div>
  )
}

export default HybridSimulator
