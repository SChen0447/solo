import React from 'react';
import { motion } from 'framer-motion';
import { Snowflake, Flame, RefreshCw, Play, Save, RotateCcw } from 'lucide-react';
import { useAlchemy } from '@/phases/Phases';
import { playClickSound } from '@/utils/audio';

const ControlPanel: React.FC = () => {
  const { state, setTemperature, setStirSpeed, setCooling, performSynthesis, saveRecipe, clearCrucible, getSuccessRate } = useAlchemy();

  const handleSave = async () => {
    playClickSound();
    await saveRecipe();
  };

  const successRate = Math.round(getSuccessRate() * 100);

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(45, 45, 45, 0.85)', backdropFilter: 'blur(8px)' }}>
      <h3 className="text-center font-bold" style={{ color: '#cd7f32', fontFamily: 'Cinzel, serif', letterSpacing: 2 }}>
        操作控制
      </h3>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-sm flex items-center gap-1" style={{ color: '#e0d0b0' }}>
            <Flame size={14} color={state.temperature > 60 ? '#ff6f00' : '#87ceeb'} />
            温度
          </span>
          <span className="text-sm font-bold" style={{ color: state.temperature > 60 ? '#ff6f00' : state.temperature > 30 ? '#daa520' : '#87ceeb' }}>
            {state.temperature}℃
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={state.temperature}
          onChange={(e) => setTemperature(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #4169e1 0%, #87ceeb 25%, #daa520 50%, #ff6f00 75%, #dc143c 100%)`
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-sm flex items-center gap-1" style={{ color: '#e0d0b0' }}>
            <RefreshCw size={14} />
            搅拌
          </span>
          <span className="text-sm font-bold" style={{ color: '#daa520' }}>
            {state.stirSpeed}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          value={state.stirSpeed}
          onChange={(e) => setStirSpeed(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ background: 'linear-gradient(to right, #555 0%, #daa520 100%)' }}
        />
      </div>

      <motion.button
        onClick={() => { playClickSound(); setCooling(!state.cooling); }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all"
        style={{
          backgroundColor: state.cooling ? '#4169e1' : 'rgba(65, 105, 225, 0.3)',
          color: '#fff',
          border: `1px solid ${state.cooling ? '#87ceeb' : '#4169e1'}`
        }}
      >
        <Snowflake size={16} />
        {state.cooling ? '冷却中...' : '开始冷却'}
      </motion.button>

      <div className="border-t border-gray-700 pt-3 flex flex-col gap-2">
        <div className="text-xs text-center" style={{ color: '#aaa' }}>
          成功率: <span style={{ color: successRate >= 80 ? '#4ade80' : successRate >= 70 ? '#fbbf24' : '#f87171', fontWeight: 'bold' }}>{successRate}%</span>
        </div>

        <motion.button
          onClick={() => { playClickSound(); performSynthesis(); }}
          disabled={state.crucibleMaterials.length === 0 || state.synthesisResult === 'processing'}
          whileHover={{ scale: state.crucibleMaterials.length > 0 && state.synthesisResult !== 'processing' ? 1.05 : 1 }}
          whileTap={{ scale: state.crucibleMaterials.length > 0 && state.synthesisResult !== 'processing' ? 0.95 : 1 }}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm"
          style={{
            backgroundColor: state.crucibleMaterials.length === 0 || state.synthesisResult === 'processing' ? '#444' : 'linear-gradient(135deg, #cd7f32, #8b5a2b)',
            color: '#fff',
            opacity: state.crucibleMaterials.length === 0 || state.synthesisResult === 'processing' ? 0.5 : 1,
            cursor: state.crucibleMaterials.length === 0 || state.synthesisResult === 'processing' ? 'not-allowed' : 'pointer',
            boxShadow: state.crucibleMaterials.length > 0 && state.synthesisResult !== 'processing' ? '0 4px 12px rgba(205, 127, 50, 0.4)' : 'none'
          }}
        >
          <Play size={16} />
          {state.synthesisResult === 'processing' ? '合成中...' : '开始合成'}
        </motion.button>

        <div className="flex gap-2">
          <motion.button
            onClick={handleSave}
            disabled={state.synthesisResult === 'idle' || state.synthesisResult === 'processing'}
            whileHover={{ scale: state.synthesisResult !== 'idle' && state.synthesisResult !== 'processing' ? 1.05 : 1 }}
            whileTap={{ scale: state.synthesisResult !== 'idle' && state.synthesisResult !== 'processing' ? 0.95 : 1 }}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: state.synthesisResult !== 'idle' && state.synthesisResult !== 'processing' ? '#333' : '#2a2a2a',
              color: '#e0d0b0',
              opacity: state.synthesisResult === 'idle' || state.synthesisResult === 'processing' ? 0.5 : 1,
              border: '1px solid #555'
            }}
          >
            <Save size={14} />
            保存
          </motion.button>
          <motion.button
            onClick={() => { playClickSound(); clearCrucible(); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-medium"
            style={{ backgroundColor: '#333', color: '#e0d0b0', border: '1px solid #555' }}
          >
            <RotateCcw size={14} />
            清空
          </motion.button>
        </div>
      </div>

      {state.synthesisResult !== 'idle' && state.synthesisResult !== 'processing' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-2 rounded-lg text-sm font-bold"
          style={{
            backgroundColor: state.synthesisResult === 'success' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)',
            color: state.synthesisResult === 'success' ? '#4ade80' : '#f87171',
            border: `1px solid ${state.synthesisResult === 'success' ? '#4ade80' : '#f87171'}`
          }}
        >
          {state.synthesisResult === 'success' ? '✨ 合成成功！' : '💨 合成失败...'}
        </motion.div>
      )}
    </div>
  );
};

export default ControlPanel;
