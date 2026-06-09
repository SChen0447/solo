import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import LetterReader from '../components/LetterReader.jsx'

export default function LetterReaderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [letter, setLetter] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadLetter()
  }, [id])

  const loadLetter = async () => {
    try {
      const data = await api.getLetter(id!)
      setLetter(data)
    } catch (err: any) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="empty-state">加载中...</div>
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">😢</div>
        <div className="empty-state-text">{error}</div>
        <button className="btn" onClick={() => navigate('/list')}>返回信件列表</button>
      </div>
    )
  }

  if (!letter) return null

  return <LetterReader letter={letter} onClose={() => navigate('/list')} />
}
