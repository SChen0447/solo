import { useState, useEffect, useCallback, useMemo } from 'react'
import FoodInput from './components/FoodInput'
import Timeline from './components/Timeline'
import Heatmap from './components/Heatmap'

type Category = '水果' | '蔬菜' | '主食' | '蛋白质' | '零食' | '饮品'
type MealTime = '早餐' | '午餐' | '晚餐' | '加餐'
type Feeling = '精力好' | '胀气' | '不舒服' | '无感' | null

interface FoodItem {
  id: number
  category: Category
  name: string
  mealTime: MealTime
  timestamp: number
  feeling: Feeling
}

const CATEGORIES: Category[] = ['水果', '蔬菜', '主食', '蛋白质', '零食', '饮品']
const FEELINGS: Feeling[] = ['精力好', '胀气', '不舒服', '无感']

function App() {
  const [foods, setFoods] = useState<FoodItem[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterFeeling, setFilterFeeling] = useState<string>('all')
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchFoods = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterCategory !== 'all') params.append('category', filterCategory)
      if (filterFeeling !== 'all') params.append('feeling', filterFeeling)
      const res = await fetch(`/api/foods?${params.toString()}`)
      const data = await res.json()
      setFoods(data)
    } catch (e) {
      console.error('Failed to fetch foods:', e)
    } finally {
      setLoading(false)
    }
  }, [filterCategory, filterFeeling])

  useEffect(() => {
    fetchFoods()
  }, [fetchFoods])

  const handleAdd = useCallback(async (item: { category: Category; name: string; mealTime: MealTime }) => {
    try {
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })
      if (res.ok) {
        fetchFoods()
      }
    } catch (e) {
      console.error('Failed to add food:', e)
    }
  }, [fetchFoods])

  const handleUpdateFeeling = useCallback(async (id: number, feeling: Feeling) => {
    try {
      const res = await fetch(`/api/foods/${id}/feeling`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeling })
      })
      if (res.ok) {
        fetchFoods()
      }
    } catch (e) {
      console.error('Failed to update feeling:', e)
    }
  }, [fetchFoods])

  const handleDelete = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/foods/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchFoods()
      }
    } catch (e) {
      console.error('Failed to delete food:', e)
    }
  }, [fetchFoods])

  const handleClearAll = useCallback(async () => {
    try {
      const res = await fetch('/api/foods', { method: 'DELETE' })
      if (res.ok) {
        fetchFoods()
        setShowConfirm(false)
      }
    } catch (e) {
      console.error('Failed to clear all:', e)
    }
  }, [fetchFoods])

  const heatmapData = useMemo(() => {
    const result: Record<string, number[]> = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dates: string[] = []
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }
    CATEGORIES.forEach(cat => {
      result[cat] = new Array(28).fill(0)
    })
    foods.forEach(food => {
      const d = new Date(food.timestamp)
      d.setHours(0, 0, 0, 0)
      const dateStr = d.toISOString().split('T')[0]
      const idx = dates.indexOf(dateStr)
      if (idx >= 0 && result[food.category]) {
        result[food.category][idx]++
      }
    })
    return { dates, data: result }
  }, [foods])

  const feelingStats = useMemo(() => {
    const stats: Record<string, number> = { '精力好': 0, '胀气': 0, '不舒服': 0, '无感': 0 }
    let total = 0
    foods.forEach(f => {
      if (f.feeling) {
        stats[f.feeling]++
        total++
      }
    })
    return { stats, total }
  }, [foods])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F0E8',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '24px', color: '#333' }}>
          食物搭配记录与热力图分析
        </h1>

        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <FoodInput onAdd={handleAdd} />

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '20px',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#555' }}>食物类别：</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="all">全部</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#555' }}>身体感受：</label>
              <select
                value={filterFeeling}
                onChange={e => setFilterFeeling(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="all">全部</option>
                {FEELINGS.map(f => f && <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div style={{ flex: 1 }} />

            <button
              onClick={() => setShowConfirm(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #E57373',
                backgroundColor: '#fff',
                color: '#E57373',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'transform 0.1s ease'
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              清除所有数据
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
          <Timeline
            foods={foods}
            loading={loading}
            onUpdateFeeling={handleUpdateFeeling}
            onDelete={handleDelete}
          />
          <Heatmap
            heatmapData={heatmapData}
            feelingStats={feelingStats}
          />
        </div>
      </div>

      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#333' }}>
              确认清除所有数据？
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
              此操作将删除所有食物记录和身体感受数据，且无法恢复。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  color: '#555',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease'
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#E57373',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease'
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
export type { FoodItem, Category, MealTime, Feeling }
