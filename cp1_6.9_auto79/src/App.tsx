import React, { useState, useMemo } from 'react'
import { presets, Gradient, hslToHex, hexToHsl } from './data/presets'
import { useLocalStorage } from './hooks/useLocalStorage'
import GradientCard from './components/GradientCard'
import PreviewArea from './components/PreviewArea'
import ColorSlider from './components/ColorSlider'
import CollectionPanel from './components/CollectionPanel'

const App: React.FC = () => {
  const [isDark, setIsDark] = useLocalStorage<boolean>('theme-dark', false)
  const [collections, setCollections] = useLocalStorage<Gradient[]>('gradient-collections', [])

  const [currentGradient, setCurrentGradient] = useState<Gradient>(presets[0])

  const startHsl = useMemo(() => hexToHsl(currentGradient.startColor), [currentGradient.startColor])
  const endHsl = useMemo(() => hexToHsl(currentGradient.endColor), [currentGradient.endColor])

  const handlePresetClick = (preset: Gradient) => {
    setCurrentGradient(preset)
  }

  const handleAngleChange = (angle: number) => {
    setCurrentGradient((prev) => ({ ...prev, angle }))
  }

  const handleStartHueChange = (hue: number) => {
    const newStartColor = hslToHex(hue, startHsl.s, startHsl.l)
    setCurrentGradient((prev) => ({ ...prev, startColor: newStartColor }))
  }

  const handleEndHueChange = (hue: number) => {
    const newEndColor = hslToHex(hue, endHsl.s, endHsl.l)
    setCurrentGradient((prev) => ({ ...prev, endColor: newEndColor }))
  }

  const isCollected = collections.some(
    (c) =>
      c.startColor === currentGradient.startColor &&
      c.endColor === currentGradient.endColor &&
      c.angle === currentGradient.angle
  )

  const handleCollect = () => {
    if (isCollected) {
      setCollections((prev) =>
        prev.filter(
          (c) =>
            !(
              c.startColor === currentGradient.startColor &&
              c.endColor === currentGradient.endColor &&
              c.angle === currentGradient.angle
            )
        )
      )
    } else {
      const newItem: Gradient = {
        id: `${Date.now()}`,
        name: `自定义 ${currentGradient.startColor} → ${currentGradient.endColor}`,
        startColor: currentGradient.startColor,
        endColor: currentGradient.endColor,
        angle: currentGradient.angle,
      }
      setCollections((prev) => [...prev, newItem])
    }
  }

  const handleDeleteCollection = (id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id))
  }

  const angleTrackGradient = `linear-gradient(90deg, ${currentGradient.startColor}, ${currentGradient.endColor})`
  const startHueTrackGradient = 'linear-gradient(90deg, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)'
  const endHueTrackGradient = 'linear-gradient(90deg, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)'

  return (
    <div className={`app ${isDark ? 'dark' : ''}`}>
      <header className="app-header">
        <h1>CSS 渐变配色方案设计器</h1>
      </header>

      <div className="main-layout">
        <div className="left-panel">
          <div className="presets-section">
            <h2 className="section-title">预设渐变</h2>
            <div className="presets-grid">
              {presets.map((preset) => (
                <GradientCard
                  key={preset.id}
                  startColor={preset.startColor}
                  endColor={preset.endColor}
                  angle={preset.angle}
                  name={preset.name}
                  onClick={() => handlePresetClick(preset)}
                />
              ))}
            </div>
          </div>

          <div className="preview-section">
            <div className="preview-header">
              <h2 className="section-title">预览</h2>
              <button
                className={`collect-btn ${isCollected ? 'collected' : ''}`}
                onClick={handleCollect}
                title={isCollected ? '取消收藏' : '收藏此配色'}
              >
                {isCollected ? '❤️' : '🤍'}
              </button>
            </div>
            <PreviewArea
              startColor={currentGradient.startColor}
              endColor={currentGradient.endColor}
              angle={currentGradient.angle}
              isDark={isDark}
            />

            <div className="sliders-section">
              <ColorSlider
                label="渐变角度"
                value={currentGradient.angle}
                min={0}
                max={360}
                step={1}
                onChange={handleAngleChange}
                trackGradient={angleTrackGradient}
                suffix="°"
              />
              <ColorSlider
                label="起始色色相"
                value={startHsl.h}
                min={0}
                max={360}
                step={1}
                onChange={handleStartHueChange}
                trackGradient={startHueTrackGradient}
                suffix="°"
              />
              <ColorSlider
                label="结束色色相"
                value={endHsl.h}
                min={0}
                max={360}
                step={1}
                onChange={handleEndHueChange}
                trackGradient={endHueTrackGradient}
                suffix="°"
              />
            </div>
          </div>
        </div>

        <div className="right-panel">
          <CollectionPanel
            collections={collections}
            onDelete={handleDeleteCollection}
            isDark={isDark}
          />
        </div>
      </div>

      <footer className="app-footer">
        <div className="theme-switch">
          <span>🌞 日间</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={isDark}
              onChange={(e) => setIsDark(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
          <span>🌙 夜间</span>
        </div>
      </footer>
    </div>
  )
}

export default App
