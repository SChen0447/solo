import { useState, useCallback } from 'react'
import {
  CakeConfig,
  CakeSize,
  CakeFlavor,
  FrostingStyle,
  FruitType,
  FruitSelection,
  CAKE_SIZES,
  FLAVOR_OPTIONS,
  FROSTING_COLORS,
  FROSTING_STYLES,
  FRUIT_OPTIONS,
  MAX_FRUIT_PER_TYPE,
  MAX_CANDLES,
  MAX_TEXT_LENGTH,
  SavedOrder,
  formatDate,
  getFlavorLabel
} from '../utils/cakeConfig'
import '../styles/customizer.css'

interface CustomizerPanelProps {
  config: CakeConfig
  onChange: (config: CakeConfig) => void
  onSave: () => void
  drafts: SavedOrder[]
  onRestoreDraft: (draft: SavedOrder) => void
  isSaving: boolean
  onCloseMobile?: () => void
}

type SectionKey = 'base' | 'frosting' | 'toppings'

function CustomizerPanel({
  config,
  onChange,
  onSave,
  drafts,
  onRestoreDraft,
  isSaving,
  onCloseMobile
}: CustomizerPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    base: true,
    frosting: false,
    toppings: false
  })

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const updateConfig = useCallback(
    (updates: Partial<CakeConfig>) => {
      onChange({ ...config, ...updates })
    },
    [config, onChange]
  )

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateConfig({ size: Number(e.target.value) as CakeSize })
  }

  const handleFlavorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateConfig({ flavor: e.target.value as CakeFlavor })
  }

  const handleFrostingColorChange = (color: string) => {
    updateConfig({ frostingColor: color })
  }

  const handleFrostingStyleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({ frostingStyle: e.target.value as FrostingStyle })
  }

  const handleFruitChange = (fruit: FruitType, checked: boolean) => {
    const newFruits: FruitSelection = { ...config.fruits }
    if (checked) {
      const total = newFruits[fruit]
      if (total < MAX_FRUIT_PER_TYPE) {
        newFruits[fruit] = total + 1
      }
    } else {
      if (newFruits[fruit] > 0) {
        newFruits[fruit] = newFruits[fruit] - 1
      }
    }
    updateConfig({ fruits: newFruits })
  }

  const handleCandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({ candleCount: Number(e.target.value) })
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, MAX_TEXT_LENGTH)
    updateConfig({ decorationText: value })
  }

  const textOverflow = config.decorationText.length > MAX_TEXT_LENGTH

  return (
    <div className="customizer-panel">
      <div className="panel-header">
        <h2 className="panel-title">🍰 蛋糕定制</h2>
        {onCloseMobile && (
          <button className="mobile-close-btn" onClick={onCloseMobile} aria-label="关闭">
            ×
          </button>
        )}
      </div>

      <Section title="蛋糕基体" expanded={expandedSections.base} onToggle={() => toggleSection('base')}>
        <div className="field">
          <label className="field-label">尺寸</label>
          <select
            className="field-select"
            value={config.size}
            onChange={handleSizeChange}
          >
            {CAKE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} 英寸
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label">口味</label>
          <select
            className="field-select"
            value={config.flavor}
            onChange={handleFlavorChange}
          >
            {FLAVOR_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <div
            className="flavor-preview"
            style={{ backgroundColor: FLAVOR_OPTIONS.find((f) => f.value === config.flavor)?.color }}
          />
        </div>
      </Section>

      <Section title="奶油装饰" expanded={expandedSections.frosting} onToggle={() => toggleSection('frosting')}>
        <div className="field">
          <label className="field-label">奶油颜色</label>
          <div className="color-palette">
            {FROSTING_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`color-swatch ${config.frostingColor === c.value ? 'active' : ''}`}
                style={{ backgroundColor: c.value }}
                onClick={() => handleFrostingColorChange(c.value)}
                title={c.name}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label">裱花样式</label>
          <div className="radio-group">
            {FROSTING_STYLES.map((style) => (
              <label key={style.value} className="radio-label">
                <input
                  type="radio"
                  name="frostingStyle"
                  value={style.value}
                  checked={config.frostingStyle === style.value}
                  onChange={handleFrostingStyleChange}
                />
                <span>{style.label}</span>
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section title="顶部插件" expanded={expandedSections.toppings} onToggle={() => toggleSection('toppings')}>
        <div className="field">
          <label className="field-label">水果（每类最多 {MAX_FRUIT_PER_TYPE} 个）</label>
          <div className="fruit-checkboxes">
            {FRUIT_OPTIONS.map((fruit) => (
              <div key={fruit.value} className="fruit-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.fruits[fruit.value] > 0}
                    onChange={(e) => handleFruitChange(fruit.value, e.target.checked)}
                  />
                  <span className="checkbox-dot" style={{ backgroundColor: fruit.color }} />
                  <span>{fruit.label}</span>
                </label>
                <div className="fruit-counter">
                  {Array.from({ length: MAX_FRUIT_PER_TYPE }).map((_, i) => (
                    <span
                      key={i}
                      className={`fruit-dot ${i < config.fruits[fruit.value] ? 'filled' : ''}`}
                      style={{ backgroundColor: fruit.color }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label">
            蜡烛数量: <span className="value-badge">{config.candleCount}</span>
          </label>
          <input
            type="range"
            min={0}
            max={MAX_CANDLES}
            value={config.candleCount}
            onChange={handleCandleChange}
            className="slider"
          />
          <div className="slider-ticks">
            {Array.from({ length: MAX_CANDLES + 1 }).map((_, i) => (
              <span key={i}>{i}</span>
            ))}
          </div>
        </div>
      </Section>

      <div className="field text-field">
        <label className="field-label">装饰文字</label>
        <input
          type="text"
          className={`text-input ${textOverflow ? 'error' : ''}`}
          value={config.decorationText}
          onChange={handleTextChange}
          placeholder="请输入祝福语，如 Happy Birthday"
          maxLength={MAX_TEXT_LENGTH}
        />
        <div className={`char-counter ${textOverflow ? 'error' : ''}`}>
          {config.decorationText.length}/{MAX_TEXT_LENGTH}
        </div>
      </div>

      <button
        className={`save-btn ${isSaving ? 'loading' : ''}`}
        onClick={onSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <span className="spinner" />
        ) : null}
        {isSaving ? '保存中...' : '💾 保存定制'}
      </button>

      {drafts.length > 0 && (
        <div className="drafts-section">
          <h3 className="drafts-title">最近草稿</h3>
          <div className="drafts-list">
            {drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                className="draft-item"
                onClick={() => onRestoreDraft(draft)}
              >
                <div className="draft-preview-color" style={{
                  backgroundColor: FLAVOR_OPTIONS.find((f) => f.value === draft.flavor)?.color
                }} />
                <div className="draft-info">
                  <div className="draft-summary">
                    {draft.size}寸 · {getFlavorLabel(draft.flavor)}
                  </div>
                  <div className="draft-date">{formatDate(draft.timestamp)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SectionProps {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function Section({ title, expanded, onToggle, children }: SectionProps) {
  return (
    <div className={`panel-section ${expanded ? 'expanded' : ''}`}>
      <button
        type="button"
        className="section-header"
        onClick={onToggle}
      >
        <span className="section-title">{title}</span>
        <span className="section-arrow">{expanded ? '−' : '+'}</span>
      </button>
      <div className="section-content">{children}</div>
    </div>
  )
}

export default CustomizerPanel
