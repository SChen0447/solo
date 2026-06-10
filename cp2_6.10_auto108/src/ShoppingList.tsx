import { memo, useState } from 'react';
import { ShoppingListItem, IngredientCategory } from './types';

interface ShoppingListProps {
  items: ShoppingListItem[];
  totalItems: number;
  purchasedCount: number;
  onTogglePurchased: (id: string) => void;
  onAdjustAmount: (id: string, delta: number) => void;
  onDeleteItem: (id: string) => void;
  onClearPurchased: () => void;
  onResetList: () => void;
}

const CATEGORY_CONFIG: Record<IngredientCategory, { name: string; color: string }> = {
  vegetable: { name: '🥬 蔬菜', color: '#4CAF50' },
  meat: { name: '🍖 肉类', color: '#E53935' },
  seasoning: { name: '🧂 调味品', color: '#FF9800' },
  staple: { name: '🍚 主食', color: '#FFEB3B' },
  other: { name: '📦 其他', color: '#9E9E9E' },
};

function ShoppingListComponent({
  items,
  totalItems,
  purchasedCount,
  onTogglePurchased,
  onAdjustAmount,
  onDeleteItem,
  onClearPurchased,
  onResetList,
}: ShoppingListProps) {
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const handleDeleteWithAnimation = (id: string) => {
    setRemovingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      onDeleteItem(id);
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<IngredientCategory, ShoppingListItem[]>);

  const categoryOrder: IngredientCategory[] = ['vegetable', 'meat', 'seasoning', 'staple', 'other'];

  const formatAmount = (amount: number) => {
    return Number.isInteger(amount) ? amount.toString() : amount.toFixed(1);
  };

  return (
    <div>
      <div className="shopping-header">
        <div className="shopping-title">🛒 采购清单</div>
        <div className="shopping-subtitle">
          {totalItems > 0
            ? `共 ${totalItems} 项，已购 ${purchasedCount} 项`
            : '清单为空，添加食谱开始采购吧！'}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="shopping-empty">
          <div className="shopping-empty-icon">🛒</div>
          <div className="shopping-empty-text">采购清单还是空的</div>
          <div style={{ fontSize: 12, marginTop: 6, color: '#A1887F' }}>
            点击食谱卡片的"+采购清单"按钮添加
          </div>
        </div>
      ) : (
        <>
          {categoryOrder.map(category => {
            const categoryItems = groupedItems[category];
            if (!categoryItems || categoryItems.length === 0) return null;
            const config = CATEGORY_CONFIG[category];
            return (
              <div className="shopping-category" key={category}>
                <div className="category-header">
                  <div className="category-color-bar" style={{ backgroundColor: config.color }} />
                  <div className="category-name">{config.name}</div>
                  <div className="category-count">{categoryItems.length}</div>
                </div>
                {categoryItems.map(item => (
                  <div
                    key={item.id}
                    className={`shopping-item ${item.purchased ? 'purchased' : ''} ${removingIds.has(item.id) ? 'removing' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="item-checkbox"
                      checked={item.purchased}
                      onChange={() => onTogglePurchased(item.id)}
                    />
                    <div className="item-info">
                      <div className="item-name">{item.name}</div>
                      <div className="item-amount">
                        {formatAmount(item.amount)} {item.unit}
                      </div>
                    </div>
                    <div className="item-controls">
                      <button
                        className="qty-btn"
                        onClick={() => onAdjustAmount(item.id, -1)}
                        title="减少"
                      >
                        −
                      </button>
                      <button
                        className="qty-btn"
                        onClick={() => onAdjustAmount(item.id, 1)}
                        title="增加"
                      >
                        +
                      </button>
                      <button
                        className="item-delete"
                        onClick={() => handleDeleteWithAnimation(item.id)}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          <div className="shopping-footer">
            <button
              className="btn-secondary"
              onClick={onClearPurchased}
              disabled={purchasedCount === 0}
              style={{
                opacity: purchasedCount === 0 ? 0.5 : 1,
                cursor: purchasedCount === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              清空已购
            </button>
            <button className="btn-danger" onClick={onResetList}>
              重置清单
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(ShoppingListComponent);
