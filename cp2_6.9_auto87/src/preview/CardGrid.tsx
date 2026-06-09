import React, { useEffect, useState } from 'react'
import GlassCard from './GlassCard'
import { GlassParams } from '../types'

interface CardGridProps {
  params: GlassParams
}

const WeatherIcon: React.FC = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="12" fill="#FFD93D" stroke="#FFF" strokeWidth="2" opacity="0.95" />
    <path d="M8 24L14 24" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <path d="M40 24L46 24" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <path d="M24 8L24 14" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <path d="M24 34L24 40" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <path d="M12 12L17 17" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <path d="M31 17L36 12" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <path d="M12 36L17 31" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <path d="M31 31L36 36" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <ellipse cx="42" cy="44" rx="16" ry="10" fill="#E0E0E0" opacity="0.9" />
    <ellipse cx="32" cy="42" rx="12" ry="8" fill="#F0F0F0" opacity="0.9" />
    <ellipse cx="50" cy="42" rx="10" ry="7" fill="#F0F0F0" opacity="0.9" />
  </svg>
)

const ProgressRing: React.FC<{ value: number }> = ({ value }) => {
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const progress = (value / 30) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="6"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
          {Math.round((value / 30) * 100)}
        </span>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          %
        </span>
      </div>
    </div>
  )
}

const LikeButton: React.FC = () => {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(128)

  return (
    <button
      onClick={() => {
        setLiked(!liked)
        setCount(liked ? count - 1 : count + 1)
      }}
      className="flex flex-col items-center gap-2 transition-transform active:scale-95"
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path
          d="M24 42C24 42 6 30 6 18C6 12 10 8 15 8C18 8 21 10 24 14C27 10 30 8 33 8C38 8 42 12 42 18C42 30 24 42 24 42Z"
          fill={liked ? '#FF6B9D' : 'none'}
          stroke={liked ? '#FF6B9D' : 'rgba(255,255,255,0.85)'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'all 0.3s ease' }}
        />
      </svg>
      <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
        {count}
      </span>
    </button>
  )
}

const StripedPattern: React.FC<{ hue: number; saturation: number }> = ({ hue, saturation }) => (
  <div
    className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl"
    style={{
      background: `repeating-linear-gradient(
        45deg,
        hsla(${hue}, ${saturation}%, 60%, 0.4) 0px,
        hsla(${hue}, ${saturation}%, 60%, 0.4) 4px,
        hsla(${(hue + 60) % 360}, ${saturation}%, 60%, 0.6) 4px,
        hsla(${(hue + 60) % 360}, ${saturation}%, 60%, 0.6) 8px
      )`,
    }}
  />
)

const CardGrid: React.FC<CardGridProps> = React.memo(({ params }) => {
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  const [date] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      className="grid gap-5 place-items-center"
      style={{
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      }}
    >
      <GlassCard params={params}>
        <span className="text-4xl font-bold tracking-wider" style={{ fontFamily: 'monospace' }}>
          {time}
        </span>
      </GlassCard>

      <GlassCard params={params}>
        <div className="text-center px-2">
          <p className="text-lg leading-relaxed font-medium" style={{ letterSpacing: '0.1em' }}>
            玻璃之外
          </p>
          <p className="text-lg leading-relaxed font-medium mt-2" style={{ letterSpacing: '0.1em' }}>
            光影流转
          </p>
        </div>
      </GlassCard>

      <GlassCard params={params}>
        <WeatherIcon />
      </GlassCard>

      <GlassCard params={params}>
        <div className="px-2">
          <p className="text-xs leading-relaxed" style={{ lineHeight: '1.8' }}>
            在光与影的边界，
            透明与朦胧交织。
            每一片玻璃都是一面镜子，
            折射出心中的风景。
          </p>
        </div>
      </GlassCard>

      <GlassCard params={params}>
        <ProgressRing value={params.blurRadius} />
      </GlassCard>

      <GlassCard params={params}>
        <LikeButton />
      </GlassCard>

      <GlassCard params={params}>
        <div className="w-full h-full p-4">
          <StripedPattern hue={params.gradientHue} saturation={params.gradientSaturation} />
        </div>
      </GlassCard>

      <GlassCard params={params}>
        <span className="text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {date}
        </span>
      </GlassCard>

      <GlassCard params={params}>
        <span />
      </GlassCard>
    </div>
  )
})

CardGrid.displayName = 'CardGrid'

export default CardGrid
