import { useState } from 'react'
import { motion } from 'framer-motion'
import type { OceanParams } from './OceanCanvas'

interface ControlPanelProps {
  params: OceanParams
  onChange: (params: OceanParams) => void
}

interface SliderConfig {
  key: keyof OceanParams
  label: string
  min: number
  max: number
  step: number
  unit: string
  icon: string
  glowColor: string
}

const sliders: SliderConfig[] = [
  {
    key: 'tideStrength',
    label: '潮汐力度',
    min: 0,
    max: 100,
    step: 1,
    unit: '',
    icon: '🌊',
    glowColor: '#00bcd4',
  },
  {
    key: 'waterTemperature',
    label: '水温',
    min: 5,
    max: 30,
    step: 0.5,
    unit: '°C',
    icon: '🌡️',
    glowColor: '#00ffaa',
  },
  {
    key: 'nutrientConcentration',
    label: '营养盐浓度',
    min: 0,
    max: 100,
    step: 1,
    unit: '',
    icon: '🧪',
    glowColor: '#00ffff',
  },
]

export default function ControlPanel({ params, onChange }: ControlPanelProps) {
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [expanded, setExpanded] = useState(!isMobile)

  const handleChange = (key: keyof OceanParams, value: number) => {
    onChange({ ...params, [key]: value })
  }

  const containerClasses = isMobile
    ? 'fixed bottom-0 left-0 right-0 z-40 px-3 pb-[70px]'
    : 'fixed left-4 bottom-24 z-40 w-80'

  return (
    <div className={containerClasses}>
      <motion.div
        className="overflow-hidden"
        style={{
          background: isMobile
            ? 'linear-gradient(180deg, rgba(0,188,212,0.25) 0%, rgba(0,188,212,0.05) 80%, transparent 100%)'
            : 'linear-gradient(135deg, rgba(0,188,212,0.25) 0%, rgba(0,188,212,0.08) 60%, transparent 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(0,188,212,0.2)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,188,212,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        animate={{
          height: expanded ? 'auto' : isMobile ? 48 : 56,
          padding: expanded ? (isMobile ? '12px 12px 16px' : '16px 18px 20px') : (isMobile ? '8px 12px' : '10px 16px'),
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🔬</span>
            <span
              className="font-medium text-sm tracking-wide"
              style={{ color: '#00bcd4', textShadow: '0 0 12px rgba(0,188,212,0.5)' }}
            >
              海洋参数控制
            </span>
          </div>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ color: '#00bcd4', fontSize: '12px' }}
          >
            ▼
          </motion.span>
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className={`mt-3 space-y-4 ${isMobile ? '' : ''}`}
          >
            {sliders.map((slider) => (
              <SliderRow
                key={slider.key}
                config={slider}
                value={params[slider.key]}
                onChange={(v) => handleChange(slider.key, v)}
                isMobile={isMobile}
              />
            ))}

            {!isMobile && (
              <div
                className="mt-4 pt-3 text-[11px] leading-relaxed opacity-70"
                style={{
                  borderTop: '1px solid rgba(0,188,212,0.1)',
                  color: '#8fd4dc',
                }}
              >
                <div>💡 点击海面生成光涟漪</div>
                <div>🖱️ 拖拽平移 · 滚轮缩放</div>
                <div>⌨️ 按 S 键保存截图</div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

interface SliderRowProps {
  config: SliderConfig
  value: number
  onChange: (value: number) => void
  isMobile: boolean
}

function SliderRow({ config, value, onChange, isMobile }: SliderRowProps) {
  const [hover, setHover] = useState(false)
  const percent = ((value - config.min) / (config.max - config.min)) * 100

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: isMobile ? '14px' : '15px' }}>{config.icon}</span>
          <span
            className="text-[12px] font-medium"
            style={{ color: '#b4e6ec' }}
          >
            {config.label}
          </span>
        </div>
        <motion.span
          key={value.toFixed(1)}
          initial={{ scale: 1.15, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-[12px] font-mono font-semibold px-2 py-0.5 rounded-md"
          style={{
            color: config.glowColor,
            background: `${config.glowColor}15`,
            textShadow: `0 0 ${hover ? 16 : 10}px ${config.glowColor}80`,
            boxShadow: hover ? `0 0 16px ${config.glowColor}30, inset 0 0 12px ${config.glowColor}10` : `inset 0 0 8px ${config.glowColor}08`,
            border: `1px solid ${config.glowColor}30`,
          }}
        >
          {config.step < 1 ? value.toFixed(1) : Math.round(value)}
          {config.unit}
        </motion.span>
      </div>

      <div className="relative h-5 flex items-center">
        <div
          className="absolute w-full h-2 rounded-full overflow-hidden"
          style={{
            background: `linear-gradient(90deg, ${config.glowColor}10, ${config.glowColor}25)`,
            boxShadow: `inset 0 1px 3px rgba(0,0,0,0.3)`,
          }}
        />

        <motion.div
          className="absolute h-2 rounded-full left-0"
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          style={{
            background: `linear-gradient(90deg, ${config.glowColor}, ${config.glowColor}cc)`,
            boxShadow: `0 0 ${hover ? 20 : 12}px ${config.glowColor}, 0 0 30px ${config.glowColor}50`,
          }}
        />

        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute w-full h-5 opacity-0 cursor-pointer z-10"
        />

        <motion.div
          className="absolute pointer-events-none rounded-full"
          animate={{
            left: `calc(${percent}% - 9px)`,
            boxShadow: hover
              ? `0 0 24px ${config.glowColor}, 0 0 40px ${config.glowColor}80, inset 0 0 8px rgba(255,255,255,0.4)`
              : `0 0 14px ${config.glowColor}aa, 0 0 24px ${config.glowColor}50, inset 0 0 6px rgba(255,255,255,0.3)`,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          style={{
            width: 18,
            height: 18,
            top: '50%',
            marginTop: -9,
            background: `radial-gradient(circle at 35% 35%, #ffffff, ${config.glowColor} 50%, ${config.glowColor}aa 80%)`,
            border: `1px solid ${config.glowColor}`,
          }}
        />
      </div>

      <div className="flex justify-between mt-1 text-[9px] opacity-40" style={{ color: '#8fd4dc' }}>
        <span>{config.step < 1 ? config.min.toFixed(1) : config.min}{config.unit}</span>
        <span>{config.step < 1 ? config.max.toFixed(1) : config.max}{config.unit}</span>
      </div>
    </div>
  )
}
