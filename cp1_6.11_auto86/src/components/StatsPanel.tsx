import React, { useMemo } from 'react'
import type { GardenElement } from '../App'

interface StatsPanelProps {
  elements: GardenElement[]
  fillRate: number
  stepCount: number
}

export default function StatsPanel({ elements, fillRate, stepCount }: StatsPanelProps) {
  const stats = useMemo(() => {
    let rocks = 0
    let rakes = 0
    let mosses = 0
    for (const el of elements) {
      switch (el.type) {
        case 'rock': rocks++; break
        case 'rake': rakes++; break
        case 'moss': mosses++; break
      }
    }
    return { rocks, rakes, mosses }
  }, [elements])

  return (
    <div className="stats-panel">
      <div className="stats-title">花园统计</div>
      <div className="stats-section">
        <div className="stats-row">
          <span className="stats-icon">🪨</span>
          <span className="stats-label">岩石</span>
          <span className="stats-value">{stats.rocks}</span>
        </div>
        <div className="stats-row">
          <span className="stats-icon">〰</span>
          <span className="stats-label">耙纹</span>
          <span className="stats-value">{stats.rakes}</span>
        </div>
        <div className="stats-row">
          <span className="stats-icon">🌿</span>
          <span className="stats-label">苔藓</span>
          <span className="stats-value">{stats.mosses}</span>
        </div>
      </div>
      <div className="stats-divider" />
      <div className="stats-section">
        <div className="stats-row">
          <span className="stats-label">填充率</span>
          <span className="stats-value fill-rate" data-warning={fillRate > 80}>
            {fillRate.toFixed(1)}%
          </span>
        </div>
        <div className="fill-bar">
          <div
            className="fill-bar-inner"
            style={{
              width: `${Math.min(fillRate, 100)}%`,
              background: fillRate > 80 ? '#c0392b' : fillRate > 50 ? '#e67e22' : '#8fc7a0',
            }}
          />
        </div>
      </div>
      <div className="stats-divider" />
      <div className="stats-section">
        <div className="stats-row">
          <span className="stats-label">操作步数</span>
          <span className="stats-value">{stepCount}</span>
        </div>
      </div>
      <div className="stats-hint">
        Ctrl+Z 撤销<br/>
        Delete 删除选中<br/>
        方向键移动元素
      </div>
    </div>
  )
}
