import { useState, useEffect } from 'react';
import type { Ingredient } from './useWebSocket';

interface Props {
  ingredients: Ingredient[];
  send: (msg: object) => void;
  lastUpdate: { type: string; id?: string; updatedBy?: string } | null;
}

export default function IngredientsPanel({ ingredients, send, lastUpdate }: Props) {
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newUnit, setNewUnit] = useState('个');
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if ((lastUpdate?.type === 'ingredient_update' || lastUpdate?.type === 'ingredient_add') && lastUpdate.id) {
      setHighlightIds(prev => new Set(prev).add(lastUpdate.id!));
      setTimeout(() => {
        setHighlightIds(prev => {
          const next = new Set(prev);
          next.delete(lastUpdate.id!);
          return next;
        });
      }, 1200);
    }
  }, [lastUpdate]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    send({
      type: 'ingredient_add',
      ingredient: { name: newName.trim(), quantity: newQuantity, unit: newUnit, checked: false }
    });
    setNewName('');
    setNewQuantity(1);
  };

  const handleToggle = (id: string, checked: boolean) => {
    send({ type: 'ingredient_update', id, changes: { checked: !checked } });
  };

  const handleQuantityChange = (id: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta);
    send({ type: 'ingredient_update', id, changes: { quantity: newQty } });
  };

  const handleDelete = (id: string) => {
    send({ type: 'ingredient_delete', id });
  };

  const handleStartEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setEditValue(ing.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editValue.trim()) {
      send({ type: 'ingredient_update', id, changes: { name: editValue.trim() } });
    }
    setEditingId(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>🥬 食材清单</h2>
        <span style={styles.countBadge}>{ingredients.length} 项</span>
      </div>

      <div style={styles.addForm}>
        <input
          type="text"
          placeholder="食材名称"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          style={styles.nameInput}
        />
        <div style={styles.qtyWrapper}>
          <input
            type="number"
            min="0"
            value={newQuantity}
            onChange={e => setNewQuantity(Number(e.target.value))}
            style={styles.qtyInput}
          />
          <select value={newUnit} onChange={e => setNewUnit(e.target.value)} style={styles.unitSelect}>
            <option value="个">个</option>
            <option value="克">克</option>
            <option value="毫升">毫升</option>
            <option value="勺">勺</option>
            <option value="片">片</option>
            <option value="适量">适量</option>
          </select>
        </div>
        <button onClick={handleAdd} style={styles.addBtn}>+</button>
      </div>

      <div style={styles.list}>
        {ingredients.map((ing) => {
          const isHighlighted = highlightIds.has(ing.id);
          const isEditing = editingId === ing.id;
          return (
            <div
              key={ing.id}
              style={{
                ...styles.card,
                backgroundColor: ing.checked ? '#e8f5e9' : '#fafafa',
                borderLeft: ing.checked ? '4px solid #4caf50' : '4px solid transparent',
                animation: isHighlighted ? 'highlightFlash 1.2s ease' : undefined,
              }}
            >
              <div
                style={{
                  ...styles.checkIndicator,
                  opacity: ing.checked ? 1 : 0,
                  transform: ing.checked ? 'translateX(0)' : 'translateX(-8px)',
                  transition: 'all 0.3s ease',
                }}
              >
                ✓
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={ing.checked}
                  onChange={() => handleToggle(ing.id, ing.checked)}
                  style={styles.checkbox}
                />
              </label>

              <div style={styles.ingContent}>
                {isEditing ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => handleSaveEdit(ing.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveEdit(ing.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    style={styles.editInput}
                  />
                ) : (
                  <div style={{
                    ...styles.ingName,
                    textDecoration: ing.checked ? 'line-through' : 'none',
                    color: ing.checked ? '#999' : '#333',
                  }} onDoubleClick={() => handleStartEdit(ing)}>
                    {ing.name}
                  </div>
                )}
                <div style={styles.ingQtyRow}>
                  <button
                    onClick={() => handleQuantityChange(ing.id, ing.quantity, -1)}
                    style={styles.qtyBtn}
                  >−</button>
                  <span style={styles.qtyValue}>{ing.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(ing.id, ing.quantity, 1)}
                    style={styles.qtyBtn}
                  >+</button>
                  <span style={styles.unitText}>{ing.unit}</span>
                </div>
              </div>

              <button onClick={() => handleDelete(ing.id)} style={styles.deleteBtn}>
                ×
              </button>
            </div>
          );
        })}
        {ingredients.length === 0 && (
          <div style={styles.empty}>暂无食材，快去添加吧～</div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fef9f0',
  },
  header: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  countBadge: {
    padding: '2px 10px',
    backgroundColor: '#c8e6c9',
    color: '#2e7d32',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
  },
  addForm: {
    padding: '12px 16px',
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    borderBottom: '1px solid #eee',
    backgroundColor: '#fff',
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
    padding: '8px 10px',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  qtyWrapper: {
    display: 'flex',
    gap: 4,
  },
  qtyInput: {
    width: 50,
    padding: '8px 6px',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    fontSize: 13,
    textAlign: 'center',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  unitSelect: {
    padding: '8px 6px',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    fontSize: 13,
    backgroundColor: '#fff',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  addBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 20,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  card: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: 8,
    transition: 'all 0.3s ease',
    gap: 10,
    overflow: 'hidden',
  },
  checkIndicator: {
    position: 'absolute',
    left: 6,
    color: '#4caf50',
    fontSize: 18,
    fontWeight: 700,
    pointerEvents: 'none',
  },
  checkboxLabel: {
    cursor: 'pointer',
    flexShrink: 0,
    marginLeft: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: 'pointer',
    accentColor: '#4caf50',
  },
  ingContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  ingName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#333',
    wordBreak: 'break-word',
    cursor: 'text',
    transition: 'all 0.2s ease',
  },
  editInput: {
    padding: '4px 8px',
    border: '1px solid #90caf9',
    borderRadius: 4,
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#fff',
  },
  ingQtyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    border: '1px solid #e0e0e0',
    backgroundColor: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: '#555',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  qtyValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 500,
    color: '#333',
  },
  unitText: {
    fontSize: 12,
    color: '#888',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#bbb',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 400,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#aaa',
    fontSize: 13,
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes highlightFlash {
    0%, 100% { background-color: var(--original, #fafafa); }
    25% { background-color: #e3f2fd; }
    50% { background-color: var(--original, #fafafa); }
    75% { background-color: #e3f2fd; }
  }
  input[style*="nameInput"]:focus,
  input[style*="qtyInput"]:focus,
  select[style*="unitSelect"]:focus {
    border-color: #90caf9 !important;
    box-shadow: 0 0 0 3px rgba(144, 202, 249, 0.2) !important;
  }
  button[style*="qtyBtn"]:hover {
    background-color: #f5f5f5 !important;
    border-color: #bdbdbd !important;
  }
  button[style*="addBtn"]:hover {
    background-color: #43a047 !important;
    transform: scale(1.05);
  }
  button[style*="deleteBtn"]:hover {
    color: #e53935 !important;
    background-color: #ffebee !important;
  }
`;
document.head.appendChild(styleSheet);
