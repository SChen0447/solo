import React, { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ThreeScene } from './ThreeScene';
import { BlockPalette } from './BlockPalette';
import { BlockData, BlockPosition, BlockTemplate, BLOCK_TEMPLATES, LEGO_COLORS, BlockSize } from './types';

interface HistoryEntry {
  type: 'add' | 'delete' | 'modify';
  blocks: BlockData[];
  previousBlocks: BlockData[];
}

const MAX_HISTORY = 20;

export const App: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<ThreeScene | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<BlockTemplate | null>(
    BLOCK_TEMPLATES[0]
  );
  const [selectedColor, setSelectedColor] = useState<string>(LEGO_COLORS[0]);
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedBlockData, setSelectedBlockData] = useState<BlockData | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [pickerColor, setPickerColor] = useState(LEGO_COLORS[0]);

  const isCtrlPressed = useRef(false);

  useEffect(() => {
    if (sceneRef.current && !threeSceneRef.current) {
      threeSceneRef.current = new ThreeScene(sceneRef.current);

      threeSceneRef.current.setOnBlockClick((id, event) => {
        if (isCtrlPressed.current && id) {
          setSelectedBlockId(id);
          const data = threeSceneRef.current?.getBlockData(id);
          setSelectedBlockData(data || null);
          threeSceneRef.current?.selectBlock(id);
        } else if (isCtrlPressed && !id) {
          setSelectedBlockId(null);
          setSelectedBlockData(null);
          threeSceneRef.current?.selectBlock(null);
        }
      });

      threeSceneRef.current.setOnBlockPlace((position) => {
        if (selectedTemplate && isPlacingMode) {
          addBlock(position);
        }
      });
    }

    return () => {
      if (threeSceneRef.current) {
        threeSceneRef.current.dispose();
        threeSceneRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (threeSceneRef.current && selectedTemplate && isPlacingMode) {
      threeSceneRef.current.setPlacingMode(true, selectedTemplate.size, selectedColor);
    } else if (threeSceneRef.current) {
      threeSceneRef.current.setPlacingMode(false);
    }
  }, [isPlacingMode, selectedTemplate, selectedColor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        isCtrlPressed.current = true;
      }

      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        e.preventDefault();
        deleteSelectedBlock();
      }

      if (e.key === 'Escape') {
        setIsPlacingMode(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        isCtrlPressed.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedBlockId, history, historyIndex]);

  const pushToHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(entry);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const addBlock = useCallback((position: BlockPosition) => {
    if (!selectedTemplate) return;

    const size = selectedTemplate.size;
    const newBlock: BlockData = {
      id: uuidv4(),
      position: { ...position },
      size: { ...size },
      color: selectedColor,
      rotation: 0,
    };

    threeSceneRef.current?.addBlock(newBlock, true);

    const entry: HistoryEntry = {
      type: 'add',
      blocks: [newBlock],
      previousBlocks: [],
    };
    pushToHistory(entry);
  }, [selectedTemplate, selectedColor, pushToHistory]);

  const deleteSelectedBlock = useCallback(() => {
    if (!selectedBlockId || !threeSceneRef.current) return;

    const blockData = threeSceneRef.current.getBlockData(selectedBlockId);
    if (!blockData) return;

    threeSceneRef.current.removeBlock(selectedBlockId, true);
    setSelectedBlockId(null);
    setSelectedBlockData(null);
    threeSceneRef.current.selectBlock(null);

    const entry: HistoryEntry = {
      type: 'delete',
      blocks: [],
      previousBlocks: [blockData],
    };
    pushToHistory(entry);
  }, [selectedBlockId, pushToHistory]);

  const undo = useCallback(() => {
    if (historyIndex < 0 || historyIndex >= history.length) return;

    const entry = history[historyIndex];
    const scene = threeSceneRef.current;
    if (!scene) return;

    if (entry.type === 'add') {
      entry.blocks.forEach((block) => {
        scene.removeBlock(block.id, true);
      });
    } else if (entry.type === 'delete') {
      entry.previousBlocks.forEach((block) => {
        scene.addBlock(block, true);
      });
    } else if (entry.type === 'modify') {
      entry.previousBlocks.forEach((block) => {
        const current = scene.getBlockData(block.id);
        if (current) {
          scene.moveBlock(block.id, block.position, true);
          scene.changeBlockColor(block.id, block.color, true);
          scene.rotateBlock(block.id, block.rotation, true);
        }
      });
    }

    setSelectedBlockId(null);
    setSelectedBlockData(null);
    scene.selectBlock(null);
    setHistoryIndex((prev) => prev - 1);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const nextIndex = historyIndex + 1;
    const entry = history[nextIndex];
    const scene = threeSceneRef.current;
    if (!scene) return;

    if (entry.type === 'add') {
      entry.blocks.forEach((block) => {
        scene.addBlock(block, true);
      });
    } else if (entry.type === 'delete') {
      entry.previousBlocks.forEach((block) => {
        scene.removeBlock(block.id, true);
      });
    } else if (entry.type === 'modify') {
      entry.blocks.forEach((block) => {
        const current = scene.getBlockData(block.id);
        if (current) {
          scene.moveBlock(block.id, block.position, true);
          scene.changeBlockColor(block.id, block.color, true);
          scene.rotateBlock(block.id, block.rotation, true);
        }
      });
    }

    setSelectedBlockId(null);
    setSelectedBlockData(null);
    scene.selectBlock(null);
    setHistoryIndex((prev) => prev + 1);
  }, [history, historyIndex]);

  const handleSelectTemplate = (template: BlockTemplate) => {
    setSelectedTemplate(template);
    setIsPlacingMode(true);
  };

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    setPickerColor(color);
  };

  const handleColorChange = (color: string) => {
    setPickerColor(color);
    if (selectedBlockId && threeSceneRef.current) {
      const prevData = threeSceneRef.current.getBlockData(selectedBlockId);
      threeSceneRef.current.changeBlockColor(selectedBlockId, color, true);

      setTimeout(() => {
        const newData = threeSceneRef.current?.getBlockData(selectedBlockId);
        if (prevData && newData) {
          const entry: HistoryEntry = {
            type: 'modify',
            blocks: [newData],
            previousBlocks: [prevData],
          };
          pushToHistory(entry);
        }
        setSelectedBlockData(newData || null);
      }, 200);
    }
  };

  const handleRotate = (direction: 'left' | 'right') => {
    if (!selectedBlockId || !threeSceneRef.current) return;

    const prevData = threeSceneRef.current.getBlockData(selectedBlockId);
    if (!prevData) return;

    const delta = direction === 'left' ? -90 : 90;
    const newRotation = (prevData.rotation + delta + 360) % 360;

    threeSceneRef.current.rotateBlock(selectedBlockId, newRotation, true);

    setTimeout(() => {
      const newData = threeSceneRef.current?.getBlockData(selectedBlockId);
      if (prevData && newData) {
        const entry: HistoryEntry = {
          type: 'modify',
          blocks: [newData],
          previousBlocks: [prevData],
        };
        pushToHistory(entry);
      }
      setSelectedBlockData(newData || null);
    }, 200);
  };

  const handleDeleteClick = () => {
    deleteSelectedBlock();
  };

  const currentStep = historyIndex + 1;
  const totalSteps = history.length;

  return (
    <div style={styles.app}>
      <div style={styles.leftPanel}>
        <BlockPalette
          selectedTemplate={selectedTemplate}
          selectedColor={selectedColor}
          onSelectTemplate={handleSelectTemplate}
          onSelectColor={handleSelectColor}
        />
      </div>

      <div style={styles.viewport}>
        <div ref={sceneRef} style={styles.canvasContainer} />
        {isPlacingMode && (
          <div style={styles.placingIndicator}>
            <span>放置模式 - 点击场景放置积木 (ESC取消)</span>
          </div>
        )}
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.rightHeader}>
          <h3 style={styles.rightTitle}>属性面板</h3>
        </div>

        {selectedBlockData ? (
          <div style={styles.properties}>
            <div style={styles.propertySection}>
              <div style={styles.propertyLabel}>颜色</div>
              <div style={styles.colorPickerSection}>
                <div style={styles.colorPickerWheel}>
                  <input
                    type="color"
                    value={selectedBlockData.color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    style={styles.colorInput}
                  />
                </div>
                <div style={styles.colorPresetRow}>
                  {LEGO_COLORS.map((color) => (
                    <div
                      key={color}
                      style={{
                        ...styles.colorPresetSwatch,
                        backgroundColor: color,
                        border:
                          selectedBlockData.color.toLowerCase() === color.toLowerCase()
                            ? '2px solid #2979ff'
                            : '2px solid transparent',
                      }}
                      onClick={() => handleColorChange(color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.propertySection}>
              <div style={styles.propertyLabel}>旋转</div>
              <div style={styles.rotateButtons}>
                <button
                  style={styles.rotateButton}
                  onClick={() => handleRotate('left')}
                >
                  <span style={styles.rotateIcon}>↺</span>
                </button>
                <div style={styles.rotationValue}>
                  {selectedBlockData.rotation}°
                </div>
                <button
                  style={styles.rotateButton}
                  onClick={() => handleRotate('right')}
                >
                  <span style={styles.rotateIcon}>↻</span>
                </button>
              </div>
            </div>

            <div style={styles.propertySection}>
              <div style={styles.propertyLabel}>尺寸</div>
              <div style={styles.sizeInfo}>
                {selectedBlockData.size.x} x {selectedBlockData.size.z}
              </div>
            </div>

            <div style={styles.actionSection}>
              <button style={styles.deleteButton} onClick={handleDeleteClick}>
                <span style={styles.deleteIcon}>🗑</span>
                删除积木
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.noSelection}>
            <p style={styles.noSelectionText}>
              按住 Ctrl 键点击积木进行选择
            </p>
          </div>
        )}

        <div style={styles.shortcutsSection}>
          <div style={styles.shortcutTitle}>快捷键</div>
          <div style={styles.shortcutItem}>
            <span style={styles.shortcutKey}>Ctrl+Z</span>
            <span style={styles.shortcutDesc}>撤销</span>
          </div>
          <div style={styles.shortcutItem}>
            <span style={styles.shortcutKey}>Ctrl+Shift+Z</span>
            <span style={styles.shortcutDesc}>重做</span>
          </div>
          <div style={styles.shortcutItem}>
            <span style={styles.shortcutKey}>Ctrl+点击</span>
            <span style={styles.shortcutDesc}>选择积木</span>
          </div>
          <div style={styles.shortcutItem}>
            <span style={styles.shortcutKey}>Delete</span>
            <span style={styles.shortcutDesc}>删除选中</span>
          </div>
          <div style={styles.shortcutItem}>
            <span style={styles.shortcutKey}>ESC</span>
            <span style={styles.shortcutDesc}>取消放置</span>
          </div>
        </div>
      </div>

      <div style={styles.stepIndicator}>
        步骤 {currentStep}/{totalSteps}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    minWidth: 1280,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  leftPanel: {
    flexShrink: 0,
  },
  viewport: {
    flex: 1,
    position: 'relative',
    border: '1px solid #999',
    margin: 12,
    marginRight: 0,
    borderRadius: 4,
    overflow: 'hidden',
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
  },
  placingIndicator: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(41, 121, 255, 0.9)',
    color: 'white',
    padding: '8px 20px',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 500,
    pointerEvents: 'none',
    zIndex: 10,
  },
  rightPanel: {
    width: 280,
    flexShrink: 0,
    backgroundColor: '#f5f5f5',
    borderLeft: '1px solid #d0d0d0',
    display: 'flex',
    flexDirection: 'column',
    marginLeft: 12,
  },
  rightHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#fafafa',
  },
  rightTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    margin: 0,
  },
  properties: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
  },
  propertySection: {
    marginBottom: 24,
  },
  propertyLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: '#666',
    marginBottom: 12,
  },
  colorPickerSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  colorPickerWheel: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  colorInput: {
    width: '100%',
    height: '100%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  colorPresetRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  colorPresetSwatch: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  rotateButtons: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  rotateButton: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#2979ff',
    color: 'white',
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(41, 121, 255, 0.3)',
  },
  rotateIcon: {
    fontSize: 22,
  },
  rotationValue: {
    fontSize: 18,
    fontWeight: 600,
    color: '#333',
    minWidth: 60,
    textAlign: 'center',
  },
  sizeInfo: {
    fontSize: 20,
    fontWeight: 600,
    color: '#333',
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
  actionSection: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  deleteButton: {
    width: '100%',
    padding: '12px 20px',
    backgroundColor: '#ff5252',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(255, 82, 82, 0.3)',
  },
  deleteIcon: {
    fontSize: 18,
  },
  noSelection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noSelectionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  shortcutsSection: {
    padding: '16px 20px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#fafafa',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#666',
    marginBottom: 12,
  },
  shortcutItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    marginBottom: 8,
  },
  shortcutKey: {
    fontWeight: 500,
    color: '#2979ff',
    fontFamily: 'monospace',
    backgroundColor: '#e3f2fd',
    padding: '2px 8px',
    borderRadius: 4,
  },
  shortcutDesc: {
    color: '#888',
  },
  stepIndicator: {
    position: 'absolute',
    bottom: 24,
    right: 310,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: 16,
    fontSize: 13,
    fontWeight: 500,
    zIndex: 10,
  },
};
