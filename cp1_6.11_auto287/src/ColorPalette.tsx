import React from 'react'
import { motion } from 'framer-motion'
import { MousePointer2, ArrowDown, ArrowRight, SquareDashed } from 'lucide-react'
import { PRESET_COLORS } from './colors'
import { useLoomStore } from './store'
import type { FillMode } from './types'

interface Props {
  selectedColor: string
  onSelectColor: (color: string) => void
  fillMode: FillMode
  onFillModeChange: (mode: FillMode) => void
}

const FILL_MODES: { mode: FillMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'point', label: '单点', icon: <MousePointer2 size={14} /> },
  { mode: 'warp', label: '经向', icon: <ArrowDown size={14} /> },
  { mode: 'weft', label: '纬向', icon: <ArrowRight size={14} /> },
  { mode: 'drag', label: '拖拽', icon: <SquareDashed size={14} /> },
]

export default function ColorPalette({
  selectedColor,
  onSelectColor,
  fillMode,
  onFillModeChange,
}: Props) {
  return (
    <div
      className="color-palette flex flex-col gap-4 p-3 rounded-xl"
      style={{
        background: 'linear-gradient(180deg, #efe5d5 0%, #e0d4c0 100%)',
        boxShadow: '0 4px 16px rgba(78,52,46,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      <div>
        <label className="block text-sm font-serif text-amber-900 mb-2 font-semibold">
          填充模式
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {FILL_MODES.map(({ mode, label, icon }) => (
            <motion.button
              key={mode}
              onClick={() => onFillModeChange(mode)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 flex items-center justify-center gap-1 ${
                fillMode === mode
                  ? 'text-amber-100 shadow-md'
                  : 'text-amber-900'
              }`}
              style={{
                background:
                  fillMode === mode
                    ? 'linear-gradient(135deg, #5d4037 0%, #8d6e63 100%)'
                    : 'linear-gradient(135deg, #f5f0e8 0%, #e8e0d0 100%)',
                boxShadow:
                  fillMode === mode
                    ? '0 2px 8px rgba(78,52,46,0.3)'
                    : '0 1px 3px rgba(78,52,46,0.1)',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {icon}
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-serif text-amber-900 mb-2 font-semibold">
          色板
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <motion.button
              key={color.hex}
              onClick={() => onSelectColor(color.hex)}
              className={`color-swatch w-[30px] h-[30px] rounded-md cursor-pointer transition-all duration-200 relative ${
                selectedColor === color.hex
                  ? 'ring-2 ring-blue-300 ring-offset-1 ring-offset-transparent scale-110'
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: color.hex,
                boxShadow:
                  selectedColor === color.hex
                    ? '0 0 8px rgba(100,150,255,0.5)'
                    : '0 1px 3px rgba(0,0,0,0.15)',
              }}
              title={color.name}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      </div>

      <div className="mt-1">
        <label className="block text-xs text-amber-800 mb-1 opacity-70">当前选色</label>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md border border-amber-700/30 shadow-inner"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="text-xs text-amber-900 font-mono">{selectedColor}</span>
        </div>
      </div>
    </div>
  )
}
