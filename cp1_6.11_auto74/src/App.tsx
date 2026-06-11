import { useEffect, useState } from 'react';
import { useBoardStore } from './store/useBoardStore';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import TagFilter from './components/TagFilter';
import Board from './components/Board';
import CardEditor from './components/CardEditor';
import './App.css';

export default function App() {
  const {
    currentBoardId,
    fetchBoards,
    fetchCards,
    isLoading,
  } = useBoardStore();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (currentBoardId) {
      fetchCards(currentBoardId);
    }
  }, [currentBoardId, fetchCards]);

  return (
    <div className="app">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      
      <main className="app-main">
        <TopBar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <TagFilter />
        <Board />
      </main>

      <CardEditor />

      {isLoading && (
        <div className="app-loading">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
}
