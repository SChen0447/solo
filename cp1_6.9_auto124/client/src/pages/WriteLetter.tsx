import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import EnvelopeSelector from '../components/EnvelopeSelector.jsx'
import StampSelector from '../components/StampSelector.jsx'

const SEASONS = [
  { id: 'spring', name: '春季 🌸' },
  { id: 'summer', name: '夏季 ☀️' },
  { id: 'autumn', name: '秋季 🍁' },
  { id: 'winter', name: '冬季 ❄️' },
]

function getTomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function WriteLetter() {
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [openDate, setOpenDate] = useState(getTomorrowStr())
  const [envelopeColor, setEnvelopeColor] = useState('#e8d5b7')
  const [stamp, setStamp] = useState('sakura')
  const [season, setSeason] = useState('spring')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (content.length < 20 || content.length > 200) {
      setError('信件内容需在20-200字之间')
      return
    }

    if (!openDate) {
      setError('请选择开启日期')
      return
    }

    const today = new Date(getTodayStr())
    const selected = new Date(openDate)
    if (selected <= today) {
      setError('必须选择未来的日期')
      return
    }

    setSubmitting(true)
    try {
      await api.createLetter({
        content,
        envelopeColor,
        stamp,
        season,
        openDate: new Date(openDate).toISOString(),
      })
      navigate('/list')
    } catch (err: any) {
      setError(err.message || '发送失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">写一封给未来的信</h1>
      <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">开启日期</label>
            <input
              type="date"
              className="form-input"
              value={openDate}
              min={getTomorrowStr()}
              onChange={(e) => setOpenDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">信件内容（{content.length}/200字）</label>
            <textarea
              className="form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 200))}
              placeholder="写下你想对未来说的话..."
              rows={6}
              required
            />
            <div className="char-count">{content.length}/200</div>
          </div>

          <div className="form-group">
            <label className="form-label">选择季节（背景动画）</label>
            <div className="season-selector">
              {SEASONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`season-btn ${season === s.id ? 'selected' : ''}`}
                  onClick={() => setSeason(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <EnvelopeSelector selected={envelopeColor} onChange={setEnvelopeColor} />
          <StampSelector selected={stamp} onChange={setStamp} />

          {error && <div className="error-text">{error}</div>}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? '寄送中...' : '📮 寄往未来'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/list')}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
