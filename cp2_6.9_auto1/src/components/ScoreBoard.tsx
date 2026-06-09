import React, { useMemo, useRef, useEffect } from 'react'
import { Player } from '../types'
import '../styles/ScoreBoard.css'

interface ScoreBoardProps {
  players: Player[]
}

export const ScoreBoard: React.FC<ScoreBoardProps> = React.memo(({ players }) => {
  const prevScoresRef = useRef<Map<string, number>>(new Map())
  const flashingRef = useRef<Set<string>>(new Set())
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score)
  }, [players])

  useEffect(() => {
    const currentFlashing = new Set<string>()
    let hasChanges = false

    players.forEach(player => {
      const prevScore = prevScoresRef.current.get(player.id)
      if (prevScore !== undefined && prevScore !== player.score) {
        currentFlashing.add(player.id)
        hasChanges = true
      }
      prevScoresRef.current.set(player.id, player.score)
    })

    if (hasChanges) {
      flashingRef.current = currentFlashing
      forceUpdate()

      const timer = setTimeout(() => {
        flashingRef.current = new Set()
        forceUpdate()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [players])

  const getMedalBorder = (index: number): string => {
    if (index === 0) return 'medal-gold'
    if (index === 1) return 'medal-silver'
    if (index === 2) return 'medal-bronze'
    return ''
  }

  const getRankIcon = (index: number): string => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}`
  }

  if (players.length === 0) {
    return (
      <div className="scoreboard empty">
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <p>暂无选手数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="scoreboard">
      <div className="scoreboard-header">
        <h2 className="scoreboard-title">实时积分榜</h2>
        <span className="player-count">{players.length} 位选手</span>
      </div>
      <div className="scoreboard-list">
        {sortedPlayers.map((player, index) => {
          const isFlashing = flashingRef.current.has(player.id)
          const medalClass = getMedalBorder(index)
          return (
            <div
              key={player.id}
          className={`scoreboard-row ${medalClass} ${isFlashing ? 'flashing' : ''}`}
            >
              <div className="rank-cell">
                <span className="rank-icon">{getRankIcon(index)}</span>
              </div>
              <div className="name-cell">
                <span className="player-name">{player.name}</span>
              </div>
              <div className="score-cell">
                <span className={`score-value ${isFlashing ? 'bounce' : ''}`}>
                  {player.score}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

ScoreBoard.displayName = 'ScoreBoard'
