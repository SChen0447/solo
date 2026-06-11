import { useState, useMemo } from 'react';
import type { Material } from '../types';
import { MATERIALS, MAX_MATERIALS } from '../data/materials';
import { mixColors } from '../utils/colorUtils';

interface PotionMixerProps {
  selected?: string[];
  onColorChange: (color: string, materials: string[]) => void;
  readOnly?: boolean;
}

export default function PotionMixer({ selected, onColorChange, readOnly }: PotionMixerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(selected ?? []);
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const selectedMaterials = useMemo(
    () => MATERIALS.filter(m => selectedIds.includes(m.id)),
    [selectedIds]
  );

  const currentColor = useMemo(() => {
    const colors = selectedMaterials.map(m => m.color);
    return colors.length > 0 ? mixColors(colors) : '#2a1b3d';
  }, [selectedMaterials]);

  const addMaterial = (mat: Material) => {
    if (readOnly) return;
    if (selectedIds.includes(mat.id)) return;
    if (selectedIds.length >= MAX_MATERIALS) return;
    const next = [...selectedIds, mat.id];
    setSelectedIds(next);
    const nextMats = MATERIALS.filter(m => next.includes(m.id));
    onColorChange(
      nextMats.length > 0 ? mixColors(nextMats.map(m => m.color)) : '',
      nextMats.map(m => m.name)
    );
  };

  const removeMaterial = (id: string) => {
    if (readOnly) return;
    const next = selectedIds.filter(x => x !== id);
    setSelectedIds(next);
    const nextMats = MATERIALS.filter(m => next.includes(m.id));
    onColorChange(
      nextMats.length > 0 ? mixColors(nextMats.map(m => m.color)) : '',
      nextMats.map(m => m.name)
    );
  };

  const handleDragStart = (e: React.DragEvent, mat: Material) => {
    if (readOnly || selectedIds.includes(mat.id) || selectedIds.length >= MAX_MATERIALS) {
      e.preventDefault();
      return;
    }
    setDraggingId(mat.id);
    e.dataTransfer.setData('text/plain', mat.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => setDraggingId(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData('text/plain');
    const mat = MATERIALS.find(m => m.id === id);
    if (mat) addMaterial(mat);
  };

  return (
    <div className="potion-mixer">
      <div className="materials-list">
        {MATERIALS.map(mat => {
          const disabled = readOnly || selectedIds.includes(mat.id) || selectedIds.length >= MAX_MATERIALS;
          return (
            <div
              key={mat.id}
              className={`material-item ${disabled ? 'disabled' : ''} ${draggingId === mat.id ? 'dragging' : ''}`}
              draggable={!disabled}
              onDragStart={e => handleDragStart(e, mat)}
              onDragEnd={handleDragEnd}
              onClick={() => !disabled && addMaterial(mat)}
              title={mat.name}
            >
              <span className="material-icon">{mat.icon}</span>
              <span className="material-name">{mat.name}</span>
            </div>
          );
        })}
      </div>

      <div
        className={`crucible-area ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className="crucible-liquid"
          style={{
            backgroundColor: currentColor,
            color: currentColor,
          }}
        >
          <span className="crucible-label">
            {selectedMaterials.length === 0 ? '拖入材料' : `${selectedMaterials.length}/${MAX_MATERIALS}`}
          </span>
        </div>
      </div>

      <div className="selected-materials">
        {selectedMaterials.map(mat => (
          <div key={mat.id} className="selected-chip">
            <span>{mat.icon}</span>
            <span>{mat.name}</span>
            {!readOnly && (
              <button onClick={() => removeMaterial(mat.id)} title="移除">×</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
