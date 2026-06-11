import { useState } from 'react';
import { Plus, LayoutGrid, Menu, X } from 'lucide-react';
import { useBoardStore } from '../store/useBoardStore';
import './Sidebar.css';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ isMobileOpen, onCloseMobile }: SidebarProps) {
  const { boards, currentBoardId, setCurrentBoardId, createBoard } = useBoardStore();
  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const handleAddBoard = async () => {
    if (newBoardName.trim()) {
      await createBoard(newBoardName.trim());
      setNewBoardName('');
      setIsAddingBoard(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddBoard();
    } else if (e.key === 'Escape') {
      setIsAddingBoard(false);
      setNewBoardName('');
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={onCloseMobile} />
      )}
      
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon" />
            <span>灵感板</span>
          </div>
          <button className="sidebar-close-btn" onClick={onCloseMobile}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-boards">
          <div className="sidebar-section-title">我的看板</div>
          
          <div className="board-list">
            {boards.map((board) => (
              <button
                key={board.id}
                className={`board-item ${currentBoardId === board.id ? 'active' : ''}`}
                onClick={() => {
                  setCurrentBoardId(board.id);
                  onCloseMobile();
                }}
              >
                <LayoutGrid size={18} />
                <span>{board.name}</span>
              </button>
            ))}
          </div>

          {isAddingBoard ? (
            <div className="add-board-input">
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入看板名称"
                autoFocus
              />
              <div className="add-board-actions">
                <button onClick={handleAddBoard}>创建</button>
                <button onClick={() => {
                  setIsAddingBoard(false);
                  setNewBoardName('');
                }}>取消</button>
              </div>
            </div>
          ) : (
            <button
              className="add-board-btn"
              onClick={() => setIsAddingBoard(true)}
            >
              <Plus size={18} />
              <span>新建看板</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
