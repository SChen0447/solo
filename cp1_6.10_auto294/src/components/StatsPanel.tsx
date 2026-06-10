import { useMemo } from 'react'
import type { TeaEntry } from '../types/tea'

interface StatsPanelProps {
  entries: TeaEntry[]
}

export default function StatsPanel({ entries }: StatsPanelProps) {
  const stats = useMemo(() => {
    const total = entries.length
    const categorySet = new Set(entries.map((e) => e.category))
    const categoryCount = categorySet.size
    const avgRating =
      total > 0
        ? (entries.reduce((sum, e) => sum + e.rating, 0) / total).toFixed(1)
        : '0.0'
    const topEntry =
      total > 0
        ? entries.reduce((best, curr) => (curr.rating > best.rating ? curr : best), entries[0])
        : null

    return {
      total,
      categoryCount,
      avgRating,
      topName: topEntry?.name ?? '—',
    }
  }, [entries])

  return (
    <div className="stats-panel">
      <div className="stat-item">
        <span className="stat-label">品鉴记录总数</span>
        <span className="stat-value">{stats.total}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">涉及茶类</span>
        <span className="stat-value">{stats.categoryCount}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">平均口感评分</span>
        <span className="stat-value">{stats.avgRating}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">评分最高茶种</span>
        <span className="stat-value-small" title={stats.topName}>
          {stats.topName}
        </span>
      </div>
    </div>
  )
}
