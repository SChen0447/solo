import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Clock, Flame, RefreshCw, Snowflake } from 'lucide-react';
import type { Recipe } from '@/types';
import { getMaterialById } from '@/data/materials';
import { useAlchemy } from '@/phases/Phases';
import { playClickSound } from '@/utils/audio';

interface RecipeCardProps {
  recipe: Recipe;
  compact?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, compact = false }) => {
  const [expanded, setExpanded] = useState(false);
  const { loadRecipe } = useAlchemy();

  const handleReplicate = () => {
    playClickSound();
    loadRecipe(recipe);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      layout
      className="relative rounded-xl overflow-hidden cursor-pointer"
      style={{
        width: compact ? '100%' : 280,
        backgroundColor: '#333333',
        border: recipe.success ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(248, 113, 113, 0.3)',
        boxShadow: recipe.success
          ? '0 4px 12px rgba(74, 222, 128, 0.1)'
          : '0 4px 12px rgba(248, 113, 113, 0.1)'
      }}
      whileHover={{
        y: -4,
        boxShadow: recipe.success
          ? '0 8px 24px rgba(74, 222, 128, 0.25)'
          : '0 8px 24px rgba(248, 113, 113, 0.25)'
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => !compact && setExpanded(!expanded)}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: recipe.success ? '#4ade80' : '#f87171' }}
            />
            <span className="text-sm font-bold" style={{ color: recipe.success ? '#4ade80' : '#f87171' }}>
              {recipe.success ? '成功' : '失败'}
            </span>
          </div>
          <span className="text-xs opacity-60" style={{ color: '#e0d0b0' }}>
            {formatDate(recipe.createdAt)}
          </span>
        </div>

        <div className="flex items-center gap-1 mb-3">
          {recipe.materials.map((rm, idx) => {
            const mat = getMaterialById(rm.materialId);
            if (!mat) return null;
            return (
              <div
                key={idx}
                title={mat.name}
                className="rounded-full border-2 flex-shrink-0"
                style={{
                  width: 30,
                  height: 30,
                  backgroundColor: mat.color,
                  borderColor: `${mat.color}80`
                }}
              />
            );
          })}
          <span className="text-xs ml-1 opacity-70" style={{ color: '#e0d0b0' }}>
            {recipe.materials.length}种材料
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#aaa' }}>
          <div className="flex items-center gap-1">
            <Flame size={12} />
            <span>{recipe.operations.temperature}℃</span>
          </div>
          <div className="flex items-center gap-1">
            <RefreshCw size={12} />
            <span>搅拌 {recipe.operations.stirSpeed}</span>
          </div>
          <div className="flex items-center gap-1">
            <Snowflake size={12} />
            <span>{recipe.operations.cooling ? '冷却' : '常温'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{recipe.operations.duration}s</span>
          </div>
        </div>

        {!compact && (
          <motion.button
            onClick={(e) => { e.stopPropagation(); handleReplicate(); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full mt-3 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
            style={{
              backgroundColor: 'rgba(205, 127, 50, 0.3)',
              color: '#cd7f32',
              border: '1px solid #cd7f32'
            }}
          >
            <Copy size={12} />
            一键复现
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {expanded && !compact && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-gray-700">
              <div className="text-xs mb-2 font-bold" style={{ color: '#cd7f32' }}>材料详情:</div>
              <div className="space-y-1">
                {recipe.materials.map((rm, idx) => {
                  const mat = getMaterialById(rm.materialId);
                  if (!mat) return null;
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs" style={{ color: '#e0d0b0' }}>
                      <div
                        className="rounded-full border flex-shrink-0"
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: mat.color,
                          borderColor: mat.color
                        }}
                      />
                      <span>{mat.name}</span>
                      <span className="opacity-50">({mat.element})</span>
                      <span className="ml-auto opacity-50">{mat.resonanceThreshold}℃</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {expanded && !compact && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          className="absolute top-2 right-2 p-1 rounded-full opacity-60 hover:opacity-100"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        >
          <X size={14} style={{ color: '#fff' }} />
        </motion.button>
      )}
    </motion.div>
  );
};

export default RecipeCard;
