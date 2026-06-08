import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { CardData, Decoration, TextElement } from '../types/card';
import { COLOR_PALETTE, GRADIENT_PRESETS, DECORATION_TYPES } from '../types/card';
import { DecorationElement } from './DecorationElement';
import { NoteEditor } from './NoteEditor';
import { v4 as uuidv4 } from 'uuid';
import { playNote, resumeAudioContext } from '../utils/audio';
import { NOTE_FREQUENCIES } from '../types/card';

interface CardEditorProps {
  cardData: CardData;
  onChange: (data: CardData) => void;
}

type SelectedItem = { type: 'decoration' | 'text'; id: string } | null;

export const CardEditor: React.FC<CardEditorProps> = ({ cardData, onChange }) => {
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'scale' | 'rotate' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, valueX: 0, valueY: 0, scale: 1, rotation: 0 });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<'bg' | 'decoration' | 'text' | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const handleEditorClick = (e: React.MouseEvent) => {
    if (e.target === editorRef.current) {
      setSelectedItem(null);
      setEditingTextId(null);
    }
  };

  const handleDecorationMouseDown = (e: React.MouseEvent, decoration: Decoration) => {
    e.stopPropagation();
    setSelectedItem({ type: 'decoration', id: decoration.id });
    setIsDragging(true);
    setDragType('move');
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      valueX: decoration.x,
      valueY: decoration.y,
      scale: decoration.scale,
      rotation: decoration.rotation,
    });
  };

  const handleTextMouseDown = (e: React.MouseEvent, text: TextElement) => {
    e.stopPropagation();
    setSelectedItem({ type: 'text', id: text.id });
  };

  const handleTextDoubleClick = (e: React.MouseEvent, text: TextElement) => {
    e.stopPropagation();
    setEditingTextId(text.id);
    setSelectedItem({ type: 'text', id: text.id });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !selectedItem || !dragType) return;

      const rect = editorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      if (selectedItem.type === 'decoration') {
        const decorations = cardData.decorations;
        const index = decorations.findIndex((d) => d.id === selectedItem.id);
        if (index === -1) return;

        const updated = [...decorations];
        const dec = { ...updated[index] };

        if (dragType === 'move') {
          dec.x = Math.max(0, Math.min(100, dragStart.valueX + (dx / rect.width) * 100));
          dec.y = Math.max(0, Math.min(100, dragStart.valueY + (dy / rect.height) * 100));
        } else if (dragType === 'scale') {
          const scaleDelta = (dx + dy) / 100;
          dec.scale = Math.max(0.3, Math.min(3, dragStart.scale + scaleDelta));
        } else if (dragType === 'rotate') {
          const centerX = rect.left + (dec.x / 100) * rect.width;
          const centerY = rect.top + (dec.y / 100) * rect.height;
          const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
          dec.rotation = angle;
        }

        updated[index] = dec;
        onChange({ ...cardData, decorations: updated });
      }
    },
    [isDragging, selectedItem, dragType, dragStart, cardData, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleBgColorClick = (color: string) => {
    onChange({ ...cardData, backgroundColor: color, backgroundGradient: undefined });
    setShowColorPicker(false);
  };

  const handleGradientClick = (gradient: { start: string; end: string; direction: string }) => {
    onChange({
      ...cardData,
      backgroundColor: gradient.start,
      backgroundGradient: {
        start: gradient.start,
        end: gradient.end,
        direction: gradient.direction as 'to right' | 'to bottom' | 'to bottom right',
      },
    });
    setShowColorPicker(false);
  };

  const addDecoration = (type: Decoration['type']) => {
    const colors = ['#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#AA96DA', '#F38181'];
    const newDecoration: Decoration = {
      id: uuidv4(),
      type,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    onChange({ ...cardData, decorations: [...cardData.decorations, newDecoration] });
    setSelectedItem({ type: 'decoration', id: newDecoration.id });
  };

  const addTextElement = () => {
    const newText: TextElement = {
      id: uuidv4(),
      content: '点击编辑文字',
      x: 50,
      y: 50,
      fontSize: 20,
      fontFamily: 'sans-serif',
      color: '#333333',
      bold: false,
      italic: false,
    };
    onChange({ ...cardData, textElements: [...cardData.textElements, newText] });
    setSelectedItem({ type: 'text', id: newText.id });
    setEditingTextId(newText.id);
  };

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    const updated = cardData.textElements.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    onChange({ ...cardData, textElements: updated });
  };

  const deleteSelected = () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'decoration') {
      onChange({
        ...cardData,
        decorations: cardData.decorations.filter((d) => d.id !== selectedItem.id),
      });
    } else if (selectedItem.type === 'text') {
      onChange({
        ...cardData,
        textElements: cardData.textElements.filter((t) => t.id !== selectedItem.id),
      });
    }
    setSelectedItem(null);
  };

  const getSelectedDecoration = (): Decoration | undefined => {
    if (selectedItem?.type === 'decoration') {
      return cardData.decorations.find((d) => d.id === selectedItem.id);
    }
    return undefined;
  };

  const getSelectedText = (): TextElement | undefined => {
    if (selectedItem?.type === 'text') {
      return cardData.textElements.find((t) => t.id === selectedItem.id);
    }
    return undefined;
  };

  const selectedDecoration = getSelectedDecoration();
  const selectedText = getSelectedText();

  const getBackgroundStyle = (): React.CSSProperties => {
    if (cardData.backgroundGradient) {
      return {
        background: `linear-gradient(${cardData.backgroundGradient.direction}, ${cardData.backgroundGradient.start}, ${cardData.backgroundGradient.end})`,
      };
    }
    return { backgroundColor: cardData.backgroundColor };
  };

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarSection}>
          <span style={styles.toolbarLabel}>添加装饰：</span>
          {DECORATION_TYPES.map((type) => (
            <button key={type} onClick={() => addDecoration(type)} style={styles.toolBtn}>
              {type === 'balloon' && '🎈'}
              {type === 'star' && '⭐'}
              {type === 'heart' && '❤️'}
              {type === 'flower' && '🌸'}
              {type === 'ribbon' && '🎀'}
            </button>
          ))}
          <button onClick={addTextElement} style={styles.toolBtn}>
            📝 文字
          </button>
        </div>

        <div style={styles.toolbarSection}>
          <button
            onClick={() => {
              setColorPickerTarget('bg');
              setShowColorPicker(!showColorPicker);
            }}
            style={styles.toolBtn}
          >
            🎨 背景
          </button>
          {selectedItem && (
            <button
              onClick={() => {
                setColorPickerTarget(selectedItem.type);
                setShowColorPicker(!showColorPicker);
              }}
              style={styles.toolBtn}
            >
              🌈 颜色
            </button>
          )}
          {selectedItem && (
            <button onClick={deleteSelected} style={{ ...styles.toolBtn, color: '#E91E63' }}>
              🗑️ 删除
            </button>
          )}
        </div>
      </div>

      {showColorPicker && (
        <div style={styles.colorPicker}>
          <div style={styles.colorPickerSection}>
            <span style={styles.colorPickerLabel}>纯色：</span>
            <div style={styles.colorGrid}>
              {COLOR_PALETTE.map((color) => (
                <div
                  key={color}
                  onClick={() => {
                    if (colorPickerTarget === 'bg') {
                      handleBgColorClick(color);
                    } else if (colorPickerTarget === 'decoration' && selectedDecoration) {
                      const updated = cardData.decorations.map((d) =>
                        d.id === selectedDecoration.id ? { ...d, color } : d
                      );
                      onChange({ ...cardData, decorations: updated });
                    } else if (colorPickerTarget === 'text' && selectedText) {
                      updateTextElement(selectedText.id, { color });
                    }
                  }}
                  style={{ ...styles.colorSwatch, backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          {colorPickerTarget === 'bg' && (
            <div style={styles.colorPickerSection}>
              <span style={styles.colorPickerLabel}>渐变：</span>
              <div style={styles.colorGrid}>
                {GRADIENT_PRESETS.map((g, i) => (
                  <div
                    key={i}
                    onClick={() => handleGradientClick(g)}
                    style={{
                      ...styles.colorSwatch,
                      background: `linear-gradient(${g.direction}, ${g.start}, ${g.end})`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        ref={editorRef}
        onClick={handleEditorClick}
        style={{
          ...styles.editorCanvas,
          ...getBackgroundStyle(),
        }}
      >
        {cardData.decorations.map((decoration) => (
          <div key={decoration.id}>
            <DecorationElement
              decoration={decoration}
              selected={selectedItem?.type === 'decoration' && selectedItem.id === decoration.id}
              interactive
              onMouseDown={(e) => handleDecorationMouseDown(e, decoration)}
            />
            {selectedItem?.type === 'decoration' && selectedItem.id === decoration.id && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    left: `${decoration.x}%`,
                    top: `${decoration.y}%`,
                    width: '12px',
                    height: '12px',
                    marginLeft: '30px',
                    marginTop: '-30px',
                    backgroundColor: '#4D96FF',
                    borderRadius: '50%',
                    cursor: 'nwse-resize',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 100,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                    setDragType('scale');
                    setDragStart({
                      x: e.clientX,
                      y: e.clientY,
                      valueX: decoration.x,
                      valueY: decoration.y,
                      scale: decoration.scale,
                      rotation: decoration.rotation,
                    });
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: `${decoration.x}%`,
                    top: `${decoration.y}%`,
                    width: '12px',
                    height: '12px',
                    marginLeft: '-30px',
                    marginTop: '-30px',
                    backgroundColor: '#FFD93D',
                    borderRadius: '50%',
                    cursor: 'grab',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 100,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                    setDragType('rotate');
                    setDragStart({
                      x: e.clientX,
                      y: e.clientY,
                      valueX: decoration.x,
                      valueY: decoration.y,
                      scale: decoration.scale,
                      rotation: decoration.rotation,
                    });
                  }}
                />
              </>
            )}
          </div>
        ))}

        {cardData.textElements.map((text) => (
          <div
            key={text.id}
            onClick={(e) => handleTextMouseDown(e, text)}
            onDoubleClick={(e) => handleTextDoubleClick(e, text)}
            style={{
              position: 'absolute',
              left: `${text.x}%`,
              top: `${text.y}%`,
              transform: 'translate(-50%, -50%)',
              cursor: 'move',
              padding: '4px 8px',
              border:
                selectedItem?.type === 'text' && selectedItem.id === text.id
                  ? '2px dashed #4D96FF'
                  : '2px dashed transparent',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            {editingTextId === text.id ? (
              <input
                type="text"
                value={text.content}
                onChange={(e) => updateTextElement(text.id, { content: e.target.value })}
                onBlur={() => setEditingTextId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingTextId(null);
                }}
                autoFocus
                style={{
                  fontSize: `${text.fontSize}px`,
                  fontFamily: text.fontFamily,
                  color: text.color,
                  fontWeight: text.bold ? 'bold' : 'normal',
                  fontStyle: text.italic ? 'italic' : 'normal',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  textAlign: 'center',
                  width: '200px',
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: `${text.fontSize}px`,
                  fontFamily: text.fontFamily,
                  color: text.color,
                  fontWeight: text.bold ? 'bold' : 'normal',
                  fontStyle: text.italic ? 'italic' : 'normal',
                }}
              >
                {text.content}
              </span>
            )}
          </div>
        ))}
      </div>

      {selectedItem?.type === 'text' && selectedText && (
        <div style={styles.textToolbar}>
          <button
            onClick={() => updateTextElement(selectedText.id, { bold: !selectedText.bold })}
            style={{
              ...styles.textToolBtn,
              fontWeight: 'bold',
              backgroundColor: selectedText.bold ? '#FF6B9D' : 'white',
              color: selectedText.bold ? 'white' : '#333',
            }}
          >
            B
          </button>
          <button
            onClick={() => updateTextElement(selectedText.id, { italic: !selectedText.italic })}
            style={{
              ...styles.textToolBtn,
              fontStyle: 'italic',
              backgroundColor: selectedText.italic ? '#FF6B9D' : 'white',
              color: selectedText.italic ? 'white' : '#333',
            }}
          >
            I
          </button>
          <select
            value={selectedText.fontSize}
            onChange={(e) => updateTextElement(selectedText.id, { fontSize: Number(e.target.value) })}
            style={styles.selectStyle}
          >
            {[12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48].map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
          <select
            value={selectedText.fontFamily}
            onChange={(e) => updateTextElement(selectedText.id, { fontFamily: e.target.value })}
            style={styles.selectStyle}
          >
            <option value="sans-serif">无衬线</option>
            <option value="serif">衬线</option>
            <option value="monospace">等宽</option>
            <option value="cursive">手写</option>
          </select>
        </div>
      )}

      <NoteEditor
        noteSequence={cardData.noteSequence}
        onChange={(noteSequence) => onChange({ ...cardData, noteSequence })}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
    overflow: 'auto',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  toolbarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  toolbarLabel: {
    fontSize: '12px',
    color: '#666',
    marginRight: '4px',
  },
  toolBtn: {
    padding: '8px 12px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },
  editorCanvas: {
    flex: 1,
    minHeight: '400px',
    position: 'relative',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    backgroundImage:
      'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  },
  colorPicker: {
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  colorPickerSection: {
    marginBottom: '12px',
  },
  colorPickerLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
    display: 'block',
  },
  colorGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: '2px solid white',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s ease',
  },
  textToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '8px',
  },
  textToolBtn: {
    width: '32px',
    height: '32px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  selectStyle: {
    padding: '6px 8px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '12px',
    backgroundColor: 'white',
  },
};
