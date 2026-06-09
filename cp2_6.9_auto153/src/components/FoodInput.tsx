import { useState } from 'react'
import type { Category, MealTime } from '../App'

const CATEGORIES: Category[] = ['水果', '蔬菜', '主食', '蛋白质', '零食', '饮品']
const MEAL_TIMES: MealTime[] = ['早餐', '午餐', '晚餐', '加餐']

const CATEGORY_COLORS: Record<Category, string> = {
  '水果': '#FF8A65',
  '蔬菜': '#81C784',
  '主食': '#FFD54F',
  '蛋白质': '#4FC3F7',
  '零食': '#CE93D8',
  '饮品': '#80DEEA'
}

interface Props {
  onAdd: (item: { category: Category; name: string; mealTime: MealTime }) => void
}

function FoodInput({ onAdd }: Props) {
  const [category, setCategory] = useState<Category>('水果')
  const [name, setName] = useState('')
  const [mealTime, setMealTime] = useState<MealTime>('早餐')

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 20) return
    onAdd({ category, name: trimmed, mealTime })
    setName('')
  }

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#333' }}>
        快速录入食物
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: category === cat ? `2px solid ${CATEGORY_COLORS[cat]}` : '2px solid transparent',
                backgroundColor: category === cat ? CATEGORY_COLORS[cat] : '#F5F0E8',
                color: category === cat ? '#fff' : '#555',
                fontSize: '13px',
                fontWeight: category === cat ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease, transform 0.1s ease'
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value.slice(0, 20))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="输入食物名称（最多20字）"
          style={{
            flex: 1,
            minWidth: '180px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <div style={{ display: 'flex', gap: '6px' }}>
          {MEAL_TIMES.map(mt => (
            <button
              key={mt}
              onClick={() => setMealTime(mt)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: mealTime === mt ? '1px solid #388E3C' : '1px solid #ddd',
                backgroundColor: mealTime === mt ? '#E8F5E9' : '#fff',
                color: mealTime === mt ? '#388E3C' : '#555',
                fontSize: '13px',
                fontWeight: mealTime === mt ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease, transform 0.1s ease'
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {mt}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: name.trim() ? '#388E3C' : '#BDBDBD',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            transition: 'transform 0.1s ease'
          }}
          onMouseDown={e => name.trim() && (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          添加
        </button>
      </div>
    </div>
  )
}

export default FoodInput
