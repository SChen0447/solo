import { useState, useEffect, useCallback } from 'react'
import type { Tea, MatchedTea } from './types'
import PreferenceSliderPanel from './PreferenceSliderPanel'
import TeaCardList from './TeaCardList'
import TeaDetailModal from './TeaDetailModal'

function App() {
  const [teaList, setTeaList] = useState<Tea[]>([])
  const [matchedTeas, setMatchedTeas] = useState<MatchedTea[]>([])
  const [preferences, setPreferences] = useState<number[]>([5, 5, 5, 5])
  const [selectedTea, setSelectedTea] = useState<MatchedTea | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/tea')
      .then((res) => res.json())
      .then((data: Tea[]) => {
        setTeaList(data)
      })
      .catch((err) => {
        console.error('获取茶叶数据失败:', err)
      })
  }, [])

  const matchTea = useCallback(async (prefs: number[]) => {
    setLoading(true)
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs })
      })
      const data: MatchedTea[] = await res.json()
      setMatchedTeas(data)
    } catch (err) {
      console.error('匹配失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePreferencesChange = useCallback(
    (newPreferences: number[]) => {
      setPreferences(newPreferences)
      matchTea(newPreferences)
    },
    [matchTea]
  )

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="header-title">
          <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 28h36c0 12-8 20-18 20S8 40 8 28zm0-4v-4h36v4H8zm44 8c4 0 8-2 8-8s-4-8-8-8v16z" />
            <ellipse cx="26" cy="16" rx="6" ry="3" fill="#d4a373" opacity="0.6" />
            <ellipse cx="30" cy="12" rx="4" ry="2" fill="#d4a373" opacity="0.4" />
          </svg>
          茶觉·味方
        </h1>
        <p className="header-subtitle">以味寻茶，一杯一知己</p>
      </header>

      <PreferenceSliderPanel
        preferences={preferences}
        onChange={handlePreferencesChange}
      />

      {loading ? (
        <div className="loading">正在为您寻找最匹配的茶款...</div>
      ) : matchedTeas.length > 0 ? (
        <TeaCardList matchedTeas={matchedTeas} onSelect={setSelectedTea} />
      ) : teaList.length > 0 ? (
        <div className="empty-state">
          <h3>开始您的寻茶之旅</h3>
          <p>请滑动上方滑块，调整您的口感偏好</p>
          <p>系统将为您推荐最匹配的茶款</p>
        </div>
      ) : (
        <div className="loading">加载中...</div>
      )}

      {selectedTea && (
        <TeaDetailModal tea={selectedTea} onClose={() => setSelectedTea(null)} />
      )}
    </div>
  )
}

export default App
