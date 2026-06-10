import React, { useRef } from 'react'

interface InputPanelProps {
  text: string
  onTextChange: (text: string) => void
  emotionValue: number
  emotionKeywords: string[]
  onAnalyze: () => void
  onGenerate: () => void
  onImport: (data: any) => void
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  color: 'white',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
}

const InputPanel: React.FC<InputPanelProps> = ({
  text,
  onTextChange,
  emotionValue,
  emotionKeywords,
  onAnalyze,
  onGenerate,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        onImport(data)
      } catch (err) {
        console.error('Failed to parse JSON:', err)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const getEmotionColor = (value: number) => {
    if (value < 0.33) return '#ef4444'
    if (value < 0.66) return '#facc15'
    return '#7effb3'
  }

  const emotionLabel = emotionValue < 0.33 ? '消极' : emotionValue < 0.66 ? '中性' : '积极'

  return (
    <div style={{
      width: '350px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: '16px',
      backgroundColor: '#111827',
      borderRight: '1px solid #374151',
      boxSizing: 'border-box',
      height: '100%',
      overflowY: 'auto',
      '@media (max-width: 768px)': {
        width: '100%',
        height: 'auto',
        borderRight: 'none',
        borderBottom: '1px solid #374151'
      }
    } as React.CSSProperties}>
      <h2 style={{
        color: '#fff',
        fontSize: '22px',
        fontWeight: 700,
        margin: 0,
        letterSpacing: '1px'
      }}>
        回声编织
      </h2>
      <p style={{
        color: '#9ca3af',
        fontSize: '13px',
        margin: 0
      }}>
        输入文字，让情感化作视觉的回声
      </p>

      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="在这里输入一段文字或一首短诗..."
        style={{
          width: '100%',
          height: '200px',
          backgroundColor: '#f0ebe3',
          border: '1px solid #d4ccc0',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#1e1b2e',
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'inherit'
        }}
      />

      {emotionKeywords.length > 0 && (
        <div style={{
          width: '100%',
          height: '8px',
          borderRadius: '4px',
          background: 'linear-gradient(to right, #ef4444, #facc15, #7effb3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-3px',
            left: `${emotionValue * 100}%`,
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: getEmotionColor(emotionValue),
            transform: 'translateX(-50%)',
            boxShadow: `0 0 10px ${getEmotionColor(emotionValue)}`,
            transition: 'left 0.3s ease'
          }} />
        </div>
      )}

      {emotionKeywords.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>
            情感倾向: <span style={{ color: getEmotionColor(emotionValue), fontWeight: 600 }}>{emotionLabel}</span>
          </span>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>
            匹配关键词: {emotionKeywords.length}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={onAnalyze}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#7c3aed'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#8b5cf6'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          style={{
            ...buttonStyle,
            backgroundColor: '#8b5cf6',
            flex: 1,
            minWidth: '120px'
          }}
        >
          分析情感
        </button>
        <button
          onClick={onGenerate}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0891b2'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#06b6d4'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          style={{
            ...buttonStyle,
            backgroundColor: '#06b6d4',
            flex: 1,
            minWidth: '120px'
          }}
        >
          生成动画
        </button>
      </div>

      <button
        onClick={handleImportClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#4b5563'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#374151'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        style={{
          ...buttonStyle,
          backgroundColor: '#374151',
          width: '100%'
        }}
      >
        导入作品
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default InputPanel
