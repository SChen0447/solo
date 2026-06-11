import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Undo2, Redo2, RotateCcw, Eye, Image, Grid3x3 } from 'lucide-react'
import { useLoomStore } from './store'
import { getPreviewDataURL } from './LoomCanvas'

interface Props {
  onPreview: () => void
  previewImage: string | null
}

export default function ControlPanel({ onPreview, previewImage }: Props) {
  const { loomState, setTension, setGridSize, undo, redo, resetGrid, canUndo, canRedo } =
    useLoomStore()
  const { tension, gridSize } = loomState

  const [_undoable, setUndoable] = useState(canUndo())
  const [_redoable, setRedoable] = useState(canRedo())

  useEffect(() => {
    setUndoable(canUndo())
    setRedoable(canRedo())
  })

  const handleTensionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTension(Number(e.target.value))
    },
    [setTension]
  )

  const handleGridSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGridSize(Number(e.target.value))
    },
    [setGridSize]
  )

  const handlePreview = useCallback(() => {
    onPreview()
  }, [onPreview])

  return (
    <div className="control-panel flex flex-col gap-5 p-4 rounded-xl" style={{
      background: 'linear-gradient(180deg, #efe5d5 0%, #e0d4c0 100%)',
      boxShadow: '0 4px 16px rgba(78,52,46,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
    }}>
      <div>
        <label className="block text-sm font-serif text-amber-900 mb-2 font-semibold">
          张力调节
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={tension}
            onChange={handleTensionChange}
            className="tension-slider flex-1 h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(90deg, #8d6e63 ${(tension - 1) / 9 * 100}%, #d7ccc8 ${(tension - 1) / 9 * 100}%)`,
            }}
          />
          <motion.span
            key={tension}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="tension-value inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold text-amber-100 shadow-md"
            style={{
              background: 'linear-gradient(135deg, #5d4037, #8d6e63)',
            }}
          >
            {tension}
          </motion.span>
        </div>
        <div className="flex justify-between text-xs text-amber-800 mt-1 opacity-70">
          <span>低张力</span>
          <span>高张力</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-serif text-amber-900 mb-2 font-semibold">
          <Grid3x3 size={14} className="inline mr-1" />
          网格大小
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={20}
            step={1}
            value={gridSize}
            onChange={handleGridSizeChange}
            className="grid-slider flex-1 h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(90deg, #8d6e63 ${(gridSize - 10) / 10 * 100}%, #d7ccc8 ${(gridSize - 10) / 10 * 100}%)`,
            }}
          />
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold text-amber-900 bg-amber-100 shadow-inner">
            {gridSize}
          </span>
        </div>
      </div>

      <div className="border-t border-amber-300/50 pt-4">
        <label className="block text-sm font-serif text-amber-900 mb-2 font-semibold">
          图案预览
        </label>
        <div
          className="preview-window w-full aspect-square rounded-lg overflow-hidden border-2 border-amber-800/30"
          style={{ background: '#e8e0d0' }}
        >
          <AnimatePresence mode="wait">
            {previewImage ? (
              <motion.img
                key={previewImage}
                src={previewImage}
                alt="图案预览"
                className="w-full h-full object-cover"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <motion.div
                className="w-full h-full flex items-center justify-center text-amber-600/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Eye size={40} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.button
          onClick={handlePreview}
          className="w-full mt-2 px-3 py-2 rounded-lg text-sm font-medium text-amber-100 transition-all duration-300 flex items-center justify-center gap-2"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: 'linear-gradient(135deg, #5d4037 0%, #8d6e63 100%)',
            boxShadow: '0 2px 8px rgba(78,52,46,0.3)',
          }}
        >
          <Image size={14} />
          生成小样
        </motion.button>
      </div>

      <div className="border-t border-amber-300/50 pt-4">
        <div className="flex gap-2">
          <motion.button
            onClick={undo}
            disabled={!canUndo()}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={canUndo() ? { scale: 1.05 } : {}}
            whileTap={canUndo() ? { scale: 0.95 } : {}}
            style={{
              background: 'linear-gradient(135deg, #efe5d5 0%, #d7ccc8 100%)',
              color: '#5d4037',
              boxShadow: '0 1px 4px rgba(78,52,46,0.15)',
            }}
          >
            <Undo2 size={16} />
            撤销
          </motion.button>
          <motion.button
            onClick={redo}
            disabled={!canRedo()}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={canRedo() ? { scale: 1.05 } : {}}
            whileTap={canRedo() ? { scale: 0.95 } : {}}
            style={{
              background: 'linear-gradient(135deg, #efe5d5 0%, #d7ccc8 100%)',
              color: '#5d4037',
              boxShadow: '0 1px 4px rgba(78,52,46,0.15)',
            }}
          >
            <Redo2 size={16} />
            重做
          </motion.button>
        </div>
        <motion.button
          onClick={resetGrid}
          className="w-full mt-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: 'linear-gradient(135deg, #c62828 0%, #e53935 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(198,40,40,0.3)',
          }}
        >
          <RotateCcw size={14} />
          重置织机
        </motion.button>
      </div>
    </div>
  )
}
