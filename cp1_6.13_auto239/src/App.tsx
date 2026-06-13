import { useState, useEffect, useCallback } from 'react';
import View from './types';
import type { LetterSummary, ParticlePoint } from './types';
import LetterList from './components/LetterList';
import LetterEditor from './components/LetterEditor';
import LetterViewer from './components/LetterViewer';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);
  const [letters, setLetters] = useState<LetterSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLetters = useCallback(async () => {
    try {
      const res = await fetch('/api/letters');
      const data = await res.json();
      setLetters(data);
    } catch (err) {
      console.error('获取信笺列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  const handleCreateLetter = () => {
    setCurrentView('create');
  };

  const handleViewLetter = (id: string) => {
    setSelectedLetterId(id);
    setCurrentView('view');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedLetterId(null);
    fetchLetters();
  };

  const handleLetterCreated = () => {
    setCurrentView('list');
    fetchLetters();
  };

  const handleLetterBurned = () => {
    fetchLetters();
  };

  return (
    <div className="app-container">
      {currentView === 'list' && (
        <LetterList
          letters={letters}
          loading={loading}
          onCreateClick={handleCreateLetter}
          onLetterClick={handleViewLetter}
          onRefresh={fetchLetters}
        />
      )}
      {currentView === 'create' && (
        <LetterEditor
          onBack={handleBackToList}
          onCreated={handleLetterCreated}
        />
      )}
      {currentView === 'view' && selectedLetterId && (
        <LetterViewer
          letterId={selectedLetterId}
          onBack={handleBackToList}
          onBurned={handleLetterBurned}
        />
      )}
    </div>
  );
}

export default App;
