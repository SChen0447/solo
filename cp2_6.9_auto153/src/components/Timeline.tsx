import type { FoodItem, Feeling } from '../App'

const CATEGORY_COLORS: Record<string, string> = {
  '水果': '#FF8A65',
  '蔬菜': '#81C784',
  '主食': '#FFD54F',
  '蛋白质': '#4FC3F7',
  '零食': '#CE93D8',
  '饮品': '#80DEEA'
}

const FEELING_EMOJIS: Record<string, string> = {
  '精力好': '😊',
  '胀气': '🤢',
  '不舒服': '😣',
  '无感': '😐'
}

const FEELINGS: Feeling[] = ['精力好', '胀气', '不舒服', '无感']

interface Props {
  foods: FoodItem[]
  loading: boolean
  onUpdateFeeling: (id: number, feeling: Feeling) => void
  onDelete: (id: number) => void
}

function formatTime(timestamp: number) {
  const d = new Date(timestamp)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  if (sameDay) return `今天 ${time}`
  if (isYesterday) return `昨天 ${time}`
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`
}

function Timeline({ foods, loading, onUpdateFeeling, onDelete }: Props) {
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        padding: '24px'
      }}>
        <p style={{ color: '#999', fontSize: '14px' }}>加载中...</p>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      padding: '24px',
      maxHeight: '700px',
      overflowY: 'auto'
    }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#333' }}>
        饮食时间轴
      </h2>

      {foods.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#999',
          fontSize: '14px'
        }}>
          暂无记录，开始添加你的第一条食物吧~
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {foods.map(food => (
            <div
              key={food.id}
              style={{
                position: 'relative',
                padding: '14px 16px 14px 20px',
                borderRadius: '8px',
                backgroundColor: '#FAFAFA',
                transition: 'background-color 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EDE7F6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FAFAFA')}
            >
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                borderRadius: '4px 0 0 4px',
                backgroundColor: CATEGORY_COLORS[food.category]
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '12px',
                      backgroundColor: CATEGORY_COLORS[food.category],
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {food.category}
                    </span>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '12px',
                      backgroundColor: '#E8F5E9',
                      color: '#388E3C',
                      fontSize: '12px'
                    }}>
                      {food.mealTime}
                    </span>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {formatTime(food.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: '#333', marginBottom: '10px' }}>
                    {food.name}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {FEELINGS.map(f => f && (
                      <button
                        key={f}
                        onClick={() => onUpdateFeeling(food.id, food.feeling === f ? null : f)}
                        title={f}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: food.feeling === f ? '2px solid #388E3C' : '1px solid #E0E0E0',
                          backgroundColor: food.feeling === f ? '#E8F5E9' : '#fff',
                          fontSize: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.1s ease, transform 0.1s ease',
                          opacity: food.feeling && food.feeling !== f ? 0.5 : 1
                        }}
                        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        {FEELING_EMOJIS[f]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onDelete(food.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#BDBDBD',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#FFEBEE'
                    e.currentTarget.style.color = '#E57373'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#BDBDBD'
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Timeline
