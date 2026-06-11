import { Grid3x3, List, Plus, Search, Menu } from 'lucide-react';
import { useBoardStore } from '../store/useBoardStore';
import './TopBar.css';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const {
    boards,
    currentBoardId,
    viewMode,
    searchQuery,
    setViewMode,
    setSearchQuery,
    openEditor,
  } = useBoardStore();

  const currentBoard = boards.find(b => b.id === currentBoardId);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-btn" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <h1 className="topbar-title">{currentBoard?.name || '我的灵感'}</h1>
      </div>

      <div className="topbar-right">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="搜索卡片..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="网格视图"
          >
            <Grid3x3 size={18} />
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="列表视图"
          >
            <List size={18} />
          </button>
        </div>

        <button
          className="add-card-btn"
          onClick={() => openEditor()}
        >
          <Plus size={18} />
          <span>新建卡片</span>
        </button>
      </div>
    </header>
  );
}
