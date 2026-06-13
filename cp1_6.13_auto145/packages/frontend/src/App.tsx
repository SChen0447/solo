import { useState, useEffect, useCallback } from 'react';
import AreaMap from './components/AreaMap';
import PuzzleModal from './components/PuzzleModal';
import Collection from './components';
import axios from 'axios';

export interface PuzzleData {
  id: number;
  name: string;
  question: string;
  unlocked: boolean;
}

export interface CollectionItem {
  id: number;
  puzzleId: number;
  painting: string;
  description: string;
  unlockedAt: string;
}

export interface SolvedPuzzle {
  id: number;
  painting: string;
  description: string;
}

function App() {
  const [puzzles, setPuzzles] = useState<PuzzleData[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleData | null>(null);
  const [showCollection, setShowCollection] = useState(false);
  const [solvedPuzzles, setSolvedPuzzles] = useState<Map<number, SolvedPuzzle>>(new Map());
  const [dissipatingIds, setDissipatingIds] = useState<Set<number>>(new Set());

  const fetchPuzzles = useCallback(async () => {
    try {
      const res = await axios.get('/api/puzzles');
      setPuzzles(res.data.puzzles);
    } catch (err) {
      console.error('Failed to fetch puzzles', err);
    }
  }, []);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await axios.get('/api/collections');
      setCollections(res.data.collections);
    } catch (err) {
      console.error('Failed to fetch collections', err);
    }
  }, []);

  useEffect(() => {
    fetchPuzzles();
    fetchCollections();
  }, [fetchPuzzles, fetchCollections]);

  const handlePuzzleClick = (puzzle: PuzzleData) => {
    if (puzzle.unlocked || solvedPuzzles.has(puzzle.id)) return;
    setSelectedPuzzle(puzzle);
  };

  const handleAnswerSubmit = async (answer: string) => {
    if (!selectedPuzzle) return false;

    try {
      const res = await axios.post(`/api/puzzles/${selectedPuzzle.id}/verify`, { answer });

      if (res.data.correct) {
        setDissipatingIds(prev => new Set(prev).add(selectedPuzzle.id));

        const newSolved = new Map(solvedPuzzles);
        newSolved.set(selectedPuzzle.id, {
          id: selectedPuzzle.id,
          painting: res.data.painting,
          description: res.data.description,
        });
        setSolvedPuzzles(newSolved);

        setPuzzles(prev =>
          prev.map(p => (p.id === selectedPuzzle.id ? { ...p, unlocked: true } : p))
        );

        await axios.post('/api/collections', {
          puzzleId: selectedPuzzle.id,
          painting: res.data.painting,
          description: res.data.description,
        });

        fetchCollections();
        setSelectedPuzzle(null);

        setTimeout(() => {
          setDissipatingIds(prev => {
            const next = new Set(prev);
            next.delete(selectedPuzzle.id);
            return next;
          });
        }, 3500);

        return true;
      }

      return false;
    } catch (err) {
      console.error('Failed to verify answer', err);
      return false;
    }
  };

  const handleDeleteCollection = async (id: number) => {
    try {
      await axios.delete(`/api/collections/${id}`);
      fetchCollections();
    } catch (err) {
      console.error('Failed to delete collection', err);
    }
  };

  const handleCloseModal = () => {
    setSelectedPuzzle(null);
  };

  const solvedCount = puzzles.filter(
    p => p.unlocked || solvedPuzzles.has(p.id)
  ).length;
  const totalCount = puzzles.length;

  return (
    <div className="app">
      <AreaMap
        puzzles={puzzles}
        solvedPuzzles={solvedPuzzles}
        dissipatingIds={dissipatingIds}
        onPuzzleClick={handlePuzzleClick}
        onOpenCollection={() => setShowCollection(true)}
        solvedCount={solvedCount}
        totalCount={totalCount}
      />
      {selectedPuzzle && (
        <PuzzleModal
          puzzle={selectedPuzzle}
          onSubmit={handleAnswerSubmit}
          onClose={handleCloseModal}
        />
      )}
      <Collection
        isOpen={showCollection}
        collections={collections}
        onClose={() => setShowCollection(false)}
        onDelete={handleDeleteCollection}
      />
    </div>
  );
}

export default App;
