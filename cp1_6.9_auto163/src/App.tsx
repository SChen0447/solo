import { useState, useCallback } from 'react';
import type { Artwork, ViewType } from './types';
import Exhibition from './components/Exhibition';
import CanvasDetail from './components/CanvasDetail';

function App() {
  const [view, setView] = useState<ViewType>('exhibition');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectArtwork = useCallback((artwork: Artwork) => {
    setSelectedArtwork(artwork);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedArtwork(null);
    setView('exhibition');
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleArtworkCreated = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <div className="app">
      {view === 'exhibition' && (
        <Exhibition
          onSelectArtwork={handleSelectArtwork}
          onArtworkCreated={handleArtworkCreated}
          refreshTrigger={refreshTrigger}
        />
      )}
      {view === 'detail' && selectedArtwork && (
        <CanvasDetail artwork={selectedArtwork} onBack={handleBack} />
      )}
    </div>
  );
}

export default App;
