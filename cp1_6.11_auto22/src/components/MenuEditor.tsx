import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  MenuData,
  Drink,
  addCategory,
  deleteCategory,
  addDrink,
  updateDrink,
  deleteDrink,
  loadMenuData,
} from '../data/menuStore';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100%',
    minHeight: '100vh',
  },
  sidebar: {
    width: 260,
    minWidth: 260,
    background: '#4A2C2A',
    color: '#F5E6D3',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 10,
  },
  sidebarHeader: {
    padding: '24px 20px 16px',
    fontSize: 18,
    fontWeight: 700,
    borderBottom: '1px solid rgba(245,230,211,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  categoryList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  categoryItem: {
    padding: '12px 20px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background 0.2s',
    fontSize: 15,
  },
  categoryItemActive: {
    background: 'rgba(200,162,122,0.25)',
    borderRight: '3px solid #E8B84B',
  },
  categoryDelete: {
    background: 'none',
    border: 'none',
    color: 'rgba(245,230,211,0.4)',
    cursor: 'pointer',
    fontSize: 16,
    padding: '2px 6px',
    borderRadius: 4,
    transition: 'color 0.2s, background 0.2s',
    lineHeight: 1,
  },
  addCategoryRow: {
    padding: '12px 20px',
    borderTop: '1px solid rgba(245,230,211,0.15)',
  },
  addCategoryInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(245,230,211,0.3)',
    background: 'rgba(245,230,211,0.1)',
    color: '#F5E6D3',
    fontSize: 14,
    outline: 'none',
  },
  main: {
    flex: 1,
    padding: 24,
    overflowY: 'auto',
    background: '#F5E6D3',
  },
  mainHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#4A2C2A',
  },
  addDrinkBtn: {
    padding: '10px 20px',
    background: '#C8A27A',
    color: '#4A2C2A',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  drinkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20,
  },
  drinkCard: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(74,44,42,0.1)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'box-shadow 0.3s, transform 0.3s',
    position: 'relative',
  },
  drinkCardHover: {
    boxShadow: '0 8px 24px rgba(74,44,42,0.18)',
    transform: 'translateY(-4px)',
  },
  drinkCardNew: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: '#E8B84B',
    color: '#4A2C2A',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
    zIndex: 2,
  },
  drinkCardImage: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
    display: 'block',
    background: '#e0d6cc',
  },
  drinkCardPlaceholder: {
    width: '100%',
    height: 160,
    background: '#e0d6cc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 40,
  },
  drinkCardBody: {
    padding: '12px 14px',
  },
  drinkCardName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#4A2C2A',
    marginBottom: 4,
  },
  drinkCardPrice: {
    fontSize: 15,
    fontWeight: 600,
    color: '#E8B84B',
    marginBottom: 4,
  },
  drinkCardDesc: {
    fontSize: 13,
    color: '#8B6F5E',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  deleteDrinkBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    background: 'rgba(74,44,42,0.1)',
    border: 'none',
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 13,
    color: '#4A2C2A',
    transition: 'background 0.2s',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(74,44,42,0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  modal: {
    width: 420,
    maxWidth: '100%',
    background: '#fff',
    height: '100%',
    overflowY: 'auto',
    padding: 32,
    animation: 'slideInRight 0.3s ease-out',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#4A2C2A',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#8B6F5E',
    marginBottom: 6,
  },
  formInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    color: '#4A2C2A',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  formTextarea: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    color: '#4A2C2A',
    outline: 'none',
    resize: 'vertical',
    minHeight: 80,
    transition: 'border-color 0.2s',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
    borderRadius: 8,
    marginTop: 8,
    background: '#e0d6cc',
  },
  imagePreviewPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    background: '#e0d6cc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 40,
    color: '#bbb',
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
  },
  btnPrimary: {
    flex: 1,
    padding: '12px 0',
    background: '#4A2C2A',
    color: '#F5E6D3',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  btnSecondary: {
    flex: 1,
    padding: '12px 0',
    background: '#F5E6D3',
    color: '#4A2C2A',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  hamburger: {
    display: 'none',
    position: 'fixed',
    top: 16,
    left: 16,
    zIndex: 200,
    background: '#4A2C2A',
    color: '#F5E6D3',
    border: 'none',
    borderRadius: 8,
    width: 40,
    height: 40,
    fontSize: 20,
    cursor: 'pointer',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarOverlay: {
    display: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 9,
  },
};

interface MenuEditorProps {
  data: MenuData;
  onDataChange: (data: MenuData) => void;
}

export default function MenuEditor({ data, onDataChange }: MenuEditorProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    data.categories.length > 0 ? data.categories[0].id : ''
  );
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editForm, setEditForm] = useState<Partial<Drink>>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [animatingNewId, setAnimatingNewId] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const deleteConfirmRef = useRef<string | null>(null);

  useEffect(() => {
    if (data.categories.length > 0 && !data.categories.find((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(data.categories[0].id);
    }
  }, [data.categories, selectedCategoryId]);

  const handleAddCategory = useCallback(() => {
    const name = newCategoryName.trim();
    if (!name) return;
    const updated = addCategory(data, name);
    onDataChange(updated);
    setNewCategoryName('');
    setSelectedCategoryId(updated.categories[updated.categories.length - 1].id);
  }, [data, newCategoryName, onDataChange]);

  const handleDeleteCategory = useCallback(
    (categoryId: string) => {
      if (deleteConfirmRef.current === categoryId) {
        const updated = deleteCategory(data, categoryId);
        onDataChange(updated);
        deleteConfirmRef.current = null;
      } else {
        deleteConfirmRef.current = categoryId;
        setTimeout(() => {
          deleteConfirmRef.current = null;
        }, 2000);
      }
    },
    [data, onDataChange]
  );

  const handleAddDrink = useCallback(() => {
    if (!selectedCategoryId) return;
    const updated = addDrink(data, selectedCategoryId);
    onDataChange(updated);
    const newDrink = updated.drinks[updated.drinks.length - 1];
    setAnimatingNewId(newDrink.id);
    setTimeout(() => setAnimatingNewId(null), 400);
    setEditingDrink(newDrink);
    setEditForm({ ...newDrink });
  }, [data, selectedCategoryId, onDataChange]);

  const handleCardClick = useCallback((drink: Drink) => {
    setEditingDrink(drink);
    setEditForm({ ...drink });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingDrink) return;
    const updated = updateDrink(data, editingDrink.id, editForm);
    onDataChange(updated);
    setEditingDrink(null);
    setEditForm({});
  }, [data, editingDrink, editForm, onDataChange]);

  const handleDeleteDrink = useCallback(
    (drinkId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = deleteDrink(data, drinkId);
      onDataChange(updated);
      if (editingDrink?.id === drinkId) {
        setEditingDrink(null);
        setEditForm({});
      }
    },
    [data, editingDrink, onDataChange]
  );

  const handleImgError = useCallback((drinkId: string) => {
    setImgErrors((prev) => new Set(prev).add(drinkId));
  }, []);

  const selectedCategory = data.categories.find((c) => c.id === selectedCategoryId);
  const categoryDrinks = data.drinks.filter((d) => d.categoryId === selectedCategoryId);

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes scaleFadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-30px); opacity: 0; }
        }
        .editor-category-delete:hover {
          color: #e87474 !important;
          background: rgba(232,116,116,0.15);
        }
        .editor-add-drink-btn:hover {
          background: #b8925e !important;
        }
        .editor-delete-drink-btn:hover {
          background: rgba(232,116,116,0.2) !important;
          color: #c0392b !important;
        }
        .editor-form-input:focus, .editor-form-textarea:focus {
          border-color: #C8A27A;
        }
        .editor-btn-primary:hover {
          background: #3a1f1d !important;
        }
        .editor-btn-secondary:hover {
          background: #ede0d0 !important;
        }
        .editor-category-item:hover {
          background: rgba(200,162,122,0.15);
        }
        .editor-category-item-active:hover {
          background: rgba(200,162,122,0.25);
        }
        @media (max-width: 768px) {
          .editor-hamburger { display: flex !important; }
          .editor-sidebar {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            transform: translateX(-100%);
            transition: transform 0.3s ease-in-out;
            z-index: 20 !important;
          }
          .editor-sidebar.open {
            transform: translateX(0);
          }
          .editor-sidebar-overlay.open {
            display: block !important;
          }
          .editor-drink-grid {
            grid-template-columns: 1fr !important;
          }
          .editor-modal {
            width: 100% !important;
          }
          .editor-main {
            padding: 16px !important;
            padding-top: 64px !important;
          }
        }
      `}</style>

      <button
        className="editor-hamburger"
        style={styles.hamburger}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>

      <div
        className={`editor-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        style={styles.sidebarOverlay}
        onClick={() => setSidebarOpen(false)}
      />

      <div style={styles.container}>
        <div
          className={`editor-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={styles.sidebar}
        >
          <div style={styles.sidebarHeader}>
            <span>☕</span> 饮品分类
          </div>
          <div style={styles.categoryList}>
            {data.categories.map((cat) => (
              <div
                key={cat.id}
                className={`editor-category-item ${
                  selectedCategoryId === cat.id
                    ? 'editor-category-item-active'
                    : ''
                }`}
                style={{
                  ...styles.categoryItem,
                  ...(selectedCategoryId === cat.id ? styles.categoryItemActive : {}),
                }}
                onClick={() => {
                  setSelectedCategoryId(cat.id);
                  setSidebarOpen(false);
                }}
              >
                <span>{cat.name}</span>
                <button
                  className="editor-category-delete"
                  style={styles.categoryDelete}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(cat.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div style={styles.addCategoryRow}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="editor-form-input"
                style={{ ...styles.addCategoryInput, flex: 1 }}
                placeholder="新分类名称..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button
                style={{
                  ...styles.addDrinkBtn,
                  padding: '8px 14px',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
                className="editor-add-drink-btn"
                onClick={handleAddCategory}
              >
                添加
              </button>
            </div>
          </div>
        </div>

        <div className="editor-main" style={styles.main}>
          {selectedCategory ? (
            <>
              <div style={styles.mainHeader}>
                <h2 style={styles.mainTitle}>{selectedCategory.name}</h2>
                <button
                  className="editor-add-drink-btn"
                  style={styles.addDrinkBtn}
                  onClick={handleAddDrink}
                >
                  + 添加饮品
                </button>
              </div>

              <div className="editor-drink-grid" style={styles.drinkGrid}>
                {categoryDrinks.map((drink) => (
                  <div
                    key={drink.id}
                    style={{
                      ...styles.drinkCard,
                      ...(hoveredCard === drink.id ? styles.drinkCardHover : {}),
                      animation: animatingNewId === drink.id
                        ? 'scaleFadeIn 0.3s ease-out'
                        : undefined,
                    }}
                    onMouseEnter={() => setHoveredCard(drink.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => handleCardClick(drink)}
                  >
                    {drink.isNew && (
                      <div style={styles.drinkCardNew}>新品</div>
                    )}
                    {drink.imageUrl && !imgErrors.has(drink.id) ? (
                      <img
                        src={drink.imageUrl}
                        alt={drink.name}
                        style={styles.drinkCardImage}
                        onError={() => handleImgError(drink.id)}
                      />
                    ) : (
                      <div style={styles.drinkCardPlaceholder}>☕</div>
                    )}
                    <div style={styles.drinkCardBody}>
                      <div style={styles.drinkCardName}>
                        {drink.name || '未命名饮品'}
                      </div>
                      <div style={styles.drinkCardPrice}>
                        {drink.price > 0 ? `¥${drink.price}` : '价格未定'}
                      </div>
                      <div style={styles.drinkCardDesc}>
                        {drink.description || '暂无描述'}
                      </div>
                    </div>
                    <button
                      className="editor-delete-drink-btn"
                      style={styles.deleteDrinkBtn}
                      onClick={(e) => handleDeleteDrink(drink.id, e)}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>

              {categoryDrinks.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 0',
                    color: '#8B6F5E',
                    fontSize: 15,
                  }}
                >
                  此分类暂无饮品，点击上方按钮添加
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                color: '#8B6F5E',
                fontSize: 15,
              }}
            >
              请选择或创建一个分类
            </div>
          )}
        </div>
      </div>

      {editingDrink && (
        <div
          style={styles.overlay}
          onClick={() => {
            setEditingDrink(null);
            setEditForm({});
          }}
        >
          <div
            className="editor-modal"
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={styles.modalTitle}>编辑饮品</h3>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>名称</label>
              <input
                className="editor-form-input"
                style={styles.formInput}
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="饮品名称"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>价格（元）</label>
              <input
                className="editor-form-input"
                style={styles.formInput}
                type="number"
                min={0}
                value={editForm.price ?? ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, price: Number(e.target.value) })
                }
                placeholder="0"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>描述</label>
              <textarea
                className="editor-form-textarea"
                style={styles.formTextarea}
                value={editForm.description || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="饮品描述..."
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>图片URL</label>
              <input
                className="editor-form-input"
                style={styles.formInput}
                value={editForm.imageUrl || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, imageUrl: e.target.value })
                }
                placeholder="https://..."
              />
              {editForm.imageUrl ? (
                <img
                  src={editForm.imageUrl}
                  alt="预览"
                  style={styles.imagePreview}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div style={styles.imagePreviewPlaceholder}>☕</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editForm.isNew ?? false}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isNew: e.target.checked })
                  }
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#8B6F5E' }}>
                  标记为新品
                </span>
              </label>
            </div>

            <div style={styles.modalActions}>
              <button
                className="editor-btn-secondary"
                style={styles.btnSecondary}
                onClick={() => {
                  setEditingDrink(null);
                  setEditForm({});
                }}
              >
                取消
              </button>
              <button
                className="editor-btn-primary"
                style={styles.btnPrimary}
                onClick={handleSaveEdit}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
