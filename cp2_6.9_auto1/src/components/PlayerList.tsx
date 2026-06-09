import React, { useMemo } from 'react'
import { Player, QuestionPhase } from '../types'
import '../styles/PlayerList.css'

interface PlayerListProps {
  players: Player[]
  phase: QuestionPhase
  answeredPlayerIds?: Set<string>
}

export const PlayerList: React.FC<PlayerListProps> = React.memo(({
  players,
  phase,
  answeredPlayerIds = new Set()
}) => {
  const activeCount = useMemo(() => {
    return phase === 'active' ? answeredPlayerIds.size : 0
  }, [phase, answeredPlayerIds])

  if (players.length === 0) {
    return (
      <div className="player-list empty">
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>暂无选手在线</p>
        </div>
      </div>
    )
  }

  return (
    <div className="player-list">
      <div className="player-list-header">
        <h2 className="player-list-title">选手列表</h2>
        <div className="answer-progress">
          {phase === 'active' && (
            <span className="answer-count">
              已答题: {activeCount}/{players.length}
            </span>
          )}
        </div>
      </div>
      <div className="player-grid">
        {players.map((player) => {
          const hasAnswered = answeredPlayerIds.has(player.id)
          return (
            <div
              key={player.id}
              className={`player-card ${hasAnswered ? 'answered' : ''}`}
            >
              <div className="player-avatar">
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div className="player-info">
                <span className="player-name">{player.name}</span>
                <span className="player-status">
                  {phase === 'active'
                    ? hasAnswered
                      ? '✓ 已提交'
                      : '思考中...'
                    : '待命中'}
                </span>
              </div>
              <div className="player-score-mini">
                {player.score}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

PlayerList.displayName = 'PlayerList'
