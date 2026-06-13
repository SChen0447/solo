import { useState, useRef } from 'react'
import { Capsule, ColorKey, COLOR_PALETTES } from './types'

interface CreateCapsuleProps {
  onClose: () => void
  onCreated: (capsule: Capsule) => void
}

const COLOR_KEYS = Object.keys(COLOR_PALETTES) as ColorKey[]

function CreateCapsule({ onClose, onCreated }: CreateCapsuleProps) {
  const [title, setTitle] = useState('')
  const [selectedColor, setSelectedColor] = useState<ColorKey>('starBlue')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav']
    if (!validTypes.includes(file.type)) {
      setError('仅支持 MP3 或 WAV 格式的音频文件')
      return
    }

    setError('')
    setAudioFile(file)

    if (audioUrl) URL.revokeObjectURL(audioUrl)
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('请输入胶囊标题')
      return
    }

    setIsSubmitting(true)
    setError('')

    let base64Audio = ''
    if (audioFile) {
      base64Audio = await fileToBase64(audioFile)
    }

    try {
      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          color: selectedColor,
          audioUrl: base64Audio
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '创建失败')
      }

      const newCapsule: Capsule = await res.json()
      onCreated(newCapsule)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const palette = COLOR_PALETTES[selectedColor]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1500,
        padding: '20px',
        animation: 'modalFadeIn 0.3s ease-out'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          animation: 'modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 300, margin: 0, color: '#ffffff', letterSpacing: '4px' }}>
            创建记忆胶囊
          </h2>
          <button
            onClick={onClose}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={e => (e.currentTarget.style.transform = '')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#ffffff',
              fontSize: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', letterSpacing: '2px' }}>
              胶囊标题
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError('') }}
              placeholder="给这段记忆起个名字..."
              maxLength={30}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={e => (e.target.style.borderColor = palette.from)}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', marginBottom: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', letterSpacing: '2px' }}>
              选择色彩
            </label>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {COLOR_KEYS.map(colorKey => {
                const cp = COLOR_PALETTES[colorKey]
                const isSelected = selectedColor === colorKey
                return (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => setSelectedColor(colorKey)}
                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
                    onMouseUp={e => (e.currentTarget.style.transform = '')}
                    onMouseLeave={e => (e.currentTarget.style.transform = '')}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${cp.from} 0%, ${cp.to} 100%)`,
                      border: isSelected ? '3px solid #ffffff' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      padding: 0,
                      boxShadow: isSelected ? `0 0 24px ${cp.from}80` : 'none'
                    }}
                    title={cp.name}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#ffffff'
                      }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', marginBottom: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', letterSpacing: '2px' }}>
              音频文件（可选）
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '32px',
                borderRadius: '12px',
                border: '2px dashed rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.03)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = palette.from)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
            >
              {audioFile ? (
                <div>
                  <div style={{ fontSize: '16px', color: '#ffffff', marginBottom: '8px' }}>
                    🎵 {audioFile.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB · 点击更换
                  </div>
                  {audioUrl && (
                    <audio src={audioUrl} controls style={{ marginTop: '16px', width: '100%' }} />
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎶</div>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                    点击上传 MP3 / WAV 音频
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 100, 100, 0.15)',
              color: '#ff8080',
              fontSize: '14px',
              marginBottom: '24px'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={e => (e.currentTarget.style.transform = '')}
              onMouseLeave={e => (e.currentTarget.style.transform = '')}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#ffffff',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              onMouseDown={e => { if (!isSubmitting) e.currentTarget.style.transform = 'scale(0.95)' }}
              onMouseUp={e => (e.currentTarget.style.transform = '')}
              onMouseLeave={e => (e.currentTarget.style.transform = '')}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 500,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
                transition: 'all 0.3s ease',
                letterSpacing: '2px'
              }}
            >
              {isSubmitting ? '创建中...' : '创建胶囊'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const createStyleInjected = (() => {
  const existing = document.getElementById('create-capsule-styles')
  if (existing) return true
  const style = document.createElement('style')
  style.id = 'create-capsule-styles'
  style.textContent = `
    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(30px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    input::placeholder {
      color: rgba(255,255,255,0.3);
    }
  `
  document.head.appendChild(style)
  return true
})()
void createStyleInjected

export default CreateCapsule
