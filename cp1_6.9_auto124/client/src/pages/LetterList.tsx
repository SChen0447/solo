import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import TimelineCard from '../components/TimelineCard.jsx'
import LetterReader from '../components/LetterReader.jsx'

interface LetterData {
  id: string
  content: string | null
  envelopeColor: string
  stamp: string
  season: string
  openDate: string
  isOpened: boolean
  isArrived: boolean
}

export default function LetterList() {
  const navigate = useNavigate()
  const [letters, setLetters] = useState<LetterData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLetter, setSelectedLetter] = useState<LetterData | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    loadLetters()
  }, [])

  const loadLetters = async () => {
    try {
      const data = await api.getLetters()
      setLetters(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = async (letter: LetterData) => {
    if (!letter.isArrived) return

    if (isMobile) {
      try {
        const full = await api.getLetter(letter.id)
        setSelectedLetter({ ...full, isArrived: true, isOpened: true })
      } catch (err) {
        console.error(err)
      }
    } else {
      navigate(`/letter/${letter.id}`)
    }
  }

  const arrivedCount = letters.filter((l) => l.isArrived).length
  const pendingCount = letters.filter((l) => !l.isArrived).length

  return (
    <div>
      <h1 className="page-title">我的时间线</h1>

      <div style={{ textAlign: 'center', marginBottom: 32, color: '#8b7355' }}>
        ✨ 已抵达 {arrivedCount} 封 · 旅途中 {pendingCount} 封 ✨
      </div>

      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : letters.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">还没有寄出任何信件</div>
          <button className="btn" onClick={() => navigate('/new')}>写第一封信</button>
        </div>
      ) : (
        <div className="timeline-container">
          <div className="timeline-grid">
            {letters.map((letter) => (
              <TimelineCard
                key={letter.id}
                letter={letter}
                onClick={() => handleCardClick(letter)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedLetter && (
        <LetterReader
          letter={selectedLetter as any}
          onClose={() => setSelectedLetter(null)}
        />
      )}
    </div>
  )
}
