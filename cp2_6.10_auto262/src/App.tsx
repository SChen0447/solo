import React, { useReducer, useEffect, useState, useCallback, useRef } from 'react'
import { debounce } from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import ColorPalette from './ColorPalette'
import CanvasRenderer from './CanvasRenderer'
import HistoryTimeline from './HistoryTimeline'
import {
  AppState,
  AppAction,
  FormState,
  HistoryItem,
  initialFormState,
  COLOR_PRESETS,
  getDefaultTextColor,
  GradientPreset
} from './types'

const initialState: AppState = {
  formState: initialFormState,
  history: []
}

const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        formState: { ...state.formState, [action.field]: action.value } as FormState
      }
    case 'SET_TEXT_STYLE': {
      const ts = state.formState.textStyle
      return {
        ...state,
        formState: {
          ...state.formState,
          textStyle: { ...ts, [action.field]: action.value }
        }
      }
    }
    case 'RESTORE_STATE':
      return { ...state, formState: action.formState }
    case 'ADD_HISTORY': {
      const next = [action.item, ...state.history].slice(0, 5)
      return { ...state, history: next }
    }
    default:
      return state
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const setField = useCallback((field: keyof FormState, value: unknown) => {
    dispatch({ type: 'SET_FIELD', field, value })
  }, [])

  const setTextStyle = useCallback((field: keyof FormState['textStyle'], value: number | string) => {
    dispatch({ type: 'SET_TEXT_STYLE', field, value })
  }, [])

  const debouncedTextStyle = debounce(setTextStyle, 16)

  const handleGradientSelect = (preset: GradientPreset) => {
    dispatch({ type: 'SET_FIELD', field: 'gradientId', value: preset.id })
    dispatch({ type: 'SET_FIELD', field: 'backgroundType', value: 'gradient' })
    dispatch({
      type: 'SET_TEXT_STYLE',
      field: 'color',
      value: getDefaultTextColor(preset.id)
    })
  }

  const handleColorPreset = (presetId: string) => {
    const preset = COLOR_PRESETS.find((c) => c.id === presetId)
    if (!preset) return
    dispatch({ type: 'SET_TEXT_STYLE', field: 'colorPresetId', value: presetId })
    dispatch({ type: 'SET_TEXT_STYLE', field: 'color', value: preset.textColor })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      dispatch({ type: 'SET_FIELD', field: 'backgroundImage', value: dataUrl })
      dispatch({ type: 'SET_FIELD', field: 'backgroundType', value: 'image' })
      dispatch({ type: 'SET_TEXT_STYLE', field: 'color', value: '#ffffff' })
    }
    reader.readAsDataURL(file)
  }

  const handleExportComplete = useCallback((thumbnail: string) => {
    const item: HistoryItem = {
      id: uuidv4(),
      timestamp: Date.now(),
      thumbnail,
      formState: JSON.parse(JSON.stringify(state.formState))
    }
    dispatch({ type: 'ADD_HISTORY', item })
  }, [state.formState])

  const handleRestore = (item: HistoryItem) => {
    dispatch({ type: 'RESTORE_STATE', formState: item.formState })
  }

  const isMobile = windowWidth < 900

  const Slider = ({
    label,
    value,
    min,
    max,
    step,
    onChange
  }: {
    label: string
    value: number
    min: number
    max: number
    step: number
    onChange: (v: number) => void
  }) => (
    <div style={mobileStyles.sliderItem}>
      <div style={mobileStyles.sliderLabel}>
        <span>{label}</span>
        <span style={mobileStyles.sliderValue}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={mobileStyles.sliderInput}
      />
    </div>
  )

  const mobileStyles: Record<string, React.CSSProperties> = isMobile
    ? {
        panel: {
          width: '100%',
          backgroundColor: '#fafafa',
          padding: 12,
          borderBottom: '1px solid #e5e5e5',
          overflowX: 'auto'
        },
        panelInner: {
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          minWidth: 700
        },
        group: {
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minWidth: 160
        },
        label: { fontSize: 11, fontWeight: 600, color: '#555' },
        input: {
          fontSize: 12,
          padding: '5px 8px',
          border: '1px solid #ddd',
          borderRadius: 4,
          backgroundColor: '#fff',
          color: '#2d2d2d',
          fontFamily: 'inherit',
          outline: 'none'
        },
        textarea: {
          fontSize: 12,
          padding: '5px 8px',
          border: '1px solid #ddd',
          borderRadius: 4,
          backgroundColor: '#fff',
          color: '#2d2d2d',
          fontFamily: 'inherit',
          resize: 'none',
          outline: 'none',
          minHeight: 42
        },
        sliderItem: { display: 'flex', flexDirection: 'column', gap: 2 },
        sliderLabel: {
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#555'
        },
        sliderValue: { fontWeight: 600, color: '#3b82f6' },
        sliderInput: {
          width: '100%',
          accentColor: '#3b82f6'
        }
      }
    : {
        panel: {
          width: 320,
          backgroundColor: '#fafafa',
          padding: 20,
          overflowY: 'auto',
          borderRight: '1px solid #e5e5e5',
          flexShrink: 0
        },
        panelInner: {
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        },
        group: { display: 'flex', flexDirection: 'column', gap: 8 },
        label: { fontSize: 13, fontWeight: 600, color: '#2d2d2d' },
        input: {
          fontSize: 14,
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: 4,
          backgroundColor: '#fff',
          color: '#2d2d2d',
          fontFamily: 'inherit',
          outline: 'none'
        },
        textarea: {
          fontSize: 14,
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: 4,
          backgroundColor: '#fff',
          color: '#2d2d2d',
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
          minHeight: 60
        },
        sliderItem: { display: 'flex', flexDirection: 'column', gap: 4 },
        sliderLabel: {
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#555'
        },
        sliderValue: { fontWeight: 600, color: '#3b82f6' },
        sliderInput: {
          width: '100%',
          accentColor: '#3b82f6'
        }
      }

  const configPanel = (
    <div style={mobileStyles.panel}>
      <div style={mobileStyles.panelInner}>
        <div style={mobileStyles.group}>
          <span style={mobileStyles.label}>单集标题</span>
          <textarea
            value={state.formState.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="可换行输入"
            style={mobileStyles.textarea}
          />
        </div>
        <div style={mobileStyles.group}>
          <span style={mobileStyles.label}>副标题</span>
          <input
            value={state.formState.subtitle}
            onChange={(e) => setField('subtitle', e.target.value)}
            style={mobileStyles.input}
          />
        </div>
        <div style={mobileStyles.group}>
          <span style={mobileStyles.label}>嘉宾姓名</span>
          <input
            value={state.formState.guest}
            onChange={(e) => setField('guest', e.target.value)}
            style={mobileStyles.input}
          />
        </div>
        <div style={mobileStyles.group}>
          <span style={mobileStyles.label}>发布日期</span>
          <input
            value={state.formState.date}
            onChange={(e) => setField('date', e.target.value)}
            style={mobileStyles.input}
          />
        </div>

        <div style={mobileStyles.group}>
          <span style={mobileStyles.label}>背景图片</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                ...mobileStyles.input,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: '#fff'
              }}
            >
              {state.formState.backgroundImage ? '已选择图片' : '选择本地图片'}
            </button>
            {state.formState.backgroundImage && (
              <button
                onClick={() => {
                  setField('backgroundImage', null)
                  setField('backgroundType', 'gradient')
                }}
                style={{
                  padding: '4px 10px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#666'
                }}
              >
                清除
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <ColorPalette
          selectedId={state.formState.gradientId}
          onSelect={handleGradientSelect}
        />

        <div style={mobileStyles.group}>
          <span style={mobileStyles.label}>文字样式</span>
          <Slider
            label="字号"
            value={state.formState.textStyle.fontSize}
            min={12}
            max={48}
            step={1}
            onChange={(v) => debouncedTextStyle('fontSize', v)}
          />
          <Slider
            label="X偏移"
            value={state.formState.textStyle.offsetX}
            min={-50}
            max={50}
            step={1}
            onChange={(v) => debouncedTextStyle('offsetX', v)}
          />
          <Slider
            label="Y偏移"
            value={state.formState.textStyle.offsetY}
            min={-50}
            max={50}
            step={1}
            onChange={(v) => debouncedTextStyle('offsetY', v)}
          />
        </div>

        <div style={mobileStyles.group}>
          <span style={mobileStyles.label}>文字颜色</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.id}
                onClick={() => handleColorPreset(c.id)}
                title={c.name}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  border:
                    state.formState.textStyle.colorPresetId === c.id
                      ? '2px solid #3b82f6'
                      : '1px solid #ddd',
                  background: `linear-gradient(135deg, ${c.accentColor} 0%, ${c.textColor} 100%)`,
                  cursor: 'pointer',
                  padding: 0
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: '#555' }}>自定义:</span>
            <input
              type="color"
              value={state.formState.textStyle.color}
              onChange={(e) => setTextStyle('color', e.target.value)}
              style={{ width: 32, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: '#2d2d2d', fontFamily: 'monospace' }}>
              {state.formState.textStyle.color}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  const canvasAreaStyle: React.CSSProperties = isMobile
    ? {
        flex: 1,
        backgroundColor: '#e0e0e0',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }
    : {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <HistoryTimeline history={state.history} onRestore={handleRestore} />
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: 0 }}>
        {configPanel}
        <div style={canvasAreaStyle}>
          <CanvasRenderer
            formState={state.formState}
            onExportComplete={handleExportComplete}
          />
        </div>
      </div>
    </div>
  )
}

export default App
