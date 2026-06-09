import React, { useState, useCallback, useEffect, useRef } from 'react';
import AlbumGrid from './components/AlbumGrid';
import { albums } from './utils/AlbumData';
import { audioEngine } from './audio/AudioEngine';
import styles from './App.module.css';

const App: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flippedAlbumId, setFlippedAlbumId] = useState<string | null>(null);
  const [playingAlbumId, setPlayingAlbumId] = useState<string | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const binCount = audioEngine.getFrequencyBinCount();
    if (binCount > 0) {
      setFrequencyData(new Uint8Array(binCount));
    }
  }, []);

  const updateFrequencyData = useCallback(() => {
    if (!audioEngine.getIsPlaying()) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    if (frequencyData) {
      audioEngine.getByteFrequencyData(frequencyData);
      setFrequencyData(new Uint8Array(frequencyData));
    }

    animationRef.current = requestAnimationFrame(updateFrequencyData);
  }, [frequencyData]);

  const handleIndexChange = useCallback((index: number) => {
    if (flippedAlbumId) {
      setFlippedAlbumId(null);
    }
    if (playingAlbumId) {
      audioEngine.stop();
      setPlayingAlbumId(null);
    }
    setCurrentIndex(index);
  }, [flippedAlbumId, playingAlbumId]);

  const handleFlip = useCallback((albumId: string) => {
    setFlippedAlbumId(prev => (prev === albumId ? null : albumId));
  }, []);

  const handlePlay = useCallback((albumId: string) => {
    audioEngine.resume();

    if (playingAlbumId === albumId) {
      audioEngine.stop();
      setPlayingAlbumId(null);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    if (playingAlbumId) {
      audioEngine.stop();
    }

    const album = albums.find(a => a.id === albumId);
    if (album) {
      setPlayingAlbumId(albumId);
      audioEngine.playRandomMelody({
        releaseYear: album.releaseYear,
        artist: album.artist,
        duration: 5000,
      });
      animationRef.current = requestAnimationFrame(updateFrequencyData);

      setTimeout(() => {
        setPlayingAlbumId(null);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      }, 5000);
    }
  }, [playingAlbumId, updateFrequencyData]);

  useEffect(() => {
    return () => {
      audioEngine.stop();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Vinyl Collection</h1>
        <p className={styles.subtitle}>Drag to browse • Click to flip • Play to listen</p>
      </header>

      <main className={styles.main}>
        <AlbumGrid
          albums={albums}
          currentIndex={currentIndex}
          flippedAlbumId={flippedAlbumId}
          playingAlbumId={playingAlbumId}
          frequencyData={frequencyData}
          onIndexChange={handleIndexChange}
          onFlip={handleFlip}
          onPlay={handlePlay}
        />
      </main>

      <footer className={styles.footer}>
        <p>Album {currentIndex + 1} of {albums.length}</p>
      </footer>
    </div>
  );
};

export default App;
