import React from 'react';
import { motion } from 'framer-motion';
import { MATERIALS } from '@/data/materials';
import type { Material } from '@/types';
import { playDropSound } from '@/utils/audio';

interface MaterialLibraryProps {
  onSelect?: (materialId: string) => void;
}

const MaterialCard: React.FC<{ material: Material; onSelect?: (id: string) => void }> = ({ material, onSelect }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('materialId', material.id);
    playDropSound();
  };

  const handleClick = () => {
    if (onSelect) onSelect(material.id);
  };

  return (
    <motion.div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className="cursor-grab active:cursor-grabbing relative flex flex-col items-center justify-center p-2 rounded-lg select-none"
      style={{
        width: 80,
        height: 80,
        backgroundColor: 'rgba(45, 45, 45, 0.8)',
        border: `2px solid ${material.color}`,
        boxShadow: `0 4px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`
      }}
      whileHover={{ scale: 1.05, boxShadow: `0 6px 12px rgba(0,0,0,0.5), 0 0 15px ${material.color}40` }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      title={`${material.name} - ${material.element}`}
    >
      <motion.div
        style={{
          width: 36,
          height: 36,
          backgroundColor: material.color,
          borderRadius: material.shape === 'circle' ? '50%' : material.shape === 'square' ? '6px' : '0',
          transform: material.shape === 'diamond' ? 'rotate(45deg)' : undefined,
          boxShadow: `0 0 10px ${material.color}80, inset 0 0 6px rgba(255,255,255,0.4)`
        }}
        animate={{
          boxShadow: [
            `0 0 8px ${material.color}60, inset 0 0 4px rgba(255,255,255,0.3)`,
            `0 0 14px ${material.color}90, inset 0 0 8px rgba(255,255,255,0.5)`,
            `0 0 8px ${material.color}60, inset 0 0 4px rgba(255,255,255,0.3)`
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="mt-1 text-xs text-center" style={{ color: '#e0d0b0', fontSize: 11 }}>{material.name}</span>
    </motion.div>
  );
};

const MaterialLibrary: React.FC<MaterialLibraryProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-center font-bold" style={{ color: '#cd7f32', fontFamily: 'Cinzel, serif', letterSpacing: 2 }}>
        材料库
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {MATERIALS.map(mat => (
          <MaterialCard key={mat.id} material={mat} onSelect={onSelect} />
        ))}
      </div>
      <div className="mt-2 text-xs opacity-60 text-center">
        拖拽材料到熔炉
      </div>
    </div>
  );
};

export default MaterialLibrary;
