import React, { useEffect, useRef } from 'react';
import { CardType } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  cardId: string;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onChangeType: (id: string, type: CardType) => void;
  onClose: () => void;
}

const typeLabels: Record<CardType, string> = {
  image: '🖼️ 转为图片',
  color: '🎨 转为色块',
  text: '✏️ 转为文字',
};

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  cardId,
  onDelete,
  onDuplicate,
  onChangeType,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="context-menu-item"
        onClick={() => {
          onDuplicate(cardId);
          onClose();
        }}
      >
        📋 复制卡片
      </div>

      <div className="context-menu-divider" />

      <div className="context-menu-item" style={{ cursor: 'default' }}>
        🔄 更改类型
      </div>
      <div className="context-submenu">
        {(Object.keys(typeLabels) as CardType[]).map((type) => (
          <div
            key={type}
            className="context-menu-item"
            onClick={() => {
              onChangeType(cardId, type);
              onClose();
            }}
          >
            {typeLabels[type]}
          </div>
        ))}
      </div>

      <div className="context-menu-divider" />

      <div
        className="context-menu-item danger"
        onClick={() => {
          onDelete(cardId);
          onClose();
        }}
      >
        🗑️ 删除卡片
      </div>
    </div>
  );
};

export default ContextMenu;
