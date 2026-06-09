import React, { useState } from 'react'
import { getGradientCSS } from '../data/presets'

interface PreviewAreaProps {
  startColor: string
  endColor: string
  angle: number
  isDark: boolean
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ startColor, endColor, angle, isDark }) => {
  const [showToast, setShowToast] = useState(false)
  const cssCode = getGradientCSS(startColor, endColor, angle)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssCode)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <div className="preview-area">
      <div
        className="preview-gradient"
        style={{
          background: `linear-gradient(${angle}deg, ${startColor}, ${endColor})`,
        }}
      />
      <div className={`code-block ${isDark ? 'dark' : ''}`}>
        <code>{cssCode};</code>
        <button className="copy-btn" onClick={handleCopy}>
          复制
        </button>
      </div>
      <div className={`toast ${showToast ? 'show' : ''}`}>
        已复制
      </div>
    </div>
  )
}

export default PreviewArea
